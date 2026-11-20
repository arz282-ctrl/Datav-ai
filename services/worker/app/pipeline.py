"""End-to-end ingestion and revalidation pipeline orchestrator."""

import asyncio
import os
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from app.contracts import (
    CorruptedDocumentError,
    CorruptedDocumentErrorCode,
    IngestJobPayload,
    RevalidateJobPayload,
    RevalidateJobResult,
    RuleCode,
    Severity,
    ExtractionResult,
    InvoiceData
)
from app.db import (
    update_document_status,
    insert_document_chunk,
    insert_extracted_invoice,
    insert_ledger_rows,
    insert_validation_flags,
    insert_cross_verify_links,
    update_job_progress,
    get_all_duplicate_hashes,
    get_ledger_rows_for_verification,
    get_all_invoices_for_verification,
    delete_unresolved_flags_for_document,
    get_db_cursor
)
try:
    from app.parsers.pdf_parser import iter_pdf_pages
    from app.parsers.image_parser import parse_image
    from app.parsers.spreadsheet_parser import parse_spreadsheet
except ImportError:
    iter_pdf_pages = None
    parse_image = None
    parse_spreadsheet = None

try:
    from app.extractor.gemini_extractor import get_extractor
    from app.extractor.grounding import ground
    from app.extractor.embeddings import embed_texts
except ImportError:
    get_extractor = None
    ground = None
    embed_texts = None
from app.validator.rules import validate_invoice, compute_duplicate_hash
from app.validator.cross_verify import cross_verify

LLM_SEMAPHORE = asyncio.Semaphore(4)

async def run_ingest(payload: IngestJobPayload) -> None:
    doc_id = payload.documentId
    stored_path = payload.storedPath
    ext = payload.fileExt.lower().strip(".")

    try:
        await update_job_progress(doc_id, 5, "RUNNING")
        await update_document_status(doc_id, "PROCESSING")

        # 1. Spreadsheet branch
        if ext in ["xlsx", "xls", "csv"]:
            ledger_rows, preview_text = parse_spreadsheet(stored_path)
            await insert_ledger_rows(doc_id, ledger_rows)

            # Generate summary embedding if preview exists
            summary_vec = None
            if preview_text.strip():
                try:
                    summary_vecs = await embed_texts([preview_text[:5000]], task_type="RETRIEVAL_DOCUMENT")
                    summary_vec = summary_vecs[0] if summary_vecs else None
                except Exception:
                    pass

            await update_document_status(
                doc_id=doc_id,
                status="VERIFIED",
                page_count=len(ledger_rows),
                raw_text=preview_text[:200000],
                embedding=summary_vec
            )
            await update_job_progress(doc_id, 100, "COMPLETED")
            return

        # 2. PDF or Image parser branch
        if ext == "pdf":
            pages_iter = iter_pdf_pages(stored_path)
        elif ext in ["png", "jpg", "jpeg", "tiff", "tif"]:
            pages_iter = parse_image(stored_path)
        else:
            raise CorruptedDocumentError(CorruptedDocumentErrorCode.UNSUPPORTED_TYPE, f"Unsupported file type .{ext}")

        # 3. Stream chunks and process with Semaphore(4)
        extractor = get_extractor()
        accumulated_raw_text = []
        page_count = 0
        total_flags_count = 0

        created_invoices: List[Tuple[str, InvoiceData]] = [] # (invoice_id, data)

        for chunk in segment_pages(pages_iter):
            page_count = max(page_count, chunk.page_end)
            accumulated_raw_text.append(chunk.text)

            # Generate vector embedding for chunk
            chunk_embedding = None
            try:
                emb_res = await embed_texts([chunk.text], task_type="RETRIEVAL_DOCUMENT")
                chunk_embedding = emb_res[0] if emb_res else None
            except Exception:
                pass

            # Insert chunk into DB
            chunk_id = await insert_document_chunk(
                doc_id=doc_id,
                chunk_index=chunk.chunk_index,
                page_start=chunk.page_start,
                page_end=chunk.page_end,
                chunk_text=chunk.text,
                embedding=chunk_embedding
            )

            # LLM extraction bounded by semaphore
            async with LLM_SEMAPHORE:
                raw_extraction = await extractor.extract(chunk.text)

            # Format-aware grounding
            grounded_extraction, grounding_flags = ground(raw_extraction, chunk.text)

            # Insert extracted invoice
            inv = grounded_extraction.invoice
            dup_hash = compute_duplicate_hash(inv.supplier_name, inv.invoice_number, inv.total)
            line_items_dict = [it.model_dump() for it in inv.line_items]

            invoice_id = await insert_extracted_invoice(
                doc_id=doc_id,
                chunk_id=chunk_id,
                invoice_number=inv.invoice_number,
                invoice_date=inv.invoice_date,
                supplier_name=inv.supplier_name,
                customer_name=inv.customer_name,
                subtotal=inv.subtotal,
                tax=inv.tax,
                total=inv.total,
                currency=inv.currency,
                line_items=line_items_dict,
                confidence=grounded_extraction.confidence,
                duplicate_hash=dup_hash,
                needs_review=len(grounding_flags) > 0,
                extraction_model=grounded_extraction.model
            )

            created_invoices.append((invoice_id, inv))

            if grounding_flags:
                await insert_validation_flags(doc_id, invoice_id, grounding_flags)
                total_flags_count += len(grounding_flags)

            await update_job_progress(doc_id, min(75, 10 + chunk.chunk_index * 15), "RUNNING")

        # 4. Final sequential validation & cross-verification stage
        existing_hashes = await get_all_duplicate_hashes(exclude_doc_id=doc_id)
        ledger_rows_data = await get_ledger_rows_for_verification()
        other_invoices_data = await get_all_invoices_for_verification(exclude_doc_id=doc_id)

        all_validation_flags = []
        for inv_id, inv_data in created_invoices:
            # Rule validation (missing fields, math, duplicates)
            val_flags = validate_invoice(inv_data, existing_hashes)
            if val_flags:
                await insert_validation_flags(doc_id, inv_id, val_flags)
                all_validation_flags.extend(val_flags)

            # Cross-verification
            links, cv_flags = cross_verify(inv_data, inv_id, ledger_rows_data, other_invoices_data)
            if links:
                await insert_cross_verify_links(links)
            if cv_flags:
                await insert_validation_flags(doc_id, inv_id, cv_flags)
                all_validation_flags.extend(cv_flags)

        total_flags_count += len(all_validation_flags)

        # 5. Set terminal document status
        full_text = "\n\n".join(accumulated_raw_text)
        summary_emb = None
        if full_text.strip():
            try:
                emb_res = await embed_texts([full_text[:5000]], task_type="RETRIEVAL_DOCUMENT")
                summary_emb = emb_res[0] if emb_res else None
            except Exception:
                pass

        final_status = "NEEDS_REVIEW" if total_flags_count > 0 else "VERIFIED"

        await update_document_status(
            doc_id=doc_id,
            status=final_status,
            page_count=page_count,
            raw_text=full_text[:200000],
            embedding=summary_emb
        )
        await update_job_progress(doc_id, 100, "COMPLETED")

    except CorruptedDocumentError as e:
        # Isolated error handling: never crashes batch, marks FAILED
        await update_document_status(
            doc_id=doc_id,
            status="FAILED",
            error_code=e.code.value,
            error_message=e.message
        )
        await update_job_progress(doc_id, 100, "FAILED")
    except Exception as e:
        await update_document_status(
            doc_id=doc_id,
            status="FAILED",
            error_code="INTERNAL_ERROR",
            error_message=str(e)
        )
        await update_job_progress(doc_id, 100, "FAILED")

