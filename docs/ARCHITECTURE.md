# System Architecture & Technical Specifications

The **AI-Powered Document Intelligence System** is an enterprise-grade document ingestion, extraction, cross-verification, and auditing platform engineered for high-throughput financial and healthcare document processing.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend & Client Access"]
        Browser["Next.js 15 Web Dashboard\n(React 19, Tailwind, Lucide)"]
        ClientAPI["REST Client / External Integrations"]
    end

    subgraph APILayer["API Gateway & Ingestion Gateway (Node 20 / Express)"]
        API["Node.js Express API (:4000)"]
        AuthMiddleware["X-API-Key Timing-Safe Auth\n+ Rate Limiter + Helmet"]
        UploadMiddleware["Multer Storage\nMagic-Byte + MIME Sniffing"]
        APIProxy["Web API Proxy Route\n(/api/proxy/*)"]
    end

    subgraph MessageBrokers["Queue Infrastructure (Redis 7+)"]
        Redis[("Redis Instance\n(Port 6379)")]
        IngestQ["Queue: docint:ingest\n(Concurrency: 2)"]
        RevalQ["Queue: docint:revalidate\n(Concurrency: 4)"]
        Redis --- IngestQ
        Redis --- RevalQ
    end

    subgraph WorkerLayer["Processing & AI Worker (Python 3.11 / FastAPI)"]
        Worker["FastAPI Worker Engine (:8001)\n(BullMQ Python Workers)"]
        Parsers["Streaming Parsers\n(PyMuPDF, Pillow, openpyxl, xlwt)"]
        OCR["OpenCV + Tesseract OCR Engine\n(Deskew, Denoise, Otsu)"]
        Extractor["Gemini LLM Extractor\n(google-genai, Structured Schema)"]
        Grounding["Format-Aware Grounding Engine\n(rapidfuzz, dateutil)"]
        Validator["Validation & Cross-Verification Engine\n(Decimal Precision 0.01)"]
    end

    subgraph DataLayer["Storage & Vector Database"]
        PG[("PostgreSQL 16 + pgvector\n(Port 5432)")]
        DiskStorage["Secure Volume Storage\n(/data/uploads)"]
    end

    subgraph CloudAI["Google Cloud GenAI"]
        GeminiAPI["Gemini 3.8 Flash (Primary)\nGemini 3.1 Pro (Fallback)\nGemini Embedding 001"]
    end

    Browser -->|Binds credentials server-side| APIProxy
    APIProxy --> API
    ClientAPI --> API
    API --> AuthMiddleware
    AuthMiddleware --> UploadMiddleware
    UploadMiddleware -->|Write binary| DiskStorage
    UploadMiddleware -->|Insert PENDING record| PG
    API -->|Enqueue Ingest Job| IngestQ
    API -->|Enqueue Revalidate Job| RevalQ
    API -->|Query Metadata & Results| PG
    API -->|Internal POST /embed| Worker

    IngestQ --> Worker
    RevalQ --> Worker
    Worker --> Parsers
    Parsers --> OCR
    Worker --> Extractor
    Extractor <-->|JSON Structured Output| GeminiAPI
    Worker --> Grounding
    Worker --> Validator
    Worker -->|Update Status, Chunks, Embeddings, Flags| PG
```

---

## 2. Ingestion Pipeline Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client
    participant Web as Next.js Web
    participant API as Express API
    participant Disk as File Storage
    participant DB as PostgreSQL
    participant Q as BullMQ (ingest)
    participant Worker as Python Worker
    participant Gemini as Google GenAI

    User->>Web: Select document(s) (PDF, XLSX, TIFF, Scan)
    Web->>API: POST /api/documents (multipart) via Proxy
    API->>API: Validate Magic Bytes & Sniff Delimiters
    API->>Disk: Persist file with UUID name
    API->>DB: INSERT INTO documents (status='PENDING')
    API->>Q: Add job to 'docint:ingest'
    API-->>Web: Return 201 Created (documentId, status)

    Q->>Worker: Consume Ingest Job (documentId, storedPath)
    Worker->>DB: UPDATE documents (status='PROCESSING')
    Worker->>Worker: Stream pages / sheets (PyMuPDF / openpyxl)
    alt Scanned / Image Page (<30 chars)
        Worker->>Worker: OpenCV Preprocess (Deskew, Otsu) + Tesseract OCR
    end
    Worker->>Worker: Detect multi-invoice boundaries (Segmenter)
    Worker->>Gemini: client.aio.models.generate_content (with Schema)
    Gemini-->>Worker: Structured JSON
    Worker->>Worker: Format-Aware Grounding (Nullify ungrounded values)
    Worker->>Worker: Deterministic Validation (Math, Missing, Duplicates)
    Worker->>Worker: Cross-Verify against Ledger counterparts
    Worker->>Gemini: POST embed_content (task_type=RETRIEVAL_DOCUMENT)
    Gemini-->>Worker: 1536-dim normalized vector
    Worker->>DB: INSERT document_chunks, extracted_invoices, validation_flags, cross_verify_links
    Worker->>DB: UPDATE documents (status='COMPLETED' or 'NEEDS_REVIEW')
    Web->>API: GET /api/documents/:id/status (Poll every 2s)
    API-->>Web: Status: COMPLETED / NEEDS_REVIEW
```

