"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  XCircle,
} from "lucide-react";

interface UploadItemResult {
  filename: string;
  accepted: boolean;
  documentId?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface DocumentRow {
  id: string;
  filename: string;
  status: string;
  file_ext: string;
  file_size_bytes: number;
  page_count: number | null;
  created_at: string;
  updated_at: string;
}

interface SearchHit {
  document_id: string;
  filename: string;
  status: string;
  chunk_index: number;
  snippet: string;
  score: number;
}

interface InvoiceRecord {
  id: string;
  document_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  supplier_name: string | null;
  customer_name: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  human_verified: boolean;
  model_used?: string;
  line_items?: Array<{
    description?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
    amount?: number | null;
  }>;
}

interface ValidationFlag {
  id: string;
  rule_code: string;
  severity: string;
  field_name: string | null;
  message: string;
}

interface CrossVerifyLink {
  id: string;
  source_invoice_id: string;
  target_type: string;
  target_id: string;
  match_status: string;
  diff_details: Record<string, unknown>;
}

interface AuditLogEntry {
  id: string;
  action: string;
  diff: Record<string, unknown>;
  created_at: string;
}

interface DocumentDetail {
  document: DocumentRow & { error_code?: string | null; error_message?: string | null };
  chunks: Array<{ id: string; chunk_index: number; page_start: number; page_end: number; chunk_text: string }>;
  invoices: InvoiceRecord[];
  validation_flags: ValidationFlag[];
  cross_verification_links: CrossVerifyLink[];
  audit_logs: AuditLogEntry[];
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  const styles: Record<string, string> = {
    COMPLETED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    NEEDS_REVIEW: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    PROCESSING: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    QUEUED: "border-zinc-700 bg-zinc-800/70 text-zinc-300",
    FAILED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        styles[s] || "border-zinc-700 bg-zinc-800 text-zinc-300"
      }`}
    >
      {s === "COMPLETED" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {s === "NEEDS_REVIEW" && <AlertTriangle className="h-3.5 w-3.5" />}
      {(s === "PROCESSING" || s === "QUEUED") && <Clock className="h-3.5 w-3.5" />}
      {s === "FAILED" && <XCircle className="h-3.5 w-3.5" />}
      {s}
    </span>
  );
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadItemResult[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<string | null>(null);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [correctionBanner, setCorrectionBanner] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "30" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/proxy/documents?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.data || []);
        setTotalDocs(json.total || 0);
      }
    } finally {
      setLoadingDocs(false);
    }
  }, [statusFilter]);

  const fetchDetail = useCallback(async (docId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/proxy/documents/${docId}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setDetail(json);
      }
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const hasActive = documents.some((d) => d.status === "QUEUED" || d.status === "PROCESSING");
    if (!hasActive) return;
    const timer = setInterval(() => {
      fetchDocuments();
      if (selectedDocId) fetchDetail(selectedDocId);
    }, 2500);
    return () => clearInterval(timer);
  }, [documents, fetchDocuments, selectedDocId, fetchDetail]);

  const handleFilesUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploading(true);
    setUploadResults([]);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/proxy/documents/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (Array.isArray(json.results)) {
        setUploadResults(json.results);
        const firstAccepted = json.results.find((r: UploadItemResult) => r.accepted && r.documentId);
        if (firstAccepted?.documentId) {
          setSelectedDocId(firstAccepted.documentId);
          fetchDetail(firstAccepted.documentId);
        }
      }
      await fetchDocuments();
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchHits([]);
      setSearchMode(null);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery.trim() });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/proxy/documents/search?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setSearchMode(json.mode || "hybrid");
        setSearchHits(json.results || []);
      }
    } finally {
      setSearching(false);
    }
  };

  const startEditing = (inv: InvoiceRecord) => {
    setEditingInvoiceId(inv.id);
    setCorrectionBanner(null);
    setEditForm({
      invoice_number: inv.invoice_number ?? "",
      invoice_date: inv.invoice_date ? String(inv.invoice_date).slice(0, 10) : "",
      supplier_name: inv.supplier_name ?? "",
      customer_name: inv.customer_name ?? "",
      subtotal: inv.subtotal != null ? String(inv.subtotal) : "",
      tax: inv.tax != null ? String(inv.tax) : "",
      total: inv.total != null ? String(inv.total) : "",
      currency: inv.currency ?? "",
    });
  };

  const submitCorrection = async (docId: string, invoiceId: string) => {
    setSavingCorrection(true);
    setCorrectionBanner(null);
    try {
      const updates: Record<string, unknown> = {
        invoice_number: editForm.invoice_number || null,
        invoice_date: editForm.invoice_date || null,
        supplier_name: editForm.supplier_name || null,
        customer_name: editForm.customer_name || null,
        subtotal: editForm.subtotal !== "" ? parseFloat(editForm.subtotal) : null,
        tax: editForm.tax !== "" ? parseFloat(editForm.tax) : null,
        total: editForm.total !== "" ? parseFloat(editForm.total) : null,
        currency: editForm.currency ? editForm.currency.toUpperCase() : null,
      };
      const res = await fetch(`/api/proxy/documents/${docId}/correct`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId, updates }),
      });
      const json = await res.json();
      setEditingInvoiceId(null);
      if (res.status === 200) {
        setCorrectionBanner(
          `Saved & revalidated immediately (${json.revalidation?.flagCount ?? 0} remaining flags).`
        );
      } else if (res.status === 202) {
        setCorrectionBanner("Saved; background revalidation queued.");
      }
      await fetchDetail(docId);
      await fetchDocuments();
    } finally {
      setSavingCorrection(false);
    }
  };

  const triggerReprocess = async (docId: string) => {
    await fetch(`/api/proxy/documents/${docId}/reprocess`, { method: "POST" });
    await fetchDocuments();
    await fetchDetail(docId);
  };

  const downloadJson = (docDetail: DocumentDetail) => {
    const safeName = (docDetail.document.filename || "document").replace(/\.[^/.]+$/, "");
    const exportPayload = {
      exported_at: new Date().toISOString(),
      document: {
        id: docDetail.document.id,
        filename: docDetail.document.filename,
        status: docDetail.document.status,
      },
      invoices: docDetail.invoices,
      validation_flags: docDetail.validation_flags,
      audit_logs: docDetail.audit_logs,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `${safeName}-corrected.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const exportPrintableInvoice = (docDetail: DocumentDetail, inv?: InvoiceRecord) => {
    const targetInvoice = inv || docDetail.invoices[0];
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsRows = targetInvoice?.line_items && targetInvoice.line_items.length > 0
      ? targetInvoice.line_items.map((it) => `
        <tr>
          <td>${it.description || "Line Item"}</td>
          <td style="text-align: right;">${it.quantity ?? 1}</td>
          <td style="text-align: right;">${it.unit_price != null ? Number(it.unit_price).toFixed(2) : "—"}</td>
          <td style="text-align: right; font-weight: 500;">${it.amount != null ? Number(it.amount).toFixed(2) : "—"}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">No detailed line items listed</td></tr>`;

    const auditTrailHtml = docDetail.audit_logs && docDetail.audit_logs.length > 0
      ? `
        <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 8px;">Audit & Verification Trail</div>
          ${docDetail.audit_logs.map(log => `
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
              • <strong>${log.action}</strong> at ${new Date(log.created_at).toLocaleString()}
            </div>
          `).join("")}
        </div>
      `
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice - ${targetInvoice?.invoice_number || docDetail.document.filename}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
            .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; margin-bottom: 6px; }
            .section-val { font-size: 15px; font-weight: 600; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 10px 12px; background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .amounts { margin-left: auto; width: 300px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .amount-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #334155; }
            .total-row { border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 10px; font-weight: 800; font-size: 16px; color: #047857; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">INVOICE</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;"># ${targetInvoice?.invoice_number || "Unnumbered Invoice"}</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">${targetInvoice?.human_verified ? "Human Verified" : docDetail.document.status}</span>
              <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Date: ${targetInvoice?.invoice_date ? String(targetInvoice.invoice_date).slice(0, 10) : "—"}</div>
            </div>
          </div>

          <div class="grid">
            <div>
              <div class="section-title">Supplier / Vendor</div>
              <div class="section-val">${targetInvoice?.supplier_name || "—"}</div>
            </div>
            <div>
              <div class="section-title">Customer / Bill To</div>
              <div class="section-val">${targetInvoice?.customer_name || "—"}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="amounts">
            <div class="amount-row">
              <span>Subtotal:</span>
              <span>${targetInvoice?.currency || "USD"} ${Number(targetInvoice?.subtotal || 0).toFixed(2)}</span>
            </div>
            <div class="amount-row">
              <span>Tax / VAT:</span>
              <span>${targetInvoice?.currency || "USD"} ${Number(targetInvoice?.tax || 0).toFixed(2)}</span>
            </div>
            <div class="amount-row total-row">
              <span>Grand Total:</span>
              <span>${targetInvoice?.currency || "USD"} ${Number(targetInvoice?.total || 0).toFixed(2)}</span>
            </div>
          </div>

          ${auditTrailHtml}

          <div class="footer">
            Generated via DocIntel AI Platform • Grounded & Verified Extraction • Doc ID: ${docDetail.document.id}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                DocIntel AI Pipeline
              </h1>
              <p className="text-xs text-zinc-400">
                Multi-Format OCR · Grounded Extraction · Ledger Cross-Verification · Hybrid RRF Search
              </p>
            </div>
          </div>
          <button
            onClick={fetchDocuments}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingDocs ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files) handleFilesUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`lg:col-span-5 cursor-pointer rounded-xl border border-dashed p-6 transition ${
              dragActive
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
            />
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-3 rounded-full border border-zinc-800 bg-zinc-950 p-3 text-emerald-400">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <UploadCloud className="h-6 w-6" />
                )}
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {uploading ? "Uploading batch..." : "Drop invoices or financial ledgers here"}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                PDF (digital or scanned up to 1,000+ pages), PNG, JPG, TIFF, XLSX, XLS, CSV
              </p>
            </div>

            {uploadResults.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-4 space-y-1.5 border-t border-zinc-800 pt-3 text-xs"
              >
                {uploadResults.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-md px-2.5 py-1.5 ${
                      r.accepted
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    <span className="truncate font-medium">{r.filename}</span>
                    <span className="ml-2 shrink-0">
                      {r.accepted ? "Queued" : r.errorCode || "Rejected"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Hybrid Semantic + Keyword Search (RRF)
              </h2>
              {searchMode && (
                <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-300">
                  mode: {searchMode}
                </span>
              )}
            </div>

            <form onSubmit={handleSearch} className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search suppliers, invoice numbers, line items, or semantic concepts..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {searchHits.length > 0 && (
              <div className="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1">
                {searchHits.map((hit, idx) => (
                  <button
                    key={`${hit.document_id}-${hit.chunk_index}-${idx}`}
                    onClick={() => {
                      setSelectedDocId(hit.document_id);
                      fetchDetail(hit.document_id);
                    }}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 p-3 text-left transition hover:border-emerald-500/40"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-emerald-300">
                        {hit.filename} (chunk #{hit.chunk_index + 1})
                      </span>
                      <span className="font-mono text-zinc-400">
                        RRF: {Number(hit.score).toFixed(4)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{hit.snippet}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Ingested Documents ({totalDocs})
              </h2>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="QUEUED">QUEUED</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>

            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="py-10 text-center text-xs text-zinc-500">
                  No documents ingested yet. Upload PDFs, scans, or spreadsheets above.
                </p>
              ) : (
                documents.map((doc) => {
                  const isSheet = ["xlsx", "xls", "csv"].includes((doc.file_ext || "").toLowerCase());
                  const active = selectedDocId === doc.id;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setCorrectionBanner(null);
                        fetchDetail(doc.id);
                      }}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        active
                          ? "border-emerald-500/60 bg-zinc-900"
                          : "border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isSheet ? (
                            <FileSpreadsheet className="h-4 w-4 shrink-0 text-sky-400" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
                          )}
                          <span className="truncate text-sm font-medium text-zinc-100">
                            {doc.filename}
                          </span>
                        </div>
                        <StatusBadge status={doc.status} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>
                          {doc.file_ext?.toUpperCase()} · {(doc.file_size_bytes / 1024).toFixed(1)} KB
                          {doc.page_count ? ` · ${doc.page_count}p` : ""}
                        </span>
                        <span>{new Date(doc.created_at).toLocaleTimeString()}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5">
            {!selectedDocId ? (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center text-zinc-500">
                <FileText className="mb-2 h-8 w-8 text-zinc-700" />
                <p className="text-sm">Select a document to inspect extracted invoices, flags, and audit logs</p>
              </div>
            ) : loadingDetail && !detail ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : detail ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">{detail.document.filename}</h3>
                    <p className="font-mono text-xs text-zinc-500">{detail.document.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={detail.document.status} />
                    <button
                      onClick={() => downloadJson(detail)}
                      title="Download Clean Corrected JSON"
                      className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700 hover:text-white"
                    >
                      <Download className="h-3 w-3 text-emerald-400" />
                      Export JSON
                    </button>
                    <button
                      onClick={() => exportPrintableInvoice(detail)}
                      title="Print or Save as PDF"
                      className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700 hover:text-white"
                    >
                      <Printer className="h-3 w-3 text-sky-400" />
                      Print / PDF
                    </button>
                    <button
                      onClick={() => triggerReprocess(detail.document.id)}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                    >
                      Reprocess
                    </button>
                  </div>
                </div>

                {detail.document.error_message && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                    <span className="font-semibold">{detail.document.error_code}: </span>
                    {detail.document.error_message}
                  </div>
                )}

                {correctionBanner && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                    {correctionBanner}
                  </div>
                )}

                {detail.validation_flags.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Validation & Grounding Flags ({detail.validation_flags.length})
                    </h4>
                    <div className="space-y-1.5">
                      {detail.validation_flags.map((flag) => (
                        <div
                          key={flag.id}
                          className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between font-medium text-amber-300">
                            <span>
                              {flag.rule_code} {flag.field_name ? `(${flag.field_name})` : ""}
                            </span>
                            <span className="text-[10px] uppercase">{flag.severity}</span>
                          </div>
                          <p className="mt-0.5 text-zinc-300">{flag.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Extracted Invoices ({detail.invoices.length})
                  </h4>
                  {detail.invoices.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      No structured invoice records (spreadsheet ledgers are stored as cross-verification rows).
                    </p>
                  ) : (
                    detail.invoices.map((inv) => {
                      const isEditing = editingInvoiceId === inv.id;
                      return (
                        <div
                          key={inv.id}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-xs"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">
                                {inv.invoice_number || "Unnumbered Invoice"}
                              </span>
                              {inv.human_verified && (
                                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                                  Human Verified
                                </span>
                              )}
                            </div>
                            {!isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => exportPrintableInvoice(detail, inv)}
                                  title="Print or Save as PDF"
                                  className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:border-sky-500 hover:text-white"
                                >
                                  <Printer className="h-3 w-3 text-sky-400" />
                                  PDF
                                </button>
                                <button
                                  onClick={() => startEditing(inv)}
                                  className="rounded border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:border-emerald-500 hover:text-white"
                                >
                                  Correct Fields
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => submitCorrection(detail.document.id, inv.id)}
                                  disabled={savingCorrection}
                                  className="rounded bg-emerald-600 px-2.5 py-1 font-medium text-white hover:bg-emerald-500"
                                >
                                  {savingCorrection ? "Saving..." : "Save & Revalidate"}
                                </button>
                                <button
                                  onClick={() => setEditingInvoiceId(null)}
                                  className="rounded border border-zinc-700 px-2 py-1 text-zinc-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="grid grid-cols-2 gap-2.5">
                              {[
                                ["invoice_number", "Invoice Number"],
                                ["invoice_date", "Invoice Date (YYYY-MM-DD)"],
                                ["supplier_name", "Supplier Name"],
                                ["customer_name", "Customer Name"],
                                ["subtotal", "Subtotal"],
                                ["tax", "Tax"],
                                ["total", "Total"],
                                ["currency", "Currency"],
                              ].map(([key, label]) => (
                                <label key={key} className="block">
                                  <span className="text-[11px] text-zinc-400">{label}</span>
                                  <input
                                    type="text"
                                    value={editForm[key] ?? ""}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
                                  />
                                </label>
                              ))}
                            </div>
                          ) : (
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                              <div>
                                <dt className="text-zinc-500">Supplier</dt>
                                <dd className="font-medium text-zinc-200">{inv.supplier_name || "—"}</dd>
                              </div>
                              <div>
                                <dt className="text-zinc-500">Customer</dt>
                                <dd className="font-medium text-zinc-200">{inv.customer_name || "—"}</dd>
                              </div>
                              <div>
                                <dt className="text-zinc-500">Date</dt>
                                <dd className="font-medium text-zinc-200">
                                  {inv.invoice_date ? String(inv.invoice_date).slice(0, 10) : "—"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-zinc-500">Total</dt>
                                <dd className="font-semibold text-emerald-300">
                                  {inv.total != null
                                    ? `${inv.currency || ""} ${Number(inv.total).toFixed(2)}`
                                    : "—"}
                                </dd>
                              </div>
                            </dl>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {detail.cross_verification_links.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                      Cross-Verification Links ({detail.cross_verification_links.length})
                    </h4>
                    <div className="space-y-1.5">
                      {detail.cross_verification_links.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs"
                        >
                          <span className="text-zinc-300">
                            Matched against <strong className="text-white">{link.target_type}</strong>
                          </span>
                          <span
                            className={`font-mono font-medium ${
                              link.match_status === "MATCHED" ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {link.match_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.audit_logs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      <History className="h-3.5 w-3.5" />
                      Audit Trail ({detail.audit_logs.length})
                    </h4>
                    <div className="space-y-1.5">
                      {detail.audit_logs.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between text-zinc-400">
                            <span className="font-mono text-zinc-200">{log.action}</span>
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          <pre className="mt-1 overflow-x-auto text-[11px] text-zinc-400">
                            {JSON.stringify(log.diff)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
