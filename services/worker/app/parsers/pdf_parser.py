"""Streaming PyMuPDF PDF parser with on-demand OCR fallback for scans and rasterized pages."""

import os
from typing import Iterator, Optional
import fitz  # PyMuPDF
import numpy as np
import cv2

from app.contracts import PageText, PageSource, CorruptedDocumentError, CorruptedDocumentErrorCode
from app.ocr.engine import OCREngine, TesseractOCREngine

def iter_pdf_pages(path: str, ocr_engine: Optional[OCREngine] = None) -> Iterator[PageText]:
    """Streams PyMuPDF pages one by one.
    Rasterizes pages with fewer than 30 characters (or image scans) at 200-300 DPI for OCR.
    """
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.EMPTY_FILE, "PDF file is empty or does not exist")

    engine = ocr_engine or TesseractOCREngine()

    try:
        doc = fitz.open(path)
    except Exception as e:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.CORRUPT_PDF, f"Failed to open PDF: {str(e)}")

    if doc.is_encrypted:
        doc.close()
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.ENCRYPTED_FILE, "PDF is password-encrypted")

    if doc.page_count == 0:
        doc.close()
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.EMPTY_FILE, "PDF contains 0 pages")

    try:
        for page_idx in range(doc.page_count):
            page = doc.load_page(page_idx)
            page_no = page_idx + 1
            native_text = page.get_text("text").strip()

            # Check if native text is sufficient (>= 30 non-whitespace characters)
            if len(native_text) >= 30:
                yield PageText(
                    page_no=page_no,
                    text=native_text,
                    source=PageSource.NATIVE,
                    ocr_confidence=None
                )
            else:
                # Page is a scan or raster image: render at 250 DPI for OCR
                # 250 DPI = zoom factor 250 / 72 ≈ 3.472
                zoom = 250 / 72.0
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                
                # Convert pixmap bytes to numpy array
                img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
                if pix.n == 3: # RGB -> BGR for OpenCV
                    img_bgr = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
                else:
                    img_bgr = img_data

                ocr_result = engine.image_to_text(img_bgr)
                combined_text = ocr_result.text if ocr_result.text else native_text
                yield PageText(
                    page_no=page_no,
                    text=combined_text,
                    source=PageSource.OCR,
                    ocr_confidence=ocr_result.confidence
                )
    except fitz.FileDataError as e:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.CORRUPT_PDF, f"Truncated or corrupted PDF structure: {str(e)}")
    except Exception as e:
        if isinstance(e, CorruptedDocumentError):
            raise
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.CORRUPT_PDF, f"Error reading PDF pages: {str(e)}")
    finally:
        doc.close()