---

## 3. Manual Correction & Revalidation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Reviewer as Human Reviewer
    participant Web as Next.js Web
    participant API as Express API
    participant DB as PostgreSQL
    participant Q as BullMQ (revalidate)
    participant Worker as Python Worker

    Reviewer->>Web: Edit invoice fields in Document Inspector
    Web->>API: PATCH /api/documents/:id/correct (payload, reason)
    API->>DB: BEGIN TRANSACTION
    API->>DB: UPDATE extracted_invoices (human_verified=true)
    API->>DB: INSERT INTO audit_logs (previous_state, new_state, reason)
    API->>DB: COMMIT
    API->>Q: Add job to 'docint:revalidate' (high-priority, concurrency 4)
    Note over API,Q: API awaits job.waitUntilFinished(queueEvents, 5000)

    alt Fast Path (< 5000ms)
        Q->>Worker: Run Revalidate Job
        Worker->>Worker: Clear unresolved flags & re-evaluate math/rules
        Worker->>DB: UPDATE validation_flags & cross_verify_links
        Worker-->>Q: Return RevalidationResult
        Q-->>API: Finished
        API-->>Web: HTTP 200 OK (updated invoice & flags)
    else Timeout (> 5000ms)
        API-->>Web: HTTP 202 Accepted ({"revalidation":"pending"})
        Web->>API: Poll GET /api/documents/:id/status
    end
```

---

## 4. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    documents ||--o{ document_chunks : "has many"
    documents ||--o| extracted_invoices : "extracts to"
    documents ||--o{ ledger_rows : "parses into"
    documents ||--o{ validation_flags : "triggers"
    documents ||--o{ cross_verify_links : "participates in"
    documents ||--o{ audit_logs : "records changes"
    documents ||--o{ job_history : "tracks processing"
    extracted_invoices ||--o{ invoice_line_items : "contains"

    documents {
        uuid id PK
        string original_filename
        string stored_filename
        string file_extension
        bigint file_size_bytes
        string mime_type
        string file_hash_sha256
        string document_type
        string status
        int page_count
        vector embedding
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    document_chunks {
        uuid id PK
        uuid document_id FK
        int chunk_index
        int page_number
        text raw_text
        int char_count
        vector embedding
        jsonb bounding_boxes
        timestamp created_at
    }

    extracted_invoices {
        uuid id PK
        uuid document_id FK
        string invoice_number
        date invoice_date
        date due_date
        string supplier_name
        string customer_name
        decimal subtotal
        decimal tax
        decimal total
        string currency
        numeric confidence_score
        boolean human_verified
        jsonb raw_llm_output
        timestamp created_at
        timestamp updated_at
    }

    invoice_line_items {
        uuid id PK
        uuid invoice_id FK
        int item_index
        text description
        decimal quantity
        decimal unit_price
        decimal total_price
    }

    validation_flags {
        uuid id PK
        uuid document_id FK
        string rule_code
        string severity
        string field_name
        text message
        jsonb context
        boolean is_resolved
        timestamp created_at
    }

    cross_verify_links {
        uuid id PK
        uuid source_document_id FK
        uuid target_document_id FK
        string status
        decimal discrepancy_amount
        jsonb match_details
        timestamp created_at
    }

    ledger_rows {
        uuid id PK
        uuid document_id FK
        int row_index
        string entry_id
        string vendor_name
        string document_reference
        date transaction_date
        decimal amount
        string currency
    }

    audit_logs {
        uuid id PK
        uuid document_id FK
        string action
        string user_identifier
        jsonb previous_state
        jsonb new_state
        text reason
        timestamp created_at
    }
```

---

## 5. Architectural Guarantees & Trade-offs

1. **Single Source of Truth for Business Logic:** All validation rules, math checks, and cross-verification routines live exclusively in Python (`services/worker/app/validator/`). The Node API never duplicates or re-implements validation algorithms.
2. **Corrupted File Isolation:** A broken stream or corrupted header raises `CorruptedDocumentError` inside the worker, records `status = 'FAILED'`, and completes the queue job normally. Subsequent jobs in the queue are never stalled.
3. **Queue Segregation:** Long, resource-intensive OCR and LLM extraction jobs run on `docint:ingest` (concurrency 2). Fast revalidations and user corrections run on `docint:revalidate` (concurrency 4). A slow 1,000-page ingest will never block a human reviewer awaiting a revalidation.
4. **Security & Sandbox Isolation:** The API never exposes the internal worker or database to the public Internet. The Next.js frontend connects via a server-side API proxy route that securely binds `X-API-Key`.
