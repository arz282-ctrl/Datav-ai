import pytest
from PIL import Image, ImageDraw
from app.parsers.image_parser import parse_image
from app.contracts import CorruptedDocumentError, CorruptedDocumentErrorCode

@pytest.mark.unit
def test_parse_single_image(tmp_path):
    img_path = str(tmp_path / "test.png")
    img = Image.new("RGB", (300, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 40), "TEST RECEIPT 999", fill=(0, 0, 0))
    img.save(img_path)

    pages = parse_image(img_path)
    assert len(pages) == 1
    assert pages[0].page_no == 1
    assert "TEST" in pages[0].text or "RECEIPT" in pages[0].text or "999" in pages[0].text

@pytest.mark.unit
def test_parse_multiframe_tiff(tmp_path):
    tiff_path = str(tmp_path / "multipage.tiff")
    frame1 = Image.new("RGB", (200, 100), color=(255, 255, 255))
    draw1 = ImageDraw.Draw(frame1)
    draw1.text((10, 30), "PAGE 1 TEXT", fill=(0, 0, 0))

    frame2 = Image.new("RGB", (200, 100), color=(255, 255, 255))
    draw2 = ImageDraw.Draw(frame2)
    draw2.text((10, 30), "PAGE 2 TEXT", fill=(0, 0, 0))

    frame1.save(tiff_path, save_all=True, append_images=[frame2])

    pages = parse_image(tiff_path)
    assert len(pages) == 2
    assert pages[0].page_no == 1
    assert pages[1].page_no == 2

@pytest.mark.unit
def test_empty_image_raises_error(tmp_path):
    empty_file = str(tmp_path / "empty.png")
    with open(empty_file, "wb") as f:
        pass
    with pytest.raises(CorruptedDocumentError) as exc_info:
        parse_image(empty_file)
    assert exc_info.value.code == CorruptedDocumentErrorCode.EMPTY_FILE
