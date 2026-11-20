# System Contracts & API Specifications

This document defines the shared interfaces, queue contracts, data structures, and REST API shapes for the AI Document Intelligence System. All sub-agents code against these exact interfaces.

---

## 1. BullMQ & Queue Architecture

### Queue Configuration
- **Prefix:** `docint`
- **Ingest Queue:** `docint:ingest`
  - Purpose: Long-running ingestion, OCR, chunking, LLM extraction, grounding, embedding, and initial validation.
  - Concurrency: 2 workers
- **Revalidate Queue:** `docint:revalidate`
  - Purpose: Short-running deterministic revalidation, cross-verification recalculation, and flag updates.
  - Concurrency: 4 workers
  - Priority: Fast-path execution; slow ingests must never block revalidations.

### Job Payloads & Results

#### Ingest Job
**Payload:**
```json
{
  "documentId": "uuid-string",
  "storedPath": "/data/uploads/<uuid>.<ext>",
  "fileExt": "pdf | png | jpg | jpeg | tiff | tif | xlsx | xls | csv",
  "originalName": "invoice_123.pdf"
}
```
**Outcome:** Updates PostgreSQL `documents` row status (`PROCESSING` -> `VERIFIED` | `NEEDS_REVIEW` | `FAILED`) and `processing_jobs.progress_pct`.

#### Revalidate Job
**Payload:**
```json
{
  "documentId": "uuid-string",
  "invoiceIds": ["optional-uuid-string"],
  "reason": "manual_correction" | "ledger_added" | "reprocess"
}
```
**Return Value:**
```json
{
  "status": "VERIFIED" | "NEEDS_REVIEW" | "FAILED",
  "flagCount": 0
}
```

---

## 2. Worker Python Interface (`services/worker/app/contracts.py`)

### Pure Function Signatures

#### Agent-1: Ingestion & OCR
```python
def iter_pdf_pages(path: str) -> Iterator[PageText]:
    """Streams PyMuPDF pages. Rasterizes pages with < 30 chars for Tesseract OCR."""
    ...

def parse_image(path: str) -> List[PageText]:
    """Parses JPG, PNG, and multi-frame TIFF with OpenCV preprocessing & Tesseract."""
    ...

def parse_spreadsheet(path: str) -> Tuple[List[LedgerRowData], str]:
    """Parses XLSX/XLS/CSV sheets, extracts ledger rows, and returns (rows, plain_text_preview)."""
    ...

def segment_pages(pages: Iterable[PageText]) -> Iterator[Chunk]:
    """Segments pages into semantic invoice chunks bounded by 20 pages or 60,000 characters."""
    ...

class OCREngine(Protocol):
    def image_to_text(self, img: np.ndarray) -> OCRResult: ...
```

#### Agent-2: Extractor & Grounding
```python
class Extractor(Protocol):
    async def extract(self, chunk_text: str) -> ExtractionResult:
        """Extracts structured invoice JSON using Gemini with temperature=0 and response_schema, or mock."""
        ...

def ground(result: ExtractionResult, chunk_text: str) -> Tuple[ExtractionResult, List[Flag]]:
    """Checks extracted values against raw text. Unfound values are nulled and flagged UNGROUNDED_VALUE."""
    ...

async def embed_texts(texts: List[str], task_type: str = "RETRIEVAL_DOCUMENT") -> List[List[float]]:
    """Generates L2-normalized 1536-dimensional vectors using gemini-embedding-001."""
    ...
```

#### Agent-3: Validation & Pipeline
```python
def validate_invoice(invoice: InvoiceData, raw_text: str) -> List[Flag]:
    """Evaluates MISSING_FIELD, MATH_MISMATCH, and tolerance checks."""
    ...

def cross_verify(
    invoice: InvoiceData,
    invoice_id: str,
    ledger_rows: List[LedgerRowData],
    other_invoices: List[Tuple[str, InvoiceData]]
) -> Tuple[List[CrossVerifyLink], List[Flag]]:
    """Cross-verifies against spreadsheet ledger rows and other extracted invoices."""
    ...

async def run_ingest(job_data: IngestJobPayload) -> None:
    """Full streaming ingestion pipeline writing chunks, invoices, embeddings, and flags to DB."""
    ...

async def run_revalidate(job_data: RevalidateJobPayload) -> RevalidateJobResult:
    """Recomputes deterministic flags, cross-verification, and status for modified invoices."""
    ...
```

---

## 3. Worker Internal HTTP API (`http://worker:8001`)

- `GET /health`
  - Response: `{"status": "ok", "rss_mb": 142.5}`
- `POST /embed`
  - Request: `{"texts": ["query string"], "task_type": "RETRIEVAL_QUERY"}`
  - Response: `{"vectors": [[0.012, -0.045, ...]]}`

---

## 4. REST API Endpoints (`apps/api` on `:4000`)

All routes require header `X-API-Key: <token>` (validated with constant-time `crypto.timingSafeEqual`).

