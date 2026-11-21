"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center p-6 text-stone-200">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-stone-900/90 border border-stone-800 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-950/60 text-red-400 flex items-center justify-center mx-auto border border-red-800/40">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Dashboard Encountered an Issue</h2>
        <p className="text-xs text-stone-400 leading-relaxed">
          {error?.message || "An unexpected error occurred while rendering the workspace data."}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-[var(--color-n3-accent)] hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
