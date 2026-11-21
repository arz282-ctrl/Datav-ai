import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://datav.ai"),
  title: "DataVai: AI Invoice & Document Intelligence (OCR, LLM Extraction, Validation)",
  description: "Turn invoices into verified data with DataVai. Upload PDFs, scans, Excel and CSV with grounded extraction, math verification, and ledger cross-verification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#060608] text-[var(--gd-ink)] antialiased font-sans selection:bg-[var(--color-n3-accent)]/30">
        {children}
      </body>
    </html>
  );
}
