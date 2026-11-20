#!/usr/bin/env python3
"""Deterministic synthetic dataset generator for AI Document Intelligence.
Generates 20 realistic medical and home-care invoices, scans, multi-sheet spreadsheets,
ledgers, validation edge cases, and corrupted files.
Outputs:
  - tests/data/documents/ (the 20 files)
  - tests/data/labels.json (ground-truth metadata and expected validation flags)
"""

import json
import os
import random
import sys
from decimal import Decimal
from pathlib import Path
import numpy as np

try:
    import pymupdf as fitz
except ImportError:
    import fitz

import cv2
from PIL import Image, ImageDraw, ImageFont
import openpyxl
import xlwt

# Seed for reproducibility
random.seed(42)
np.random.seed(42)

DOCS_DIR = Path("tests/data/documents")
LABELS_PATH = Path("tests/data/labels.json")


def create_digital_pdf(path: Path, invoice_data: dict, extra_pages: int = 0):
    """Create a crisp digital PDF using PyMuPDF."""
    doc = fitz.open()
    total_pages = 1 + extra_pages

    for p in range(1, total_pages + 1):
        page = doc.new_page(width=595, height=842)
        lines = [
            invoice_data["supplier_name"].upper(),
            "1200 Healthcare Drive, Suite 300, Minneapolis, MN 55401",
            "Phone: (888) 555-0144 | contact@medical-supplies.org",
            "",
            "COMMERCIAL INVOICE",
            "=" * 70,
            f"Invoice Number: {invoice_data['invoice_number']}" if invoice_data.get("invoice_number") else "Invoice Number: [NOT SPECIFIED]",
            f"Invoice Date:   {invoice_data['invoice_date']}" if invoice_data.get("invoice_date") else "Invoice Date:   [NOT SPECIFIED]",
            f"Payment Terms:  Net 30 Days",
            f"Page:           {p} of {total_pages}",
            "",
            "CUSTOMER / BILL TO:",
            f"  {invoice_data['customer_name']}",
            "  Attn: Accounts Payable & Purchasing",
            "  450 Meadowbrook Senior Living Blvd",
            "  St. Paul, MN 55104",
            "",
            "ITEMIZED CHARGES:",
            "-" * 70,
            f"{'Description':<40} {'Qty':>5} {'Unit Price':>10} {'Amount':>10}",
            "-" * 70,
        ]

        for item in invoice_data.get("line_items", []):
            desc = item["description"][:38]
            qty = item["quantity"]
            unit = f"${item['unit_price']:.2f}"
            amt = f"${item['total_price']:.2f}"
            lines.append(f"{desc:<40} {qty:>5} {unit:>10} {amt:>10}")

        lines.extend([
            "-" * 70,
            "",
            "ACCOUNTING SUMMARY:",
            f"  Subtotal:          ${invoice_data['subtotal']:.2f} {invoice_data['currency']}",
            f"  Sales Tax:         ${invoice_data['tax']:.2f} {invoice_data['currency']}",
            f"  TOTAL AMOUNT DUE:  ${invoice_data['total']:.2f} {invoice_data['currency']}",
            "",
            "=" * 70,
            "Remit Payment to: Apex Healthcare Logistics Bank",
            "Routing: 091000019 | Account: 4400192837 | SWIFT: APEXUS44",
            "Thank you for choosing us for quality patient care supplies!",
        ])

        page.insert_text(fitz.Point(40, 50), "\n".join(lines), fontsize=9, fontname="courier")

    doc.save(str(path), garbage=3, deflate=True)
    doc.close()


