import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DatavAI | Financial Document Intelligence",
  description: "Multi-format OCR, grounded LLM extraction, cross-verification, and hybrid search",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#060608] text-[var(--gd-ink)] antialiased selection:bg-[var(--gd-teal)]/30">
        {children}
      </body>
    </html>
  );
}