### `POST /api/documents/upload`
- Multipart upload (`files`: up to 20 files, max 200MB each).
- Validates file headers and magic bytes.
- Returns:
  - `201 Created` if all files accepted.
  - `207 Multi-Status` if mixed accept/reject.
  - `400 Bad Request` if all rejected.
```json
{
  "results": [
    {
      "filename": "invoice_march.pdf",
      "accepted": true,
      "documentId": "4a7f052b-7b08-4e1b-9f6b-07bfa7ce33aa"
    },
    {
      "filename": "malicious.exe.pdf",
      "accepted": false,
      "errorCode": "MAGIC_BYTE_MISMATCH"
    }
  ]
}
```

### `GET /api/documents`
- Query parameters: `page` (default 1), `limit` (default 20), `status` (QUEUED, PROCESSING, VERIFIED, NEEDS_REVIEW, FAILED).
- Response:
```json
{
  "page": 1,
  "limit": 20,
  "total": 45,
  "data": [
    {
      "id": "4a7f052b-7b08-4e1b-9f6b-07bfa7ce33aa",
      "filename": "invoice_march.pdf",
      "status": "NEEDS_REVIEW",
      "file_size_bytes": 104520,
      "created_at": "2026-11-20T10:00:00Z",
      "updated_at": "2026-11-20T10:01:15Z"
    }
  ]
}
```

### `GET /api/documents/:id/status`
- Reads directly from PostgreSQL `documents` and `processing_jobs`.
```json
{
  "id": "4a7f052b-7b08-4e1b-9f6b-07bfa7ce33aa",
  "status": "PROCESSING",
  "progress_pct": 65,
  "error_code": null,
  "error_message": null
}
```

### `GET /api/documents/:id`
- Returns full details: document metadata, raw text preview (first 200k chars), chunks, extracted invoices, validation flags, cross-verification links, and audit logs.

### `PATCH /api/documents/:id/correct`
- Request body:
```json
{
  "invoice_id": "uuid-string",
  "updates": {
    "total": 1250.00,
    "invoice_number": "INV-2026-001"
  }
}
```
- Execution:
  1. Transaction in PostgreSQL: updates invoice fields, marks `human_verified=true`, writes diff to `audit_logs`.
  2. Enqueues job on `docint:revalidate`.
  3. Awaits `job.waitUntilFinished(queueEvents, 5000)`.
  4. Returns `200 OK` with updated status and flags if completed within 5s; otherwise returns `202 Accepted` with `{"revalidation": "pending"}`.

### `POST /api/documents/:id/reprocess`
- Re-enqueues full ingest pipeline for document. Returns `200 OK`.

### `GET /api/documents/search`
- Query parameters:
  - `q`: search string
  - `status`, `supplier`, `date_from`, `date_to`, `min_total`, `max_total`
- Performs Reciprocal Rank Fusion (RRF, k=60) between PostgreSQL Full Text Search (`search_tsv`) and pgvector cosine similarity (`document_chunks.embedding <=> query_vector`).
- If worker `/embed` fails, degrades gracefully to keyword search with `"mode": "keyword_only"`.
- Response:
```json
{
  "mode": "hybrid",
  "query": "medical supplies",
  "results": [
    {
      "document_id": "uuid",
      "filename": "care_pack.pdf",
      "chunk_index": 0,
      "snippet": "...Total medical supplies for patient care: $1,250.00...",
      "score": 0.032,
      "status": "VERIFIED"
    }
  ]
}
```

### `GET /health`
- Checks PostgreSQL connection and Redis connection. Returns 200 OK or 503 Service Unavailable.

---

## 5. Next.js Dashboard Client & Proxy Contract

- The browser client MUST never receive or store `API_KEY`.
- All requests from frontend go through Next.js Route Handler Proxy:
  `app/api/proxy/[...path]/route.ts` -> forwards to `http://api:4000/api/...` with `X-API-Key` injected from private server environment variable.

---

## 6. Smoke Test Verification Outcome

A live smoke test between the Node.js producer (`apps/api/scripts/smoke_producer.ts`) and Python worker (`scripts/smoke_test_queue.py`) using BullMQ was executed against Redis:

- **Test A (Synchronous Fast Job Round-trip):**
  - Payload: `{"type": "short", "input": 21}`
  - Result: Received `{"status": "ok", "value": 42}` via `waitUntilFinished(queueEvents, 5000)` within < 200ms.
  - Status: **PASSED**.
- **Test B (45-second Long Job Lock Renewal):**
  - Payload: `{"type": "long", "duration": 45}`
  - Monitored: `queueEvents.on("stalled")` and `queueEvents.on("completed")`.
  - Result: 0 stalled events, job completed exactly once in 45.06s.
  - Status: **PASSED**. Lock renewal operates properly across the Node and Python BullMQ boundary without duplication.

BullMQ cross-runtime protocol is verified and active for both `ingest` and `revalidate` queues.