async def run_revalidate(payload: RevalidateJobPayload) -> RevalidateJobResult:
    doc_id = payload.documentId

    # 1. Clear unresolved flags
    await delete_unresolved_flags_for_document(doc_id)

    # 2. Fetch current invoices for document
    async with get_db_cursor() as cur:
        await cur.execute(
            """
            SELECT id, invoice_number, invoice_date, supplier_name, customer_name,
                   subtotal, tax, total, currency, line_items, human_verified
            FROM extracted_invoices
            WHERE document_id = %s
            """,
            (doc_id,)
        )
        invoice_rows = await cur.fetchall()

    existing_hashes = await get_all_duplicate_hashes(exclude_doc_id=doc_id)
    ledger_rows_data = await get_ledger_rows_for_verification()
    other_invoices_data = await get_all_invoices_for_verification(exclude_doc_id=doc_id)

    total_flags = 0
    for r in invoice_rows:
        inv_id = str(r["id"])
        inv_data = InvoiceData(
            invoice_number=r["invoice_number"],
            invoice_date=str(r["invoice_date"]) if r["invoice_date"] else None,
            supplier_name=r["supplier_name"],
            customer_name=r["customer_name"],
            subtotal=float(r["subtotal"]) if r["subtotal"] is not None else None,
            tax=float(r["tax"]) if r["tax"] is not None else None,
            total=float(r["total"]) if r["total"] is not None else None,
            currency=r["currency"],
            line_items=[]
        )

        flags = validate_invoice(inv_data, existing_hashes)
        links, cv_flags = cross_verify(inv_data, inv_id, ledger_rows_data, other_invoices_data)

        combined = flags + cv_flags
        if combined:
            await insert_validation_flags(doc_id, inv_id, combined)
            total_flags += len(combined)

        if links:
            await insert_cross_verify_links(links)

    new_status = "NEEDS_REVIEW" if total_flags > 0 else "VERIFIED"
    await update_document_status(doc_id, new_status)

    return RevalidateJobResult(status=new_status, flagCount=total_flags)
