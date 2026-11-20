"""Deterministic validation rules for invoices using exact Decimal arithmetic."""

import hashlib
import re
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Tuple

from app.contracts import Flag, InvoiceData, LineItemData, RuleCode, Severity

TOLERANCE = Decimal("0.01")

def compute_duplicate_hash(
    supplier_name: Optional[str],
    invoice_number: Optional[str],
    total: Optional[float]
) -> Optional[str]:
    """Generates SHA-256 of lower(strip(supplier)) | uppercase-alphanumeric(invoice_number) | f"{total:.2f}"."""
    if not supplier_name or not invoice_number or total is None:
        return None

    clean_supp = supplier_name.strip().lower()
    clean_inv = re.sub(r"[^A-Za-z0-9]", "", invoice_number).upper()
    tot_str = f"{total:.2f}"

    raw_key = f"{clean_supp}|{clean_inv}|{tot_str}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

def validate_invoice(
    invoice: InvoiceData,
    existing_duplicate_hashes: Optional[Dict[str, str]] = None
) -> List[Flag]:
    """Validates an invoice for missing required fields, math consistency, and duplicates."""
    flags: List[Flag] = []

    # 1. MISSING_FIELD checks (ERROR for core fields, WARNING for line_items)
    if not invoice.invoice_number or not str(invoice.invoice_number).strip():
        flags.append(Flag(
            rule_code=RuleCode.MISSING_FIELD,
            severity=Severity.ERROR,
            field_name="invoice_number",
            message="Required field 'invoice_number' is missing or empty."
        ))

    if not invoice.supplier_name or not str(invoice.supplier_name).strip():
        flags.append(Flag(
            rule_code=RuleCode.MISSING_FIELD,
            severity=Severity.ERROR,
            field_name="supplier_name",
            message="Required field 'supplier_name' is missing or empty."
        ))

    if not invoice.invoice_date or not str(invoice.invoice_date).strip():
        flags.append(Flag(
            rule_code=RuleCode.MISSING_FIELD,
            severity=Severity.ERROR,
            field_name="invoice_date",
            message="Required field 'invoice_date' is missing or empty."
        ))

    if invoice.total is None:
        flags.append(Flag(
            rule_code=RuleCode.MISSING_FIELD,
            severity=Severity.ERROR,
            field_name="total",
            message="Required field 'total' is missing."
        ))

    if not invoice.line_items:
        flags.append(Flag(
            rule_code=RuleCode.MISSING_FIELD,
            severity=Severity.WARNING,
            field_name="line_items",
            message="Document contains no extracted line items."
        ))

    # 2. MATH_MISMATCH checks using Decimal
    # Subtotal + Tax vs Total
    if invoice.total is not None and invoice.subtotal is not None:
        try:
            total_dec = Decimal(str(invoice.total))
            subtotal_dec = Decimal(str(invoice.subtotal))
            tax_dec = Decimal(str(invoice.tax)) if invoice.tax is not None else Decimal("0.00")
            expected_total = subtotal_dec + tax_dec

            diff = abs(total_dec - expected_total)
            if diff > TOLERANCE:
                flags.append(Flag(
                    rule_code=RuleCode.MATH_MISMATCH,
                    severity=Severity.ERROR,
                    field_name="total",
                    message=f"Math mismatch: subtotal ({subtotal_dec:.2f}) + tax ({tax_dec:.2f}) = {expected_total:.2f}, but total is {total_dec:.2f} (diff: {diff:.2f})."
                ))
        except (InvalidOperation, ValueError):
            pass

    # Sum(line item amounts) vs Subtotal
    if invoice.subtotal is not None and invoice.line_items:
        try:
            subtotal_dec = Decimal(str(invoice.subtotal))
            item_amounts: List[Decimal] = []
            all_parseable = True

            for item in invoice.line_items:
                if item.amount is not None:
                    try:
                        item_amounts.append(Decimal(str(item.amount)))
                    except Exception:
                        all_parseable = False
                        break
                elif item.quantity is not None and item.unit_price is not None:
                    try:
                        calc_amt = Decimal(str(item.quantity)) * Decimal(str(item.unit_price))
                        item_amounts.append(round(calc_amt, 2))
                    except Exception:
                        all_parseable = False
                        break
                else:
                    all_parseable = False
                    break

            if all_parseable and item_amounts:
                sum_items = sum(item_amounts)
                diff = abs(subtotal_dec - sum_items)
                if diff > TOLERANCE:
                    flags.append(Flag(
                        rule_code=RuleCode.MATH_MISMATCH,
                        severity=Severity.ERROR,
                        field_name="subtotal",
                        message=f"Math mismatch: sum of line items ({sum_items:.2f}) does not equal subtotal ({subtotal_dec:.2f}) (diff: {diff:.2f})."
                    ))
        except Exception:
            pass

    # 3. DUPLICATE_INVOICE check
    dup_hash = compute_duplicate_hash(invoice.supplier_name, invoice.invoice_number, invoice.total)
    if dup_hash and existing_duplicate_hashes:
        if dup_hash in existing_duplicate_hashes:
            orig_doc_or_inv = existing_duplicate_hashes[dup_hash]
            flags.append(Flag(
                rule_code=RuleCode.DUPLICATE_INVOICE,
                severity=Severity.ERROR,
                field_name="duplicate_hash",
                message=f"Duplicate invoice detected. Matches existing invoice '{orig_doc_or_inv}' (supplier: {invoice.supplier_name}, number: {invoice.invoice_number}, total: {invoice.total:.2f})."
            ))

    return flags
