"""Deterministic, key-free mock extractor for tests, CI, and local evaluation."""

import re
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from dateutil import parser as date_parser

from app.contracts import ExtractionResult, InvoiceData, LineItemData

class MockExtractor:
    """Extracts structured invoice data deterministically using robust regex patterns."""

    def __init__(self, model_name: str = "mock-extractor"):
        self.model_name = model_name

    async def extract(self, chunk_text: str) -> ExtractionResult:
        text = chunk_text

        # 1. Invoice Number
        inv_no: Optional[str] = None
        inv_patterns = [
            re.compile(r"(?:invoice|inv|bill)\s*(?:no|number|num|#)?\s*[:#]\s*([A-Z0-9_-]{3,30})", re.IGNORECASE),
            re.compile(r"(?:invoice|inv|bill)\s+(?:no|number|num|#)\s*[:.\s]+([A-Z0-9_-]{3,30})", re.IGNORECASE),
            re.compile(r"#\s*([A-Z0-9_-]{4,30})\b", re.IGNORECASE),
        ]
        for pat in inv_patterns:
            m = pat.search(text)
            if m:
                cand = m.group(1).strip()
                if not re.match(r"^(?:date|due|terms|total|tax|bill|invoice)$", cand, re.IGNORECASE):
                    inv_no = cand.upper()
                    break

        # 2. Date
        inv_date: Optional[str] = None
        date_patterns = [
            re.compile(r"(?:invoice\s*date|date|billed\s*on)\s*[:.\s]*([A-Za-z0-9, /-]+)", re.IGNORECASE),
            re.compile(r"\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b"),
            re.compile(r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b", re.IGNORECASE),
            re.compile(r"\b(\d{1,2}[-/]\d{1,2}[-/]\d{4})\b"),
        ]
        for pat in date_patterns:
            m = pat.search(text)
            if m:
                stripped_lines = m.group(1).strip().splitlines()
                if not stripped_lines:
                    continue
                raw_d = stripped_lines[0].strip()
                if not raw_d:
                    continue
                try:
                    dt = date_parser.parse(raw_d, fuzzy=True).date()
                    inv_date = dt.strftime("%Y-%m-%d")
                    break
                except Exception:
                    continue

        # 3. Currency
        currency: Optional[str] = None
        if "$" in text or "USD" in text:
            currency = "USD"
        elif "€" in text or "EUR" in text:
            currency = "EUR"
        elif "£" in text or "GBP" in text:
            currency = "GBP"
        elif "৳" in text or "BDT" in text:
            currency = "BDT"

        # 4. Supplier & Customer
        supplier_name: Optional[str] = None
        supp_match = re.search(r"(?:from|vendor|supplier|company)\s*[:.\s]+([A-Za-z0-9 .,&'-]{3,40})", text, re.IGNORECASE)
        if supp_match:
            supplier_name = supp_match.group(1).strip()
        else:
            # Check common mock vendors
            for vendor in [
                "Apex Medical Supplies Inc",
                "Apex Medical",
                "Horizon Home Health Care",
                "CrossCare Medical Corp",
                "Sunrise Elderly Care Center",
                "Acme Medical Supply",
                "Global Healthcare Ltd",
                "CareFirst Supplies",
                "HomeCare Logistics",
                "MediEquip Global",
                "Pulse Medical",
            ]:
                if vendor.lower() in text.lower():
                    supplier_name = vendor
                    break
            if not supplier_name:
                # Top non-empty header line before invoice markers
                lines = [l.strip() for l in text.splitlines() if l.strip()]
                for l in lines[:3]:
                    if not re.search(r"(?:invoice|commercial|bill|page|date|#)", l, re.IGNORECASE):
                        supplier_name = l
                        break

        customer_name: Optional[str] = None
        cust_match = re.search(r"(?:bill\s*to|to|customer|client|patient)\s*[:.\s]+([A-Za-z0-9 .,&'-]{3,40})", text, re.IGNORECASE)
        if cust_match:
            customer_name = cust_match.group(1).strip()

        # 5. Amounts: Total, Subtotal, Tax
        total: Optional[float] = None
        subtotal: Optional[float] = None
        tax: Optional[float] = None

        total_patterns = [
            re.compile(r"\b(?:grand\s*total|total\s*amount\s*due|total\s*due|balance\s*due)\b\s*[:.\s]*[\$€£৳¥]?\s*([\d,]+(?:\.\d{2})?)", re.IGNORECASE),
            re.compile(r"\b(?:total)\b\s*[:.\s]*[\$€£৳¥]?\s*([\d,]+(?:\.\d{2})?)", re.IGNORECASE),
        ]
        for pat in total_patterns:
            total_match = pat.search(text)
            if total_match:
                try:
                    total = float(total_match.group(1).replace(",", ""))
                    break
                except Exception:
                    pass

        subtotal_match = re.search(r"\b(?:subtotal|sub-total|net\s*amount)\b\s*[:.\s]*[\$€£৳¥]?\s*([\d,]+(?:\.\d{2})?)", text, re.IGNORECASE)
        if subtotal_match:
            try:
                subtotal = float(subtotal_match.group(1).replace(",", ""))
            except Exception:
                pass

        tax_match = re.search(r"\b(?:tax|vat|gst)\b\s*[:.\s]*[\$€£৳¥]?\s*([\d,]+(?:\.\d{2})?)", text, re.IGNORECASE)
        if tax_match:
            try:
                tax = float(tax_match.group(1).replace(",", ""))
            except Exception:
                pass

        # 6. Line items heuristic
        line_items: List[LineItemData] = []
        # Pattern like: 2x Wheelchair $100.00 $200.00
        line_item_matches = re.findall(
            r"([A-Za-z0-9\s-]{4,30})\s+(\d+)\s+[\$€£৳¥]?\s*([\d,]+\.\d{2})\s+[\$€£৳¥]?\s*([\d,]+\.\d{2})",
            text
        )
        for desc, qty_str, uprice_str, amt_str in line_item_matches:
            try:
                line_items.append(LineItemData(
                    description=desc.strip(),
                    quantity=float(qty_str),
                    unit_price=float(uprice_str.replace(",", "")),
                    amount=float(amt_str.replace(",", ""))
                ))
            except Exception:
                pass

        invoice = InvoiceData(
            invoice_number=inv_no,
            invoice_date=inv_date,
            supplier_name=supplier_name,
            customer_name=customer_name,
            subtotal=subtotal,
            tax=tax,
            total=total,
            currency=currency,
            line_items=line_items
        )

        return ExtractionResult(
            invoice=invoice,
            confidence={"model_confidence": 0.95},
            model=self.model_name
        )
