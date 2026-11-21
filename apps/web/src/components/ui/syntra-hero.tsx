"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  FileText,
  ScanLine,
  ShieldCheck,
  ArrowRight,
  Menu,
  X,
  Github,
  Layers,
  Sparkles,
  CheckCircle2,
  Database,
  Search,
  ExternalLink,
} from "lucide-react";

// --- Configuration Constants ---

const COPY = {
  eyebrow: "AI document intelligence",
  headline: ["Turn invoices into", "verified data with"],
  accentWord: "DataVai.",
  body: "Upload PDFs, scans, Excel and CSV. DataVai reads every field, checks the maths, and flags only what needs a human.",
  primaryCta: "Open dashboard",
  secondaryCta: "See how it works",
};

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Connectors", href: "#connectors" },
  { label: "GitHub", href: "https://github.com/arz282-ctrl/data-v-ai" },
];

const METRICS = [
  { value: "7", label: "File formats", icon: FileText },
  { value: "1,000+", label: "Page PDFs supported", icon: ScanLine },
  { value: "Grounded", label: "Every value checked", icon: ShieldCheck },
];

interface StageItem {
  id: number;
  title: string;
  items: string[];
  apps?: string[];
  side: "left" | "right";
  badge?: string;
  category: string;
  isMain?: boolean;
}

const STAGES: StageItem[] = [
  {
    id: 5,
    title: "Searchable Results",
    items: ["JSON", "Search", "Exports"],
    apps: ["Slack", "Notion", "Google Sheets"],
    side: "right",
    category: "outcomes",
  },
  {
    id: 4,
    title: "Validation & Review",
    items: ["Maths", "Duplicates", "Cross-verify"],
    side: "left",
    category: "automation",
  },
  {
    id: 3,
    title: "AI Extraction (main)",
    items: ["Fields", "Line items", "Evidence"],
    apps: ["Gemini", "OpenAI"],
    side: "right",
    category: "ai",
    isMain: true,
  },
  {
    id: 2,
    title: "Document Reading",
    items: ["OCR", "Parsing", "Page quality"],
    side: "left",
    category: "context",
  },
  {
    id: 1,
    title: "Connected Sources",
    items: ["Uploads", "Email", "Drive"],
    apps: ["Google Drive", "Zapier"],
    side: "right",
    category: "sources",
  },
];

// Inlined App Logos to avoid third-party dependencies or hotlinking
function AppLogo({ name }: { name: string }) {
  switch (name) {
    case "Gemini":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
          </svg>
          Gemini
        </span>
      );
    case "OpenAI":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V15a1 1 0 0 1 2 0v1.93A8 8 0 0 1 6.07 13H8a1 1 0 0 1 0 2H6.07A8 8 0 0 1 12 16.93z" />
          </svg>
          OpenAI
        </span>
      );
    case "Google Drive":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Drive
        </span>
      );
    case "Zapier":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-[10px] font-semibold border border-orange-200">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a2f]" />
          Zapier
        </span>
      );
    case "Slack":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
          Slack
        </span>
      );
    case "Notion":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 text-[10px] font-semibold border border-stone-300">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-700" />
          Notion
        </span>
      );
    case "Google Sheets":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Sheets
        </span>
      );
    default:
      return null;
  }
}

