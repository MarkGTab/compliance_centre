import React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import ScoreChip from "./ScoreChip";
import RagDot from "./RagDot";
import { tierStyles, statusStyles, formatDate, isReviewOverdue } from "@/lib/risk-helpers";

const COLUMNS = [
  { key: "risk_ref", label: "Ref", className: "w-24" },
  { key: "title", label: "Title" },
  { key: "tier", label: "Tier", className: "w-32" },
  { key: "categoryName", label: "Category", className: "w-48" },
  { key: "ownerName", label: "Owner", className: "w-40" },
  { key: "inherent_score", label: "Inh.", className: "w-16 text-center" },
  { key: "residual_score", label: "Res.", className: "w-16 text-center" },
  { key: "appetite_status", label: "App.", className: "w-16 text-center" },
  { key: "status", label: "Status", className: "w-28" },
  { key: "next_review", label: "Next Review", className: "w-28" },
];

export default function RiskTable({ rows, sort, onSort, onOpen, selectedId }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/60">
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                onClick={() => onSort(c.key)}
                className={`cursor-pointer select-none px-3 py-2 text-left font-semibold text-foreground ${c.className || ""}`}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  <SortIcon active={sort.key === c.key} dir={sort.dir} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onOpen(r.id)}
              className={`border-t border-border hover:bg-muted/40 cursor-pointer ${
                selectedId === r.id ? "bg-primary/5" : ""
              }`}
            >
              <td className="px-3 py-2 font-mono text-xs">{r.risk_ref || "—"}</td>
              <td className="px-3 py-2 font-medium">{r.title}</td>
              <td className="px-3 py-2">
                <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${tierStyles[r.tier] || ""}`}>
                  {r.tier}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{r.categoryName || "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.ownerName || "—"}</td>
              <td className="px-3 py-2 text-center font-mono text-xs">{r.inherent_score ?? "—"}</td>
              <td className="px-3 py-2 text-center">
                <ScoreChip score={r.residual_score} />
              </td>
              <td className="px-3 py-2 text-center">
                <RagDot value={r.appetite_status} />
              </td>
              <td className="px-3 py-2">
                <span className={`rounded px-1.5 py-0.5 text-xs ${statusStyles[r.status] || ""}`}>
                  {r.status}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {r.next_review ? (
                  <span className="inline-flex items-center gap-1">
                    {formatDate(r.next_review)}
                    {isReviewOverdue(r) && <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold text-red-700">OVERDUE</span>}
                  </span>
                ) : "—"}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-muted-foreground">
                No risks match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({ active, dir }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />;
  return dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}