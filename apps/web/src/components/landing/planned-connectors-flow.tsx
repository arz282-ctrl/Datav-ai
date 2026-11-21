"use client";

import React, { useState } from "react";
import { Play, Pause, Code2, RotateCcw, X, Check } from "lucide-react";

interface FlowNode {
  id: string;
  label: string;
  sub: string;
  tech: string;
  color: string;
  x: number;
  y: number;
  detail: string;
  metric: string;
  endpoint: string;
}

const COLORS = {
  orange: "#ff9a2e",
  blue: "#4080ff",
  sky: "#57a9fb",
  aqua: "#37d4cf",
  green: "#23c343",
  yellow: "#fbe842",
  slate: "#a9aeb8",
};

const NODES: FlowNode[] = [
  {
    id: "email",
    label: "Gmail & Outlook",
    sub: "Inbound email · MIME",
    tech: "Connector source",
    color: COLORS.orange,
    x: 130,
    y: 92,
    detail: "Email ingestion adapter for inbound attachments and message metadata. Normalizes MIME parts before streaming to the upload endpoint.",
    metric: "Source tool",
    endpoint: "email / MIME adapter",
  },
  {
    id: "drive",
    label: "Google Drive",
    sub: "Cloud storage · PDF",
    tech: "Connector source",
    color: COLORS.sky,
    x: 130,
    y: 190,
    detail: "Cloud file picker and folder sync for documents entering the same magic-byte sniffing and upload verification contract.",
    metric: "Source tool",
    endpoint: "Drive files.list / files.get",
  },
  {
    id: "slack",
    label: "Slack",
    sub: "Alerting · files",
    tech: "Connector source",
    color: COLORS.yellow,
    x: 130,
    y: 288,
    detail: "Event-driven alert and file handoff for accounting teams that need processing state notifications or immediate discrepancy alerts.",
    metric: "Source tool",
    endpoint: "Slack events / files",
  },
  {
    id: "notion",
    label: "Notion",
    sub: "Knowledgebase · pages",
    tech: "Connector source",
    color: COLORS.aqua,
    x: 130,
    y: 386,
    detail: "Page and database export adapter for corporate billing records that should be grounded and verified before ledger posting.",
    metric: "Source tool",
    endpoint: "Notion pages / blocks",
  },
  {
    id: "sheets",
    label: "Google Sheets",
    sub: "Spreadsheets · ledger",
    tech: "Connector source",
    color: COLORS.green,
    x: 130,
    y: 484,
    detail: "Ledger ingestion adapter. Rows can be cross-verified against extracted invoices, purchase orders, and discrepancy flags.",
    metric: "Source tool",
    endpoint: "Sheets values / CSV",
  },
  {
    id: "books",
    label: "QuickBooks & Xero",
    sub: "Accounting ERP · ledger",
    tech: "Connector source",
    color: COLORS.blue,
    x: 130,
    y: 582,
    detail: "Accounting ERP adapter for vendor registries, historical bills, and ledger balances used in deterministic cross-verification.",
    metric: "Source tool",
    endpoint: "ERP invoices / ledger",
  },
  {
    id: "adapter",
    label: "Connector adapter",
    sub: "Node.js / Express",
    tech: "Unified gateway",
    color: COLORS.sky,
    x: 410,
    y: 288,
    detail: "Normalizes each tool into one authenticated upload and event contract. Magic-byte sniffing and X-API-Key validation remain server-side.",
    metric: "Port 4000",
    endpoint: "POST /api/documents/upload",
  },
  {
    id: "ingest",
    label: "docint:ingest",
    sub: "BullMQ · concurrency 2",
    tech: "Long job queue",
    color: COLORS.orange,
    x: 660,
    y: 200,
    detail: "Long-running ingestion queue for parsing, OCR pre-processing, chunking, Gemini extraction, grounding, embeddings, and initial validation.",
    metric: "Async queue",
    endpoint: "docint:ingest",
  },
  {
    id: "revalidate",
    label: "docint:revalidate",
    sub: "BullMQ · concurrency 4",
    tech: "Fast job queue",
    color: COLORS.yellow,
    x: 660,
    y: 390,
    detail: "Short-running queue for human corrections, ledger updates, deterministic revalidation, and instant flag recalculation.",
    metric: "Fast path",
    endpoint: "docint:revalidate",
  },
  {
    id: "worker",
    label: "Document intelligence",
    sub: "Python 3.11 / FastAPI",
    tech: "Worker engine",
    color: COLORS.aqua,
    x: 920,
    y: 200,
    detail: "Streams documents, triggers OCR for degraded scans, extracts structured JSON, grounds source tokens, and validates math and ledger relationships.",
    metric: "Port 8001",
    endpoint: "POST /embed",
  },
  {
    id: "verified",
    label: "Verified data",
    sub: "PostgreSQL + pgvector",
    tech: "System of record",
    color: COLORS.green,
    x: 1130,
    y: 290,
    detail: "Persists documents, chunks, invoices, ledger rows, flags, cross-verification links, audit logs, and 768-dim embeddings.",
    metric: "Vector + SQL",
    endpoint: "documents · flags · audit_logs",
  },
  {
    id: "review",
    label: "Review dashboard",
    sub: "React 19 / Next.js 15",
    tech: "Human-in-the-loop",
    color: COLORS.blue,
    x: 920,
    y: 480,
    detail: "Status polling, split-pane inspection, raw chunk viewing, inline correction, revalidation feedback, and hybrid pgvector search.",
    metric: "Web client",
    endpoint: "/api/proxy/*",
  },
];