export function SyntraHero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const stackRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stackRef.current) return;
    const rect = stackRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <div className="relative min-h-screen bg-[var(--color-n3-page)] text-[var(--color-n3-ink)] selection:bg-[var(--color-n3-accent)]/20 overflow-hidden font-sans border-b border-[var(--color-n3-line)]">
      {/* Background isometric grid & ambient lighting */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.45] bg-[radial-gradient(#d9d6d0_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />

      {/* Warm spotlight glow in the center */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-amber-200/20 via-orange-200/25 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* --- Top Navigation --- */}
      <header className="relative z-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <nav
          className="flex items-center justify-between bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-[var(--color-n3-line)] shadow-sm"
          aria-label="Main Navigation"
        >
          {/* Logo & Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded-lg p-1"
            aria-label="DataVai Home"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--color-n3-ink)] flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform duration-200">
              <span className="text-[var(--color-n3-accent)]">D</span>v
            </div>
            <span className="font-semibold text-lg tracking-tight text-[var(--color-n3-ink)]">
              Data<span className="text-[var(--color-n3-accent)]">Vai</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-sm font-medium text-[var(--color-n3-grey)] hover:text-[var(--color-n3-ink)] transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded px-1.5 py-0.5"
              >
                {link.label}
                {link.href.startsWith("http") && <ExternalLink className="w-3 h-3 opacity-60" />}
              </a>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://github.com/arz282-ctrl/data-v-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 text-sm font-medium text-[var(--color-n3-ink)] hover:bg-stone-100/80 rounded-xl transition-colors border border-[var(--color-n3-line)]/70 inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)]"
              aria-label="GitHub Repository"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-n3-ink)] hover:bg-neutral-800 rounded-xl shadow-sm transition-all duration-200 inline-flex items-center gap-1.5 hover:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)]"
            >
              <span>{COPY.primaryCta}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--color-n3-accent)]" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[var(--color-n3-ink)] hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 bg-white rounded-2xl border border-[var(--color-n3-line)] p-4 shadow-lg flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-[var(--color-n3-ink)] hover:bg-stone-50 rounded-lg flex items-center justify-between"
              >
                <span>{link.label}</span>
                {link.href.startsWith("http") && <ExternalLink className="w-4 h-4 opacity-50" />}
              </a>
            ))}
            <div className="pt-2 border-t border-[var(--color-n3-line)] flex flex-col gap-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-medium text-white bg-[var(--color-n3-ink)] rounded-xl"
              >
                {COPY.primaryCta}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* --- Hero Content Section --- */}
      <main className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-[var(--color-n3-line)] shadow-xs mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--color-n3-accent)] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-n3-grey)]">
                {COPY.eyebrow}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--color-n3-ink)] leading-[1.08] mb-6">
              {COPY.headline[0]} <br />
              <span className="text-[var(--color-n3-grey)]">{COPY.headline[1]}</span>{" "}
              <span className="text-[var(--color-n3-accent)] relative">
                {COPY.accentWord}
                <svg
                  className="absolute left-0 -bottom-1 w-full h-2 text-[var(--color-n3-accent)]/30"
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                >
                  <path d="M0,15 Q50,0 100,15" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
              </span>
            </h1>

            {/* Sub-body */}
            <p className="text-base sm:text-lg text-[var(--color-n3-grey)] max-w-xl leading-relaxed mb-8">
              {COPY.body}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-10 w-full sm:w-auto">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3.5 text-base font-semibold text-white bg-[var(--color-n3-ink)] hover:bg-neutral-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)]"
              >
                <span>{COPY.primaryCta}</span>
                <ArrowRight className="w-4 h-4 text-[var(--color-n3-accent)]" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-6 py-3.5 text-base font-medium text-[var(--color-n3-ink)] bg-white/80 hover:bg-white rounded-xl border border-[var(--color-n3-line)] transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)]"
              >
                <span>{COPY.secondaryCta}</span>
              </a>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[var(--color-n3-line)] w-full">
              {METRICS.map((metric) => {
                const IconComponent = metric.icon;
                return (
                  <div key={metric.label} className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-[var(--color-n3-accent)] mb-1">
                      <IconComponent className="w-4 h-4" />
                      <span className="text-xl sm:text-2xl font-bold text-[var(--color-n3-ink)]">
                        {metric.value}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--color-n3-grey)] font-medium">
                      {metric.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: 3D Isometric Exploded Pipeline Stack */}
          <div
            className="lg:col-span-6 relative flex flex-col items-center justify-center select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            ref={stackRef}
          >
            {/* Explode / Collapse Toggle Bar */}
            <div className="flex items-center gap-2 mb-4 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--color-n3-line)] text-xs font-medium text-[var(--color-n3-grey)] shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-n3-accent)]" />
              <span>Interactive Pipeline Stack</span>
              <button
                onClick={() => setIsExploded(!isExploded)}
                className="ml-2 px-2.5 py-0.5 rounded-full bg-[var(--color-n3-ink)] text-white hover:bg-neutral-800 transition-colors text-[11px]"
              >
                {isExploded ? "Stack Cards" : "Explode Stack"}
              </button>
            </div>

            {/* 3D Stack Viewport */}
            <div
              className="relative w-full max-w-[480px] h-[460px] sm:h-[500px] flex items-center justify-center transition-transform duration-300 ease-out"
              style={{
                perspective: "1200px",
                transform: `rotateY(${mousePos.x * 0.4}deg) rotateX(${mousePos.y * 0.4}deg)`,
              }}
            >
              {/* Floor Spotlight Grid */}
              <div
                className="absolute bottom-4 w-[340px] h-[180px] rounded-[100%] bg-gradient-to-tr from-[var(--color-n3-line)]/50 via-white/80 to-[var(--color-n3-accent)]/20 shadow-2xl pointer-events-none"
                style={{
                  transform: "rotateX(68deg) translateZ(-60px)",
                }}
              />

              {/* Stack Layers (Rendered bottom-to-top) */}
              <div
                className="relative w-full h-full flex flex-col items-center justify-center"
                style={{ transformStyle: "preserve-3d" }}
              >
                {STAGES.map((stage, idx) => {
                  const isHovered = activeStage === stage.id;
                  // Calculate vertical spacing based on exploded state
                  const yOffset = isExploded ? (idx - 2) * 76 : (idx - 2) * 34;
                  const zOffset = (STAGES.length - idx) * 30;

                  return (
                    <div
                      key={stage.id}
                      onMouseEnter={() => setActiveStage(stage.id)}
                      onMouseLeave={() => setActiveStage(null)}
                      className={cn(
                        "absolute w-[90%] sm:w-[390px] rounded-2xl p-4 transition-all duration-300 cursor-pointer border",
                        stage.isMain
                          ? "bg-white/95 border-[var(--color-n3-accent)]/60 shadow-xl"
                          : "bg-white/85 border-[var(--color-n3-line)] shadow-md hover:bg-white",
                        isHovered && "ring-2 ring-[var(--color-n3-accent)] scale-[1.03] z-30"
                      )}
                      style={{
                        transform: `translateY(${yOffset}px) translateZ(${zOffset}px) rotateX(15deg) rotateY(-8deg)`,
                      }}
                    >
                      {/* Stage Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white",
                              stage.isMain ? "bg-[var(--color-n3-accent)]" : "bg-[var(--color-n3-ink)]"
                            )}
                          >
                            {stage.id}
                          </span>
                          <h2 className="font-semibold text-xs sm:text-sm text-[var(--color-n3-ink)] tracking-tight">
                            {stage.title}
                          </h2>
                        </div>
                        {stage.isMain && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-n3-accent)] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                            Core LLM Engine
                          </span>
                        )}
                        {(stage.id === 1 || stage.id === 5) && (
                          <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                            Roadmap
                          </span>
                        )}
                      </div>

                      {/* Items pill row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {stage.items.map((item) => (
                          <span
                            key={item}
                            className="text-[11px] font-medium text-[var(--color-n3-grey)] bg-stone-100/90 px-2 py-0.5 rounded-md border border-[var(--color-n3-line)]/50"
                          >
                            {item}
                          </span>
                        ))}
                      </div>

                      {/* Apps Row if present */}
                      {stage.apps && stage.apps.length > 0 && (
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-[var(--color-n3-grey)]">
                            {stage.id === 1 || stage.id === 5
                              ? "Connectors (roadmap):"
                              : "Supported Models:"}
                          </span>
                          <div className="flex items-center gap-1">
                            {stage.apps.map((app) => (
                              <AppLogo key={app} name={app} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage Quick Filter Flippers */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap justify-center">
              {STAGES.slice()
                .reverse()
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveStage(activeStage === s.id ? null : s.id);
                      setIsExploded(true);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-lg transition-colors border",
                      activeStage === s.id
                        ? "bg-[var(--color-n3-ink)] text-white border-[var(--color-n3-ink)]"
                        : "bg-white/80 text-[var(--color-n3-grey)] border-[var(--color-n3-line)] hover:text-[var(--color-n3-ink)]"
                    )}
                  >
                    Stage {s.id}: {s.title.split(" ")[0]}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
