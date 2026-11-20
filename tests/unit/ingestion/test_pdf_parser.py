import pytest
import os
import fitz
from app.parsers.pdf_parser import iter_pdf_pages
from app.contracts import CorruptedDocumentError, CorruptedDocumentErrorCode, PageSource

@pytest.mark.unit
def test_digital_pdf_parsing(tmp_path):
    pdf_path = str(tmp_path / "digital.pdf")
    doc = fitz.open()
    page = doc.new_page()
    text_content = "This is a digital invoice document with more than thirty native characters for testing."
    page.insert_text((50, 72), text_content)
    doc.save(pdf_path)
    doc.close()

    pages = list(iter_pdf_pages(pdf_path))
    assert len(pages) == 1
    assert pages[0].source == PageSource.NATIVE
    assert "digital invoice document" in pages[0].text

@pytest.mark.unit
def test_empty_pdf_raises_error(tmp_path):
    empty_file = str(tmp_path / "empty.pdf")
    with open(empty_file, "wb") as f:
        pass
    with pytest.raises(CorruptedDocumentError) as exc_info:
        list(iter_pdf_pages(empty_file))
    assert exc_info.value.code == CorruptedDocumentErrorCode.EMPTY_FILE

@pytest.mark.unit
def test_corrupt_pdf_raises_error(tmp_path):
    corrupt_file = str(tmp_path / "corrupt.pdf")
    with open(corrupt_file, "wb") as f:
        f.write(b"%PDF-1.4\nGarbage random truncated data that is invalid")
    with pytest.raises(CorruptedDocumentError) as exc_info:
        list(iter_pdf_pages(corrupt_file))
    assert exc_info.value.code == CorruptedDocumentErrorCode.CORRUPT_PDF
