import pytest
from app.contracts import InvoiceData, LineItemData, RuleCode, Severity
from app.validator.rules import validate_invoice, compute_duplicate_hash

@pytest.mark.unit
def test_missing_fields_validation():
    # Empty invoice
    inv = InvoiceData()
    flags = validate_invoice(inv)

    error_fields = [f.field_name for f in flags if f.severity == Severity.ERROR]
    warning_fields = [f.field_name for f in flags if f.severity == Severity.WARNING]

    assert "invoice_number" in error_fields
    assert "supplier_name" in error_fields
    assert "invoice_date" in error_fields
    assert "total" in error_fields
    assert "line_items" in warning_fields

@pytest.mark.unit
def test_math_validation_tolerance_edges():
    # 0.01 difference must PASS (no MATH_MISMATCH flag)
    inv_pass = InvoiceData(
        invoice_number="INV-001",
        invoice_date="2026-05-01",
        supplier_name="Acme",
        subtotal=100.00,
        tax=10.00,
        total=110.01, # diff = 0.01 <= 0.01
        line_items=[
            LineItemData(description="Item A", amount=100.01) # diff = 0.01 <= 0.01
        ]
    )
    flags_pass = validate_invoice(inv_pass)
    math_flags = [f for f in flags_pass if f.rule_code == RuleCode.MATH_MISMATCH]
    assert len(math_flags) == 0

    # 0.02 difference must FAIL (emit MATH_MISMATCH flag)
    inv_fail = InvoiceData(
        invoice_number="INV-001",
        invoice_date="2026-05-01",
        supplier_name="Acme",
        subtotal=100.00,
        tax=10.00,
        total=110.02, # diff = 0.02 > 0.01 -> FAILS
        line_items=[
            LineItemData(description="Item A", amount=100.02) # diff = 0.02 > 0.01 -> FAILS
        ]
    )
    flags_fail = validate_invoice(inv_fail)
    math_flags_fail = [f for f in flags_fail if f.rule_code == RuleCode.MATH_MISMATCH]
    assert len(math_flags_fail) == 2 # One for subtotal+tax vs total, one for line items vs subtotal

@pytest.mark.unit
def test_duplicate_detection():
    supplier = "Global Health Services"
    inv_num = "INV-2026-99"
    total = 540.50

    dup_hash = compute_duplicate_hash(supplier, inv_num, total)
    assert dup_hash is not None

    existing_hashes = {
        dup_hash: "INV-ORIGINAL-01"
    }

    inv = InvoiceData(
        invoice_number=inv_num,
        invoice_date="2026-06-01",
        supplier_name=supplier,
        subtotal=500.00,
        tax=40.50,
        total=total,
        line_items=[LineItemData(amount=500.00)]
    )

    flags = validate_invoice(inv, existing_duplicate_hashes=existing_hashes)
    dup_flags = [f for f in flags if f.rule_code == RuleCode.DUPLICATE_INVOICE]
    assert len(dup_flags) == 1
    assert "INV-ORIGINAL-01" in dup_flags[0].message
