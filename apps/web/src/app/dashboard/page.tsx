"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
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
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Edit2,
  Check,
  X,
  Send,
  Eye,
  Filter,
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

interface LineItemRecord {
  id: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
}

interface InvoiceRecord {
  id: string;
  invoice_number?: string;
  invoice_date?: string;
  supplier_name?: string;
  customer_name?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
  raw_extraction?: Record<string, unknown>;
  confidence?: number;
  line_items?: LineItemRecord[];
}

interface ValidationFlagRecord {
  id: string;
  flag_code: string;
  field_name?: string;
  message?: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  rule_code?: string;
}

interface AuditLogRecord {
  id: string;
  action: string;
  timestamp: string;
  detail?: Record<string, unknown>;
  actor?: string;
}

interface TextChunkRecord {
  id: string;
  chunk_index: number;
  page_number?: number;
  text_content: string;
}

interface DocumentDetail {
  document: DocumentRow;
  invoices: InvoiceRecord[];
  validation_flags: ValidationFlagRecord[];
  audit_logs: AuditLogRecord[];
  text_chunks?: TextChunkRecord[];
}

interface SearchHit {
  document_id: string;
  filename: string;
  headline: string;
  score: number;
  status?: string;
  subtotal?: number;
  total?: number;
  currency?: string;
}

