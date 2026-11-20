-- PostgreSQL 16 + pgvector schema initialization for AI-Powered Document Intelligence System
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_ext TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_file TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'VERIFIED', 'NEEDS_REVIEW', 'FAILED')),
    page_count INT DEFAULT NULL,
    error_code TEXT DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    raw_text TEXT DEFAULT NULL, -- preview only: first 200,000 characters
    search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', filename || ' ' || left(coalesce(raw_text, ''), 100000))) STORED,
    embedding VECTOR(1536) DEFAULT NULL, -- summary vector
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at_desc ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_sha256_file ON documents(sha256_file);
CREATE INDEX IF NOT EXISTS idx_documents_search_tsv ON documents USING GIN(search_tsv);

-- 2. Document Chunks Table (Primary Search Surface)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    page_start INT NOT NULL,
    page_end INT NOT NULL,
    chunk_text TEXT NOT NULL,
    search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED,
    embedding VECTOR(1536) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_chunk_index UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_search_tsv ON document_chunks USING GIN(search_tsv);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 3. Extracted Invoices Table
CREATE TABLE IF NOT EXISTS extracted_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE SET NULL,
    invoice_number TEXT,
    invoice_date DATE,
    supplier_name TEXT,
    customer_name TEXT,
    subtotal NUMERIC(14,2),
    tax NUMERIC(14,2),
    total NUMERIC(14,2),
    currency TEXT,
    line_items JSONB DEFAULT '[]'::jsonb,
    confidence JSONB DEFAULT '{}'::jsonb,
    duplicate_hash TEXT,
    needs_review BOOLEAN DEFAULT FALSE,
    human_verified BOOLEAN DEFAULT FALSE,
    extraction_model TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_extracted_invoices_updated_at
BEFORE UPDATE ON extracted_invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_extracted_invoices_document_id ON extracted_invoices(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_invoices_invoice_number ON extracted_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_extracted_invoices_duplicate_hash ON extracted_invoices(duplicate_hash);
CREATE INDEX IF NOT EXISTS idx_extracted_invoices_lower_supplier ON extracted_invoices(lower(supplier_name));
CREATE INDEX IF NOT EXISTS idx_extracted_invoices_invoice_date ON extracted_invoices(invoice_date);

-- 4. Ledger Rows Table (Spreadsheet row extraction)
CREATE TABLE IF NOT EXISTS ledger_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    row_index INT NOT NULL,
    sheet_name TEXT,
    invoice_number TEXT,
    invoice_date DATE,
    supplier_name TEXT,
    total_amount NUMERIC(14,2),
    currency TEXT,
    raw_row JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_rows_document_id ON ledger_rows(document_id);
CREATE INDEX IF NOT EXISTS idx_ledger_rows_invoice_number ON ledger_rows(invoice_number);
CREATE INDEX IF NOT EXISTS idx_ledger_rows_supplier_total ON ledger_rows(supplier_name, total_amount);

-- 5. Validation Flags Table
CREATE TABLE IF NOT EXISTS validation_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES extracted_invoices(id) ON DELETE CASCADE,
    rule_code TEXT NOT NULL CHECK (rule_code IN ('MISSING_FIELD', 'UNGROUNDED_VALUE', 'MATH_MISMATCH', 'DUPLICATE_INVOICE', 'CROSS_VERIFY_MISMATCH')),
    severity TEXT NOT NULL CHECK (severity IN ('ERROR', 'WARNING', 'INFO')),
    field_name TEXT,
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_flags_document_id ON validation_flags(document_id);
CREATE INDEX IF NOT EXISTS idx_validation_flags_invoice_id ON validation_flags(invoice_id);
CREATE INDEX IF NOT EXISTS idx_validation_flags_rule_code ON validation_flags(rule_code);

-- 6. Cross Verification Links Table
CREATE TABLE IF NOT EXISTS cross_verification_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_invoice_id UUID NOT NULL REFERENCES extracted_invoices(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('LEDGER_ROW', 'EXTRACTED_INVOICE')),
    target_ledger_id UUID REFERENCES ledger_rows(id) ON DELETE CASCADE,
    target_invoice_id UUID REFERENCES extracted_invoices(id) ON DELETE CASCADE,
    match_status TEXT NOT NULL CHECK (match_status IN ('MATCHED', 'TOTAL_MISMATCH', 'DATE_MISMATCH', 'CURRENCY_MISMATCH', 'MULTIPLE_MISMATCH')),
    diff_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cross_verification_links_source_invoice_id ON cross_verification_links(source_invoice_id);
CREATE INDEX IF NOT EXISTS idx_cross_verification_links_target_ledger_id ON cross_verification_links(target_ledger_id);
CREATE INDEX IF NOT EXISTS idx_cross_verification_links_target_invoice_id ON cross_verification_links(target_invoice_id);

-- 7. Processing Jobs Table
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('INGEST', 'REVALIDATE')),
    queue_name TEXT NOT NULL,
    bullmq_job_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    progress_pct INT NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_processing_jobs_updated_at
BEFORE UPDATE ON processing_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id ON processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES extracted_invoices(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    diff JSONB,
    user_identifier TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_invoice_id ON audit_logs(invoice_id);
