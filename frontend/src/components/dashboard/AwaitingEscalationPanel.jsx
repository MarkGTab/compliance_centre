import React from "react";
import { useNavigate } from "react-router-dom";
import RagDot from "@/components/risk/RagDot";
import ScoreChip from "@/components/risk/ScoreChip";
import { buildLink } from "@/lib/deeplink";
import { tierStyles } from "@/lib/risk-helpers";

// Appetite breaches (Red) that are not yet linked to a parent at the level
// above — i.e. not yet escalated. Strategic risks are top-level by design.
export default function AwaitingEscalationPanel({ risks }) {
  const navigate = useNavigate();
  const awaiting = risks
    .filter((r) => r.appetite_status === "Red" && !r.parent_risk && r.tier !== "Strategic")
    .sort((a, b) => (b.residual_score ?? 0) - (a.residual_score ?? 0));

  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 text-[11px] text-muted-foreground">
        Appetite breaches not yet linked to a parent at the level above — flag these for escalation.
      </p>
      {awaiting.length === 0 ? (
        <p className="text-xs text-muted-foreground">No appetite breaches awaiting escalation. ✅</p>
      ) : (
        <ul className="space-y-1.5">
          {awaiting.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => navigate(buildLink("/risk-register", { q: r.risk_ref || r.title, from: "/" }))}
              className="w-full rounded border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-left text-sm hover:bg-amber-50"
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
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className={`rounded border px-1.5 py-0.5 ${tierStyles[r.tier] || ""}`}>{r.tier}</span>
                <span>{r.categoryName || "Uncategorised"} · {r.ownerName || "Unassigned"}</span>
              </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}