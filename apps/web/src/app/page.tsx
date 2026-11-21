import type { Metadata } from "next";
import { SyntraHero } from "@/components/ui/syntra-hero";
import { ProductSection } from "@/components/landing/product-section";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "DataVai: AI Invoice & Document Intelligence (OCR, LLM Extraction, Validation)",
  description:
    "Turn invoices into verified data with DataVai. Upload PDFs, scans, Excel and CSV with grounded extraction, math verification, and ledger cross-verification.",
  openGraph: {
    title: "DataVai: AI Invoice & Document Intelligence",
    description:
      "Enterprise document extraction, OCR, format-aware grounding, and deterministic arithmetic verification.",
    url: "https://datav.ai",
    siteName: "DataVai",
    images: [
      {
        url: "/landing/og.png",
        width: 1200,
        height: 630,
        alt: "DataVai Document Intelligence Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DataVai: AI Invoice & Document Intelligence",
    description:
      "Turn invoices into verified data with DataVai. Upload PDFs, scans, Excel and CSV with grounded extraction.",
    images: ["/landing/og.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DataVai",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Enterprise AI document intelligence system offering multi-format ingestion, OCR, Gemini extraction, and deterministic math validation.",
  featureList: [
    "Multi-format ingestion (PDF, PNG, JPG, TIFF, XLSX, XLS, CSV)",
    "OpenCV and Tesseract OCR preprocessing",
    "Format-aware grounding with zero hallucination tolerance",
    "Deterministic balance arithmetic validation",
    "Spreadsheet ledger cross-verification",
    "Hybrid semantic and keyword search via pgvector",
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col min-h-screen bg-[var(--color-n3-page)]">
        <SyntraHero />
        <ProductSection />
        <SiteFooter />
      </div>
    </>
  );
}
