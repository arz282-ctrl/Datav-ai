import pytest
from app.contracts import PageText, PageSource
from app.segmenter import segment_pages

@pytest.mark.unit
def test_segmenter_splits_distinct_invoices():
    pages = [
        PageText(page_no=1, text="INVOICE\nInvoice No: INV-001\nVendor: MedSupply\nTotal: $100", source=PageSource.NATIVE),
        PageText(page_no=2, text="Invoice No: INV-001\nPage 2 of 2\nAdditional details", source=PageSource.NATIVE),
        PageText(page_no=3, text="TAX INVOICE\nInvoice Number: INV-002\nVendor: PharmaCorp\nTotal: $250", source=PageSource.NATIVE),
    ]

    chunks = list(segment_pages(pages))
    assert len(chunks) == 2
    # Chunk 1: pages 1 and 2
    assert chunks[0].chunk_index == 0
    assert chunks[0].page_start == 1
    assert chunks[0].page_end == 2
    assert "INV-001" in chunks[0].text

    # Chunk 2: page 3
    assert chunks[1].chunk_index == 1
    assert chunks[1].page_start == 3
    assert chunks[1].page_end == 3
    assert "INV-002" in chunks[1].text

@pytest.mark.unit
def test_segmenter_hard_caps_page_limit():
    pages = [
        PageText(page_no=i, text=f"Document page {i} content text", source=PageSource.NATIVE)
        for i in range(1, 26)
    ]
    chunks = list(segment_pages(pages))
    assert len(chunks) == 2
    assert chunks[0].page_start == 1
    assert chunks[0].page_end == 20
    assert chunks[1].page_start == 21
    assert chunks[1].page_end == 25
