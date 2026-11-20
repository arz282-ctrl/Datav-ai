#!/usr/bin/env python3
"""Generate a synthetic ~1,000-page digital PDF for volume and memory testing.
Uses PyMuPDF (pymupdf) for fast generation without high memory overhead.
Output path: tests/data/generated/invoice_1000p.pdf
"""

import os
import sys
import time
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:
    import fitz


def generate_1000p_pdf(output_path: str = "tests/data/generated/invoice_1000p.pdf", target_pages: int = 1000) -> str:
    start_time = time.time()
    dest = Path(output_path)
    dest.parent.mkdir(parents=True, exist_ok=True)

    print(f"Generating {target_pages}-page PDF at {dest}...")
    doc = fitz.open()

    # Pre-define sample text template
    items = [
        ("Nitrile Medical Examination Gloves (Box of 100)", 10, 14.50, 145.00),
        ("Disposable Surgical Masks Type IIR (50pk)", 20, 8.25, 165.00),
        ("Sterile Hypodermic Needles 21G (Box 100)", 5, 22.00, 110.00),
        ("Digital Clinical Thermometer Probe Covers", 15, 6.00, 90.00),
        ("Antiseptic Chlorhexidine Solution 500ml", 8, 11.25, 90.00),
    ]

    for page_num in range(1, target_pages + 1):
        page = doc.new_page(width=595, height=842)  # Standard A4
        subtotal = 600.00
        tax = 60.00
        total = 660.00

        text = f"""GLOBAL HEALTHCARE SUPPLY CHAIN CORP
100 Industrial Parkway, Suite 400, Chicago, IL 60601
Phone: (800) 555-0199 | Tax ID: 36-9876543

INVOICE
================================================================================
Invoice Number: INV-VOL-{page_num:05d}
Invoice Date:   2026-02-15
Due Date:       2026-03-15
PO Number:      PO-MED-{page_num + 10000}
Page:           {page_num} of {target_pages}

BILL TO:
Metro Care Health System
Department of Patient Logistics
450 Community Hospital Road
Chicago, IL 60614

LINE ITEMS:
--------------------------------------------------------------------------------
Item Description                               Qty   Unit Price   Total Price
--------------------------------------------------------------------------------
1. Nitrile Medical Gloves (Box 100)            10       $14.50       $145.00
2. Disposable Surgical Masks (50pk)            20        $8.25       $165.00
3. Sterile Hypodermic Needles 21G               5       $22.00       $110.00
4. Digital Clinical Thermometer Covers         15        $6.00        $90.00
5. Antiseptic Chlorhexidine Solution 500ml      8       $11.25        $90.00
--------------------------------------------------------------------------------

SUMMARY:
--------------------------------------------------------------------------------
Subtotal: $600.00
Sales Tax (10%): $60.00
TOTAL AMOUNT DUE: $660.00 USD

Payment Terms: Net 30 days. Remit to: payments@globalhealthsupply.com
Bank: First National Commercial Bank | Routing: 071000013 | Account: 987654321
Thank you for your partnership in providing patient healthcare!
"""
        # Insert text onto page
        page.insert_text(fitz.Point(50, 60), text, fontsize=9, fontname="courier")

    # Save with compression
    doc.save(str(dest), garbage=3, deflate=True)
    doc.close()

    elapsed = round(time.time() - start_time, 2)
    file_size_mb = round(dest.stat().st_size / (1024 * 1024), 2)
    print(f"Successfully generated {target_pages}-page PDF!")
    print(f"  File: {dest} ({file_size_mb} MB)")
    print(f"  Time taken: {elapsed} seconds")
    return str(dest)


if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
    generate_1000p_pdf(target_pages=count)
