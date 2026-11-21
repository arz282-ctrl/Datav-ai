"use client";

import React from "react";
import Link from "next/link";
import { Github, ArrowUpRight, ExternalLink } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative bg-[#171717] text-[#f8f7f3] border-t border-stone-800/80 pt-16 pb-12 overflow-hidden font-sans">
      {/* Faint isometric floor-grid pattern at low opacity */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.15] bg-[radial-gradient(#d9d6d0_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-stone-800/60">
          {/* Brand info (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-start">
            <Link
              href="/"
              className="flex items-center gap-2.5 mb-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded-lg"
              aria-label="DataVai Home"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--color-n3-accent)] flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform duration-200">
                Dv
              </div>
              <span className="font-semibold text-xl tracking-tight text-white">
                Data<span className="text-[var(--color-n3-accent)]">Vai</span>
              </span>
            </Link>

            <p className="text-sm text-stone-400 font-medium mb-4 max-w-sm">
              Invoices in, verified data out.
            </p>
            <p className="text-xs text-stone-500 leading-relaxed max-w-sm mb-6">
              Deterministic document extraction, math balance validation, and ledger cross-verification engineered with zero hallucination tolerance.
            </p>

            <a
              href="https://github.com/arz282-ctrl/data-v-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700/60 text-xs font-medium text-stone-300 hover:text-white hover:bg-stone-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)]"
            >
              <Github className="w-3.5 h-3.5" />
              <span>arz282-ctrl/data-v-ai</span>
              <ArrowUpRight className="w-3 h-3 opacity-60" />
            </a>
          </div>

          {/* Spacer (1 col) */}
          <div className="hidden md:block md:col-span-1" />

          {/* Links: Product (3 cols) */}
          <div className="md:col-span-3 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 mb-4">
              Product
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="#features"
                  className="text-stone-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded"
                >
                  Features & Capabilities
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="text-stone-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#connectors"
                  className="text-stone-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded"
                >
                  Planned Connectors
                </a>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-[var(--color-n3-accent)] hover:underline font-medium inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded"
                >
                  Interactive Dashboard
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Links: Resources (3 cols) */}
          <div className="md:col-span-3 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 mb-4">
              Resources & Architecture
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://github.com/arz282-ctrl/data-v-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-white transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded"
                >
                  GitHub Repository
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/arz282-ctrl/data-v-ai/blob/main/docs/ARCHITECTURE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-white transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded"
                >
                  Architecture Specification
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/arz282-ctrl/data-v-ai/blob/main/EVALUATION_REPORT.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-white transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded"
                >
                  Evaluation Report & Metrics
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/arz282-ctrl/data-v-ai/blob/main/README.md#key-capabilities"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-white transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded"
                >
                  AI Grounding Disclosure
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>&copy; 2026 DataVai. All rights reserved.</div>
          <div className="text-stone-400 text-center sm:text-right">
            Built with Gemini, FastAPI, Next.js, PostgreSQL + pgvector
          </div>
        </div>
      </div>
    </footer>
  );
}
