"""Integration test for mixed concurrent batch uploads."""

import time
from pathlib import Path
import pytest
import httpx


@pytest.mark.integration
def test_mixed_batch_upload_concurrency(require_api, client: httpx.Client, test_data_dir: Path):
    batch_files = [
        "inv_03_clean.pdf",
        "inv_07_scan_skew.png",
        "inv_11_multisheet.xlsx",
        "inv_15_math_mismatch.pdf",
    ]

    files_payload = []
    file_handles = []
    try:
        for fn in batch_files:
            fp = test_data_dir / fn
            assert fp.exists()
            fh = open(fp, "rb")
            file_handles.append(fh)
            files_payload.append(("files", (fn, fh)))

        resp = client.post("/api/documents", files=files_payload)
        assert resp.status_code in (200, 201, 207)
        docs = resp.json().get("documents", [])
        assert len(docs) == len(batch_files)

        # Poll all documents in the batch
        doc_ids = [d["id"] for d in docs]
        completed = set()

        start = time.time()
        while time.time() - start < 90:
            for d_id in doc_ids:
                if d_id not in completed:
                    st = client.get(f"/api/documents/{d_id}/status").json().get("status")
                    if st in ("COMPLETED", "NEEDS_REVIEW"):
                        completed.add(d_id)

            if len(completed) == len(doc_ids):
                break
            time.sleep(1.0)

        assert len(completed) == len(doc_ids), f"Not all batch items finished: {len(completed)}/{len(doc_ids)}"

    finally:
        for fh in file_handles:
            fh.close()
