"""Format-aware grounding engine verifying LLM extracted values against raw source text."""

import re
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from dateutil import parser as date_parser
from rapidfuzz import fuzz

from app.contracts import (
    ExtractionResult,
    InvoiceData,
    LineItemData,
    Flag,
    RuleCode,
    Severity
)

# ---------------------------------------------------------------------------
# Currency Normalization Map
# ---------------------------------------------------------------------------
CURRENCY_MAP = {
    "$": "USD",
    "USD": "$",
    "€": "EUR",
    "EUR": "€",
    "£": "GBP",
    "GBP": "£",
    "৳": "BDT",
    "BDT": "৳",
    "¥": "JPY",
    "JPY": "¥",
    "C$": "CAD",
    "CAD": "C$",
    "A$": "AUD",
    "AUD": "A$",
}

CURRENCY_KEYWORDS = {
    "USD": ["USD", "$", "DOLLAR", "DOLLARS"],
    "EUR": ["EUR", "€", "EURO", "EUROS"],
    "GBP": ["GBP", "£", "POUND", "POUNDS"],
    "BDT": ["BDT", "৳", "TAKA"],
    "CAD": ["CAD", "C$"],
    "AUD": ["AUD", "A$"],
    "JPY": ["JPY", "¥", "YEN"],
}

# ---------------------------------------------------------------------------
# 1. Number Normalizer & Grounding
# ---------------------------------------------------------------------------
def normalize_number_str(s: str) -> str:
    """Removes commas, spaces, currency symbols from a numeric string."""
    cleaned = re.sub(r"[\s,\$€£৳¥]", "", s)
    return cleaned

def is_number_grounded(val: float, text: str, tolerance: float = 0.001) -> bool:
    """Checks if a float value exists in text, accounting for formatting variations (1,250.00 == 1250 == 1250.0)."""
    if val is None:
        return True

    val_dec = Decimal(str(val))
    # Look for candidate numbers in text
    candidates = re.findall(r"[-+]?\d+(?:[,\s]\d+)*(?:\.\d+)?", text)
    for cand in candidates:
        cleaned = normalize_number_str(cand)
        if cleaned:
            try:
                c_dec = Decimal(cleaned)
                if abs(c_dec - val_dec) <= Decimal(str(tolerance)):
                    return True
            except Exception:
                continue
    return False

# ---------------------------------------------------------------------------
# 2. Date Normalizer & Grounding
# ---------------------------------------------------------------------------
DATE_CANDIDATE_REGEX = re.compile(
    r"\b(?:\d{1,4}[-/. ]\d{1,2}[-/. ]\d{1,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.,]?\s+\d{1,2}(?:st|nd|rd|th)?[.,]?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.,]?\s+\d{4})\b",
    re.IGNORECASE
)

def is_date_grounded(iso_date: str, text: str) -> bool:
    """Validates if an extracted ISO date (YYYY-MM-DD) is grounded in source text by trying dayfirst and monthfirst."""
    if not iso_date:
        return True

    try:
        target_dt = datetime.strptime(iso_date, "%Y-%m-%d").date()
    except Exception:
        return False

    candidates = DATE_CANDIDATE_REGEX.findall(text)
    for cand in candidates:
        # Try month-first then day-first
        for dayfirst in [False, True]:
            try:
                dt = date_parser.parse(cand, dayfirst=dayfirst, fuzzy=False).date()
                if dt == target_dt:
                    return True
            except Exception:
                pass
    return False

# ---------------------------------------------------------------------------
# 3. Currency Grounding
# ---------------------------------------------------------------------------
def is_currency_grounded(curr: str, text: str) -> bool:
    """Verifies that the currency code or its symbol appears in the source text."""
    if not curr:
        return True

    code = curr.strip().upper()
    keywords = CURRENCY_KEYWORDS.get(code, [code])
    for kw in keywords:
        pattern = re.escape(kw)
        if re.search(r"(?:^|[\s\d.,;:\(\)])" + pattern + r"(?:$|[\s\d.,;:\(\)])", text, re.IGNORECASE):
            return True
    return False

# ---------------------------------------------------------------------------
# 4. Text & Identifier Fuzzy Grounding
# ---------------------------------------------------------------------------
def is_invoice_number_grounded(inv_no: str, text: str) -> bool:
    """Matches invoice numbers exactly after stripping common punctuation separators (- _ / space # . :)."""
    if not inv_no:
        return True

    clean_target = re.sub(r"[-_/\s#.:]", "", inv_no).upper()
    if not clean_target:
        return False

    clean_text = re.sub(r"[-_/\s#.:]", "", text).upper()
    return clean_target in clean_text

def is_name_grounded(name: str, text: str, threshold: int = 90) -> bool:
    """Matches company or supplier names using fuzzy matching (rapidfuzz partial_ratio >= 90)."""
    if not name:
        return True

    norm_name = " ".join(name.strip().lower().split())
    norm_text = " ".join(text.strip().lower().split())

    # Exact substring
    if norm_name in norm_text:
        return True

    # RapidFuzz partial ratio
    score = fuzz.partial_ratio(norm_name, norm_text)
    return score >= threshold

