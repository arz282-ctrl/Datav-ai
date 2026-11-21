"""Spreadsheet parser for XLSX, XLS, and CSV files with header detection and alias mapping."""

import csv
import os
import re
from datetime import datetime, date
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
import openpyxl
import xlrd
from dateutil import parser as date_parser

from app.contracts import LedgerRowData, CorruptedDocumentError, CorruptedDocumentErrorCode

HEADER_ALIASES = {
    "invoice_number": [
        "invoice_number", "invoice_no", "inv_no", "inv_num", "invoice#", "inv#", 
        "bill_no", "bill_number", "document_no", "doc_no", "doc_number", "document_number",
        "doc_num", "doc#", "invoice", "document_reference", "document_ref", "doc_reference",
        "doc_ref", "reference_no", "reference_number", "ref_no", "ref_num", "ref#", "reference"
    ],
    "supplier_name": [
        "supplier_name", "supplier", "vendor_name", "vendor", "payee", "seller", 
        "company_name", "company", "biller", "contractor"
    ],
    "invoice_date": [
        "invoice_date", "inv_date", "date", "bill_date", "doc_date", "transaction_date"
    ],
    "total_amount": [
        "total_amount", "grand_total", "total", "amount", "invoice_total", 
        "net_total", "balance_due", "billed_amount", "gross_amount"
    ],
    "currency": [
        "currency", "curr", "ccy", "currency_code"
    ],
}

def _clean_str(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()

def _normalize_header(header: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", header.strip().lower())
    return s.strip("_")

def _map_headers(headers: List[str]) -> Dict[str, int]:
    mapping: Dict[str, int] = {}
    normalized = [_normalize_header(h) for h in headers]

    for target_field, aliases in HEADER_ALIASES.items():
        for alias in aliases:
            for idx, norm_h in enumerate(normalized):
                if norm_h == alias or alias in norm_h:
                    if target_field not in mapping:
                        mapping[target_field] = idx
                        break
            if target_field in mapping:
                break
    return mapping

def _parse_date_to_iso(val: Any) -> Optional[str]:
    if not val:
        return None
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    try:
        dt = date_parser.parse(s, fuzzy=True)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None

def _parse_amount(val: Any) -> Optional[float]:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float, Decimal)):
        return round(float(val), 2)
    s = str(val).strip().replace(",", "")
    s = re.sub(r"[^\d.-]", "", s)
    try:
        return round(float(s), 2)
    except Exception:
        return None

def _parse_csv(path: str) -> Tuple[List[LedgerRowData], str]:
    # Sniff encoding: utf-8, utf-8-sig, latin-1
    content_bytes = open(path, "rb").read()
    if not content_bytes:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.EMPTY_FILE, "CSV file is empty")

    encoding = "utf-8"
    for enc in ["utf-8-sig", "utf-8", "latin-1"]:
        try:
            content_text = content_bytes.decode(enc)
            encoding = enc
            break
        except UnicodeDecodeError:
            continue
    else:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.CORRUPT_SPREADSHEET, "Unable to decode CSV text encoding")

    # Sniff delimiter
    sample = content_text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample)
        delimiter = dialect.delimiter
    except Exception:
        delimiter = "," if "," in sample else "\t"

    lines = content_text.splitlines()
    reader = csv.reader(lines, delimiter=delimiter)
    all_rows = [row for row in reader if any(cell.strip() for cell in row)]

    if not all_rows:
        return [], ""

    # Find header row
    header_idx = 0
    best_match_count = 0
    for idx, row in enumerate(all_rows[:15]):
        matches = len(_map_headers(row))
        if matches > best_match_count:
            best_match_count = matches
            header_idx = idx

    headers = [h.strip() for h in all_rows[header_idx]]
    mapping = _map_headers(headers)

    records: List[LedgerRowData] = []
    plain_lines = ["\t".join(headers)]

    for row_idx, row in enumerate(all_rows[header_idx + 1:], start=1):
        raw_row: Dict[str, Any] = {}
        for c_idx, cell in enumerate(row):
            col_name = headers[c_idx] if c_idx < len(headers) else f"col_{c_idx}"
            raw_row[col_name] = cell.strip()

        inv_num = row[mapping["invoice_number"]].strip() if "invoice_number" in mapping and mapping["invoice_number"] < len(row) else None
        supp = row[mapping["supplier_name"]].strip() if "supplier_name" in mapping and mapping["supplier_name"] < len(row) else None
        dt_val = row[mapping["invoice_date"]] if "invoice_date" in mapping and mapping["invoice_date"] < len(row) else None
        amt_val = row[mapping["total_amount"]] if "total_amount" in mapping and mapping["total_amount"] < len(row) else None
        curr = row[mapping["currency"]].strip() if "currency" in mapping and mapping["currency"] < len(row) else None

        records.append(LedgerRowData(
            row_index=row_idx,
            sheet_name="Sheet1",
            invoice_number=inv_num or None,
            invoice_date=_parse_date_to_iso(dt_val),
            supplier_name=supp or None,
            total_amount=_parse_amount(amt_val),
            currency=curr or None,
            raw_row=raw_row
        ))
        plain_lines.append("\t".join(row))

    return records, "\n".join(plain_lines)

