import pytest
from app.contracts import (
    CrossVerifyStatus,
    InvoiceData,
    LedgerRowData,
    RuleCode
)
from app.validator.cross_verify import cross_verify

@pytest.mark.unit
def test_cross_verify_against_ledger_matched():
    inv = InvoiceData(
        invoice_number="INV-2026-001",
        invoice_date="2026-05-15",
        supplier_name="Acme Medical",
        total=1250.00,
        currency="USD"
    )

    ledger_rows = [
        ("row_1", LedgerRowData(
            row_index=1,
            sheet_name="Sheet1",
            invoice_number="INV-2026-001",
            invoice_date="2026-05-15",
            supplier_name="Acme Medical",
            total_amount=1250.01, # diff = 0.01 <= 0.01 -> MATCHED
            currency="USD"
        ))
    ]

    links, flags = cross_verify(inv, "inv_1", ledger_rows, [])
    assert len(links) == 1
    assert links[0].match_status == CrossVerifyStatus.MATCHED
    assert len(flags) == 0

@pytest.mark.unit
def test_cross_verify_against_ledger_total_mismatch():
    inv = InvoiceData(
        invoice_number="INV-2026-001",
        invoice_date="2026-05-15",
        supplier_name="Acme Medical",
        total=1250.00,
        currency="USD"
    )

    ledger_rows = [
        ("row_1", LedgerRowData(
            row_index=1,
            sheet_name="Sheet1",
            invoice_number="INV-2026-001",
            invoice_date="2026-05-15",
            supplier_name="Acme Medical",
            total_amount=1260.00, # diff = 10.00 -> MISMATCH
            currency="USD"
        ))
    ]

    links, flags = cross_verify(inv, "inv_1", ledger_rows, [])
    assert len(links) == 1
    assert links[0].match_status == CrossVerifyStatus.TOTAL_MISMATCH
    assert len(flags) == 1
    assert flags[0].rule_code == RuleCode.CROSS_VERIFY_MISMATCH

@pytest.mark.unit
def test_no_counterpart_found_emits_no_flag():
    inv = InvoiceData(
        invoice_number="INV-UNMATCHED-999",
        invoice_date="2026-05-15",
        supplier_name="Acme Medical",
        total=1250.00,
        currency="USD"
    )

    # Empty ledger rows and other invoices
    links, flags = cross_verify(inv, "inv_1", [], [])
    assert len(links) == 0
    assert len(flags) == 0
