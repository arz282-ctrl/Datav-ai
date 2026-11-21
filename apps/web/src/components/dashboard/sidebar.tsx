"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  AlertTriangle,
  Search,
  ChevronDown,
  Layers,
  GitCompare,
  Copy,
  BarChart2,
  Mail,
  HardDrive,
  Cloud,
  Server,
  Plus,
  Slack,
  Database,
  FileSpreadsheet,
  BookOpen,
  Webhook,
  Users,
  Key,
  ShieldAlert,
  Settings,
  Home,
  X,
  ExternalLink,
} from "lucide-react";

interface SidebarProps {
  documentsCount?: number;
  needsReviewCount?: number;
  activeFilter?: string | null;
  onSelectFilter?: (filter: string | null) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function DashboardSidebar({
  documentsCount = 0,
  needsReviewCount = 0,
  activeFilter = null,
  onSelectFilter,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0e]/95 backdrop-blur-xl border-r border-stone-800/80 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Header */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-stone-800/70 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-n3-accent)] rounded-lg"
              aria-label="Back to Marketing Home"
            >
              <div className="w-7 h-7 rounded-lg bg-[var(--color-n3-accent)] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                Dv
              </div>
              <span className="font-semibold text-base tracking-tight text-white">
                Data<span className="text-[var(--color-n3-accent)]">Vai</span>
              </span>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/60"
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links Scroll Container */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 text-xs text-stone-300">
            {/* Always visible main links */}
            <div className="space-y-1">
              <Link
                href="/"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-900/80 transition-colors"
              >
                <Home className="w-4 h-4 text-stone-400" />
                <span>Marketing Home</span>
              </Link>

              <button
                onClick={() => onSelectFilter?.(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                  activeFilter === null
                    ? "bg-stone-800/90 text-white border border-stone-700/60"
                    : "text-stone-300 hover:text-white hover:bg-stone-900/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[var(--color-n3-accent)]" />
                  <span>All Documents</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-stone-800 text-[10px] font-mono text-stone-400 border border-stone-700/50">
                  {documentsCount}
                </span>
              </button>

              <button
                onClick={() => onSelectFilter?.("NEEDS_REVIEW")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                  activeFilter === "NEEDS_REVIEW"
                    ? "bg-amber-950/40 text-amber-300 border border-amber-800/50"
                    : "text-stone-300 hover:text-white hover:bg-stone-900/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Needs Review</span>
                </div>
                {needsReviewCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                    {needsReviewCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectFilter?.("SEARCH")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                  activeFilter === "SEARCH"
                    ? "bg-stone-800/90 text-white border border-stone-700/60"
                    : "text-stone-300 hover:text-white hover:bg-stone-900/60"
                }`}
              >
                <Search className="w-4 h-4 text-teal-400" />
                <span>Search Intelligence</span>
              </button>
            </div>

            {/* Tools ▾ */}
            <details className="group" open>
              <summary className="flex items-center justify-between px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wider text-stone-400 cursor-pointer hover:text-stone-200 select-none">
                <span>Tools</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform duration-150 group-open:rotate-180" />
              </summary>
              <div className="mt-1 space-y-0.5 pl-2">
                <button
                  onClick={() => onSelectFilter?.("CROSS_VERIFY_MISMATCH")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                    activeFilter === "CROSS_VERIFY_MISMATCH"
                      ? "bg-red-950/40 text-red-300 border border-red-800/50"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-3.5 h-3.5 text-red-400" />
                    <span>Cross-Verify</span>
                  </div>
                </button>

                <button
                  onClick={() => onSelectFilter?.("DUPLICATE_INVOICE")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${
                    activeFilter === "DUPLICATE_INVOICE"
                      ? "bg-amber-950/40 text-amber-300 border border-amber-800/50"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Duplicates</span>
                  </div>
                </button>

                <div className="flex items-center justify-between px-2.5 py-1.5 text-stone-500">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Reports</span>
                  </div>
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-500">
                    Soon
                  </span>
                </div>
              </div>
            </details>

            {/* Sources ▾ (open by default) */}
            <details className="group" open>
              <summary className="flex items-center justify-between px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wider text-stone-400 cursor-pointer hover:text-stone-200 select-none">
                <span>Sources</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform duration-150 group-open:rotate-180" />
              </summary>
              <div className="mt-1 space-y-0.5 pl-2">
                {[
                  { name: "Gmail / Outlook", icon: Mail },
                  { name: "Google Drive", icon: HardDrive },
                  { name: "OneDrive / SharePoint", icon: Cloud },
                  { name: "S3 / SFTP", icon: Server },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.name}
                      className="flex items-center justify-between px-2.5 py-1.5 text-stone-400"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-stone-500" />
                        <span>{s.name}</span>
                      </div>
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-500">
                        Soon
                      </span>
                    </div>
                  );
                })}

                <button
                  onClick={() => setAddSourceModalOpen(true)}
                  className="w-full mt-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[var(--color-n3-accent)] hover:bg-[var(--color-n3-accent)]/10 transition-colors font-medium text-[11px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add source</span>
                </button>
              </div>
            </details>

            {/* Destinations ▾ */}
            <details className="group">
              <summary className="flex items-center justify-between px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wider text-stone-400 cursor-pointer hover:text-stone-200 select-none">
                <span>Destinations</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform duration-150 group-open:rotate-180" />
              </summary>
              <div className="mt-1 space-y-0.5 pl-2">
                {[
                  { name: "Slack alerts", icon: Slack },
                  { name: "Notion database", icon: BookOpen },
                  { name: "Google Sheets", icon: FileSpreadsheet },
                  { name: "QuickBooks / Xero", icon: Database },
                  { name: "Webhooks / Zapier", icon: Webhook },
                ].map((d) => {
                  const Icon = d.icon;
                  return (
                    <div
                      key={d.name}
                      className="flex items-center justify-between px-2.5 py-1.5 text-stone-500"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{d.name}</span>
                      </div>
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-500">
                        Soon
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>

            {/* Admin ▾ */}
            <details className="group">
              <summary className="flex items-center justify-between px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wider text-stone-400 cursor-pointer hover:text-stone-200 select-none">
                <span>Admin</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform duration-150 group-open:rotate-180" />
              </summary>
              <div className="mt-1 space-y-0.5 pl-2">
                {[
                  { name: "Users & Roles", icon: Users },
                  { name: "API Keys", icon: Key },
                  { name: "Audit Log", icon: ShieldAlert },
                  { name: "Settings", icon: Settings },
                ].map((a) => {
                  const Icon = a.icon;
                  return (
                    <div
                      key={a.name}
                      className="flex items-center justify-between px-2.5 py-1.5 text-stone-500"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{a.name}</span>
                      </div>
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-500">
                        Soon
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>

          {/* Bottom: User Profile Chip */}
          <div className="p-3 border-t border-stone-800/80 bg-stone-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-n3-accent)] to-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                AR
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">Ahmed Riyaz</div>
                <div className="text-[11px] text-stone-400 truncate">arz4dev@gmail.com</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Planned Connector Modal */}
      {addSourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Planned Inbound Connector</h3>
              <button
                onClick={() => setAddSourceModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-stone-400 mb-6 leading-relaxed">
              Automated document synchronization from email inboxes (IMAP/Exchange) and cloud storage buckets (S3, GCS, OneDrive) is on the active product roadmap.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAddSourceModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-stone-300 hover:bg-stone-800 rounded-xl transition-colors"
              >
                Dismiss
              </button>
              <button
                disabled
                className="px-4 py-2 text-xs font-semibold text-stone-500 bg-stone-800 rounded-xl cursor-not-allowed opacity-70"
              >
                Connect (Roadmap)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
