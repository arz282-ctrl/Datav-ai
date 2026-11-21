"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Eye,
  History,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  Search,
  ExternalLink,
} from "lucide-react";

interface InvoiceData {
  id: string;
  filename: string;
  size: string;
  status: "VERIFIED" | "NEEDS_REVIEW";
  statusLabel: string;
  confidence: number;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  customerName: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  mathVariance: number;
  lineItems: { description: string; qty: number; unitPrice: number; total: number }[];
  flags: { severity: "CRITICAL" | "WARNING"; code: string; message: string; field: string }[];
  ocrChunks: { chunk: number; page: number; text: string }[];
  auditTimeline: { step: string; actor: string; time: string; detail: string }[];
}

const SAMPLE_DOCS: InvoiceData[] = [
  {
    id: "doc-1",
    filename: "inv_01_clean.pdf",
    size: "1.6 KB",
    status: "VERIFIED",
    statusLabel: "100% Grounded · Math Clean",
    confidence: 99.4,
    invoiceNumber: "INV-2024-8841",
    invoiceDate: "2024-11-15",
    supplierName: "Acme Industrial Supplies Ltd",
    customerName: "Global Logistics Corp",
    currency: "USD",
    subtotal: 2000.0,
    tax: 280.0,
    total: 2280.0,
    mathVariance: 0.0,
    lineItems: [
      { description: "Precision CNC Milling Bit Sets (10-pack)", qty: 4, unitPrice: 250.0, total: 1000.0 },
      { description: "High-Grade Tungsten Carbide Rods 12mm", qty: 10, unitPrice: 100.0, total: 1000.0 },
    ],
    flags: [],
    ocrChunks: [
      {
        chunk: 1,
        page: 1,
        text: `INVOICE #INV-2024-8841\nDate: 15-Nov-2024\nAcme Industrial Supplies Ltd\nBill To: Global Logistics Corp\nItems:\n1. Precision CNC Milling Bit Sets x4 @ $250.00 = $1,000.00\n2. High-Grade Tungsten Carbide Rods x10 @ $100.00 = $1,000.00\nSubtotal: $2,000.00 | Tax (14%): $280.00 | Total: $2,280.00`,
      },
    ],
    auditTimeline: [
      { step: "SHA-256 Checksum", actor: "Ingestion Service", time: "10:14:02", detail: "21c3118893... verified duplicate-free" },
      { step: "Deterministic OCR", actor: "Tesseract & Deskew", time: "10:14:03", detail: "1 page, 1 layout chunk extracted" },
      { step: "Vision LLM Parsing", actor: "Gemini 1.5 Flash", time: "10:14:05", detail: "Grounded schema extraction (99.4% confidence)" },
      { step: "Arithmetic Rule Check", actor: "Rule Engine", time: "10:14:05", detail: "Subtotal $2,000.00 + Tax $280.00 = Total $2,280.00 (Pass)" },
      { step: "Status Evaluated", actor: "Orchestrator", time: "10:14:06", detail: "Marked [VERIFIED] - ready for GL export" },
    ],
  },
  {
    id: "doc-2",
    filename: "MR-2021-786.pdf",
    size: "1.6 KB",
    status: "NEEDS_REVIEW",
    statusLabel: "Cash Voucher · 1 Discrepancy",
    confidence: 96.8,
    invoiceNumber: "MR-20/21-786",
    invoiceDate: "2023-01-08",
    supplierName: "Edward M. Kennedy Center",
    customerName: "Rijuyan Ahmed (ID: 709342)",
    currency: "BDT",
    subtotal: 500.0,
    tax: 0.0,
    total: 500.0,
    mathVariance: 0.0,
    lineItems: [
      { description: "Cash Payment Voucher - Sum: Taka Five Hundred Only", qty: 1, unitPrice: 500.0, total: 500.0 },
    ],
    flags: [
      {
        severity: "WARNING",
        code: "MISSING_TAX_DECLARATION",
        field: "tax",
        message: "Tax / VAT line is missing on voucher. Defaulted to 0.00 with flag for manual sign-off.",
      },
    ],
    ocrChunks: [
      {
        chunk: 1,
        page: 1,
        text: `No. : MR-20/21-786\nDated: 8-Jan-23\nEdward M. Kennedy Center\nMidas Center, 9th Floor, Dhanmondi, Dhaka -1209\nReceived with thanks from: ID:709342\nThe sum of: Taka Five Hundred Only\nBy: Cash | Remarks: Name: Rijuyan Ahmed\nTk 500.00/- Authorised Signatory`,
      },
    ],
    auditTimeline: [
      { step: "SHA-256 Ingestion", actor: "Upload Endpoint", time: "09:48:10", detail: "SHA-256 hashed and recorded in PostgreSQL" },
      { step: "Tesseract OCR", actor: "Worker Process", time: "09:48:12", detail: "Processed 1 scanned voucher page" },
      { step: "Gemini Structured Parse", actor: "Gemini 1.5 Flash", time: "09:48:14", detail: "Mapped supplier, receipt number, currency (BDT)" },
      { step: "Audit Rule Evaluation", actor: "Validator Engine", time: "09:48:15", detail: "Flagged missing tax declaration on payment voucher" },
      { step: "Status Evaluated", actor: "Orchestrator", time: "09:48:15", detail: "Marked [NEEDS_REVIEW] for human confirmation" },
    ],
  },
  {
    id: "doc-3",
    filename: "Receipt-2024-0427-0089.pdf",
    size: "32.7 KB",
    status: "NEEDS_REVIEW",
    statusLabel: "Math Mismatch -$100.00",
    confidence: 97.2,
    invoiceNumber: "AC-99201-B",
    invoiceDate: "2024-10-22",
    supplierName: "Apex Cloud Infrastructure Inc.",
    customerName: "DataFlow Enterprise",
    currency: "USD",
    subtotal: 1400.0,
    tax: 120.0,
    total: 1420.0,
    mathVariance: -100.0,
    lineItems: [
      { description: "Managed Kubernetes Cluster Compute", qty: 2, unitPrice: 500.0, total: 1000.0 },
      { description: "High-IOPS Persistent Storage 4TB", qty: 1, unitPrice: 400.0, total: 400.0 },
    ],
    flags: [
      {
        severity: "CRITICAL",
        code: "ARITHMETIC_MISMATCH",
        field: "total",
        message: "Math discrepancy: Subtotal ($1,400.00) + Tax ($120.00) = $1,520.00, but invoice declared Total is $1,420.00 (-$100.00 difference).",
      },
    ],
    ocrChunks: [
      {
        chunk: 1,
        page: 1,
        text: `Apex Cloud Infrastructure Inc.\nInvoice: AC-99201-B | Date: 2024-10-22\nBill To: DataFlow Enterprise\nCluster Compute x2 @ 500.00 = 1,000.00\nStorage 4TB x1 @ 400.00 = 400.00\nSubtotal: $1,400.00\nTax: $120.00\nTotal Due: $1,420.00 (DISCREPANCY DETECTED)`,
      },
    ],
    auditTimeline: [
      { step: "SHA-256 Ingestion", actor: "API Gateway", time: "11:20:01", detail: "Registered 32.7 KB PDF payload" },
      { step: "Text Chunker", actor: "OCR Worker", time: "11:20:02", detail: "Extracted line coordinates and table structure" },
      { step: "Gemini Structured Extract", actor: "Gemini 1.5 Flash", time: "11:20:04", detail: "Parsed line items and declared totals" },
      { step: "Deterministic Math Check", actor: "Validation Engine", time: "11:20:04", detail: "CRITICAL FLAG: $1,400 + $120 != $1,420 (-$100 discrepancy)" },
      { step: "Status Evaluated", actor: "Orchestrator", time: "11:20:05", detail: "Marked [NEEDS_REVIEW] - alert sent to ledger audit queue" },
    ],
  },
];

