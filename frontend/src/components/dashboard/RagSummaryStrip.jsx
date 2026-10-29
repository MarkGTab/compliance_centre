import React from "react";
import { useNavigate } from "react-router-dom";
import { buildLink } from "@/lib/deeplink";

const CARDS = [
  { key: "Green", label: "Green", sub: "Within appetite", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  { key: "Amber", label: "Amber", sub: "Monitor", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  { key: "Red", label: "Red", sub: "Out of appetite", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
];

export default function RagSummaryStrip({ risks }) {
  const navigate = useNavigate();
  const counts = { Green: 0, Amber: 0, Red: 0 };
  risks.forEach((r) => { if (counts[r.appetite_status] != null) counts[r.appetite_status] += 1; });
  const total = risks.length;
  const unallocated = total - counts.Green - counts.Amber - counts.Red;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map((c) => (
        <button
          key={c.key}
          onClick={() => navigate(buildLink("/risk-register", { appetite: c.key, from: "/" }))}
          className={`rounded-md border ${c.border} ${c.bg} px-4 py-3 text-left hover:ring-2 hover:ring-primary/40`}
          title={`Open Risk Register filtered to ${c.label} risks`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${c.dot}`} />
            {c.label}
          </div>
          <div className={`mt-1 text-3xl font-bold ${c.text}`}>{counts[c.key]}</div>
          <div className="text-[11px] text-muted-foreground">{c.sub}</div>
        </button>
      ))}
      <button
        onClick={() => navigate("/risk-register")}
        className="rounded-md border border-border bg-white px-4 py-3 text-left hover:bg-muted/40"
        title="Open Risk Register"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Risks</div>
        <div className="mt-1 text-3xl font-bold text-foreground">{total}</div>
        <div className="text-[11px] text-muted-foreground">{unallocated > 0 ? `${unallocated} not yet RAG-rated` : "All risks rated"}</div>
      </button>
    </div>
  );
}