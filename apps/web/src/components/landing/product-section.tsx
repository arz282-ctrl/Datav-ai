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
import { Button } from "@/components/ui/saa-s-template";
import { InteractiveDashboardCard } from "@/components/landing/interactive-dashboard-card";

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
        {/* --- Top Section Heading & Pill (SaaS Template Style) --- */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--color-n3-accent,#ff7a2f)] animate-pulse" />
            <span className="text-xs text-gray-300">
              Grounded extraction · 100% deterministic math validation
            </span>
            <a
              href="#features"
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-all active:scale-95 whitespace-nowrap ml-1"
              aria-label="Read more about features"
            >
              Read more
              <ArrowRight className="w-3 h-3" />
            </a>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight leading-tight mb-6"
            style={{
              background: "linear-gradient(to bottom, #ffffff, #ffffff, rgba(255, 255, 255, 0.6))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.04em",
            }}
          >
            Every invoice, checked before it reaches your books
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10"
          >
            Upload anything. DataVai extracts the fields, verifies the maths, and only asks you about what looks wrong.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center gap-4 relative z-10"
          >
            <Link href="/dashboard">
              <Button
                type="button"
                variant="gradient"
                size="lg"
                className="rounded-lg flex items-center justify-center gap-2 shadow-2xl cursor-pointer"
                aria-label="Open the dashboard"
              >
                <span>Open the dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* --- Large Dashboard Preview Card with SaaS Layered Aura --- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-28 max-w-5xl mx-auto group"
        >
          {/* Ambient visual aura from SaaS template */}
          <div
            className="absolute left-1/2 w-[95%] pointer-events-none z-0"
            style={{
              top: "-22%",
              transform: "translateX(-50%)",
            }}
            aria-hidden="true"
          >
            <img
              src="https://cdn.21st.dev/assets/mirror/ab/abe6d8090cc14780b846eee062024e4e03274c99d38188554239cd312a7180fa.png"
              alt=""
              className="w-full h-auto opacity-70"
              loading="eager"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </div>

          <div className="relative z-10 space-y-5">
            {/* Live Interactive Dashboard Preview Card matching real workspace */}
            <InteractiveDashboardCard />

            {/* Interactive Stats Grid */}
            <div className="rounded-xl bg-[#0c0c10] border border-stone-800 p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
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
