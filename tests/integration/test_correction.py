"""Integration test for manual correction, audit trail, and revalidation."""

import time
from pathlib import Path
import pytest
import httpx


@pytest.mark.integration
def test_manual_correction_and_revalidation(require_api, client: httpx.Client, test_data_dir: Path):
    # Upload clean invoice first
    doc_path = test_data_dir / "inv_01_clean.pdf"
    with open(doc_path, "rb") as f:
        resp = client.post("/api/documents", files={"files": ("inv_01_clean.pdf", f)})
    assert resp.status_code in (200, 201, 207)
    doc_id = resp.json()["documents"][0]["id"]

    # Poll until completed
    for _ in range(60):
        s = client.get(f"/api/documents/{doc_id}/status").json().get("status")
        if s == "COMPLETED":
            break
        time.sleep(0.5)

    # Patch manual correction (edit supplier name and mark human_verified)
    patch_payload = {
        "corrections": {
            "supplier_name": "Apex Medical Supplies Incorporated (Verified)",
            "total": 1350.00
        },
        "reason": "Corrected legal entity suffix after review"
    }
    c_resp = client.patch(f"/api/documents/{doc_id}/correct", json=patch_payload)
    # CONTRACT: Either 200 (completed within 5s waitUntilFinished) or 202 (pending revalidation)
    assert c_resp.status_code in (200, 202), f"Correction returned unexpected status: {c_resp.status_code}"

    if c_resp.status_code == 202:
        # Await revalidation completion
        for _ in range(30):
            status = client.get(f"/api/documents/{doc_id}/status").json().get("status")
            if status in ("COMPLETED", "NEEDS_REVIEW"):
                break
            time.sleep(0.5)

    # Verify detail and audit log
    detail = client.get(f"/api/documents/{doc_id}").json()
    extracted = detail.get("extracted", {})
    assert "Verified" in extracted.get("supplier_name", "")
    assert extracted.get("human_verified") is True

    # Audit log check
    audit_logs = detail.get("audit_logs", [])
    assert len(audit_logs) > 0, "Audit trail must record correction"
    assert any("Verified" in str(log.get("details", "")) for log in audit_logs)
