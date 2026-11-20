"""Shared test configuration, fixtures, and connection helpers."""

import os
from pathlib import Path
import pytest
import httpx

API_BASE_URL = os.environ.get("API_URL", "http://localhost:4000")
API_KEY = os.environ.get("API_KEY", "dev_secret_key_12345")


@pytest.fixture(scope="session")
def api_url() -> str:
    return API_BASE_URL.rstrip("/")


@pytest.fixture(scope="session")
def api_headers() -> dict:
    return {
        "X-API-Key": API_KEY,
    }


@pytest.fixture(scope="session")
def is_api_running(api_url: str) -> bool:
    """Check if the API server is reachable."""
    try:
        resp = httpx.get(f"{api_url}/health", timeout=2.0)
        return resp.status_code == 200
    except Exception:
        return False


@pytest.fixture(scope="session")
def require_api(is_api_running: bool):
    """Skip test if API server is not running."""
    if not is_api_running:
        pytest.skip(f"API server is not running at {API_BASE_URL}. Run 'docker compose up' or local dev stack to run integration tests.")


@pytest.fixture(scope="session")
def test_data_dir() -> Path:
    return Path(__file__).parent / "data" / "documents"


@pytest.fixture(scope="session")
def client(api_url: str, api_headers: dict) -> httpx.Client:
    with httpx.Client(base_url=api_url, headers=api_headers, timeout=30.0) as client:
        yield client
