"""Image parser for JPG, PNG, and multi-frame TIFF images with OCR."""

import os
from typing import List, Optional
from PIL import Image, ImageSequence
import numpy as np
import cv2

from app.contracts import PageText, PageSource, CorruptedDocumentError, CorruptedDocumentErrorCode
from app.ocr.engine import OCREngine, TesseractOCREngine

def parse_image(path: str, ocr_engine: Optional[OCREngine] = None) -> List[PageText]:
    """Parses JPG, PNG, or multi-frame TIFF images into a list of PageText items."""
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.EMPTY_FILE, "Image file is empty or does not exist")

    engine = ocr_engine or TesseractOCREngine()
    pages: List[PageText] = []

    try:
        with Image.open(path) as img:
            for idx, frame in enumerate(ImageSequence.Iterator(img)):
                page_no = idx + 1
                # Convert PIL frame to OpenCV BGR numpy array
                frame_rgb = frame.convert("RGB")
                img_array = np.array(frame_rgb)
                img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

                ocr_res = engine.image_to_text(img_bgr)
                pages.append(PageText(
                    page_no=page_no,
                    text=ocr_res.text,
                    source=PageSource.OCR,
                    ocr_confidence=ocr_res.confidence
                ))
    except Exception as e:
        if isinstance(e, CorruptedDocumentError):
            raise
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.CORRUPT_IMAGE, f"Failed to parse or decode image: {str(e)}")

    if not pages:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.EMPTY_FILE, "Image file contained no frames")

    return pages
