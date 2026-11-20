"""Cross-verification engine comparing extracted invoices against spreadsheet ledger rows and other documents."""

import re
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from rapidfuzz import fuzz

from app.contracts import (
    CrossVerifyLink,
    CrossVerifyStatus,
    Flag,
    InvoiceData,
    LedgerRowData,
    RuleCode,
    Severity
)

TOLERANCE = Decimal("0.01")

def _normalize_inv_no(inv_no: Optional[str]) -> str:
    if not inv_no:
        return ""
    return re.sub(r"[^A-Za-z0-9]", "", inv_no).upper()

def cross_verify(
    invoice: InvoiceData,
    invoice_id: str,
    ledger_rows: List[Tuple[str, LedgerRowData]], # (ledger_row_id, data)
    other_invoices: List[Tuple[str, InvoiceData]] # (other_invoice_id, data)
) -> Tuple[List[CrossVerifyLink], List[Flag]]:
    """Cross-verifies an invoice against ledger rows and other extracted invoices.
    
    ARCHITECTURAL DECISION:
    When no counterpart match is identified in either the spreadsheet ledger rows or other documents,
    NO flag is emitted. Cross-verification flags are strictly reserved for actual discrepancies
    between two matching financial records. A document uploaded alone without an uploaded ledger
    is not considered invalid.
    """
    links: List[CrossVerifyLink] = []
    flags: List[Flag] = []

    norm_source_num = _normalize_inv_no(invoice.invoice_number)
    source_total = Decimal(str(invoice.total)) if invoice.total is not None else None

    # 1. Match against Ledger Rows
    matched_ledger_id: Optional[str] = None
    matched_ledger_row: Optional[LedgerRowData] = None

    for l_id, row in ledger_rows:
        row_num = _normalize_inv_no(row.invoice_number)
        # Match by invoice number
        if norm_source_num and row_num and norm_source_num == row_num:
            matched_ledger_id = l_id
            matched_ledger_row = row
            break
        # Fallback match: fuzzy supplier + matching total
        if not matched_ledger_id and row.total_amount is not None and source_total is not None:
            if invoice.supplier_name and row.supplier_name:
                supp_score = fuzz.partial_ratio(invoice.supplier_name.lower(), row.supplier_name.lower())
                if supp_score >= 85 and abs(Decimal(str(row.total_amount)) - source_total) <= TOLERANCE:
                    matched_ledger_id = l_id
                    matched_ledger_row = row
                    break

    if matched_ledger_id and matched_ledger_row:
        diffs: Dict[str, Any] = {}
        mismatch_types: List[str] = []

        # Check total
        if matched_ledger_row.total_amount is not None and source_total is not None:
            l_tot = Decimal(str(matched_ledger_row.total_amount))
            diff = abs(source_total - l_tot)
            if diff > TOLERANCE:
                mismatch_types.append("TOTAL")
                diffs["total"] = {"invoice": float(source_total), "ledger": float(l_tot), "diff": float(diff)}

        # Check date
        if matched_ledger_row.invoice_date and invoice.invoice_date:
            if matched_ledger_row.invoice_date != invoice.invoice_date:
                mismatch_types.append("DATE")
                diffs["date"] = {"invoice": invoice.invoice_date, "ledger": matched_ledger_row.invoice_date}

        # Check currency
        if matched_ledger_row.currency and invoice.currency:
            if matched_ledger_row.currency.upper() != invoice.currency.upper():
                mismatch_types.append("CURRENCY")
                diffs["currency"] = {"invoice": invoice.currency, "ledger": matched_ledger_row.currency}

        if not mismatch_types:
            status = CrossVerifyStatus.MATCHED
        elif len(mismatch_types) > 1:
            status = CrossVerifyStatus.MULTIPLE_MISMATCH
        elif mismatch_types[0] == "TOTAL":
            status = CrossVerifyStatus.TOTAL_MISMATCH
        elif mismatch_types[0] == "DATE":
            status = CrossVerifyStatus.DATE_MISMATCH
        else:
            status = CrossVerifyStatus.CURRENCY_MISMATCH

        links.append(CrossVerifyLink(
            source_invoice_id=invoice_id,
            target_type="LEDGER_ROW",
            target_id=matched_ledger_id,
            match_status=status,
            diff_details=diffs
        ))

        if status != CrossVerifyStatus.MATCHED:
            flags.append(Flag(
                rule_code=RuleCode.CROSS_VERIFY_MISMATCH,
                severity=Severity.ERROR,
                field_name="cross_verify_ledger",
                message=f"Cross-verification mismatch against ledger row ({matched_ledger_row.sheet_name} row {matched_ledger_row.row_index}): {', '.join(mismatch_types)} mismatch. Diff: {diffs}"
            ))

    # 2. Match against Other Invoices
    for other_id, other_inv in other_invoices:
        if other_id == invoice_id:
            continue
        other_num = _normalize_inv_no(other_inv.invoice_number)
        if norm_source_num and other_num and norm_source_num == other_num:
            other_total = Decimal(str(other_inv.total)) if other_inv.total is not None else None
            diffs_other: Dict[str, Any] = {}
            mismatches: List[str] = []

            if source_total is not None and other_total is not None:
                d = abs(source_total - other_total)
                if d > TOLERANCE:
                    mismatches.append("TOTAL")
                    diffs_other["total"] = {"this_invoice": float(source_total), "other_invoice": float(other_total), "diff": float(d)}

            if not mismatches:
                status_other = CrossVerifyStatus.MATCHED
            else:
                status_other = CrossVerifyStatus.TOTAL_MISMATCH

            links.append(CrossVerifyLink(
                source_invoice_id=invoice_id,
                target_type="EXTRACTED_INVOICE",
                target_id=other_id,
                match_status=status_other,
                diff_details=diffs_other
            ))

            if status_other != CrossVerifyStatus.MATCHED:
                flags.append(Flag(
                    rule_code=RuleCode.CROSS_VERIFY_MISMATCH,
                    severity=Severity.ERROR,
                    field_name="cross_verify_invoice",
                    message=f"Cross-verification mismatch against invoice '{other_id}': total amount differs (this: {source_total}, other: {other_total})."
                ))

    return links, flags