def create_degraded_scan_pdf(path: Path, invoice_data: dict, degradation_type: str = "blur"):
    """Create a PDF rendered from a degraded image (simulating mobile camera or dirty scanner)."""
    # 1. Render clean PDF first in memory
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    lines = [
        invoice_data["supplier_name"].upper(),
        "Medical Equipment & Diagnostics Distribution",
        "=" * 60,
        f"INVOICE NUMBER: {invoice_data['invoice_number']}",
        f"DATE: {invoice_data['invoice_date']}",
        f"BILL TO: {invoice_data['customer_name']}",
        "-" * 60,
    ]
    for item in invoice_data.get("line_items", []):
        lines.append(f"{item['description']} x{item['quantity']} @ ${item['unit_price']:.2f} = ${item['total_price']:.2f}")
    lines.extend([
        "-" * 60,
        f"Subtotal: ${invoice_data['subtotal']:.2f}",
        f"Tax: ${invoice_data['tax']:.2f}",
        f"Total Amount: ${invoice_data['total']:.2f} {invoice_data['currency']}",
        "=" * 60,
    ])
    page.insert_text(fitz.Point(40, 50), "\n".join(lines), fontsize=10, fontname="helv")

    pix = page.get_pixmap(dpi=150)
    img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
    if pix.n == 4:
        img_data = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR)
    elif pix.n == 3:
        img_data = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
    doc.close()

    # 2. Apply degradation
    if degradation_type == "blur":
        # Gaussian blur simulating out-of-focus phone camera
        img_data = cv2.GaussianBlur(img_data, (5, 5), 1.5)
    elif degradation_type == "skew":
        # Slight rotation (3 degrees)
        h, w = img_data.shape[:2]
        M = cv2.getRotationMatrix2D((w // 2, h // 2), 3.0, 1.0)
        img_data = cv2.warpAffine(img_data, M, (w, h), borderValue=(255, 255, 255))
    elif degradation_type == "noise":
        # Gaussian noise
        noise = np.random.normal(0, 12, img_data.shape).astype(np.float32)
        noisy = np.clip(img_data.astype(np.float32) + noise, 0, 255).astype(np.uint8)
        img_data = noisy

    # 3. Save as PDF via fitz with JPEG compression
    success, encoded = cv2.imencode(".jpg", img_data, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    scan_doc = fitz.open()
    img_rect = fitz.Rect(0, 0, 595, 842)
    scan_page = scan_doc.new_page(width=595, height=842)
    scan_page.insert_image(img_rect, stream=encoded.tobytes())
    scan_doc.save(str(path), garbage=3, deflate=True)
    scan_doc.close()


def create_multiframe_tiff(path: Path, invoice_data: dict):
    """Create a 2-page multi-frame TIFF invoice."""
    images = []
    for page_idx in range(1, 3):
        img = Image.new("RGB", (800, 1050), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        text = f"""{invoice_data['supplier_name']}
Medical Equipment Care Group - Multi-Frame TIFF
------------------------------------------------------------
Invoice Number: {invoice_data['invoice_number']}
Invoice Date:   {invoice_data['invoice_date']}
Page:           {page_idx} of 2
Customer:       {invoice_data['customer_name']}

Page {page_idx} Item Details:
  - Hospital Bed Electric Motor Model-{page_idx}00 : $2,000.00
  - Bed Rail Safety Clamp Set                 : $800.00

SUMMARY:
  Subtotal: ${invoice_data['subtotal']:.2f}
  Tax:      ${invoice_data['tax']:.2f}
  Total:    ${invoice_data['total']:.2f} {invoice_data['currency']}
"""
        draw.text((40, 50), text, fill=(0, 0, 0))
        images.append(img)

    images[0].save(
        str(path),
        save_all=True,
        append_images=images[1:],
        compression="tiff_deflate"
    )


def create_multisheet_xlsx(path: Path, invoice_data: dict):
    """Create a multi-sheet XLSX invoice workbook."""
    wb = openpyxl.Workbook()
    # Sheet 1: Summary
    ws1 = wb.active
    ws1.title = "Invoice Summary"
    ws1.append(["Document Type", "Commercial Invoice"])
    ws1.append(["Vendor Name", invoice_data["supplier_name"]])
    ws1.append(["Invoice Number", invoice_data["invoice_number"]])
    ws1.append(["Invoice Date", invoice_data["invoice_date"]])
    ws1.append(["Client Name", invoice_data["customer_name"]])
    ws1.append([])
    ws1.append(["Subtotal", invoice_data["subtotal"]])
    ws1.append(["Tax Amount", invoice_data["tax"]])
    ws1.append(["Total Amount", invoice_data["total"]])
    ws1.append(["Currency", invoice_data["currency"]])

    # Sheet 2: Items
    ws2 = wb.create_sheet(title="Line Items")
    ws2.append(["Item #", "Description", "Quantity", "Unit Price", "Total Price"])
    for idx, item in enumerate(invoice_data.get("line_items", []), 1):
        ws2.append([idx, item["description"], item["quantity"], item["unit_price"], item["total_price"]])

    # Sheet 3: Metadata
    ws3 = wb.create_sheet(title="Audit Log")
    ws3.append(["System", "Healthcare SAP Connector"])
    ws3.append(["Export Date", "2026-02-15"])

    wb.save(str(path))


def create_legacy_xls(path: Path, invoice_data: dict):
    """Create a legacy Excel XLS file using xlwt."""
    wb = xlwt.Workbook()
    ws = wb.add_sheet("Invoice")
    ws.write(0, 0, "Supplier Name")
    ws.write(0, 1, invoice_data["supplier_name"])
    ws.write(1, 0, "Invoice Number")
    ws.write(1, 1, invoice_data["invoice_number"])
    ws.write(2, 0, "Invoice Date")
    ws.write(2, 1, invoice_data["invoice_date"])
    ws.write(3, 0, "Customer Name")
    ws.write(3, 1, invoice_data["customer_name"])
    ws.write(4, 0, "Subtotal")
    ws.write(4, 1, float(invoice_data["subtotal"]))
    ws.write(5, 0, "Tax")
    ws.write(5, 1, float(invoice_data["tax"]))
    ws.write(6, 0, "Total")
    ws.write(6, 1, float(invoice_data["total"]))
    ws.write(7, 0, "Currency")
    ws.write(7, 1, invoice_data["currency"])

    wb.save(str(path))


def create_csv_ledger(path: Path, rows: list):
    """Create a CSV transaction ledger for cross-verification."""
    with open(path, "w", encoding="utf-8") as f:
        f.write("entry_id,vendor_name,document_reference,transaction_date,amount,currency,status\n")
        for r in rows:
            f.write(f"{r['entry_id']},{r['vendor_name']},{r['document_reference']},{r['transaction_date']},{r['amount']},{r['currency']},{r['status']}\n")


def generate_all():
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    LABELS_PATH.parent.mkdir(parents=True, exist_ok=True)

    labels = {}

    # 1. Clean PDF #1
    inv_1 = {
        "invoice_number": "INV-2026-001",
        "invoice_date": "2026-01-15",
        "supplier_name": "Apex Medical Supplies Inc",
        "customer_name": "Sunrise Elderly Care Center",
        "subtotal": 1250.00,
        "tax": 100.00,
        "total": 1350.00,
        "currency": "USD",
        "line_items": [
            {"description": "Wheelchair Footrest Replacement Pair", "quantity": 5, "unit_price": 150.00, "total_price": 750.00},
            {"description": "Pressure Relief Seat Cushions", "quantity": 10, "unit_price": 50.00, "total_price": 500.00},
        ],
        "expected_flags": []
    }
    create_digital_pdf(DOCS_DIR / "inv_01_clean.pdf", inv_1)
    labels["inv_01_clean.pdf"] = inv_1

    # 2. Clean PDF #2
    inv_2 = {
        "invoice_number": "INV-2026-002",
        "invoice_date": "2026-01-20",
        "supplier_name": "Horizon Home Health Care",
        "customer_name": "Beacon Hospice Care",
        "subtotal": 2600.00,
        "tax": 240.00,
        "total": 2840.00,
        "currency": "USD",
        "line_items": [
            {"description": "Portable Oxygen Concentrator Filter Set", "quantity": 20, "unit_price": 80.00, "total_price": 1600.00},
            {"description": "Nasal Cannula Soft Dip 7ft (Case 50)", "quantity": 10, "unit_price": 100.00, "total_price": 1000.00},
        ],
        "expected_flags": []
    }
    create_digital_pdf(DOCS_DIR / "inv_02_clean.pdf", inv_2)
    labels["inv_02_clean.pdf"] = inv_2

    # 3. Clean PDF #3
    inv_3 = {
        "invoice_number": "INV-2026-003",
        "invoice_date": "2026-01-28",
        "supplier_name": "MediEquip Solutions LLC",
        "customer_name": "Oakwood Care Center",
        "subtotal": 3750.50,
        "tax": 375.00,
        "total": 4125.50,
        "currency": "USD",
        "line_items": [
            {"description": "Hydraulic Patient Lift Sling Mesh XL", "quantity": 3, "unit_price": 450.00, "total_price": 1350.00},
            {"description": "Bedside Commode Chair Heavy Duty", "quantity": 12, "unit_price": 200.04, "total_price": 2400.50},
        ],
        "expected_flags": []
    }
    create_digital_pdf(DOCS_DIR / "inv_03_clean.pdf", inv_3)
    labels["inv_03_clean.pdf"] = inv_3

    # 4. Clean PDF #4
    inv_4 = {
        "invoice_number": "INV-2026-004",
        "invoice_date": "2026-02-02",
        "supplier_name": "CareFirst Diagnostic Supplies",
        "customer_name": "St. Jude Elderly Clinic",
        "subtotal": 800.00,
        "tax": 90.00,
        "total": 890.00,
        "currency": "USD",
        "line_items": [
            {"description": "Blood Glucose Test Strips (Box 100)", "quantity": 20, "unit_price": 40.00, "total_price": 800.00},
        ],
        "expected_flags": []
    }
    create_digital_pdf(DOCS_DIR / "inv_04_clean.pdf", inv_4)
    labels["inv_04_clean.pdf"] = inv_4

    # 5. Clean PDF #5
    inv_5 = {
        "invoice_number": "INV-2026-005",
        "invoice_date": "2026-02-05",
        "supplier_name": "Sterling Mobility Services",
        "customer_name": "Golden Years Retreat",
        "subtotal": 3150.00,
        "tax": 300.00,
        "total": 3450.00,
        "currency": "USD",
        "line_items": [
            {"description": "Motorized Wheelchair Lithium Battery 24V", "quantity": 3, "unit_price": 1050.00, "total_price": 3150.00},
        ],
        "expected_flags": []
    }
    create_digital_pdf(DOCS_DIR / "inv_05_clean.pdf", inv_5)
    labels["inv_05_clean.pdf"] = inv_5

    # 6. Degraded Scan (Blur)
    inv_6 = {
        "invoice_number": "INV-2026-006",
        "invoice_date": "2026-02-08",
        "supplier_name": "Prime Health Logistics",
        "customer_name": "Valley Nursing Home",
        "subtotal": 1500.00,
        "tax": 120.00,
        "total": 1620.00,
        "currency": "USD",
        "line_items": [
            {"description": "Sterile Surgical Gowns XL (Case 50)", "quantity": 10, "unit_price": 150.00, "total_price": 1500.00},
        ],
        "expected_flags": []
    }
    create_degraded_scan_pdf(DOCS_DIR / "inv_06_scan_blur.pdf", inv_6, degradation_type="blur")
    labels["inv_06_scan_blur.pdf"] = inv_6

    # 7. Degraded Scan (Skew PNG)
    inv_7 = {
        "invoice_number": "INV-2026-007",
        "invoice_date": "2026-02-10",
        "supplier_name": "BioCare Disposable Supplies",
        "customer_name": "Serenity Senior Care",
        "subtotal": 950.00,
        "tax": 76.00,
        "total": 1026.00,
        "currency": "USD",
        "line_items": [
            {"description": "Latex Examination Gloves Medium (Box 100)", "quantity": 50, "unit_price": 19.00, "total_price": 950.00},
        ],
        "expected_flags": []
    }
    # Create PNG
    img = Image.new("RGB", (800, 1000), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    text_7 = f"""BIOCARE DISPOSABLE SUPPLIES
Medical Disposables & Hygiene Products
Invoice Number: {inv_7['invoice_number']}
Date: {inv_7['invoice_date']}
Bill To: {inv_7['customer_name']}
--------------------------------------------------
Latex Exam Gloves x50 : $950.00
Subtotal: $950.00
Tax: $76.00
Total: $1,026.00 USD
"""
    draw.text((50, 60), text_7, fill=(0, 0, 0))
    # Rotate slightly
    img = img.rotate(2.5, expand=False, fillcolor=(255, 255, 255))
    img.save(DOCS_DIR / "inv_07_scan_skew.png")
    labels["inv_07_scan_skew.png"] = inv_7

    # 8. Degraded Scan (Noisy PDF)
    inv_8 = {
        "invoice_number": "INV-2026-008",
        "invoice_date": "2026-02-12",
        "supplier_name": "Vanguard Medical Systems",
        "customer_name": "Lakeside Medical Clinic",
        "subtotal": 2100.00,
        "tax": 189.00,
        "total": 2289.00,
        "currency": "USD",
        "line_items": [
            {"description": "Vital Signs Monitor Stand Rolling Base", "quantity": 6, "unit_price": 350.00, "total_price": 2100.00},
        ],
        "expected_flags": []
    }
    create_degraded_scan_pdf(DOCS_DIR / "inv_08_scan_noisy.pdf", inv_8, degradation_type="noise")
    labels["inv_08_scan_noisy.pdf"] = inv_8

    # 9. Multi-frame TIFF
    inv_9 = {
        "invoice_number": "INV-2026-009",
        "invoice_date": "2026-02-14",
        "supplier_name": "Allied Care Equipment",
        "customer_name": "Maplewood Senior Living",
        "subtotal": 5600.00,
        "tax": 0.00,
        "total": 5600.00,
        "currency": "USD",
        "line_items": [
            {"description": "Hospital Bed Electric Motor", "quantity": 2, "unit_price": 2000.00, "total_price": 4000.00},
            {"description": "Bed Rail Safety Clamp Set", "quantity": 2, "unit_price": 800.00, "total_price": 1600.00},
        ],
        "expected_flags": []
    }
    create_multiframe_tiff(DOCS_DIR / "inv_09_multiframe.tiff", inv_9)
    labels["inv_09_multiframe.tiff"] = inv_9

    # 10. Multi-page Clean PDF (3 pages)
    inv_10 = {
        "invoice_number": "INV-2026-010",
        "invoice_date": "2026-02-16",
        "supplier_name": "Comprehensive Senior Health Supplies",
        "customer_name": "St. Paul Regional Medical Center",
        "subtotal": 7200.00,
        "tax": 650.00,
        "total": 7850.00,
        "currency": "USD",
        "line_items": [
            {"description": "Air Mattresses Alternating Pressure System", "quantity": 6, "unit_price": 1200.00, "total_price": 7200.00},
        ],
        "expected_flags": []
    }
    create_digital_pdf(DOCS_DIR / "inv_10_multipage.pdf", inv_10, extra_pages=2)
    labels["inv_10_multipage.pdf"] = inv_10

    # 11. Multi-sheet XLSX
    inv_11 = {
        "invoice_number": "INV-2026-011",
        "invoice_date": "2026-02-18",
        "supplier_name": "Elite Mobility Systems",
        "customer_name": "Pine Crest Assisted Living",
        "subtotal": 1950.00,
        "tax": 150.00,
        "total": 2100.00,
        "currency": "USD",
        "line_items": [
            {"description": "Aluminum Folding Walkers with Wheels", "quantity": 30, "unit_price": 65.00, "total_price": 1950.00},
        ],
        "expected_flags": []
    }
    create_multisheet_xlsx(DOCS_DIR / "inv_11_multisheet.xlsx", inv_11)
    labels["inv_11_multisheet.xlsx"] = inv_11

    # 12. Legacy XLS
    inv_12 = {
        "invoice_number": "INV-2026-012",
        "invoice_date": "2026-02-20",
        "supplier_name": "Medline Regional Partners",
        "customer_name": "Riverview Rehab Clinic",
        "subtotal": 1600.00,
        "tax": 150.00,
        "total": 1750.00,
        "currency": "USD",
        "line_items": [],
        "expected_flags": []
    }
    create_legacy_xls(DOCS_DIR / "inv_12_legacy.xls", inv_12)
    labels["inv_12_legacy.xls"] = inv_12

    # 13. CSV Ledger for cross-verification
    ledger_rows = [
        {"entry_id": "L-101", "vendor_name": "Apex Medical Supplies Inc", "document_reference": "INV-2026-001", "transaction_date": "2026-01-15", "amount": 1350.00, "currency": "USD", "status": "APPROVED"},
        {"entry_id": "L-102", "vendor_name": "Horizon Home Health Care", "document_reference": "INV-2026-002", "transaction_date": "2026-01-20", "amount": 2840.00, "currency": "USD", "status": "APPROVED"},
        {"entry_id": "L-103", "vendor_name": "CrossCare Medical Corp", "document_reference": "INV-2026-018", "transaction_date": "2026-02-25", "amount": 2500.00, "currency": "USD", "status": "PENDING"},
    ]
    create_csv_ledger(DOCS_DIR / "inv_13_ledger.csv", ledger_rows)
    labels["inv_13_ledger.csv"] = {
        "type": "ledger",
        "row_count": len(ledger_rows),
        "expected_flags": []
    }

    # 14. Excel Ledger
    wb_ledger = openpyxl.Workbook()
    ws_l = wb_ledger.active
    ws_l.title = "General Ledger"
    ws_l.append(["Vendor", "Reference", "Date", "Amount", "Currency"])
    ws_l.append(["MediEquip Solutions LLC", "INV-2026-003", "2026-01-28", 4125.50, "USD"])
    ws_l.append(["CareFirst Diagnostic Supplies", "INV-2026-004", "2026-02-02", 890.00, "USD"])
    wb_ledger.save(str(DOCS_DIR / "inv_14_ledger.xlsx"))
    labels["inv_14_ledger.xlsx"] = {
        "type": "ledger",
        "row_count": 2,
        "expected_flags": []
    }

    # 15. Math Mismatch Invoice (Subtotal 1000 + Tax 100 != Total 1250)
    inv_15 = {
        "invoice_number": "INV-2026-015",
        "invoice_date": "2026-02-22",
        "supplier_name": "Erroneous Health Corp",
        "customer_name": "Community Hospice",
        "subtotal": 1000.00,
        "tax": 100.00,
        "total": 1250.00,  # 1000 + 100 != 1250! Math mismatch!
        "currency": "USD",
        "line_items": [
            {"description": "Defective Oxygen Monitor Set", "quantity": 5, "unit_price": 200.00, "total_price": 1000.00},
        ],
        "expected_flags": ["MATH_MISMATCH"]
    }
    create_digital_pdf(DOCS_DIR / "inv_15_math_mismatch.pdf", inv_15)
    labels["inv_15_math_mismatch.pdf"] = inv_15

    # 16. Missing Field Invoice (Missing invoice_date)
    inv_16 = {
        "invoice_number": "INV-2026-016",
        "invoice_date": None,  # Intentionally missing!
        "supplier_name": "Incomplete Supplies LLC",
        "customer_name": "St. Marys Home Care",
        "subtotal": 500.00,
        "tax": 50.00,
        "total": 550.00,
        "currency": "USD",
        "line_items": [
            {"description": "Disposable Bed Protectors (Box 200)", "quantity": 10, "unit_price": 50.00, "total_price": 500.00},
        ],
        "expected_flags": ["MISSING_FIELD"]
    }
    create_digital_pdf(DOCS_DIR / "inv_16_missing_field.pdf", inv_16)
    labels["inv_16_missing_field.pdf"] = inv_16

    # 17. Duplicate Invoice (Exact duplicate of inv_01)
    inv_17 = {
        "invoice_number": "INV-2026-001",  # Same as inv_01!
        "invoice_date": "2026-01-15",
        "supplier_name": "Apex Medical Supplies Inc",  # Same vendor!
        "customer_name": "Sunrise Elderly Care Center",
        "subtotal": 1250.00,
        "tax": 100.00,
        "total": 1350.00,  # Same total!
        "currency": "USD",
        "line_items": [
            {"description": "Wheelchair Footrest Replacement Pair", "quantity": 5, "unit_price": 150.00, "total_price": 750.00},
            {"description": "Pressure Relief Seat Cushions", "quantity": 10, "unit_price": 50.00, "total_price": 500.00},
        ],
        "expected_flags": ["DUPLICATE_INVOICE"]
    }
    create_digital_pdf(DOCS_DIR / "inv_17_duplicate.pdf", inv_17)
    labels["inv_17_duplicate.pdf"] = inv_17

    # 18. Cross-Verification Mismatch
    # Ledger row L-103 expects amount 2500.00, but invoice says 3200.00!
    inv_18 = {
        "invoice_number": "INV-2026-018",
        "invoice_date": "2026-02-25",
        "supplier_name": "CrossCare Medical Corp",
        "customer_name": "Sunrise Elderly Care Center",
        "subtotal": 3000.00,
        "tax": 200.00,
        "total": 3200.00,  # Mismatch with ledger 2500.00!
        "currency": "USD",
        "line_items": [
            {"description": "Patient Monitoring Sensor Units", "quantity": 10, "unit_price": 300.00, "total_price": 3000.00},
        ],
        "expected_flags": ["CROSS_VERIFY_MISMATCH"]
    }
    create_digital_pdf(DOCS_DIR / "inv_18_cross_mismatch.pdf", inv_18)
    labels["inv_18_cross_mismatch.pdf"] = inv_18

    # 19. Corrupted File: Wrong magic bytes / fake PDF
    with open(DOCS_DIR / "inv_19_corrupt_bad_magic.pdf", "wb") as f:
        f.write(b"THIS IS NOT A VALID PDF FILE. Plain text masquerading as a PDF binary.")
    labels["inv_19_corrupt_bad_magic.pdf"] = {
        "type": "corrupted",
        "expected_flags": ["CORRUPTED_DOCUMENT"],
        "error_code": "CORRUPTED_MAGIC_BYTES"
    }

    # 20. Corrupted File: Truncated valid PDF header
    with open(DOCS_DIR / "inv_20_corrupt_truncated.pdf", "wb") as f:
        f.write(b"%PDF-1.4\n%EOF\n" + b"\x00\xff" * 30)  # Valid header, broken stream
    labels["inv_20_corrupt_truncated.pdf"] = {
        "type": "corrupted",
        "expected_flags": ["CORRUPTED_DOCUMENT"],
        "error_code": "CORRUPTED_STREAM"
    }

    # Write labels.json
    with open(LABELS_PATH, "w", encoding="utf-8") as f:
        json.dump(labels, f, indent=2)

    print(f"Generated 20 synthetic documents in {DOCS_DIR}/")
    print(f"Saved ground truth labels to {LABELS_PATH}")


if __name__ == "__main__":
    generate_all()
