"""Integration test for cross-verification between invoices and spreadsheet ledgers."""

import time
from pathlib import Path
import pytest
import httpx


@pytest.mark.integration
def test_cross_verify_invoice_and_ledger(require_api, client: httpx.Client, test_data_dir: Path):
    ledger_path = test_data_dir / "inv_13_ledger.csv"
    mismatch_path = test_data_dir / "inv_18_cross_mismatch.pdf"

    # 1. Upload ledger first
    with open(ledger_path, "rb") as f_l:
        r_l = client.post("/api/documents", files={"files": ("inv_13_ledger.csv", f_l)})
    assert r_l.status_code in (200, 201, 207)
    ledger_id = r_l.json()["documents"][0]["id"]

    for _ in range(60):
        s = client.get(f"/api/documents/{ledger_id}/status").json().get("status")
        if s == "COMPLETED":
            break
        time.sleep(0.5)

    # 2. Upload mismatch invoice (INV-2026-018: amount $3,200 vs ledger $2,500)
    with open(mismatch_path, "rb") as f_m:
        r_m = client.post("/api/documents", files={"files": ("inv_18_cross_mismatch.pdf", f_m)})
    assert r_m.status_code in (200, 201, 207)
    mismatch_id = r_m.json()["documents"][0]["id"]

    for _ in range(60):
        s = client.get(f"/api/documents/{mismatch_id}/status").json().get("status")
        if s in ("COMPLETED", "NEEDS_REVIEW"):
            break
        time.sleep(0.5)

    # 3. Check flags on mismatch invoice
    d_m = client.get(f"/api/documents/{mismatch_id}").json()
    flags = [f.get("rule_code") for f in d_m.get("flags", [])]
    assert "CROSS_VERIFY_MISMATCH" in flags, f"Expected CROSS_VERIFY_MISMATCH flag, got: {flags}"
