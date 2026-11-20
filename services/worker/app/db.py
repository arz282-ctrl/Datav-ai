"""Asynchronous PostgreSQL database layer using psycopg_pool and pgvector."""

import json
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, Tuple
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row

_pool: Optional[AsyncConnectionPool] = None

def get_connection_string() -> str:
    host = os.environ.get("POSTGRES_HOST", "localhost")
    port = os.environ.get("POSTGRES_PORT", "5432")
    db = os.environ.get("POSTGRES_DB", "docintel")
    user = os.environ.get("POSTGRES_USER", "docintel_user")
    pwd = os.environ.get("POSTGRES_PASSWORD", "docintel_password_change_me")
    return f"postgresql://{user}:{pwd}@{host}:{port}/{db}"

async def init_db_pool():
    global _pool
    if _pool is None:
        conninfo = get_connection_string()
        _pool = AsyncConnectionPool(conninfo=conninfo, min_size=2, max_size=10, open=False)
        await _pool.open()

async def close_db_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None

@asynccontextmanager
async def get_db_cursor():
    if _pool is None:
        await init_db_pool()
    async with _pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            yield cur

async def update_document_status(
    doc_id: str,
    status: str,
    page_count: Optional[int] = None,
    raw_text: Optional[str] = None,
    error_code: Optional[str] = None,
    error_message: Optional[str] = None,
    embedding: Optional[List[float]] = None
):
    async with get_db_cursor() as cur:
        emb_param = str(embedding) if embedding else None
        await cur.execute(
            """
            UPDATE documents
            SET status = %s,
                page_count = COALESCE(%s, page_count),
                raw_text = COALESCE(%s, raw_text),
                error_code = %s,
                error_message = %s,
                embedding = CASE WHEN %s::text IS NOT NULL THEN %s::vector ELSE embedding END,
                updated_at = NOW()
            WHERE id = %s
            """,
            (status, page_count, raw_text[:200000] if raw_text else None, error_code, error_message, emb_param, emb_param, doc_id)
        )

async def insert_document_chunk(
    doc_id: str,
    chunk_index: int,
    page_start: int,
    page_end: int,
    chunk_text: str,
    embedding: Optional[List[float]] = None
) -> str:
    async with get_db_cursor() as cur:
        emb_param = str(embedding) if embedding else None
        await cur.execute(
            """
            INSERT INTO document_chunks (document_id, chunk_index, page_start, page_end, chunk_text, embedding)
            VALUES (%s, %s, %s, %s, %s, CASE WHEN %s::text IS NOT NULL THEN %s::vector ELSE NULL END)
            ON CONFLICT (document_id, chunk_index) DO UPDATE
            SET page_start = EXCLUDED.page_start,
                page_end = EXCLUDED.page_end,
                chunk_text = EXCLUDED.chunk_text,
                embedding = EXCLUDED.embedding
            RETURNING id
            """,
            (doc_id, chunk_index, page_start, page_end, chunk_text, emb_param, emb_param)
        )
        row = await cur.fetchone()
        return str(row["id"])

async def insert_extracted_invoice(
    doc_id: str,
    chunk_id: Optional[str],
    invoice_number: Optional[str],
    invoice_date: Optional[str],
    supplier_name: Optional[str],
    customer_name: Optional[str],
    subtotal: Optional[float],
    tax: Optional[float],
    total: Optional[float],
    currency: Optional[str],
    line_items: List[Dict[str, Any]],
    confidence: Dict[str, Any],
    duplicate_hash: Optional[str],
    needs_review: bool,
    extraction_model: str
) -> str:
    async with get_db_cursor() as cur:
        await cur.execute(
            """
            INSERT INTO extracted_invoices (
                document_id, chunk_id, invoice_number, invoice_date, supplier_name,
                customer_name, subtotal, tax, total, currency, line_items, confidence,
                duplicate_hash, needs_review, human_verified, extraction_model
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, FALSE, %s)
            RETURNING id
            """,
            (
                doc_id, chunk_id, invoice_number, invoice_date, supplier_name,
                customer_name, subtotal, tax, total, currency,
                json.dumps(line_items), json.dumps(confidence), duplicate_hash,
                needs_review, extraction_model
            )
        )
        row = await cur.fetchone()
        return str(row["id"])

