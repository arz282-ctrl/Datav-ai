import pytest
from app.contracts import ExtractionResult, InvoiceData, LineItemData, RuleCode
from app.extractor.grounding import ground

@pytest.mark.unit
def test_grounding_nullifies_hallucinated_values():
    raw_text = """
    TAX INVOICE
    Invoice No: INV-4567
    Date: 2026-05-10
    Vendor: CareFirst Medical
    Total: $1,500.00
    """

    # Model hallucinated subtotal of $1,200.00 and customer name "John Doe" not in raw_text
    extracted = ExtractionResult(
        invoice=InvoiceData(
            invoice_number="INV-4567",
            invoice_date="2026-05-10",
            supplier_name="CareFirst Medical",
            customer_name="John Doe", # Hallucinated!
            subtotal=1200.00,        # Hallucinated!
            total=1500.00,
            currency="USD",
            line_items=[]
        ),
        confidence={"model_confidence": 0.99},
        model="mock-llm"
    )

    grounded_res, flags = ground(extracted, raw_text)

    # Verified values retained
    assert grounded_res.invoice.invoice_number == "INV-4567"
    assert grounded_res.invoice.total == 1500.00
    assert grounded_res.invoice.currency == "USD"

    # Hallucinated values nulled and flagged
    assert grounded_res.invoice.customer_name is None
    assert grounded_res.invoice.subtotal is None

    flag_fields = [f.field_name for f in flags]
    assert "customer_name" in flag_fields
    assert "subtotal" in flag_fields
    assert all(f.rule_code == RuleCode.UNGROUNDED_VALUE for f in flags)

@pytest.mark.unit
def test_human_verified_skips_grounding():
    raw_text = "Empty document without numbers."
    extracted = ExtractionResult(
        invoice=InvoiceData(
            invoice_number="INV-MANUAL-1",
            total=500.00,
            currency="USD"
        ),
        confidence={},
        model="human-edit"
    )

    grounded_res, flags = ground(extracted, raw_text, human_verified=True)
    assert grounded_res.invoice.invoice_number == "INV-MANUAL-1"
    assert grounded_res.invoice.total == 500.00
    assert len(flags) == 0
