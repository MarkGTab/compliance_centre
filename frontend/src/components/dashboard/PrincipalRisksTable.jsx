import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { buildLink } from "@/lib/deeplink";
import RagDot from "@/components/risk/RagDot";
import ScoreChip from "@/components/risk/ScoreChip";

const TrendIcon = ({ trend }) => {
  if (trend === "Improving") return <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />;
  if (trend === "Worsening") return <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />;
  if (trend === "Stable") return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  return <span className="text-muted-foreground">—</span>;
};

// Period-over-period: current residual vs the residual recorded at last review.
// Higher score = more risk, so an increase (▲) is worsening (red), a decrease (▼) is improving (green).
const Movement = ({ risk, prevScore }) => {
  const cur = risk.residual_score;
  if (cur == null) return <span className="text-muted-foreground">—</span>;
  if (prevScore == null) return <span className="text-[11px] text-muted-foreground">new</span>;
  const delta = cur - prevScore;
  if (delta > 0) return <span className="inline-flex items-center gap-0.5 text-red-700"><ArrowUpRight className="h-3.5 w-3.5" />+{delta}</span>;
  if (delta < 0) return <span className="inline-flex items-center gap-0.5 text-emerald-700"><ArrowDownRight className="h-3.5 w-3.5" />{delta}</span>;
  return <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Minus className="h-3.5 w-3.5" />0</span>;
};

export default function PrincipalRisksTable({ risks, prevScoreMap = {} }) {
  const navigate = useNavigate();
  const top = [...risks]
    .sort((a, b) => (b.residual_score ?? 0) - (a.residual_score ?? 0))
    .slice(0, 10);

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Risk</th>
            <th className="px-3 py-2 text-left font-semibold">Category</th>
            <th className="px-3 py-2 text-left font-semibold">Owner</th>
            <th className="px-3 py-2 text-center font-semibold">Residual</th>
            <th className="px-3 py-2 text-center font-semibold">Appetite</th>
            <th className="px-3 py-2 text-center font-semibold">Trend</th>
            <th className="px-3 py-2 text-center font-semibold">Movement</th>
          </tr>
        </thead>
        <tbody>
          {top.map((r) => (
            <tr
              key={r.id}
              onClick={() => navigate(buildLink("/risk-register", { q: r.risk_ref || r.title, from: "/" }))}
              className="cursor-pointer border-t border-border hover:bg-muted/40"
            >
              <td className="px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground">{r.risk_ref || "—"} </span>
                <span className="font-medium">{r.title}</span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{r.categoryName || "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.ownerName || "—"}</td>
              <td className="px-3 py-2 text-center"><ScoreChip score={r.residual_score} /></td>
              <td className="px-3 py-2 text-center"><RagDot value={r.appetite_status} /></td>
              <td className="px-3 py-2 text-center"><TrendIcon trend={r.trend} /></td>
              <td className="px-3 py-2 text-center"><Movement risk={r} prevScore={prevScoreMap[r.id]} /></td>
            </tr>
          ))}
          {top.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No Strategic risks recorded.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="border-t border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
        Movement compares current residual score to the value at last review (▲ = worsening, ▼ = improving). Top 10 by residual score.
      </div>
    </div>
  );
}