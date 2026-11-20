import pytest
from app.extractor.grounding import (
    is_number_grounded,
    is_date_grounded,
    is_currency_grounded,
    is_invoice_number_grounded,
    is_name_grounded
)

@pytest.mark.unit
def test_number_grounding():
    text = "The subtotal is $1,250.00 and tax is 125.0 with total 1375"
    assert is_number_grounded(1250.0, text)
    assert is_number_grounded(1250, text)
    assert is_number_grounded(125.0, text)
    assert is_number_grounded(1375.0, text)
    # Hallucinated number
    assert not is_number_grounded(9999.99, text)

@pytest.mark.unit
def test_date_grounding():
    text1 = "Invoice Date: 03/11/2026. Payment due in 30 days."
    assert is_date_grounded("2026-11-03", text1)

    text2 = "Billed on Nov 3, 2026 for services rendered."
    assert is_date_grounded("2026-11-03", text2)

    # Hallucinated date
    assert not is_date_grounded("2025-01-01", text1)

@pytest.mark.unit
def test_currency_grounding():
    assert is_currency_grounded("USD", "Total due: $500.00")
    assert is_currency_grounded("EUR", "Total due: 500.00 €")
    assert is_currency_grounded("GBP", "Total due: £500.00")
    assert is_currency_grounded("BDT", "Grand total: 50,000 ৳")
    assert not is_currency_grounded("JPY", "Total due: $500.00")

@pytest.mark.unit
def test_invoice_number_grounding():
    text = "Invoice # INV-2026/001 issued today."
    assert is_invoice_number_grounded("INV-2026-001", text)
    assert is_invoice_number_grounded("INV2026001", text)
    assert not is_invoice_number_grounded("INV-999", text)

@pytest.mark.unit
def test_name_fuzzy_grounding():
    text = "Bill From: Acme Medical Supplies & Health Equipment Inc."
    assert is_name_grounded("Acme Medical Supplies", text, threshold=90)
    assert not is_name_grounded("Unrelated Corporate Entity", text, threshold=90)
