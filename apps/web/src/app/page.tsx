"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { DynamicShaderBackground } from "@/components/ui/animated-shader-bg";
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
    COMPLETED: "border-[var(--gd-teal)]/50 bg-[var(--gd-teal)]/18 text-[var(--gd-teal)] shadow-[0_0_14px_rgba(45,212,191,0.25),inset_0_1px_0_rgba(45,212,191,0.2)]",
    VERIFIED:  "border-[var(--gd-teal)]/50 bg-[var(--gd-teal)]/18 text-[var(--gd-teal)] shadow-[0_0_14px_rgba(45,212,191,0.25),inset_0_1px_0_rgba(45,212,191,0.2)]",
    NEEDS_REVIEW: "border-[var(--gd-ochre)]/50 bg-[var(--gd-ochre)]/18 text-[var(--gd-ochre)] shadow-[0_0_14px_rgba(251,191,36,0.2),inset_0_1px_0_rgba(251,191,36,0.15)]",
    PROCESSING: "border-sky-400/50 bg-sky-500/18 text-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.2),inset_0_1px_0_rgba(56,189,248,0.15)] badge-processing",
    QUEUED: "border-white/10 bg-white/5 text-[var(--gd-muted)] shadow-inner",
    FAILED: "border-[var(--gd-coral)]/50 bg-[var(--gd-coral)]/18 text-[var(--gd-coral)] shadow-[0_0_14px_rgba(251,113,133,0.2),inset_0_1px_0_rgba(251,113,133,0.15)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md transition-all ${
        styles[s] || "border-white/10 bg-white/5 text-[var(--gd-muted)]"
      }`}
    >
      {(s === "COMPLETED" || s === "VERIFIED") && <CheckCircle2 className="h-3.5 w-3.5" />}
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
            Generated via Data v AI Platform • Grounded & Verified Extraction • Doc ID: ${docDetail.document.id}
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
    <div className="relative min-h-screen text-[var(--gd-ink)] selection:bg-[var(--gd-teal)]/30 selection:text-white">
      {/* Dynamic Animated Black Shader Background */}
      <DynamicShaderBackground />

      {/* Floating Top Header Bar */}
      <header className="sticky top-4 z-30 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="glass-pill flex items-center justify-between rounded-2xl px-5 py-3.5 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--gd-rim)] bg-gradient-to-br from-[var(--gd-teal)]/20 to-transparent text-[var(--gd-teal)] shadow-[0_0_20px_rgba(45,212,191,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] glow-teal">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-[var(--gd-ink)]">
                  Data v AI
                </h1>
                <span className="rounded-full border border-[var(--gd-teal)]/40 bg-[var(--gd-teal)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gd-teal)] shadow-[0_0_10px_rgba(45,212,191,0.2)]">
                  Production
                </span>
              </div>
              <p className="text-xs text-[var(--gd-muted)]">
                Multi-Format OCR · Grounded Extraction · Ledger Cross-Verification · Hybrid RRF Search
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchDocuments}
              className="glass-card-interactive flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-[var(--gd-ink)]"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[var(--gd-teal)] ${loadingDocs ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        {/* Upload Dropzone & Hybrid Search Row */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Frosted Multi-Format Dropzone */}
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
            className={`glass-panel lg:col-span-5 cursor-pointer rounded-2xl p-6 transition-all duration-300 ${
              dragActive
                ? "border-[var(--gd-teal)] bg-[var(--gd-teal)]/10 shadow-[0_0_40px_rgba(45,212,191,0.25),inset_0_0_30px_rgba(45,212,191,0.06)]"
                : "hover:border-[var(--gd-edge-light)] hover:shadow-[0_20px_56px_rgba(0,0,0,0.7),0_0_0_1px_rgba(45,212,191,0.06)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.xlsx,.xls,.csv,application/pdf,image/*,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*"
              className="hidden"
              onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
            />
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border text-[var(--gd-teal)] transition-all duration-300 ${
                dragActive
                  ? "border-[var(--gd-teal)]/60 bg-[var(--gd-teal)]/20 shadow-[0_0_30px_rgba(45,212,191,0.4)]"
                  : "border-[var(--gd-rim)] bg-gradient-to-br from-[var(--gd-teal)]/15 to-transparent shadow-[0_0_20px_rgba(45,212,191,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]"
              }`}>
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <UploadCloud className="h-6 w-6" />
                )}
              </div>
              <p className="text-sm font-semibold tracking-tight text-[var(--gd-ink)]">
                {uploading ? "Ingesting Document Batch..." : "Drop invoices or financial ledgers here"}
              </p>
              <p className="mt-1 text-xs text-[var(--gd-muted)]">
                PDF (digital or scanned up to 1,000+ pages), PNG, JPG, TIFF, XLSX, XLS, CSV
              </p>
            </div>

            {uploadResults.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-4 space-y-1.5 border-t border-[var(--gd-line)] pt-3 text-xs"
              >
                {uploadResults.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-xl px-3 py-1.5 backdrop-blur-md card-enter ${
                      r.accepted
                        ? "border border-[var(--gd-teal)]/35 bg-[var(--gd-teal)]/12 text-[var(--gd-teal)] shadow-[0_0_12px_rgba(45,212,191,0.1)]"
                        : "border border-[var(--gd-coral)]/35 bg-[var(--gd-coral)]/12 text-[var(--gd-coral)] shadow-[0_0_12px_rgba(251,113,133,0.1)]"
                    }`}
                  >
                    <span className="truncate font-medium">{r.filename}</span>
                    <span className="ml-2 shrink-0 font-semibold">
                      {r.accepted ? "Queued" : r.errorCode || "Rejected"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Frosted Hybrid Search Panel */}
          <div className="glass-panel lg:col-span-7 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-[var(--gd-ink)]">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--gd-teal)]/15 text-[var(--gd-teal)] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                Hybrid Semantic + Keyword Search (RRF)
              </h2>
              {searchMode && (
                <span className="rounded-full border border-[var(--gd-teal)]/40 bg-[var(--gd-teal)]/10 px-2.5 py-0.5 font-mono text-[11px] text-[var(--gd-teal)] shadow-[0_0_10px_rgba(45,212,191,0.15)]">
                  mode: {searchMode}
                </span>
              )}
            </div>

            <form onSubmit={handleSearch} className="mt-3.5 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-[var(--gd-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search suppliers, invoice numbers, line items, or semantic concepts..."
                  className="w-full rounded-xl border border-[var(--gd-line)] bg-black/50 py-2 pl-10 pr-3.5 text-sm text-[var(--gd-ink)] placeholder-[var(--gd-muted)] shadow-inner backdrop-blur-md transition-all focus:border-[var(--gd-teal)]/60 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.08)] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="rounded-xl border border-[var(--gd-teal)]/50 bg-[var(--gd-teal)] px-4 py-2 text-sm font-semibold text-[var(--gd-primary-ink)] shadow-[0_4px_20px_rgba(45,212,191,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all hover:brightness-110 hover:shadow-[0_6px_28px_rgba(45,212,191,0.45)] active:scale-95 disabled:opacity-50"
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
                    className="glass-card-interactive w-full rounded-xl p-3 text-left"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--gd-teal)]">
                        {hit.filename} (chunk #{hit.chunk_index + 1})
                      </span>
                      <span className="font-mono text-[var(--gd-muted)]">
                        RRF: {Number(hit.score).toFixed(4)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--gd-muted)]">{hit.snippet}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Ingested Documents List & Document Inspector Drawer */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Document Ingestion Queue */}
          <div className="glass-panel lg:col-span-5 rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-[var(--gd-ink)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/15 text-sky-400">
                  <FileText className="h-3 w-3" />
                </span>
                Ingested Documents
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-[var(--gd-muted)]">{totalDocs}</span>
              </h2>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-[var(--gd-line)] bg-black/50 px-3 py-1 text-xs font-medium text-[var(--gd-ink)] shadow-inner backdrop-blur-md focus:border-[var(--gd-teal)]/50 focus:outline-none transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="QUEUED">QUEUED</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>

            <div className="space-y-2">
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--gd-line)] bg-[var(--gd-inner)] text-[var(--gd-muted)]">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-[var(--gd-muted)]">No documents ingested yet. Upload PDFs, scans, or spreadsheets above.</p>
                </div>
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
                      className={`glass-card-interactive w-full rounded-xl p-3.5 text-left ${
                        active
                          ? "border-[var(--gd-teal)]/40 bg-[var(--gd-teal)]/6 shadow-[0_0_20px_rgba(45,212,191,0.12),inset_0_1px_0_rgba(45,212,191,0.1)] ring-1 ring-[var(--gd-teal)]/25"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isSheet ? (
                            <FileSpreadsheet className="h-4 w-4 shrink-0 text-sky-400" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0 text-[var(--gd-teal)]" />
                          )}
                          <span className="truncate text-sm font-semibold text-[var(--gd-ink)]">
                            {doc.filename}
                          </span>
                        </div>
                        <StatusBadge status={doc.status} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--gd-muted)]">
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

          {/* Right Inspector & Human Verification Drawer */}
          <div className="glass-panel lg:col-span-7 rounded-2xl p-6">
            {!selectedDocId ? (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center text-[var(--gd-muted)]">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--gd-line)] bg-gradient-to-br from-white/5 to-transparent text-[var(--gd-muted)] shadow-inner">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-[var(--gd-muted)]">Select a document to inspect extracted invoices, flags, and audit logs</p>
                <p className="mt-1 text-xs text-[var(--gd-muted)]/60">Click any document on the left to begin</p>
              </div>
            ) : loadingDetail && !detail ? (
              <div className="flex h-64 items-center justify-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-[var(--gd-teal)]" />
                <span className="text-sm text-[var(--gd-muted)]">Loading document…</span>
              </div>
            ) : detail ? (
              <div className="space-y-5">
                {/* Header with Title, Status & 1-Click Export Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gd-line)] pb-4">
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-[var(--gd-ink)]">
                      {detail.document.filename}
                    </h3>
                    <p className="font-mono text-xs text-[var(--gd-muted)]">{detail.document.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={detail.document.status} />
                    <button
                      onClick={() => downloadJson(detail)}
                      title="Download Clean Corrected JSON"
                      className="glass-card-interactive flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--gd-ink)]"
                    >
                      <Download className="h-3.5 w-3.5 text-[var(--gd-teal)]" />
                      Export JSON
                    </button>
                    <button
                      onClick={() => exportPrintableInvoice(detail)}
                      title="Print or Save as PDF"
                      className="glass-card-interactive flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--gd-ink)]"
                    >
                      <Printer className="h-3.5 w-3.5 text-sky-400" />
                      Print / PDF
                    </button>
                    <button
                      onClick={() => triggerReprocess(detail.document.id)}
                      className="glass-card-interactive rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--gd-muted)] hover:text-[var(--gd-ink)]"
                    >
                      Reprocess
                    </button>
                  </div>
                </div>

                {detail.document.error_message && (
                  <div className="rounded-xl border border-[var(--gd-coral)]/35 bg-[var(--gd-coral)]/10 p-3.5 text-xs text-[var(--gd-coral)] backdrop-blur-md shadow-[0_0_16px_rgba(251,113,133,0.1)]">
                    <span className="font-bold">{detail.document.error_code}: </span>
                    {detail.document.error_message}
                  </div>
                )}

                {correctionBanner && (
                  <div className="rounded-xl border border-[var(--gd-teal)]/35 bg-[var(--gd-teal)]/10 p-3.5 text-xs text-[var(--gd-teal)] backdrop-blur-md shadow-[0_0_16px_rgba(45,212,191,0.1)] card-enter">
                    {correctionBanner}
                  </div>
                )}

                {/* Validation & Grounding Flags */}
                {detail.validation_flags.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--gd-ochre)]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Validation &amp; Grounding Flags ({detail.validation_flags.length})
                    </h4>
                    <div className="space-y-2">
                      {detail.validation_flags.map((flag) => (
                        <div
                          key={flag.id}
                          className="glass-card rounded-xl border border-[var(--gd-ochre)]/30 bg-[var(--gd-ochre)]/6 px-3.5 py-2.5 text-xs shadow-[0_0_12px_rgba(251,191,36,0.06)]"
                        >
                          <div className="flex items-center justify-between font-semibold text-[var(--gd-ochre)]">
                            <span>
                              {flag.rule_code} {flag.field_name ? `(${flag.field_name})` : ""}
                            </span>
                            <span className="rounded-full border border-[var(--gd-ochre)]/35 bg-[var(--gd-ochre)]/12 px-2 py-0.5 text-[10px] uppercase">
                              {flag.severity}
                            </span>
                          </div>
                          <p className="mt-1 text-[var(--gd-muted)]">{flag.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Invoices with Inline Correction & PDF */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--gd-muted)]">
                    <FileText className="h-3.5 w-3.5" />
                    Extracted Invoices ({detail.invoices.length})
                  </h4>
                  {detail.invoices.length === 0 ? (
                    <p className="text-xs text-[var(--gd-muted)]">
                      No structured invoice records (spreadsheet ledgers are stored as cross-verification rows).
                    </p>
                  ) : (
                    detail.invoices.map((inv) => {
                      const isEditing = editingInvoiceId === inv.id;
                      return (
                        <div
                          key={inv.id}
                          className="glass-card rounded-xl p-4 text-xs border border-[var(--gd-line)] hover:border-[var(--gd-rim)] transition-colors"
                        >
                          <div className="mb-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--gd-ink)]">
                                {inv.invoice_number || "Unnumbered Invoice"}
                              </span>
                              {inv.human_verified && (
                                <span className="rounded-full border border-[var(--gd-teal)]/30 bg-[var(--gd-teal)]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--gd-teal)]">
                                  Human Verified
                                </span>
                              )}
                            </div>
                            {!isEditing ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => exportPrintableInvoice(detail, inv)}
                                  title="Print or Save as PDF"
                                  className="glass-card-interactive flex items-center gap-1 rounded-lg px-2.5 py-1 text-[var(--gd-muted)]"
                                >
                                  <Printer className="h-3 w-3 text-sky-400" />
                                  PDF
                                </button>
                                <button
                                  onClick={() => startEditing(inv)}
                                  className="glass-card-interactive rounded-lg px-2.5 py-1 font-semibold text-[var(--gd-ink)] hover:border-[var(--gd-teal)] hover:text-[var(--gd-teal)]"
                                >
                                  Correct Fields
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => submitCorrection(detail.document.id, inv.id)}
                                  disabled={savingCorrection}
                                  className="rounded-lg border border-[var(--gd-rim)] bg-[var(--gd-teal)] px-3 py-1 font-bold text-[var(--gd-primary-ink)] shadow-[0_2px_10px_rgba(117,218,192,0.3)] hover:brightness-110"
                                >
                                  {savingCorrection ? "Saving..." : "Save & Revalidate"}
                                </button>
                                <button
                                  onClick={() => setEditingInvoiceId(null)}
                                  className="glass-card rounded-lg px-2.5 py-1 text-[var(--gd-muted)] hover:text-white"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="grid grid-cols-2 gap-3">
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
                                  <span className="text-[11px] font-medium text-[var(--gd-muted)]">{label}</span>
                                  <input
                                    type="text"
                                    value={editForm[key] ?? ""}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    className="mt-1 w-full rounded-xl border border-[var(--gd-line)] bg-black/50 px-2.5 py-1.5 text-xs text-white shadow-inner focus:border-[var(--gd-focus)] focus:outline-none"
                                  />
                                </label>
                              ))}
                            </div>
                          ) : (
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
                              <div>
                                <dt className="text-[11px] text-[var(--gd-muted)]">Supplier</dt>
                                <dd className="font-semibold text-[var(--gd-ink)]">{inv.supplier_name || "—"}</dd>
                              </div>
                              <div>
                                <dt className="text-[11px] text-[var(--gd-muted)]">Customer</dt>
                                <dd className="font-semibold text-[var(--gd-ink)]">{inv.customer_name || "—"}</dd>
                              </div>
                              <div>
                                <dt className="text-[11px] text-[var(--gd-muted)]">Date</dt>
                                <dd className="font-semibold text-[var(--gd-ink)]">
                                  {inv.invoice_date ? String(inv.invoice_date).slice(0, 10) : "—"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-[11px] text-[var(--gd-muted)]">Total</dt>
                                <dd className="font-bold text-[var(--gd-teal)]">
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

                {/* Cross-Verification Links */}
                {detail.cross_verification_links.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Cross-Verification Links ({detail.cross_verification_links.length})
                    </h4>
                    <div className="space-y-2">
                      {detail.cross_verification_links.map((link) => (
                        <div
                          key={link.id}
                          className="glass-card flex items-center justify-between rounded-xl border border-sky-400/15 px-3.5 py-2.5 text-xs hover:border-sky-400/30 transition-colors"
                        >
                          <span className="text-[var(--gd-muted)]">
                            Matched against <strong className="text-[var(--gd-ink)]">{link.target_type}</strong>
                          </span>
                          <span
                            className={`font-mono font-bold rounded-full px-2 py-0.5 text-[10px] ${
                              link.match_status === "MATCHED"
                                ? "bg-[var(--gd-teal)]/12 text-[var(--gd-teal)] border border-[var(--gd-teal)]/30"
                                : "bg-[var(--gd-ochre)]/12 text-[var(--gd-ochre)] border border-[var(--gd-ochre)]/30"
                            }`}
                          >
                            {link.match_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chronological Audit Trail */}
                {detail.audit_logs.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--gd-muted)]">
                      <History className="h-3.5 w-3.5" />
                      Audit Trail ({detail.audit_logs.length})
                    </h4>
                    <div className="space-y-2">
                      {detail.audit_logs.map((log) => (
                        <div
                          key={log.id}
                          className="glass-card rounded-xl px-3.5 py-2.5 text-xs hover:border-[var(--gd-line)] transition-colors"
                        >
                          <div className="flex items-center justify-between text-[var(--gd-muted)]">
                            <span className="font-mono font-semibold text-[var(--gd-ink)]">{log.action}</span>
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          <pre className="mt-1.5 overflow-x-auto rounded-lg bg-black/50 p-2 font-mono text-[11px] text-[var(--gd-muted)] border border-white/5">
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
