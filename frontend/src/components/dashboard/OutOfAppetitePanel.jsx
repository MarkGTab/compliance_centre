import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { buildLink } from "@/lib/deeplink";
import RagDot from "@/components/risk/RagDot";
import ScoreChip from "@/components/risk/ScoreChip";

export default function OutOfAppetitePanel({ risks }) {
  const navigate = useNavigate();
  const red = risks.filter((r) => r.appetite_status === "Red")
    .sort((a, b) => (b.residual_score ?? 0) - (a.residual_score ?? 0));

  return (
    <div className="flex h-full flex-col rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-red-600" /> Out of Appetite
        </div>
        <button
          onClick={() => navigate(buildLink("/risk-register", { appetite: "Red", from: "/" }))}
          className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-200"
          title="Open Risk Register filtered to Red (out of appetite) risks"
        >
          {red.length}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {red.length === 0 ? (
          <p className="text-xs text-muted-foreground">No risks currently out of appetite. ✅</p>
        ) : (
          <ul className="space-y-1.5">
            {red.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => navigate(buildLink("/risk-register", { q: r.risk_ref || r.title, from: "/" }))}
                  className="w-full rounded border border-red-200 bg-red-50/50 px-3 py-1.5 text-left text-sm hover:bg-red-50"
                >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span className="font-mono text-xs text-muted-foreground">{r.risk_ref || ""} </span>
                    <span className="font-medium">{r.title}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ScoreChip score={r.residual_score} />
                    <RagDot value={r.appetite_status} />
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {r.categoryName || "Uncategorised"} · {r.ownerName || "Unassigned"}
                </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}