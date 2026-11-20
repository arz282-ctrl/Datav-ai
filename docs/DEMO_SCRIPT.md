# Document Intelligence System — 4-Minute Demonstration Script

This script provides an exact, minute-by-minute walkthrough to demonstrate the key capabilities of the AI-Powered Document Intelligence System to stakeholders, evaluators, or in recorded demonstrations.

---

## Timeline & Scene Overview

- **0:00 – 0:45:** System Architecture & Clean Multi-File Upload
- **0:45 – 1:30:** Real-Time Queue Processing & OCR Pipeline
- **1:30 – 2:30:** Split-Pane Document Inspector & Format-Aware Grounding
- **2:30 – 3:15:** Cross-Verification & Deterministic Math Validation
- **3:15 – 4:00:** Human Correction, Synchronous Revalidation, & Hybrid Search

---

## Detailed Step-by-Step Walkthrough

### 0:00 – 0:45 | Introduction & Multi-Format Ingestion
1. **Open Dashboard:** Navigate to `http://localhost:3000`. Point out the header displaying connected status, active queues, and the navy/orange interface theme.
2. **Drag & Drop Batch Upload:** Drag a batch of 4 distinct files into the upload dropzone:
   - `inv_01_clean.pdf` (Clean digital invoice)
   - `inv_06_scan_blur.pdf` (Degraded blurred mobile scan)
   - `inv_11_multisheet.xlsx` (Multi-sheet Excel workbook)
   - `inv_13_ledger.csv` (General ledger accounting export)
3. **Show Client-Side Pre-validation:** Note that the UI inspects MIME types and sizes before dispatching. Click **Upload Batch**.
4. **Multi-Status Response:** Show HTTP 201/207 in network tab with UUIDs assigned to each document.

### 0:45 – 1:30 | Concurrency & Isolation
1. **Live Queue Monitoring:** View the document table polling every 2 seconds. The documents transition from `PENDING` to `PROCESSING`.
2. **Resource Isolation:** Demonstrate that `inv_06_scan_blur.pdf` triggers the OpenCV deskew and bilateral Otsu filter pipeline followed by Tesseract OCR, while `inv_01_clean.pdf` completes in under 2 seconds.
3. **Corrupted File Resilience (Optional):** Upload `inv_20_corrupt_truncated.pdf`. Observe it immediately mark `FAILED` with `Corrupted stream isolated` without stalling subsequent jobs in the BullMQ queue.

### 1:30 – 2:30 | Document Inspector & Grounding Guarantee
1. **Select Document:** Click on `inv_01_clean.pdf` in the queue table to open the Split-Pane Inspector.
2. **Side-by-Side Review:**
   - **Left Pane:** Displays raw extracted text chunks with bounding boxes and page navigation.
   - **Right Pane:** Displays structured extracted JSON fields:
     - Invoice Number: `INV-2026-001`
     - Invoice Date: `2026-01-15`
     - Supplier: `Apex Medical Supplies Inc`
     - Subtotal: `$1,250.00`
     - Total: `$1,350.00`
3. **No-Hallucination Grounding:** Highlight the green "Grounded in Source Text" badge. Explain that every value is verified against raw text tokens; if a hallucination occurred, the value would be nulled and flagged with `UNGROUNDED_VALUE`.

### 2:30 – 3:15 | Math Validation & Cross-Verification
1. **Inspect Math Mismatch:** Select `inv_15_math_mismatch.pdf`.
2. **Review Flags:** The document status shows `NEEDS_REVIEW`. In the flags section, point out the red badge:
   - `MATH_MISMATCH` (Calculated `subtotal + tax = $1,100.00` differs from printed total `$1,250.00`).
3. **Cross-Verification Badge:** Select `inv_18_cross_mismatch.pdf`.
4. **Show Ledger Comparison:** The document shows `CROSS_VERIFY_MISMATCH`:
   - System automatically matched invoice `INV-2026-018` against ledger entry `L-103` in `inv_13_ledger.csv`.
   - Identified discrepancy of `$700.00` between invoice total (`$3,200.00`) and accounting record (`$2,500.00`).

### 3:15 – 4:00 | Human-in-the-Loop Correction & Hybrid Search
1. **Perform Correction:** In the Inspector for `inv_15_math_mismatch.pdf`, edit the Total field to `$1,100.00`.
2. **Save & Re-Validate:** Click **Save & Re-Validate**.
   - Show network request to `PATCH /api/documents/:id/correct`.
   - The job is placed on the dedicated `docint:revalidate` queue (concurrency 4).
   - Node API awaits `waitUntilFinished(5000ms)` and returns HTTP 200 synchronously.
   - The document status immediately turns green: `COMPLETED`, and `MATH_MISMATCH` flag is resolved!
3. **Audit Trail Verification:** Scroll to Audit Logs pane showing who changed what, the exact timestamp, previous value, new value, and reason.
4. **Search Verification:** In the top Search Bar, type "Wheelchair cushions".
   - Shows real-time hybrid search results with vector similarity score and text snippets.
   - Point out graceful degradation to `"mode": "keyword_only"` if embedding services are offline.
