"""Integration test for corrupted and invalid file isolation."""

import time
from pathlib import Path
import pytest
import httpx


@pytest.mark.integration
def test_unsupported_file_extension_rejected(require_api, client: httpx.Client):
    # Upload an unsupported file type (.exe)
    resp = client.post(
        "/api/documents",
        files={"files": ("malicious.exe", b"MZ\x90\x00\x03\x00\x00\x00")}
    )
    # Gateway must reject unsupported extensions with 415
    assert resp.status_code == 415 or (resp.status_code == 207 and len(resp.json().get("errors", [])) > 0)


@pytest.mark.integration
def test_corrupted_magic_bytes_isolated(require_api, client: httpx.Client, test_data_dir: Path):
    corrupt_file = test_data_dir / "inv_19_corrupt_bad_magic.pdf"
    with open(corrupt_file, "rb") as f:
        resp = client.post("/api/documents", files={"files": ("inv_19_corrupt_bad_magic.pdf", f)})

    # Either rejected upfront (415) or accepted and processed to FAILED
    if resp.status_code == 415:
        return

    assert resp.status_code in (200, 201, 207)
    doc_id = resp.json()["documents"][0]["id"]

    # Poll status: must become FAILED, never get stuck or crash queue
    for _ in range(30):
        status = client.get(f"/api/documents/{doc_id}/status").json().get("status")
        if status == "FAILED":
            break
        time.sleep(0.5)

    assert status == "FAILED"


@pytest.mark.integration
def test_truncated_pdf_isolated_without_crashing_subsequent_jobs(require_api, client: httpx.Client, test_data_dir: Path):
    trunc_file = test_data_dir / "inv_20_corrupt_truncated.pdf"
    clean_file = test_data_dir / "inv_02_clean.pdf"

    # Upload corrupt file followed by valid file
    with open(trunc_file, "rb") as f1, open(clean_file, "rb") as f2:
        resp = client.post(
            "/api/documents",
            files=[
                ("files", ("inv_20_corrupt_truncated.pdf", f1)),
                ("files", ("inv_02_clean.pdf", f2))
            ]
        )

    assert resp.status_code in (200, 201, 207)
    docs = resp.json().get("documents", [])
    assert len(docs) == 2

    id_corrupt = docs[0]["id"]
    id_clean = docs[1]["id"]

    # The clean file MUST complete successfully even though corrupt file failed
    poll_start = time.time()
    clean_completed = False
    corrupt_failed = False

    while time.time() - poll_start < 60:
        s1 = client.get(f"/api/documents/{id_corrupt}/status").json().get("status")
        s2 = client.get(f"/api/documents/{id_clean}/status").json().get("status")

        if s1 == "FAILED":
            corrupt_failed = True
        if s2 == "COMPLETED":
            clean_completed = True

        if clean_completed and corrupt_failed:
            break
        time.sleep(0.5)

    assert corrupt_failed, f"Corrupted document should have status FAILED, got {s1}"
    assert clean_completed, f"Subsequent clean document should complete normally, got {s2}"