const FLAG_DESCRIPTIONS: Record<string, string> = {
  MATH_MISMATCH: "The total doesn't add up.",
  MISSING_FIELD: "A required field couldn't be found.",
  DUPLICATE_INVOICE: "Looks like a duplicate of an invoice you already uploaded.",
  CROSS_VERIFY_MISMATCH: "Doesn't match the matching row in your spreadsheet.",
  UNGROUNDED_VALUE: "A value couldn't be confirmed in the document.",
  CORRUPTED_DOCUMENT: "This file couldn't be read.",
};

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DocumentDetail | null>(null);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadResults, setUploadResults] = useState<UploadItemResult[] | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchMode, setSearchMode] = useState<string | null>(null);

  // Inspector tabs
  const [activeTab, setActiveTab] = useState<"invoices" | "flags" | "chunks" | "audit">("invoices");

  // Inline correction state
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    invoice_number: "",
    invoice_date: "",
    supplier_name: "",
    customer_name: "",
    subtotal: "",
    tax: "",
    total: "",
    currency: "",
  });
  const [savingCorrection, setSavingCorrection] = useState<boolean>(false);
  const [correctionBanner, setCorrectionBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch document list
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/documents", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const docs: DocumentRow[] = json.documents || json;
        if (Array.isArray(docs)) {
          setDocuments(docs);
        }
      }
    } catch (e) {
      console.error("Failed to fetch documents:", e);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  // Fetch single document detail
  const fetchDetail = useCallback(async (docId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/proxy/documents/${docId}/status`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setSelectedDetail(json);
      }
    } catch (e) {
      console.error("Failed to fetch detail:", e);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Polling effect for pending documents
  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(() => {
      fetchDocuments();
      if (selectedDocId) {
        fetchDetail(selectedDocId);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchDocuments, fetchDetail, selectedDocId]);

  useEffect(() => {
    if (selectedDocId) {
      fetchDetail(selectedDocId);
    } else {
      setSelectedDetail(null);
    }
  }, [selectedDocId, fetchDetail]);

  // Upload handler
  const handleFilesUpload = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadResults(null);

    const formData = new FormData();
    Array.from(fileList).forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/proxy/documents", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (res.ok && json.results) {
        setUploadResults(json.results);
        await fetchDocuments();
      } else {
        alert(json.error || "Upload failed");
      }
    } catch (err: unknown) {
      alert(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
    }
  };

  // Search handler
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

  // Correction handling
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
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `${safeName}_audit_export.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    if (activeFilter === "NEEDS_REVIEW") {
      return doc.status === "NEEDS_REVIEW" || doc.status === "FLAGGED";
    }
    if (activeFilter === "READY") {
      return doc.status === "READY";
    }
    if (activeFilter === "FAILED") {
      return doc.status === "FAILED";
    }
    return true;
  });

  const processedCount = documents.filter((d) => d.status === "READY").length;
  const needsReviewCount = documents.filter(
    (d) => d.status === "NEEDS_REVIEW" || d.status === "FLAGGED"
  ).length;
  const failedCount = documents.filter((d) => d.status === "FAILED").length;

  return (
    <DashboardShell
      documentsCount={documents.length}
      needsReviewCount={needsReviewCount}
      activeFilter={activeFilter}
      onSelectFilter={(f) => {
        setActiveFilter(f);
        if (f === "SEARCH") {
          const el = document.getElementById("search-input");
          el?.focus();
        }
      }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="space-y-8">
        {/* --- 1. Top Greeting & Hybrid Search Bar --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Document Audit Workspace
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Deterministic multi-format parsing, Gemini extraction, math validation, and cross-verification.
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search supplier, item, tax, total (pgvector RRF)..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-stone-900/80 border border-stone-800 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-n3-accent)]/80 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-[var(--color-n3-accent)] text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {searching ? "..." : "Search"}
            </button>
          </form>
        </div>

        {/* --- 2. Upload Dropzone --- */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) handleFilesUpload(e.dataTransfer.files);
          }}
          className="relative rounded-2xl border-2 border-dashed border-stone-800 hover:border-stone-700 bg-stone-950/40 hover:bg-stone-900/30 p-8 text-center transition-all duration-200 cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) handleFilesUpload(e.target.files);
            }}
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.xlsx,.xls,.csv"
            className="hidden"
          />
          <div className="w-12 h-12 rounded-2xl bg-stone-900/80 text-[var(--color-n3-accent)] flex items-center justify-center mx-auto mb-3 border border-stone-800 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-white mb-1">
            Drop invoices here or click to browse
          </h2>
          <p className="text-xs text-stone-400 max-w-md mx-auto mb-3">
            Supported formats: PDF (digital & scan), PNG, JPG, TIFF, XLSX, XLS, and CSV up to 50MB.
          </p>
          <button
            type="button"
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-white border border-stone-700 transition-colors"
          >
            {uploading ? "Ingesting & Analyzing..." : "Choose files"}
          </button>
        </div>

        {/* Upload feedback */}
        {uploadResults && (
          <div className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 text-xs space-y-1.5">
            <div className="font-semibold text-white mb-2">Ingestion Batch Summary:</div>
            {uploadResults.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-stone-300">
                <span className="truncate max-w-md">{item.filename}</span>
                <span
                  className={
                    item.accepted ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"
                  }
                >
                  {item.accepted ? "Queued for Processing" : item.errorMessage || "Rejected"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* --- 3. Three Stats Cards (Clickable Filters) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveFilter(activeFilter === "READY" ? null : "READY")}
            className={`p-5 rounded-2xl border text-left transition-all ${
              activeFilter === "READY"
                ? "bg-emerald-950/40 border-emerald-500/50 ring-2 ring-emerald-500/30"
                : "bg-stone-900/50 border-stone-800/80 hover:border-stone-700"
            }`}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
              <span>Processed Invoices</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{processedCount}</div>
            <div className="text-[11px] text-emerald-400 font-medium">Math & Grounding Validated</div>
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === "NEEDS_REVIEW" ? null : "NEEDS_REVIEW")}
            className={`p-5 rounded-2xl border text-left transition-all ${
              activeFilter === "NEEDS_REVIEW"
                ? "bg-amber-950/40 border-amber-500/50 ring-2 ring-amber-500/30"
                : "bg-stone-900/50 border-stone-800/80 hover:border-stone-700"
            }`}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
              <span>Need a Quick Look</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{needsReviewCount}</div>
            <div className="text-[11px] text-amber-400 font-medium">Flagged for Human Review</div>
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === "FAILED" ? null : "FAILED")}
            className={`p-5 rounded-2xl border text-left transition-all ${
              activeFilter === "FAILED"
                ? "bg-red-950/40 border-red-500/50 ring-2 ring-red-500/30"
                : "bg-stone-900/50 border-stone-800/80 hover:border-stone-700"
            }`}
          >
            <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
              <span>Couldn&apos;t Be Read</span>
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{failedCount}</div>
            <div className="text-[11px] text-stone-400">Corrupted or Unparsable</div>
          </button>
        </div>

        {/* --- Search Results Section (if active) --- */}
        {searchHits.length > 0 && (
          <div className="p-5 rounded-2xl bg-stone-900/80 border border-teal-800/60 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">
                  Hybrid Search Results ({searchHits.length} hits via {searchMode || "RRF"})
                </h3>
              </div>
              <button
                onClick={() => setSearchHits([])}
                className="text-xs text-stone-400 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {searchHits.map((hit) => (
                <div
                  key={hit.document_id}
                  onClick={() => setSelectedDocId(hit.document_id)}
                  className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 hover:border-teal-500/60 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{hit.filename}</div>
                    <div className="text-[11px] text-stone-400 truncate max-w-lg">{hit.headline}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-teal-400 font-bold">
                      Score: {(hit.score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 4. Main Split Inspector & Review List --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Documents Table / Needs Review List (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-stone-900/40 border border-stone-800/80 overflow-hidden">
            <div className="p-4 border-b border-stone-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-stone-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Documents {activeFilter ? `(${activeFilter})` : `(${filteredDocuments.length})`}
                </h3>
              </div>
              <button
                onClick={fetchDocuments}
                className="p-1 rounded text-stone-400 hover:text-white"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-stone-800/60 max-h-[600px] overflow-y-auto">
              {filteredDocuments.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500">
                  No documents found matching this filter.
                </div>
              ) : (
                filteredDocuments.map((doc) => {
                  const isSelected = selectedDocId === doc.id;
                  const isNeedsReview = doc.status === "NEEDS_REVIEW" || doc.status === "FLAGGED";

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`p-3.5 text-left cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-stone-800/90 border-l-2 border-[var(--color-n3-accent)]"
                          : "hover:bg-stone-900/60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                          {doc.filename}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                            doc.status === "READY"
                              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/50"
                              : isNeedsReview
                              ? "bg-amber-950/60 text-amber-300 border-amber-800/50 animate-pulse"
                              : doc.status === "FAILED"
                              ? "bg-red-950/60 text-red-400 border-red-800/50"
                              : "bg-blue-950/60 text-blue-400 border-blue-800/50"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-400">
                        <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Document Detail & Inspector (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-stone-900/40 border border-stone-800/80 p-5 text-left">
            {!selectedDetail ? (
              <div className="p-16 text-center text-stone-500 text-xs flex flex-col items-center">
                <FileText className="w-10 h-10 text-stone-700 mb-3" />
                <span>Select an invoice from the list to inspect fields, check math, or review audit flags.</span>
              </div>
            ) : (
              <div>
                {/* Header & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800/80 gap-3 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white truncate max-w-sm">
                      {selectedDetail.document.filename}
                    </h2>
                    <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                      <span>Status: {selectedDetail.document.status}</span>
                      <span>•</span>
                      <span>ID: {selectedDetail.document.id.slice(0, 8)}...</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => triggerReprocess(selectedDetail.document.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 border border-stone-700 flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reprocess</span>
                    </button>

                    <button
                      onClick={() => downloadJson(selectedDetail)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 border border-stone-700 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 border border-stone-700 flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Banner message */}
                {correctionBanner && (
                  <div className="p-3 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
                    <span>{correctionBanner}</span>
                    <button onClick={() => setCorrectionBanner(null)} className="text-emerald-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-stone-800/80 mb-5 pb-2 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab("invoices")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      activeTab === "invoices"
                        ? "bg-stone-800 text-white"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    Extracted Fields ({selectedDetail.invoices.length})
                  </button>

                  <button
                    onClick={() => setActiveTab("flags")}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === "flags"
                        ? "bg-stone-800 text-white"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    <span>Audit Flags</span>
                    {selectedDetail.validation_flags.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                        {selectedDetail.validation_flags.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("chunks")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      activeTab === "chunks"
                        ? "bg-stone-800 text-white"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    Raw OCR / Text Chunks
                  </button>

                  <button
                    onClick={() => setActiveTab("audit")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      activeTab === "audit"
                        ? "bg-stone-800 text-white"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    Audit Log
                  </button>
                </div>

                {/* Tab: Invoices & Inline Correction Form */}
                {activeTab === "invoices" && (
                  <div className="space-y-4">
                    {selectedDetail.invoices.length === 0 ? (
                      <div className="p-8 text-center text-xs text-stone-500">
                        No structured invoices extracted yet.
                      </div>
                    ) : (
                      selectedDetail.invoices.map((inv) => {
                        const isEditing = editingInvoiceId === inv.id;

                        if (isEditing) {
                          return (
                            <form
                              key={inv.id}
                              onSubmit={(e) => {
                                e.preventDefault();
                                submitCorrection(selectedDetail.document.id, inv.id);
                              }}
                              className="p-4 rounded-xl bg-stone-950/80 border border-[var(--color-n3-accent)]/80 space-y-4"
                            >
                              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                                <span className="text-xs font-semibold text-[var(--color-n3-accent)] flex items-center gap-1">
                                  <Edit2 className="w-3.5 h-3.5" /> Inline Correction & Revalidation
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingInvoiceId(null)}
                                    className="p-1 rounded text-stone-400 hover:text-white text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <label className="text-stone-400 block mb-1">Invoice #</label>
                                  <input
                                    type="text"
                                    value={editForm.invoice_number}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, invoice_number: e.target.value })
                                    }
                                    className="w-full p-2 rounded bg-stone-900 border border-stone-700 text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-stone-400 block mb-1">Date</label>
                                  <input
                                    type="date"
                                    value={editForm.invoice_date}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, invoice_date: e.target.value })
                                    }
                                    className="w-full p-2 rounded bg-stone-900 border border-stone-700 text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-stone-400 block mb-1">Supplier</label>
                                  <input
                                    type="text"
                                    value={editForm.supplier_name}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, supplier_name: e.target.value })
                                    }
                                    className="w-full p-2 rounded bg-stone-900 border border-stone-700 text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-stone-400 block mb-1">Customer</label>
                                  <input
                                    type="text"
                                    value={editForm.customer_name}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, customer_name: e.target.value })
                                    }
                                    className="w-full p-2 rounded bg-stone-900 border border-stone-700 text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-stone-400 block mb-1">Subtotal</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.subtotal}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, subtotal: e.target.value })
                                    }
                                    className="w-full p-2 rounded bg-stone-900 border border-stone-700 text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-stone-400 block mb-1">Tax</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.tax}
                                    onChange={(e) => setEditForm({ ...editForm, tax: e.target.value })}
                                    className="w-full p-2 rounded bg-stone-900 border border-stone-700 text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-stone-400 block mb-1">Total</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.total}
                                    onChange={(e) => setEditForm({ ...editForm, total: e.target.value })}
                                    className="w-full p-2 rounded bg-stone-900 border border-stone-700 text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-stone-400 block mb-1">Currency</label>
                                  <input
                                    type="text"
                                    value={editForm.currency}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, currency: e.target.value })
                                    }
                                    className="w-full p-2 rounded bg-stone-900 border border-stone-700 text-white"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                                {/* Disabled Send To Select */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-stone-500">Send to:</span>
                                  <select
                                    disabled
                                    className="text-xs bg-stone-900 border border-stone-800 rounded px-2 py-1 text-stone-500 cursor-not-allowed"
                                  >
                                    <option>QuickBooks (Soon)</option>
                                    <option>Notion (Soon)</option>
                                    <option>Google Sheets (Soon)</option>
                                  </select>
                                </div>

                                <button
                                  type="submit"
                                  disabled={savingCorrection}
                                  className="px-4 py-2 rounded-lg bg-[var(--color-n3-accent)] hover:bg-orange-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                                >
                                  {savingCorrection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  <span>Save and approve</span>
                                </button>
                              </div>
                            </form>
                          );
                        }

                        return (
                          <div
                            key={inv.id}
                            className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-3"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-stone-800/60">
                              <span className="text-xs font-semibold text-white">
                                Invoice #{inv.invoice_number || "N/A"}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => startEditing(inv)}
                                  className="px-2.5 py-1 text-[11px] rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium flex items-center gap-1 transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" /> Edit & Fix
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-stone-500 block text-[10px] uppercase">Supplier</span>
                                <span className="font-medium text-stone-200">
                                  {inv.supplier_name || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-stone-500 block text-[10px] uppercase">Customer</span>
                                <span className="font-medium text-stone-200">
                                  {inv.customer_name || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-stone-500 block text-[10px] uppercase">Date</span>
                                <span className="font-medium text-stone-200">
                                  {inv.invoice_date ? String(inv.invoice_date).slice(0, 10) : "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-stone-500 block text-[10px] uppercase">Currency</span>
                                <span className="font-medium text-stone-200">
                                  {inv.currency || "USD"}
                                </span>
                              </div>
                              <div>
                                <span className="text-stone-500 block text-[10px] uppercase">Subtotal</span>
                                <span className="font-mono text-stone-200">
                                  ${inv.subtotal != null ? inv.subtotal.toFixed(2) : "0.00"}
                                </span>
                              </div>
                              <div>
                                <span className="text-stone-500 block text-[10px] uppercase">Tax</span>
                                <span className="font-mono text-stone-200">
                                  ${inv.tax != null ? inv.tax.toFixed(2) : "0.00"}
                                </span>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="text-stone-500 block text-[10px] uppercase">Total</span>
                                <span className="font-mono text-base font-bold text-emerald-400">
                                  ${inv.total != null ? inv.total.toFixed(2) : "0.00"}
                                </span>
                              </div>
                            </div>

                            {/* Line items if available */}
                            {inv.line_items && inv.line_items.length > 0 && (
                              <div className="pt-2 border-t border-stone-800/60">
                                <span className="text-[10px] uppercase text-stone-500 font-semibold block mb-1">
                                  Line Items ({inv.line_items.length})
                                </span>
                                <div className="space-y-1">
                                  {inv.line_items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-[11px] text-stone-300 bg-stone-900/60 px-2 py-1 rounded"
                                    >
                                      <span>{item.description || "Item"}</span>
                                      <span className="font-mono">
                                        ${item.total_price != null ? item.total_price.toFixed(2) : "—"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Tab: Flags with Plain-Language Map */}
                {activeTab === "flags" && (
                  <div className="space-y-3">
                    {selectedDetail.validation_flags.length === 0 ? (
                      <div className="p-8 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>All arithmetic, required fields, and token grounding verified clean!</span>
                      </div>
                    ) : (
                      selectedDetail.validation_flags.map((flag) => {
                        const plainMsg =
                          FLAG_DESCRIPTIONS[flag.flag_code] || flag.message || "Discrepancy detected";
                        return (
                          <div
                            key={flag.id}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                              flag.severity === "CRITICAL"
                                ? "bg-red-950/40 border-red-800/60 text-red-200"
                                : "bg-amber-950/40 border-amber-800/60 text-amber-200"
                            }`}
                          >
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-semibold text-white">{plainMsg}</div>
                              <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-1 font-mono">
                                <span>Code: {flag.flag_code}</span>
                                {flag.field_name && <span>• Field: {flag.field_name}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Tab: Raw OCR Chunks */}
                {activeTab === "chunks" && (
                  <div className="space-y-2">
                    {!selectedDetail.text_chunks || selectedDetail.text_chunks.length === 0 ? (
                      <div className="p-8 text-center text-xs text-stone-500">
                        No raw text chunks recorded for this file.
                      </div>
                    ) : (
                      selectedDetail.text_chunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 text-[11px] font-mono text-stone-300 leading-relaxed whitespace-pre-wrap"
                        >
                          <div className="text-[10px] text-stone-500 font-sans mb-1">
                            Chunk #{chunk.chunk_index} · Page {chunk.page_number || 1}
                          </div>
                          {chunk.text_content}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Audit Log */}
                {activeTab === "audit" && (
                  <div className="space-y-2">
                    {selectedDetail.audit_logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-stone-950/50 border border-stone-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-stone-200">{log.action}</span>
                          <span className="text-stone-500 text-[11px] ml-2">by {log.actor || "system"}</span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