export function InteractiveDashboardCard() {
  const [selectedId, setSelectedId] = useState<string>("doc-2");
  const [activeTab, setActiveTab] = useState<"fields" | "flags" | "ocr" | "audit">("fields");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const activeDoc = SAMPLE_DOCS.find((d) => d.id === selectedId) || SAMPLE_DOCS[0];

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 900);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(activeDoc, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-stone-800/80 bg-stone-950/90 shadow-2xl backdrop-blur-xl overflow-hidden text-left">
      {/* ── Top Bar with Simulated Browser Chrome ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-stone-800/80 bg-stone-900/60 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
          </div>
          <span className="text-xs font-mono text-stone-400 bg-stone-950 px-2.5 py-1 rounded-md border border-stone-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-n3-accent,#ff7a2f)] animate-ping" />
            <span>app.datav.ai/dashboard</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 text-[11px] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Live Audit Engine Active</span>
          </span>
          <Link
            href="/dashboard"
            className="text-xs font-medium text-[var(--color-n3-accent,#ff7a2f)] hover:underline flex items-center gap-1 pl-2"
          >
            <span>Open Real Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Document Quick-Selector Bar ── */}
      <div className="p-3 bg-stone-900/40 border-b border-stone-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-stone-400 font-medium mr-1 text-[11px] uppercase tracking-wider">
            Select Sample Ingestion:
          </span>
          {SAMPLE_DOCS.map((doc) => {
            const isSelected = doc.id === activeDoc.id;
            return (
              <button
                key={doc.id}
                onClick={() => setSelectedId(doc.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-stone-800 text-white border border-stone-700 shadow-sm"
                    : "bg-stone-950 text-stone-400 border border-stone-850 hover:text-stone-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-stone-400" />
                <span>{doc.filename}</span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    doc.status === "VERIFIED"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                      : "bg-amber-950 text-amber-300 border border-amber-800/60"
                  }`}
                >
                  {doc.status}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateScan}
            disabled={isScanning}
            className="px-2.5 py-1 rounded-lg bg-[var(--color-n3-accent,#ff7a2f)] hover:bg-orange-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Scanning with Gemini..." : "Re-Scan Document"}</span>
          </button>
          <button
            onClick={handleCopyJson}
            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium text-xs flex items-center gap-1 transition-colors border border-stone-700 cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied JSON" : "Copy JSON"}</span>
          </button>
        </div>
      </div>

      {/* ── Main Split View (Documents List 4 cols + Inspector 8 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        {/* Left Column: Document Queue */}
        <div className="lg:col-span-4 border-r border-stone-800/80 bg-stone-950/60 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-800/70 text-xs">
              <span className="font-semibold text-stone-300 uppercase tracking-wider text-[11px]">
                Audited Queue (3 Files)
              </span>
              <span className="text-[11px] text-stone-500">Auto-Refreshed</span>
            </div>

            <div className="space-y-2">
              {SAMPLE_DOCS.map((doc) => {
                const isSelected = doc.id === activeDoc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedId(doc.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-stone-900 border-[var(--color-n3-accent,#ff7a2f)]/70 ring-1 ring-[var(--color-n3-accent,#ff7a2f)]/40"
                        : "bg-stone-900/40 border-stone-850 hover:border-stone-750"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white truncate max-w-[170px]">
                        {doc.filename}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          doc.status === "VERIFIED"
                            ? "bg-emerald-950/70 text-emerald-400 border-emerald-800/50"
                            : "bg-amber-950/70 text-amber-300 border-amber-800/50"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-400 truncate mb-1.5 font-medium">
                      {doc.supplierName}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1.5 border-t border-stone-800/50">
                      <span>{doc.size}</span>
                      <span className="font-mono text-stone-300 font-semibold">
                        {doc.currency} {doc.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800/60 mt-4 text-xs text-stone-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero-Hallucination Policy</span>
            </span>
            <span className="font-mono text-stone-400 text-[11px]">pgvector 16</span>
          </div>
        </div>

        {/* Right Column: Document Detail Inspector */}
        <div className="lg:col-span-8 p-4 sm:p-5 flex flex-col justify-between bg-stone-950/30">
          <div>
            {/* Active Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-stone-800/80 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {activeDoc.filename}
                  </h3>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                      activeDoc.status === "VERIFIED"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                        : "bg-amber-950 text-amber-300 border-amber-800 animate-pulse"
                    }`}
                  >
                    {activeDoc.status}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-1">
                  <span className="font-semibold text-stone-300">{activeDoc.supplierName}</span>
                  <span>•</span>
                  <span>Inv #{activeDoc.invoiceNumber}</span>
                  <span>•</span>
                  <span>{activeDoc.invoiceDate}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-stone-400 block uppercase font-mono">Gemini Confidence</span>
                <span className="text-sm font-bold text-teal-400 font-mono">
                  {activeDoc.confidence}% Validated
                </span>
              </div>
            </div>

            {/* Interactive Inspector Tabs */}
            <div className="flex items-center gap-1.5 border-b border-stone-800/70 pb-2 mb-4 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab("fields")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === "fields"
                    ? "bg-stone-800 text-white border border-stone-700"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--color-n3-accent,#ff7a2f)]" />
                <span>Extracted Fields</span>
              </button>

              <button
                onClick={() => setActiveTab("flags")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === "flags"
                    ? "bg-stone-800 text-white border border-stone-700"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Audit Flags</span>
                {activeDoc.flags.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                    {activeDoc.flags.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("ocr")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === "ocr"
                    ? "bg-stone-800 text-white border border-stone-700"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-teal-400" />
                <span>Scanned OCR Text</span>
              </button>

              <button
                onClick={() => setActiveTab("audit")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === "audit"
                    ? "bg-stone-800 text-white border border-stone-700"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5 text-orange-400" />
                <span>Pipeline Audit Trail</span>
              </button>
            </div>

            {/* Tab 1: Extracted Fields */}
            {activeTab === "fields" && (
              <div className="space-y-4">
                {/* Financial Summary Calculation Card */}
                <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-mono">Subtotal</span>
                    <div className="font-semibold text-white font-mono text-sm mt-0.5">
                      {activeDoc.currency} {activeDoc.subtotal.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-mono">Tax / VAT</span>
                    <div className="font-semibold text-white font-mono text-sm mt-0.5">
                      {activeDoc.currency} {activeDoc.tax.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-mono">Declared Total</span>
                    <div className="font-semibold text-white font-mono text-sm mt-0.5">
                      {activeDoc.currency} {activeDoc.total.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-mono">Math Verification</span>
                    <div className="mt-0.5">
                      {activeDoc.mathVariance === 0 ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
                        </span>
                      ) : (
                        <span className="text-red-400 font-semibold flex items-center gap-1 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" /> Diff: {activeDoc.currency} {activeDoc.mathVariance.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="rounded-xl border border-stone-800/80 overflow-hidden text-xs">
                  <div className="px-3 py-2 bg-stone-900/80 font-semibold text-stone-300 border-b border-stone-800 flex justify-between">
                    <span>Verified Line Items ({activeDoc.lineItems.length})</span>
                    <span className="text-[10px] text-stone-400 font-mono">Deterministic Match</span>
                  </div>
                  <div className="divide-y divide-stone-850">
                    {activeDoc.lineItems.map((item, i) => (
                      <div key={i} className="p-3 bg-stone-950/40 flex items-center justify-between gap-2">
                        <div className="truncate max-w-sm">
                          <div className="font-medium text-stone-200">{item.description}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            Qty: {item.qty} × {activeDoc.currency} {item.unitPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="font-mono font-semibold text-white shrink-0">
                          {activeDoc.currency} {item.total.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Audit Flags */}
            {activeTab === "flags" && (
              <div className="space-y-3">
                {activeDoc.flags.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span className="font-semibold text-sm">No Discrepancies Found</span>
                    <span className="text-stone-400 text-xs">
                      All arithmetic checks, date ranges, supplier lookups, and line item totals matched perfectly.
                    </span>
                  </div>
                ) : (
                  activeDoc.flags.map((flag, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                        flag.severity === "CRITICAL"
                          ? "bg-red-950/40 border-red-800/60 text-red-200"
                          : "bg-amber-950/40 border-amber-800/60 text-amber-200"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white">{flag.code}</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/40">
                            Severity: {flag.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300 leading-relaxed">{flag.message}</p>
                        <div className="text-[10px] text-stone-400 mt-2 font-mono">
                          Target Field: <span className="text-white">{flag.field}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Scanned OCR Text */}
            {activeTab === "ocr" && (
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                  <span>Verbatim Optical Character Recognition (OpenCV Deskewed)</span>
                  <span className="font-mono text-teal-400 text-[10px]">Tesseract OCR + Layout</span>
                </div>
                {activeDoc.ocrChunks.map((chunk, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-stone-950 border border-stone-850 font-mono text-[11px] text-stone-300 leading-relaxed whitespace-pre-wrap select-text"
                  >
                    {chunk.text}
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Pipeline Audit Trail */}
            {activeTab === "audit" && (
              <div className="space-y-2">
                {activeDoc.auditTimeline.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-stone-900/50 border border-stone-800/70 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-stone-800 text-[var(--color-n3-accent,#ff7a2f)] font-bold text-[10px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-stone-200">{step.step}</div>
                        <div className="text-[11px] text-stone-400">{step.detail}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-stone-400 block">{step.actor}</span>
                      <span className="text-[10px] font-mono text-stone-400">{step.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-4 border-t border-stone-800/70 mt-5 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-stone-400 text-[11px]">
              Ready to process high volumes?
            </span>
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-lg bg-[var(--color-n3-accent,#ff7a2f)] hover:bg-orange-600 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
            >
              <span>Test Your Own Invoices in Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InteractiveDashboardCard;