type EdgeTuple = [string, string, string];

const EDGES: EdgeTuple[] = [
  ["email", "adapter", "normalize"],
  ["drive", "adapter", "normalize"],
  ["slack", "adapter", "event"],
  ["notion", "adapter", "normalize"],
  ["sheets", "adapter", "ledger"],
  ["books", "adapter", "ledger"],
  ["adapter", "ingest", "enqueue"],
  ["adapter", "revalidate", "correction"],
  ["ingest", "worker", "consume"],
  ["revalidate", "worker", "fast path"],
  ["worker", "verified", "write"],
  ["verified", "review", "status + search"],
  ["review", "revalidate", "human correction"],
];

function getPath(a: FlowNode, b: FlowNode) {
  const dx = b.x - a.x;
  return `M ${a.x + 76} ${a.y} C ${a.x + 76 + dx * 0.45} ${a.y}, ${b.x - 76 - dx * 0.12} ${b.y}, ${b.x - 76} ${b.y}`;
}

export function PlannedConnectorsFlow() {
  const [selectedId, setSelectedId] = useState<string>("email");
  const [playing, setPlaying] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const selectedNode = NODES.find((n) => n.id === selectedId) || NODES[0];

  const getIconForNode = (id: string) => {
    switch (id) {
      case "adapter":
        return "↔";
      case "worker":
        return "◉";
      case "verified":
        return "✓";
      case "review":
        return "⌁";
      default:
        return "✦";
    }
  };

  return (
    <div className="w-full text-left font-sans">
      {/* ── Section Hero Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-9 border-b border-stone-800">
        <div>
          <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[var(--color-n3-accent,#ff7a2f)] block mb-3">
            Connector design system · 01
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3">
            Tools in. <span className="text-[var(--color-n3-accent,#ff7a2f)] italic font-normal">Verified data out.</span>
          </h2>
          <p className="max-w-2xl text-sm sm:text-base text-stone-400 leading-relaxed">
            A source-to-record graph for the six planned connectors. Each tool enters through the same authenticated Node.js gateway, is routed through an isolated BullMQ queue, and lands in the DataVai extraction, grounding, validation, and audit pipeline.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-stone-800 bg-stone-900/60 text-xs text-stone-400 min-w-[270px] shadow-sm">
          <strong className="text-emerald-400 text-xs block mb-1">● Inspectable connector map</strong>
          Select any tool, adapter, queue, or output node to inspect its execution role and payload contract.
        </div>
      </div>

      {/* ── Toolbar & Status ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-4">
        <div className="flex items-center gap-2.5 text-xs text-stone-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span>live connector flow · active: </span>
          <b className="text-white font-semibold">{selectedNode.label}</b>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying(!playing)}
            className="px-3 py-1.5 rounded-lg border border-stone-800 bg-stone-900/80 hover:border-[var(--color-n3-accent,#ff7a2f)] text-xs text-stone-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{playing ? "Pause motion" : "Play motion"}</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-stone-800 bg-stone-900/80 hover:border-[var(--color-n3-accent,#ff7a2f)] text-xs text-stone-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>GraphQL notes</span>
          </button>

          <button
            onClick={() => setSelectedId("email")}
            className="px-3 py-1.5 rounded-lg border border-stone-800 bg-stone-900/80 hover:border-[var(--color-n3-accent,#ff7a2f)] text-xs text-stone-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset focus</span>
          </button>
        </div>
      </div>

      {/* ── Interactive Workflow Graph Canvas ── */}
      <div className="rounded-2xl border border-stone-800 bg-gradient-to-br from-[#101114] via-[#151619] to-[#0e0f12] overflow-hidden shadow-2xl">
        {/* Canvas Legend */}
        <div className="flex items-center gap-5 flex-wrap px-5 pt-4 text-[10px] tracking-wider uppercase text-stone-400 font-semibold border-b border-stone-800/40 pb-3">
          <span className="flex items-center gap-2">
            <i className="w-2 h-2 rounded-full bg-[#ff9a2e]" />
            <span>source / tool</span>
          </span>
          <span className="flex items-center gap-2">
            <i className="w-2 h-2 rounded-full bg-[#fbe842]" />
            <span>async routing</span>
          </span>
          <span className="flex items-center gap-2">
            <i className="w-2 h-2 rounded-full bg-[#23c343]" />
            <span>verified output</span>
          </span>
        </div>

        {/* SVG Viewport */}
        <div className="overflow-x-auto select-none">
          <svg
            viewBox="0 0 1320 650"
            className="w-full min-w-[1050px] h-auto block"
            role="img"
            aria-label="Planned connectors tool flow diagram"
          >
            <defs>
              <pattern id="flow-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 H 0 V 28" fill="none" stroke="#ffffff" strokeOpacity="0.035" />
              </pattern>
              <linearGradient id="flow-line" x1="0" x2="1">
                <stop stopColor="#ff9a2e" />
                <stop offset="0.48" stopColor="#57a9fb" />
                <stop offset="1" stopColor="#23c343" />
              </linearGradient>
              <filter id="flow-glow">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid background */}
            <rect width="1320" height="650" fill="url(#flow-grid)" />

            {/* ── Render Edges ── */}
            {EDGES.map(([fromId, toId, label], idx) => {
              const a = NODES.find((n) => n.id === fromId)!;
              const b = NODES.find((n) => n.id === toId)!;
              const d = getPath(a, b);
              const isHot =
                fromId === selectedId ||
                toId === selectedId ||
                (selectedId === "email" && fromId === "adapter");
              const isQueue = fromId === "revalidate" || label === "correction";

              const midX = a.x + (b.x - a.x) * 0.5;
              const midY = a.y + (b.y - a.y) * 0.5 - 8;

              return (
                <g key={`edge-${idx}`} className={`transition-opacity duration-300 ${isHot ? "opacity-95" : "opacity-30"}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke={isQueue ? COLORS.orange : "url(#flow-line)"}
                    strokeWidth={isHot ? 2 : 1.2}
                    strokeDasharray={isQueue ? "5 6" : undefined}
                  />
                  <text
                    x={midX}
                    y={midY}
                    fill="#a9aeb8"
                    fontSize="9"
                    textAnchor="middle"
                    className="font-mono"
                  >
                    {label}
                  </text>

                  {/* Flowing particle animation */}
                  {playing && isHot && (
                    <circle r="4" fill={COLORS.yellow} filter="url(#flow-glow)">
                      <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* ── Render Nodes ── */}
            {NODES.map((n) => {
              const isSelected = n.id === selectedId;

              return (
                <g
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedId(n.id)}
                  className="cursor-pointer group outline-none"
                >
                  {/* Selection Pulsing Halo */}
                  {isSelected && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="52"
                      fill="none"
                      stroke={n.color}
                      strokeWidth="1.5"
                      className="opacity-40 animate-ping"
                      style={{ animationDuration: "2s" }}
                    />
                  )}

                  {/* Node Background Box */}
                  <rect
                    x={n.x - 76}
                    y={n.y - 31}
                    width="152"
                    height="62"
                    rx="13"
                    fill={isSelected ? "#22252a" : "#17181b"}
                    stroke={n.color}
                    strokeWidth={isSelected ? 2 : 1}
                    className="transition-all duration-200 group-hover:fill-[#26282d] group-hover:stroke-width-2"
                  />

                  {/* Indicator Dot */}
                  <circle cx={n.x - 56} cy={n.y - 9} r="5.5" fill={n.color} />

                  {/* Node Label */}
                  <text
                    x={n.x - 42}
                    y={n.y - 7}
                    fill="#f6f7f9"
                    fontSize="10"
                    fontWeight="700"
                    className="select-none"
                  >
                    {n.label}
                  </text>

                  {/* Node Subtitle */}
                  <text
                    x={n.x - 56}
                    y={n.y + 14}
                    fill="#a9aeb8"
                    fontSize="8.5"
                    className="select-none font-medium"
                  >
                    {n.sub}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Selected Node Live Inspector Footer ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-4 border-t border-stone-800 bg-stone-950/70 text-xs">
          <div
            className="w-10 h-10 rounded-xl grid place-items-center text-base font-bold shrink-0"
            style={{ color: selectedNode.color, backgroundColor: `${selectedNode.color}22` }}
          >
            {getIconForNode(selectedNode.id)}
          </div>

          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-n3-accent,#ff7a2f)]">
              Selected node · {selectedNode.tech}
            </span>
            <h3 className="text-base font-bold text-white tracking-tight mt-0.5 mb-1">
              {selectedNode.label}
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed max-w-3xl">
              {selectedNode.detail}
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800/80 w-full sm:w-auto">
            <b className="block text-white text-xs font-semibold mb-1">{selectedNode.metric}</b>
            <code className="text-[11px] font-mono text-stone-400 bg-stone-900/90 px-2 py-0.5 rounded border border-stone-800">
              {selectedNode.endpoint}
            </code>
          </div>
        </div>
      </div>

      {/* ── Callout Banner ── */}
      <div className="mt-6 flex items-center gap-2 text-emerald-400 text-xs font-semibold">
        <Check className="w-4 h-4 text-emerald-400" />
        <span>One ingestion contract across email, storage, messaging, knowledgebase, spreadsheets, and accounting ERP.</span>
      </div>

      {/* ── GraphQL Blueprint Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl p-6 sm:p-8 rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl text-left">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-n3-accent,#ff7a2f)] block mb-1">
              GraphQL blueprint · connector inspection
            </span>
            <h3 className="text-2xl font-bold text-white tracking-tight mb-2">
              Model tools as typed sources.
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed mb-4">
              Expose connector capabilities and downstream workflow state without moving deterministic business rules out of the worker.
            </p>

            <pre className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-teal-300 font-mono text-xs leading-relaxed overflow-x-auto mb-4">
{`type ConnectorTool {
  id: ID!
  name: String!
  category: ConnectorCategory!
  inputFormats: [String!]!
  status: ConnectorStatus!
  workflow: WorkflowNode!
}

query PlannedConnectors {
  connectors {
    name
    category
    inputFormats
    status
  }
}`}
            </pre>

            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <Check className="w-4 h-4" />
              <span>Use DataLoader batching, depth limits, query complexity checks, and field-level authorization.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlannedConnectorsFlow;