async def insert_ledger_rows(doc_id: str, rows: List[Any]):
    if not rows:
        return
    async with get_db_cursor() as cur:
        for r in rows:
            await cur.execute(
                """
                INSERT INTO ledger_rows (
                    document_id, row_index, sheet_name, invoice_number, invoice_date,
                    supplier_name, total_amount, currency, raw_row
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    doc_id, r.row_index, r.sheet_name, r.invoice_number,
                    r.invoice_date, r.supplier_name, r.total_amount, r.currency,
                    json.dumps(r.raw_row)
                )
            )

async def insert_validation_flags(doc_id: str, invoice_id: Optional[str], flags: List[Any]):
    if not flags:
        return
    async with get_db_cursor() as cur:
        for f in flags:
            await cur.execute(
                """
                INSERT INTO validation_flags (
                    document_id, invoice_id, rule_code, severity, field_name, message
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (doc_id, invoice_id, f.rule_code.value, f.severity.value, f.field_name, f.message)
            )

async def insert_cross_verify_links(links: List[Any]):
    if not links:
        return
    async with get_db_cursor() as cur:
        for l in links:
            target_ledger_id = l.target_id if l.target_type == "LEDGER_ROW" else None
            target_invoice_id = l.target_id if l.target_type == "EXTRACTED_INVOICE" else None
            await cur.execute(
                """
                INSERT INTO cross_verification_links (
                    source_invoice_id, target_type, target_ledger_id, target_invoice_id,
                    match_status, diff_details
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (l.source_invoice_id, l.target_type, target_ledger_id, target_invoice_id, l.match_status.value, json.dumps(l.diff_details))
            )

async def update_job_progress(doc_id: str, progress_pct: int, status: str = "RUNNING"):
    async with get_db_cursor() as cur:
        await cur.execute(
            """
            UPDATE processing_jobs
            SET progress_pct = %s, status = %s, updated_at = NOW()
            WHERE document_id = %s
            """,
            (progress_pct, status, doc_id)
        )

async def get_all_duplicate_hashes(exclude_doc_id: Optional[str] = None) -> Dict[str, str]:
    """Returns mapping of duplicate_hash -> invoice identifier for duplicate detection."""
    async with get_db_cursor() as cur:
        query = "SELECT duplicate_hash, invoice_number FROM extracted_invoices WHERE duplicate_hash IS NOT NULL"
        params = []
        if exclude_doc_id:
            query += " AND document_id != %s"
            params.append(exclude_doc_id)
        query += " ORDER BY created_at ASC"
        await cur.execute(query, params)
        rows = await cur.fetchall()
        return {r["duplicate_hash"]: r["invoice_number"] for r in rows}

async def get_ledger_rows_for_verification() -> List[Tuple[str, Any]]:
    from app.contracts import LedgerRowData
    async with get_db_cursor() as cur:
        await cur.execute("SELECT id, row_index, sheet_name, invoice_number, invoice_date, supplier_name, total_amount, currency, raw_row FROM ledger_rows")
        rows = await cur.fetchall()
        result = []
        for r in rows:
            data = LedgerRowData(
                row_index=r["row_index"],
                sheet_name=r["sheet_name"],
                invoice_number=r["invoice_number"],
                invoice_date=str(r["invoice_date"]) if r["invoice_date"] else None,
                supplier_name=r["supplier_name"],
                total_amount=float(r["total_amount"]) if r["total_amount"] is not None else None,
                currency=r["currency"],
                raw_row=r["raw_row"] if isinstance(r["raw_row"], dict) else json.loads(r["raw_row"] or "{}")
            )
            result.append((str(r["id"]), data))
        return result

async def get_all_invoices_for_verification(exclude_doc_id: Optional[str] = None) -> List[Tuple[str, Any]]:
    from app.contracts import InvoiceData
    async with get_db_cursor() as cur:
        query = "SELECT id, invoice_number, invoice_date, supplier_name, total, currency FROM extracted_invoices"
        params = []
        if exclude_doc_id:
            query += " WHERE document_id != %s"
            params.append(exclude_doc_id)
        await cur.execute(query, params)
        rows = await cur.fetchall()
        result = []
        for r in rows:
            data = InvoiceData(
                invoice_number=r["invoice_number"],
                invoice_date=str(r["invoice_date"]) if r["invoice_date"] else None,
                supplier_name=r["supplier_name"],
                total=float(r["total"]) if r["total"] is not None else None,
                currency=r["currency"],
                line_items=[]
            )
            result.append((str(r["id"]), data))
        return result

async def delete_unresolved_flags_for_document(doc_id: str):
    async with get_db_cursor() as cur:
        await cur.execute(
            "DELETE FROM validation_flags WHERE document_id = %s AND is_resolved = FALSE",
            (doc_id,)
        )
