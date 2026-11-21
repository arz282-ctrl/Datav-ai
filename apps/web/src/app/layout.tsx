import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";

const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DataVai: AI Invoice & Document Intelligence (OCR, LLM Extraction, Validation)",
  description: "Turn invoices into verified data with DataVai. Upload PDFs, scans, Excel and CSV with grounded extraction, math verification, and ledger cross-verification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${onest.variable}`}>
      <body className="min-h-screen bg-[#060608] text-[var(--gd-ink)] antialiased font-sans selection:bg-[var(--color-n3-accent)]/30">
        {children}
      </body>
    </html>
  );
}
