"""Integration test for document upload and status polling."""

import time
from pathlib import Path
import pytest
import httpx


@pytest.mark.integration
def test_upload_and_process_clean_invoice(require_api, client: httpx.Client, test_data_dir: Path):
    doc_path = test_data_dir / "inv_01_clean.pdf"
    assert doc_path.exists(), f"Sample file {doc_path} must exist"

    # 1. Upload
    with open(doc_path, "rb") as f:
        resp = client.post("/api/documents", files={"files": ("inv_01_clean.pdf", f)})
    assert resp.status_code in (200, 201, 207), f"Upload failed: {resp.text}"

    data = resp.json()
    docs = data.get("documents", [])
    assert len(docs) > 0, "Response must contain created document"
    doc_id = docs[0]["id"]
    assert doc_id, "Document ID must not be empty"

    # 2. Poll status until terminal state (COMPLETED or FAILED)
    poll_start = time.time()
    final_status = None
    while time.time() - poll_start < 60:
        s_resp = client.get(f"/api/documents/{doc_id}/status")
        assert s_resp.status_code == 200
        status_info = s_resp.json()
        status = status_info.get("status")
        if status in ("COMPLETED", "FAILED"):
            final_status = status
            break
        time.sleep(1.0)

    assert final_status == "COMPLETED", f"Document failed to process: {final_status}"

    # 3. Retrieve document detail
    d_resp = client.get(f"/api/documents/{doc_id}")
    assert d_resp.status_code == 200
    detail = d_resp.json()

    extracted = detail.get("extracted", {})
    assert extracted.get("invoice_number") == "INV-2026-001"
    assert extracted.get("total") == 1350.00 or extracted.get("total") == "1350.00"
    assert "Apex" in str(extracted.get("supplier_name", ""))
