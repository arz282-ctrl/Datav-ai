import pytest
import openpyxl
import xlwt
from app.parsers.spreadsheet_parser import parse_spreadsheet
from app.contracts import CorruptedDocumentError, CorruptedDocumentErrorCode

@pytest.mark.unit
def test_parse_csv(tmp_path):
    csv_file = str(tmp_path / "ledger.csv")
    csv_content = """Invoice No,Vendor,Date,Grand Total,Currency,Notes
INV-101,Acme Medical,2026-03-15,1250.00,USD,Urgent delivery
INV-102,Global Health,2026-03-16,450.50,EUR,Routine supplies
"""
    with open(csv_file, "w", encoding="utf-8") as f:
        f.write(csv_content)

    rows, preview = parse_spreadsheet(csv_file)
    assert len(rows) == 2
    assert rows[0].invoice_number == "INV-101"
    assert rows[0].supplier_name == "Acme Medical"
    assert rows[0].total_amount == 1250.00
    assert rows[0].currency == "USD"
    assert "Notes" in rows[0].raw_row
    assert "INV-101" in preview

@pytest.mark.unit
def test_parse_xlsx(tmp_path):
    xlsx_file = str(tmp_path / "ledger.xlsx")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Invoices"
    ws.append(["Doc Number", "Payee", "Inv Date", "Total", "Currency"])
    ws.append(["INV-900", "Care Supplies", "2026-04-01", 3400.75, "USD"])
    wb.save(xlsx_file)

    rows, preview = parse_spreadsheet(xlsx_file)
    assert len(rows) == 1
    assert rows[0].invoice_number == "INV-900"
    assert rows[0].supplier_name == "Care Supplies"
    assert rows[0].total_amount == 3400.75
    assert rows[0].currency == "USD"

@pytest.mark.unit
def test_parse_xls(tmp_path):
    xls_file = str(tmp_path / "ledger.xls")
    wb = xlwt.Workbook()
    ws = wb.add_sheet("Ledger")
    headers = ["Invoice #", "Vendor Name", "Date", "Amount", "Currency"]
    for c, h in enumerate(headers):
        ws.write(0, c, h)
    row_data = ["INV-888", "Home Care Inc", "2026-05-10", 780.20, "USD"]
    for c, v in enumerate(row_data):
        ws.write(1, c, v)
    wb.save(xls_file)

    rows, preview = parse_spreadsheet(xls_file)
    assert len(rows) == 1
    assert rows[0].invoice_number == "INV-888"
    assert rows[0].total_amount == 780.20
