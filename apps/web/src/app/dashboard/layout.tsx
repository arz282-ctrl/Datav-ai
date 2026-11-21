import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | DataVai Financial Document Intelligence",
  description:
    "Real-time document ingestion, status polling, split-pane inspector, human correction, and hybrid vector search.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#060608]">{children}</div>;
}
