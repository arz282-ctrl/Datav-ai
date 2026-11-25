import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Router, Request, Response } from "express";
import { z } from "zod";
import { pgPool } from "../db.js";
import { ingestQueue, revalidateQueue, revalidateQueueEvents } from "../queues.js";
import { multerUpload, validateUploadedFile } from "../middleware/upload.js";
import { uploadRateLimiter } from "../middleware/security.js";
import { config } from "../config.js";

const router = Router();

// ---------------------------------------------------------------------------
// 1. POST /api/documents/upload and POST /api/documents
// ---------------------------------------------------------------------------
router.post(
  ["/upload", "/"],
  uploadRateLimiter,
  multerUpload.array("files", 20),
  async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded." });
      return;
    }

    const results = [];
    let acceptedCount = 0;
    let rejectedCount = 0;

    for (const file of files) {
      const validation = await validateUploadedFile(file.path, file.originalname);
      if (!validation.valid) {
        // Remove invalid file from disk
        try {
          fs.unlinkSync(file.path);
        } catch (e) {}

        results.push({
          filename: file.originalname,
          accepted: false,
          errorCode: validation.errorCode,
          errorMessage: validation.errorMessage,
        });
        rejectedCount++;
        continue;
      }

      // If file was saved as .bin or lacks extension on disk, rename to detected extension
      let finalFilePath = file.path;
      const expectedExt = `.${validation.detectedExt}`;
      if (!finalFilePath.endsWith(expectedExt)) {
        const newPath = `${finalFilePath.replace(/\.[^.]+$/, "")}${expectedExt}`;
        try {
          fs.renameSync(finalFilePath, newPath);
          finalFilePath = newPath;
        } catch (e) {}
      }

      // Compute sha256
      const fileBuffer = fs.readFileSync(finalFilePath);
      const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      const ext = validation.detectedExt;

      try {
        // Insert into PostgreSQL documents table
        const insertDocRes = await pgPool.query(
          `
          INSERT INTO documents (filename, stored_path, mime_type, file_ext, file_size_bytes, sha256_file, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'QUEUED')
          RETURNING id
          `,
          [file.originalname, finalFilePath, validation.mimeType, ext, file.size, sha256]
        );
        const documentId = insertDocRes.rows[0].id;

        // Insert processing_job row
        await pgPool.query(
          `
          INSERT INTO processing_jobs (document_id, job_type, queue_name, status, progress_pct)
          VALUES ($1, 'INGEST', 'docint:ingest', 'PENDING', 0)
          `,
          [documentId]
        );

        // Forward/mirror file to worker over HTTP multipart to eliminate serverless volume sync lag
        if (config.workerInternalUrl) {
          try {
            const formData = new FormData();
            const fileBlob = new Blob([fileBuffer]);
            const baseFileName = path.basename(finalFilePath);
            formData.append("file", fileBlob, baseFileName);
            formData.append("filename", baseFileName);
            await fetch(`${config.workerInternalUrl}/upload`, {
              method: "POST",
              body: formData,
              signal: AbortSignal.timeout(5000),
            });
          } catch (workerUploadErr) {
            console.warn(
              "[Worker Upload Warning] Could not mirror upload to worker HTTP endpoint:",
              workerUploadErr instanceof Error ? workerUploadErr.message : workerUploadErr
            );
          }
        }

        // Enqueue BullMQ job
        await ingestQueue.add("ingest-task", {
          documentId,
          storedPath: finalFilePath,
          fileExt: ext,
          originalName: file.originalname,
        });

        results.push({
          filename: file.originalname,
          accepted: true,
          documentId,
        });
        acceptedCount++;
      } catch (err: any) {
        results.push({
          filename: file.originalname,
          accepted: false,
          errorCode: "DATABASE_ERROR",
          errorMessage: err.message,
        });
        rejectedCount++;
      }
    }

    // Status code determination per contracts & integration test compatibility
    const documents = results
      .filter((r) => r.accepted)
      .map((r) => ({ id: r.documentId, filename: r.filename, accepted: true }));
    const errors = results
      .filter((r) => !r.accepted)
      .map((r) => ({ filename: r.filename, errorCode: r.errorCode, errorMessage: r.errorMessage }));

    const responsePayload = { results, documents, errors };

    if (rejectedCount === 0) {
      res.status(201).json(responsePayload);
    } else if (acceptedCount === 0) {
      const isMediaTypeError = results.some(
        (r) =>
          r.errorCode === "UNSUPPORTED_EXTENSION" ||
          r.errorCode === "UNSUPPORTED_TYPE" ||
          r.errorCode === "MAGIC_BYTE_MISMATCH"
      );
      res.status(isMediaTypeError ? 415 : 400).json(responsePayload);
    } else {
      res.status(207).json(responsePayload);
    }
  }
);

