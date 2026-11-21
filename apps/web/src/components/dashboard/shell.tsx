"use client";

import React, { useState } from "react";
import { DashboardSidebar } from "./sidebar";
import { DashboardTopbar } from "./topbar";

interface DashboardShellProps {
  children: React.ReactNode;
  documentsCount?: number;
  needsReviewCount?: number;
  activeFilter?: string | null;
  onSelectFilter?: (filter: string | null) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export function DashboardShell({
  children,
  documentsCount = 0,
  needsReviewCount = 0,
  activeFilter = null,
  onSelectFilter,
  searchQuery = "",
  onSearchChange,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#060608] text-[var(--gd-ink)] font-sans antialiased flex flex-col md:flex-row">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar */}
      <DashboardSidebar
        documentsCount={documentsCount}
        needsReviewCount={needsReviewCount}
        activeFilter={activeFilter}
        onSelectFilter={(f) => {
          onSelectFilter?.(f);
          setMobileMenuOpen(false);
        }}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area (offset by sidebar on desktop) */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        <DashboardTopbar
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
