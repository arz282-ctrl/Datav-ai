"""Integration test for document search (keyword and semantic fallback)."""

import time
from pathlib import Path
import pytest
import httpx


@pytest.mark.integration
def test_search_documents(require_api, client: httpx.Client, test_data_dir: Path):
    # Upload clean invoice to ensure there is searchable data
    doc_path = test_data_dir / "inv_01_clean.pdf"
    with open(doc_path, "rb") as f:
        resp = client.post("/api/documents", files={"files": ("inv_01_clean.pdf", f)})
    assert resp.status_code in (200, 201, 207)
    doc_id = resp.json()["documents"][0]["id"]

    # Await completion
    for _ in range(60):
        s = client.get(f"/api/documents/{doc_id}/status").json().get("status")
        if s == "COMPLETED":
            break
        time.sleep(0.5)

    # Search query
    search_resp = client.get("/api/documents/search", params={"q": "Apex"})
    assert search_resp.status_code == 200, f"Search failed: {search_resp.text}"

    results = search_resp.json()
    items = results.get("results", [])
    assert len(items) > 0, "Search should return matching documents"

    first = items[0]
    assert "id" in first
    assert "filename" in first
    # Search mode degradation check
    assert "mode" in results, "Search response must indicate search mode ('hybrid' or 'keyword_only')"