def _parse_xlsx(path: str) -> Tuple[List[LedgerRowData], str]:
    try:
        wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    except Exception as e:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.CORRUPT_SPREADSHEET, f"Invalid XLSX workbook: {str(e)}")

    records: List[LedgerRowData] = []
    plain_lines: List[str] = []
    global_row_index = 1

    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]
        sheet_rows = []
        for r in sheet.iter_rows(values_only=True):
            if any(c is not None and str(c).strip() != "" for c in r):
                sheet_rows.append([_clean_str(c) for c in r])

        if not sheet_rows:
            continue

        header_idx = 0
        best_match_count = 0
        for idx, row in enumerate(sheet_rows[:15]):
            m = len(_map_headers(row))
            if m > best_match_count:
                best_match_count = m
                header_idx = idx

        headers = sheet_rows[header_idx]
        mapping = _map_headers(headers)
        plain_lines.append(f"--- Sheet: {sheet_name} ---")
        plain_lines.append("\t".join(headers))

        for row in sheet_rows[header_idx + 1:]:
            raw_row = {headers[c_idx] if c_idx < len(headers) else f"col_{c_idx}": val for c_idx, val in enumerate(row)}
            inv_num = row[mapping["invoice_number"]] if "invoice_number" in mapping and mapping["invoice_number"] < len(row) else None
            supp = row[mapping["supplier_name"]] if "supplier_name" in mapping and mapping["supplier_name"] < len(row) else None
            dt_val = row[mapping["invoice_date"]] if "invoice_date" in mapping and mapping["invoice_date"] < len(row) else None
            amt_val = row[mapping["total_amount"]] if "total_amount" in mapping and mapping["total_amount"] < len(row) else None
            curr = row[mapping["currency"]] if "currency" in mapping and mapping["currency"] < len(row) else None

            records.append(LedgerRowData(
                row_index=global_row_index,
                sheet_name=sheet_name,
                invoice_number=inv_num or None,
                invoice_date=_parse_date_to_iso(dt_val),
                supplier_name=supp or None,
                total_amount=_parse_amount(amt_val),
                currency=curr or None,
                raw_row=raw_row
            ))
            plain_lines.append("\t".join(row))
            global_row_index += 1

    wb.close()
    return records, "\n".join(plain_lines)

def _parse_xls(path: str) -> Tuple[List[LedgerRowData], str]:
    try:
        wb = xlrd.open_workbook(path)
    except Exception as e:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.CORRUPT_SPREADSHEET, f"Invalid XLS workbook: {str(e)}")

    records: List[LedgerRowData] = []
    plain_lines: List[str] = []
    global_row_index = 1

    for sheet in wb.sheets():
        if sheet.nrows == 0:
            continue
        sheet_rows = []
        for r_idx in range(sheet.nrows):
            row_vals = [sheet.cell_value(r_idx, c_idx) for c_idx in range(sheet.ncols)]
            if any(v is not None and str(v).strip() != "" for v in row_vals):
                sheet_rows.append([_clean_str(v) for v in row_vals])

        if not sheet_rows:
            continue

        header_idx = 0
        best_match_count = 0
        for idx, row in enumerate(sheet_rows[:15]):
            m = len(_map_headers(row))
            if m > best_match_count:
                best_match_count = m
                header_idx = idx

        headers = sheet_rows[header_idx]
        mapping = _map_headers(headers)
        plain_lines.append(f"--- Sheet: {sheet.name} ---")
        plain_lines.append("\t".join(headers))

        for row in sheet_rows[header_idx + 1:]:
            raw_row = {headers[c_idx] if c_idx < len(headers) else f"col_{c_idx}": val for c_idx, val in enumerate(row)}
            inv_num = row[mapping["invoice_number"]] if "invoice_number" in mapping and mapping["invoice_number"] < len(row) else None
            supp = row[mapping["supplier_name"]] if "supplier_name" in mapping and mapping["supplier_name"] < len(row) else None
            dt_val = row[mapping["invoice_date"]] if "invoice_date" in mapping and mapping["invoice_date"] < len(row) else None
            amt_val = row[mapping["total_amount"]] if "total_amount" in mapping and mapping["total_amount"] < len(row) else None
            curr = row[mapping["currency"]] if "currency" in mapping and mapping["currency"] < len(row) else None

            records.append(LedgerRowData(
                row_index=global_row_index,
                sheet_name=sheet.name,
                invoice_number=inv_num or None,
                invoice_date=_parse_date_to_iso(dt_val),
                supplier_name=supp or None,
                total_amount=_parse_amount(amt_val),
                currency=curr or None,
                raw_row=raw_row
            ))
            plain_lines.append("\t".join(row))
            global_row_index += 1

    return records, "\n".join(plain_lines)

def parse_spreadsheet(path: str) -> Tuple[List[LedgerRowData], str]:
    """Parses XLSX, XLS, or CSV spreadsheets into LedgerRowData items and text preview."""
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.EMPTY_FILE, "Spreadsheet file is empty or missing")

    ext = os.path.splitext(path)[1].lower()
    if ext == ".csv":
        return _parse_csv(path)
    elif ext == ".xlsx":
        return _parse_xlsx(path)
    elif ext == ".xls":
        return _parse_xls(path)
    else:
        raise CorruptedDocumentError(CorruptedDocumentErrorCode.UNSUPPORTED_TYPE, f"Unsupported spreadsheet format: {ext}")
