import pytest
import numpy as np
import cv2
from PIL import Image, ImageDraw

from app.ocr.engine import TesseractOCREngine
from app.contracts import OCRResult

@pytest.mark.unit
def test_ocr_preprocessing_and_execution(tmp_path):
    # Create an image with clean text
    img = Image.new("RGB", (300, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 40), "INVOICE 12345", fill=(0, 0, 0))
    img_bgr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    engine = TesseractOCREngine()
    result = engine.image_to_text(img_bgr)
    assert isinstance(result, OCRResult)
    assert "INVOICE" in result.text.upper() or "12345" in result.text
    assert result.confidence > 0

@pytest.mark.unit
def test_ocr_deskew_no_crash():
    engine = TesseractOCREngine()
    # Rotated image with noise
    blank = np.full((200, 200), 255, dtype=np.uint8)
    cv2.putText(blank, "TEST", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
    processed = engine.preprocess_image(blank)
    assert processed.shape == (200, 200)
