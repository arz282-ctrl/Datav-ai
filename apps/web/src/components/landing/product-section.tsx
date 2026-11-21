"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import {
  FileText,
  Scan,
  ShieldCheck,
  Calculator,
  GitCompare,
  Search,
  ArrowRight,
  Upload,
  CheckCircle,
  FileCheck2,
  ExternalLink,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Multi-Format Ingestion",
    description:
      "Handles native digital PDFs, multi-sheet Excel workbooks (XLSX, XLS), accounting CSVs, and image scans without schema pre-configuration.",
  },
  {
    icon: Scan,
    title: "OCR for Scanned Documents",
    description:
      "Integrated OpenCV pre-processing pipeline (deskew, bilateral filter, Otsu binarization) feeding high-accuracy Tesseract OCR.",
  },
  {
    icon: ShieldCheck,
    title: "Grounded Extraction",
    description:
      "Strict format-aware token grounding prevents hallucinations. Every currency, date, and invoice number is verified against source text.",
  },
  {
    icon: Calculator,
    title: "Deterministic Validation",
    description:
      "Runs automated arithmetic balance checks (subtotal + tax = total), line-item summations, and SHA-256 duplicate invoice detection.",
  },
  {
    icon: GitCompare,
    title: "Ledger Cross-Verification",
    description:
      "Automatically reconciles invoices against bank or accounting ledgers with RapidFuzz token matching to highlight discrepancies.",
  },
  {
    icon: Search,
    title: "Hybrid Vector & Keyword Search",
    description:
      "Powered by PostgreSQL 16 + pgvector (768-dim embeddings) and Reciprocal Rank Fusion (RRF) for semantic query intelligence.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Upload Documents",
    description:
      "Drag-and-drop batch invoices, purchase orders, or payment statements. Digital files and noisy scans are ingested simultaneously.",
  },
  {
    step: "02",
    title: "Review High-Confidence Flags",
    description:
      "Only look at flagged discrepancies. Correct mismatched totals with instant synchronous re-validation in a split-screen viewer.",
  },
  {
    step: "03",
    title: "Search & Export Clean Data",
    description:
      "Export validated JSON, print formatted summaries, or search millions of lines using hybrid natural-language queries.",
  },
];

const CONNECTORS = [
  { name: "Gmail & Outlook", type: "Inbound Email", desc: "Auto-extract attached bills" },
  { name: "Google Drive", type: "Cloud Storage", desc: "Sync invoice folders" },
  { name: "Slack", type: "Alerting", desc: "Notify on math mismatches" },
  { name: "Notion", type: "Knowledgebase", desc: "Export records to databases" },
  { name: "Google Sheets", type: "Spreadsheets", desc: "Append verified line rows" },
  { name: "QuickBooks & Xero", type: "Accounting ERP", desc: "Push audited bills directly" },
];

