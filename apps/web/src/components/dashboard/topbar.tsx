"use client";

import React from "react";
import Link from "next/link";
import { Menu, Search, Sparkles, ExternalLink } from "lucide-react";

interface TopbarProps {
  onToggleMobileMenu?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export function DashboardTopbar({
  onToggleMobileMenu,
  searchQuery = "",
  onSearchChange,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-[#060608]/80 backdrop-blur-md border-b border-stone-800/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Menu + Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)]"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white tracking-tight">
            Financial Document Audit
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Gemini Flash Ingestion Active
          </span>
        </div>
      </div>

      {/* Right: Quick Links */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-xs font-medium text-stone-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-stone-800/50 transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)]"
        >
          <span>Landing Page</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </Link>
      </div>
    </header>
  );
}