# ---------------------------------------------------------------------------
# Line Items Grounding
# ---------------------------------------------------------------------------
def ground_line_item(item: LineItemData, text: str) -> Tuple[LineItemData, bool]:
    valid = True
    if item.amount is not None and not is_number_grounded(item.amount, text):
        item.amount = None
        valid = False
    if item.unit_price is not None and not is_number_grounded(item.unit_price, text):
        item.unit_price = None
        valid = False
    if item.description and not is_name_grounded(item.description, text, threshold=80):
        # Allow partial description or keep as is if amount is grounded
        pass
    return item, valid

# ---------------------------------------------------------------------------
# Comprehensive Grounding Function
# ---------------------------------------------------------------------------
def ground(
    result: ExtractionResult,
    chunk_text: str,
    human_verified: bool = False
) -> Tuple[ExtractionResult, List[Flag]]:
    """Format-aware grounding check.
    Unfound non-null values are set to null and emit UNGROUNDED_VALUE flags.
    If human_verified is True, grounding checks are skipped.
    """
    flags: List[Flag] = []
    if human_verified:
        return result, flags

    inv = result.invoice
    conf = dict(result.confidence or {})

    # 1. Invoice Number
    if inv.invoice_number is not None:
        if not is_invoice_number_grounded(inv.invoice_number, chunk_text):
            flags.append(Flag(
                rule_code=RuleCode.UNGROUNDED_VALUE,
                severity=Severity.WARNING,
                field_name="invoice_number",
                message=f"Invoice number '{inv.invoice_number}' could not be grounded in source text and was nulled."
            ))
            inv.invoice_number = None
            conf["invoice_number"] = {"grounded": False, "score": 0.0}
        else:
            conf["invoice_number"] = {"grounded": True, "score": 1.0}

    # 2. Invoice Date
    if inv.invoice_date is not None:
        if not is_date_grounded(inv.invoice_date, chunk_text):
            flags.append(Flag(
                rule_code=RuleCode.UNGROUNDED_VALUE,
                severity=Severity.WARNING,
                field_name="invoice_date",
                message=f"Invoice date '{inv.invoice_date}' could not be grounded in source text and was nulled."
            ))
            inv.invoice_date = None
            conf["invoice_date"] = {"grounded": False, "score": 0.0}
        else:
            conf["invoice_date"] = {"grounded": True, "score": 1.0}

    # 3. Supplier Name
    if inv.supplier_name is not None:
        if not is_name_grounded(inv.supplier_name, chunk_text, threshold=90):
            flags.append(Flag(
                rule_code=RuleCode.UNGROUNDED_VALUE,
                severity=Severity.WARNING,
                field_name="supplier_name",
                message=f"Supplier name '{inv.supplier_name}' could not be grounded in source text and was nulled."
            ))
            inv.supplier_name = None
            conf["supplier_name"] = {"grounded": False, "score": 0.0}
        else:
            conf["supplier_name"] = {"grounded": True, "score": 1.0}

    # 4. Customer Name
    if inv.customer_name is not None:
        if not is_name_grounded(inv.customer_name, chunk_text, threshold=85):
            flags.append(Flag(
                rule_code=RuleCode.UNGROUNDED_VALUE,
                severity=Severity.WARNING,
                field_name="customer_name",
                message=f"Customer name '{inv.customer_name}' could not be grounded in source text and was nulled."
            ))
            inv.customer_name = None
            conf["customer_name"] = {"grounded": False, "score": 0.0}
        else:
            conf["customer_name"] = {"grounded": True, "score": 1.0}

    # 5. Currency
    if inv.currency is not None:
        if not is_currency_grounded(inv.currency, chunk_text):
            flags.append(Flag(
                rule_code=RuleCode.UNGROUNDED_VALUE,
                severity=Severity.WARNING,
                field_name="currency",
                message=f"Currency '{inv.currency}' could not be grounded in source text and was nulled."
            ))
            inv.currency = None
            conf["currency"] = {"grounded": False, "score": 0.0}
        else:
            conf["currency"] = {"grounded": True, "score": 1.0}

    # 6. Amounts: Subtotal, Tax, Total
    for amount_field in ["subtotal", "tax", "total"]:
        val = getattr(inv, amount_field)
        if val is not None:
            if not is_number_grounded(val, chunk_text):
                flags.append(Flag(
                    rule_code=RuleCode.UNGROUNDED_VALUE,
                    severity=Severity.WARNING,
                    field_name=amount_field,
                    message=f"Amount field '{amount_field}' with value '{val}' could not be grounded in source text and was nulled."
                ))
                setattr(inv, amount_field, None)
                conf[amount_field] = {"grounded": False, "score": 0.0}
            else:
                conf[amount_field] = {"grounded": True, "score": 1.0}

    # 7. Line Items
    grounded_items: List[LineItemData] = []
    for item in inv.line_items:
        g_item, is_valid = ground_line_item(item, chunk_text)
        grounded_items.append(g_item)
    inv.line_items = grounded_items

    result.confidence = conf
    return result, flags