export function ProductSection() {
  return (
    <section id="product" className="relative bg-[#171717] text-[#f8f7f3] pt-24 pb-28 overflow-hidden font-sans">
      {/* Soft gradient blend seam between light hero and dark section */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[var(--color-n3-page)] to-[#171717] opacity-15 pointer-events-none" />

      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--color-n3-accent)]/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* --- Top Section Heading & Pill --- */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900/90 border border-stone-700/60 shadow-inner mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--color-n3-accent)]" />
            <span className="text-xs font-medium text-stone-300">
              Grounded extraction · no invented values
            </span>
            <a
              href="#features"
              className="text-xs font-semibold text-[var(--color-n3-accent)] hover:underline ml-1"
            >
              Read more &rarr;
            </a>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-b from-white via-stone-200 to-stone-400 bg-clip-text text-transparent leading-tight mb-6"
          >
            Every invoice, checked before it reaches your books
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-base sm:text-lg text-stone-400 leading-relaxed max-w-2xl mx-auto mb-8"
          >
            Upload anything. DataVai extracts the fields, verifies the maths, and only asks you about what looks wrong.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--color-n3-accent)] to-orange-600 hover:from-orange-500 hover:to-orange-600 shadow-lg shadow-orange-950/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)]"
            >
              <span>Open the dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* --- Large Dashboard Preview Card with Glass Aesthetic --- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-stone-800/80 bg-stone-900/60 p-2 sm:p-4 shadow-2xl backdrop-blur-xl mb-28 max-w-5xl mx-auto group"
        >
          {/* Card Topbar Mock */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-stone-800/70 mb-3 text-xs text-stone-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
              <span className="ml-2 font-mono text-stone-400 text-[11px]">app.datav.ai/dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 text-[10px] font-medium">
                Live Audit Active
              </span>
            </div>
          </div>

          {/* High-res Dashboard Preview Image */}
          <div className="relative w-full rounded-xl overflow-hidden mb-3 border border-stone-800">
            <Image
              src="/landing/dashboard-preview.webp"
              alt="DataVai Financial Document Audit Dashboard Preview"
              width={1600}
              height={900}
              className="w-full h-auto object-cover"
              priority
            />
          </div>

          {/* Interactive Mock Dashboard View */}
          <div className="rounded-xl bg-[#0c0c10] border border-stone-800 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {/* Stat 1 */}
            <div className="p-4 rounded-xl bg-stone-900/50 border border-stone-800/60">
              <div className="text-xs text-stone-400 font-medium mb-1">Processed Invoices</div>
              <div className="text-2xl font-bold text-white mb-2">20 / 20 Verified</div>
              <div className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> 100% Grounded (No Hallucination)
              </div>
            </div>

            {/* Stat 2 */}
            <div className="p-4 rounded-xl bg-stone-900/50 border border-stone-800/60">
              <div className="text-xs text-stone-400 font-medium mb-1">Audit Discrepancies</div>
              <div className="text-2xl font-bold text-[var(--color-n3-accent)] mb-2">2 Flagged</div>
              <div className="text-xs text-stone-400">Math mismatch: $1,420.00 vs $1,400.00</div>
            </div>

            {/* Stat 3 */}
            <div className="p-4 rounded-xl bg-stone-900/50 border border-stone-800/60">
              <div className="text-xs text-stone-400 font-medium mb-1">Hybrid Search Engine</div>
              <div className="text-2xl font-bold text-teal-400 mb-2">pgvector RRF</div>
              <div className="text-xs text-stone-400">768-dim embeddings + Full-Text</div>
            </div>

            {/* Split Screen Mock Row */}
            <div className="md:col-span-3 p-4 rounded-xl bg-stone-950/70 border border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-n3-accent)]/20 text-[var(--color-n3-accent)] flex items-center justify-center font-bold">
                  PDF
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">inv_06_scan_blur.pdf</div>
                  <div className="text-xs text-stone-400">Tesseract OCR · Bilateral Deskew · Gemini 1.5 Flash</div>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <span className="text-xs font-mono text-stone-300 bg-stone-800/80 px-2.5 py-1 rounded-md">
                  Tax: $280.00 | Total: $2,280.00
                </span>
                <Link
                  href="/dashboard"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors border border-stone-700 flex items-center gap-1"
                >
                  Inspect in Live Dashboard &rarr;
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- Features Grid (id="features") --- */}
        <div id="features" className="mb-28 pt-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Built for precision, audited for truth
            </h2>
            <p className="text-sm sm:text-base text-stone-400">
              Engineered with zero hallucination tolerance, format-aware grounding, and strict deterministic validation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => {
              const IconComp = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="p-6 rounded-2xl bg-stone-900/50 border border-stone-800/80 hover:border-stone-700 hover:bg-stone-900/80 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-[var(--color-n3-accent)] mb-4 border border-stone-700/60">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-stone-400 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* --- How It Works Section (id="how-it-works") --- */}
        <div id="how-it-works" className="mb-28 pt-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              How DataVai Works
            </h2>
            <p className="text-sm sm:text-base text-stone-400">
              From noisy receipt scans to audited accounting records in three deterministic steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="relative p-6 rounded-2xl bg-stone-900/40 border border-stone-800/60 flex flex-col justify-between"
              >
                <div>
                  <span className="text-4xl font-extrabold text-stone-700 block mb-4 font-mono">
                    {step.step}
                  </span>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-stone-400 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* --- Connectors Section (id="connectors") --- */}
        <div id="connectors" className="pt-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Planned Connectors
            </h2>
            <p className="text-sm sm:text-base text-stone-400">
              Integrations under active development to stream documents in and verified data out.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CONNECTORS.map((c) => (
              <div
                key={c.name}
                className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 flex flex-col items-start justify-between min-h-[110px]"
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">
                    Roadmap
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white mb-0.5">{c.name}</h4>
                  <p className="text-[11px] text-stone-400">{c.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
