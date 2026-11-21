# AI-Powered Document Intelligence System

An enterprise-grade document extraction, cross-verification, and auditing platform built with **FastAPI (Python 3.11)**, **Express (Node 20 LTS)**, **Next.js 15 (React 19)**, **PostgreSQL 16 with pgvector**, and **BullMQ on Redis**.

---

## Key Capabilities

- **Multi-Format Ingestion:** Handles digital PDF, degraded scans (JPG/PNG/TIFF), multi-sheet spreadsheets (XLSX, XLS), and CSV accounting exports. Streamed parsing via PyMuPDF scales up to 1,000+ pages without memory bloat.
- **OCR with Computer Vision:** OpenCV pre-processing pipeline (grayscale, OSD orientation detection, skew correction, bilateral filtering, Otsu binarization) feeding Tesseract OCR.
- **Structured JSON Extraction:** Leverages Google GenAI Gemini models with strict Pydantic schemas, prompt-injection defense (`<untrusted_document>` tagging), and automatic fallback routing.
- **Format-Aware Grounding (Zero Hallucination Tolerance):** Deterministic post-extraction verification of numbers, dates, currencies, and names against source tokens. Ungrounded values are nulled and flagged with `UNGROUNDED_VALUE`.
- **Deterministic Validation & Cross-Verification:** Checks missing fields, line item balance, math discrepancy (`subtotal + tax == total` within 0.01 tolerance), duplicate invoice hashing, and cross-verification between invoices and spreadsheet ledgers.
- **Dual-Queue Architecture:** Segregated BullMQ queues on Redis: `docint:ingest` (long jobs, concurrency 2) and `docint:revalidate` (short jobs, concurrency 4).
- **Interactive Review Dashboard:** Next.js 15 dashboard featuring drag-and-drop batch upload, real-time status polling, split-pane document inspector with raw chunk viewing, inline human correction with synchronous revalidation, and hybrid search.

---

## Architecture Overview

```
                      +-----------------------------+
                      |   Next.js 15 Web Dashboard  |
                      |   (React 19, Tailwind CSS)   |
                      +--------------+--------------+
                                     |
                          API Proxy (credentials)
                                     v
                      +-----------------------------+
                      |   Node 20 Express API (:4000)|
                      |  (Multer, Magic Bytes, Auth)|
                      +-------+--------------+------+
                              |              |
                      Ingest Jobs      Revalidate Jobs
                              |              |
                              v              v
                 +--------------------------------+
                 |    Redis 7+ (BullMQ Queues)    |
                 | docint:ingest  docint:revalidate|
                 +----------------+---------------+
                                  |
                           Worker Jobs
                                  v
                      +-----------------------------+
                      | Python 3.11 FastAPI Worker  |
                      | (:8001 / Internal API)      |
                      |  - OpenCV & Tesseract OCR   |
                      |  - Gemini Structured Extr.  |
                      |  - Grounding & Validator    |
                      |  - pgvector Embeddings      |
                      +-------+--------------+------+
                              |              |
                              v              v
+-----------------------------+    +-----------------------------+
|    PostgreSQL 16 + pgvector |    |       Google GenAI          |
|    (Port 5432)              |    | (Gemini 3.8 Flash / Pro)    |
+-----------------------------+    +-----------------------------+
```

---

## Quickstart with Docker Compose

### 1. Prerequisites
- Docker Engine 24+ and Docker Compose 2.20+ (or Colima on macOS)
- A Google Gemini API Key (place in `.env`)

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here
```

### 3. Spin Up the Stack
```bash
docker compose up --build -d
```

### 4. Verify Services
- **Web Dashboard:** `http://localhost:3000`
- **Express API Health:** `http://localhost:4000/health`
- **Python Worker Health:** `http://localhost:8001/health`
- **Postgres Database:** `localhost:5432` (`docintel_user` / `docintel_password_change_me`)
- **Redis Queue:** `localhost:6379`

To view container logs:
```bash
docker compose logs -f
```

---

## API Reference

All requests to the Node.js API require the `X-API-Key` header (default in development: `docintel-test-api-key-2026-secure-token`).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health check (API, Redis, Postgres) |
| `POST` | `/api/documents` | Multipart upload (accepts up to 20 files: PDF, PNG, JPG, TIFF, XLSX, XLS, CSV) |
| `GET` | `/api/documents` | List paginated documents with filtering by status/type |
| `GET` | `/api/documents/:id` | Get document details, raw chunks, extracted fields, validation flags, and audit logs |
| `GET` | `/api/documents/:id/status`| Poll job progress and terminal status (`COMPLETED`, `NEEDS_REVIEW`, `FAILED`) |
| `PATCH`| `/api/documents/:id/correct`| Apply human correction, record audit log, and synchronously re-validate (5s timeout / 202) |
| `POST` | `/api/documents/:id/reprocess`| Clear flags and re-enqueue document for full extraction |
| `GET` | `/api/documents/search` | Hybrid vector + full-text search with keyword-only fallback |

---

## Testing & Quality Assurance

### Run Unit Tests
No API key required (runs against local deterministic mock models):
```bash
# In Python virtualenv
pytest tests/unit -v
```

### Run Integration Tests
Runs end-to-end tests against the running service stack:
```bash
pytest tests/integration -v
```

### Run 20-Document Benchmark
Evaluates precision, recall, math validation recall, and latency on the 20-document dataset:
```bash
# 1. Generate test dataset (if not already present)
python scripts/generate_dataset.py

# 2. Run benchmark harness (supports --runs N, defaults to 1)
python scripts/run_benchmark.py --runs 3
```

### 1,000-Page Volume Test
Tests streaming parser memory efficiency and throughput on a 1,000-page document:
```bash
python scripts/generate_1000p_pdf.py 1000
```

---

## Security & Governance

1. **Prompt Injection Defense:** Untrusted input is strictly segregated within `<untrusted_document>` delimiters. System instructions enforce that prompts inside documents cannot override system instructions.
2. **Timing-Safe Auth:** API authentication employs `crypto.timingSafeEqual` to prevent timing side-channel attacks on API tokens.
3. **Magic-Byte Sniffing:** Uploads are inspected for binary magic bytes to prevent extension spoofing.
4. **Least-Privilege Containers:** All Docker containers execute under non-root UID/GID `10001:10001`.
5. **No Secrets in Source:** No API credentials or keys are committed to version control.

---

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Detailed component architecture, sequence diagrams, and ER schemas.
- [docs/CONTRACTS.md](docs/CONTRACTS.md): API payloads, schemas, error codes, and BullMQ queue smoke test findings.
- [docs/AI_DISCLOSURE.md](docs/AI_DISCLOSURE.md): Complete disclosure of prompts, models, and grounding logic.
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md): 4-minute demonstration script.
