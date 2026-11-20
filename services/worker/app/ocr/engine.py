"""OCR Engine interface and OpenCV-preprocessed Tesseract implementation."""

import os
import re
from typing import Protocol, Optional
import cv2
import numpy as np
from PIL import Image
import pytesseract
from pytesseract import Output

from app.contracts import OCRResult, CorruptedDocumentError, CorruptedDocumentErrorCode

class OCREngine(Protocol):
    def image_to_text(self, img: np.ndarray) -> OCRResult:
        """Extracts text and confidence from an image array."""
        ...

class TesseractOCREngine:
    def __init__(self, lang: Optional[str] = None):
        self.lang = lang or os.environ.get("OCR_LANG", "eng")

    def preprocess_image(self, img: np.ndarray) -> np.ndarray:
        """Applies grayscale, orientation fix, deskew, bilateral filter, and Otsu thresholding."""
        # 1. Grayscale
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.copy()

        # 2. Orientation fix via OSD (Orientation and Script Detection)
        try:
            osd = pytesseract.image_to_osd(gray, output_type=Output.DICT)
            rotation = osd.get("rotate", 0)
            if rotation == 90:
                gray = cv2.rotate(gray, cv2.ROTATE_90_CLOCKWISE)
            elif rotation == 180:
                gray = cv2.rotate(gray, cv2.ROTATE_180)
            elif rotation == 270:
                gray = cv2.rotate(gray, cv2.ROTATE_90_COUNTERCLOCKWISE)
        except Exception:
            # OSD might fail on low text or synthetic images; safely proceed
            pass

        # 3. Deskew using cv2.minAreaRect
        try:
            coords = np.column_stack(np.where(gray < 255))
            if len(coords) > 50:
                angle = cv2.minAreaRect(coords)[-1]
                if angle < -45:
                    angle = -(90 + angle)
                elif angle > 45:
                    angle = 90 - angle
                else:
                    angle = -angle
                if abs(angle) > 0.5:
                    (h, w) = gray.shape[:2]
                    center = (w // 2, h // 2)
                    M = cv2.getRotationMatrix2D(center, angle, 1.0)
                    gray = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        except Exception:
            pass

        # 4. Bilateral filter for noise reduction while preserving edges
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)

        # 5. Otsu thresholding
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return thresh

    def image_to_text(self, img: np.ndarray) -> OCRResult:
        try:
            processed = self.preprocess_image(img)
            data = pytesseract.image_to_data(processed, lang=self.lang, output_type=Output.DICT)
            
            words = []
            confs = []
            for i, text in enumerate(data.get("text", [])):
                t = text.strip()
                if t:
                    words.append(t)
                    c = float(data["conf"][i])
                    if c > 0:
                        confs.append(c)

            extracted_text = " ".join(words)
            avg_conf = float(np.mean(confs)) if confs else (85.0 if extracted_text else 0.0)
            return OCRResult(text=extracted_text, confidence=round(avg_conf, 2))
        except pytesseract.TesseractError as e:
            raise CorruptedDocumentError(CorruptedDocumentErrorCode.OCR_FAILED, f"Tesseract OCR failed: {str(e)}")
        except Exception as e:
            raise CorruptedDocumentError(CorruptedDocumentErrorCode.OCR_FAILED, f"OCR processing error: {str(e)}")