// ---------------------------------------------------------------------------
// 2. GET /api/documents (Paginated list)
// ---------------------------------------------------------------------------
router.get("/", async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const offset = (page - 1) * limit;
  const statusFilter = req.query.status as string;

  try {
    let countQuery = "SELECT COUNT(*) FROM documents";
    let listQuery = `
      SELECT id, filename, status, file_ext, file_size_bytes, page_count, created_at, updated_at
      FROM documents
    `;
    const params: any[] = [];

    if (statusFilter) {
      countQuery += " WHERE status = $1";
      listQuery += " WHERE status = $1";
      params.push(statusFilter.toUpperCase());
    }

    listQuery += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const totalRes = await pgPool.query(countQuery, params);
    const total = parseInt(totalRes.rows[0].count, 10);

    const listRes = await pgPool.query(listQuery, [...params, limit, offset]);

    res.status(200).json({
      page,
      limit,
      total,
      data: listRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. GET /api/documents/search (Defined before /:id)
// ---------------------------------------------------------------------------
router.get("/search", async (req: Request, res: Response) => {
  const q = (req.query.q as string || "").trim();
  const statusFilter = req.query.status as string;
  const supplierFilter = req.query.supplier as string;
  const dateFrom = req.query.date_from as string;
  const dateTo = req.query.date_to as string;
  const minTotal = req.query.min_total ? parseFloat(req.query.min_total as string) : null;
  const maxTotal = req.query.max_total ? parseFloat(req.query.max_total as string) : null;

  let queryVector: number[] | null = null;
  let mode = "hybrid";

  if (q) {
    try {
      const response = await fetch(`${config.workerInternalUrl}/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: [q], task_type: "RETRIEVAL_QUERY" }),
      });
      if (response.ok) {
        const data = (await response.json()) as { vectors: number[][] };
        queryVector = data.vectors[0];
      } else {
        mode = "keyword_only";
      }
    } catch (e) {
      mode = "keyword_only";
    }
  } else {
    mode = "keyword_only";
  }

  try {
    const vectorStr = queryVector ? `[${queryVector.join(",")}]` : null;

    const searchQuery = `
      WITH keyword_matches AS (
        SELECT 
          c.id AS chunk_id,
          c.document_id,
          c.chunk_index,
          c.chunk_text,
          d.filename,
          d.status,
          ts_rank_cd(c.search_tsv, plainto_tsquery('english', $1)) AS rank_score,
          ROW_NUMBER() OVER (ORDER BY ts_rank_cd(c.search_tsv, plainto_tsquery('english', $1)) DESC) AS rnk
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE ($1 = '' OR c.search_tsv @@ plainto_tsquery('english', $1))
      ),
      vector_matches AS (
        SELECT
          c.id AS chunk_id,
          c.document_id,
          c.chunk_index,
          c.chunk_text,
          d.filename,
          d.status,
          CASE WHEN $2::text IS NOT NULL THEN (c.embedding <=> $2::vector) ELSE 1.0 END AS distance,
          ROW_NUMBER() OVER (ORDER BY CASE WHEN $2::text IS NOT NULL THEN (c.embedding <=> $2::vector) ELSE 1.0 END ASC) AS rnk
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE c.embedding IS NOT NULL AND $2::text IS NOT NULL
      ),
      combined AS (
        SELECT 
          COALESCE(k.chunk_id, v.chunk_id) AS chunk_id,
          COALESCE(k.document_id, v.document_id) AS document_id,
          COALESCE(k.filename, v.filename) AS filename,
          COALESCE(k.status, v.status) AS status,
          COALESCE(k.chunk_index, v.chunk_index) AS chunk_index,
          COALESCE(k.chunk_text, v.chunk_text) AS chunk_text,
          (COALESCE(1.0 / (60.0 + k.rnk), 0.0) + COALESCE(1.0 / (60.0 + v.rnk), 0.0)) AS score
        FROM keyword_matches k
        FULL OUTER JOIN vector_matches v ON k.chunk_id = v.chunk_id
      )
      SELECT 
        document_id AS id,
        document_id,
        filename,
        status,
        chunk_index,
        substring(chunk_text from 1 for 300) AS snippet,
        score
      FROM combined
      WHERE ($3::text IS NULL OR status = $3)
      ORDER BY score DESC
      LIMIT 20
    `;

    const searchRes = await pgPool.query(searchQuery, [q, vectorStr, statusFilter || null]);

    res.status(200).json({
      mode,
      query: q,
      results: searchRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. GET /api/documents/:id/status
// ---------------------------------------------------------------------------
router.get("/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const docRes = await pgPool.query(
      `
      SELECT d.id, d.status, d.error_code, d.error_message, j.progress_pct
      FROM documents d
      LEFT JOIN processing_jobs j ON d.id = j.document_id
      WHERE d.id = $1
      ORDER BY j.created_at DESC
      LIMIT 1
      `,
      [id]
    );

    if (docRes.rows.length === 0) {
      res.status(404).json({ error: "Document not found." });
      return;
    }

    const row = docRes.rows[0];
    const isCompleted = row.status === "VERIFIED" || row.status === "COMPLETED";
    const status = isCompleted ? "COMPLETED" : row.status;
    res.status(200).json({
      id: row.id,
      status: status,
      raw_status: row.status,
      progress_pct: row.progress_pct ?? 0,
      error_code: row.error_code,
      error_message: row.error_message,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. GET /api/documents/:id (Full details)
// ---------------------------------------------------------------------------
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const docRes = await pgPool.query("SELECT * FROM documents WHERE id = $1", [id]);
    if (docRes.rows.length === 0) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    const document = docRes.rows[0];

    const chunksRes = await pgPool.query(
      "SELECT id, chunk_index, page_start, page_end, chunk_text FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index ASC",
      [id]
    );
    const invoicesRes = await pgPool.query(
      "SELECT * FROM extracted_invoices WHERE document_id = $1 ORDER BY created_at ASC",
      [id]
    );
    const flagsRes = await pgPool.query(
      "SELECT * FROM validation_flags WHERE document_id = $1 ORDER BY created_at ASC",
      [id]
    );
    const linksRes = await pgPool.query(
      `
      SELECT l.* FROM cross_verification_links l
      JOIN extracted_invoices i ON l.source_invoice_id = i.id
      WHERE i.document_id = $1
      `,
      [id]
    );
    const auditRes = await pgPool.query(
      "SELECT *, diff AS details FROM audit_logs WHERE document_id = $1 ORDER BY created_at DESC",
      [id]
    );

    res.status(200).json({
      document,
      extracted: invoicesRes.rows[0] || {},
      flags: flagsRes.rows,
      chunks: chunksRes.rows,
      invoices: invoicesRes.rows,
      validation_flags: flagsRes.rows,
      cross_verification_links: linksRes.rows,
      audit_logs: auditRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. PATCH /api/documents/:id/correct (Synchronous / 202 timeout)
// ---------------------------------------------------------------------------
const correctSchema = z.object({
  invoice_id: z.string().uuid().optional(),
  updates: z.record(z.any()).optional(),
  corrections: z.record(z.any()).optional(),
  reason: z.string().optional(),
});

router.patch("/:id/correct", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parseRes = correctSchema.safeParse(req.body);
  if (!parseRes.success) {
    res.status(400).json({ error: "Invalid correction payload", details: parseRes.error });
    return;
  }

  const updates = parseRes.data.updates || parseRes.data.corrections;
  if (!updates || Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Missing updates or corrections in payload" });
    return;
  }

  let invoice_id = parseRes.data.invoice_id;
  if (!invoice_id) {
    const invLookup = await pgPool.query(
      "SELECT id FROM extracted_invoices WHERE document_id = $1 ORDER BY created_at ASC LIMIT 1",
      [id]
    );
    if (invLookup.rows.length === 0) {
      res.status(404).json({ error: "Invoice not found for this document." });
      return;
    }
    invoice_id = invLookup.rows[0].id;
  }

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    // Fetch existing invoice state
    const currRes = await client.query(
      "SELECT * FROM extracted_invoices WHERE id = $1 AND document_id = $2 FOR UPDATE",
      [invoice_id, id]
    );
    if (currRes.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Invoice not found for this document." });
      return;
    }
    const previousState = currRes.rows[0];
    const mergedState = { ...previousState, ...updates };

    // Recompute duplicate hash if relevant fields changed
    const cleanSupp = (mergedState.supplier_name || "").toString().trim().toLowerCase();
    const cleanInv = (mergedState.invoice_number || "").toString().replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const totVal = parseFloat(mergedState.total);
    const newDupHash = (!cleanSupp || !cleanInv || isNaN(totVal))
      ? null
      : crypto.createHash("sha256").update(`${cleanSupp}|${cleanInv}|${totVal.toFixed(2)}`).digest("hex");

    const allUpdates: Record<string, any> = { ...updates, duplicate_hash: newDupHash };

    // Build update query dynamically
    const fields = Object.keys(allUpdates);
    const setClauses = fields.map((f, idx) => `"${f}" = $${idx + 3}`);
    const values = fields.map((f) => allUpdates[f]);

    await client.query(
      `
      UPDATE extracted_invoices
      SET ${setClauses.join(", ")}, human_verified = TRUE, updated_at = NOW()
      WHERE id = $1 AND document_id = $2
      `,
      [invoice_id, id, ...values]
    );

    // Write audit log
    await client.query(
      `
      INSERT INTO audit_logs (document_id, invoice_id, action, previous_state, new_state, diff)
      VALUES ($1, $2, 'MANUAL_CORRECTION', $3, $4, $5)
      `,
      [id, invoice_id, JSON.stringify(previousState), JSON.stringify({ ...previousState, ...updates }), JSON.stringify(updates)]
    );

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: `Transaction failed: ${err.message}` });
    return;
  } finally {
    client.release();
  }

  // Enqueue revalidation job
  const job = await revalidateQueue.add("revalidate-task", {
    documentId: id,
    invoiceIds: [invoice_id],
    reason: "manual_correction",
  });

  // Await job.waitUntilFinished(queueEvents, 5000)
  try {
    const result = await job.waitUntilFinished(revalidateQueueEvents, 5000);
    res.status(200).json({
      status: "completed",
      revalidation: result,
    });
  } catch (timeoutErr) {
    // 202 Accepted on timeout
    res.status(202).json({
      status: "pending",
      revalidation: "pending",
      message: "Revalidation job is taking longer than 5 seconds; please poll status.",
    });
  }
});

// ---------------------------------------------------------------------------
// 7. POST /api/documents/:id/reprocess
// ---------------------------------------------------------------------------
router.post("/:id/reprocess", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const docRes = await pgPool.query("SELECT * FROM documents WHERE id = $1", [id]);
    if (docRes.rows.length === 0) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    const doc = docRes.rows[0];

    await pgPool.query("UPDATE documents SET status = 'QUEUED', updated_at = NOW() WHERE id = $1", [id]);

    await ingestQueue.add("reprocess-task", {
      documentId: id,
      storedPath: doc.stored_path,
      fileExt: doc.file_ext,
      originalName: doc.filename,
    });

    res.status(200).json({ status: "requeued", documentId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 8. POST /api/documents/test-reset (Test environment cleanup)
// ---------------------------------------------------------------------------
router.post("/test-reset", async (req: Request, res: Response) => {
  try {
    await pgPool.query(`
      TRUNCATE documents, document_chunks, extracted_invoices, 
               validation_flags, cross_verification_links, audit_logs, 
               processing_jobs, ledger_rows CASCADE;
    `);
    try {
      await ingestQueue.drain();
      await revalidateQueue.drain();
    } catch {
      // ignore queue drain errors
    }
    res.status(200).json({ status: "reset_successful" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
