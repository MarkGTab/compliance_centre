import React from "react";
import { useNavigate } from "react-router-dom";
import { buildLink } from "@/lib/deeplink";

const ROWS = [5, 4, 3, 2, 1];
const COLS = [1, 2, 3, 4, 5];
const CELL = 44;

const bandCell = (score) =>
  score <= 6 ? "bg-emerald-50 border-emerald-200"
    : score <= 12 ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200";

const bandBadge = (score) =>
  score <= 6 ? "bg-emerald-500 text-white"
    : score <= 12 ? "bg-amber-500 text-white"
      : "bg-red-500 text-white";

export default function DashboardHeatMap({ risks }) {
  const navigate = useNavigate();
  const grid = {};
  risks.forEach((r) => {
    const l = Number(r.residual_likelihood);
    const i = Number(r.residual_impact);
    if (!l || !i) return;
    const key = `${i}-${l}`;
    grid[key] = (grid[key] || 0) + 1;
  });
  const plotted = Object.values(grid).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex">
        <div className="flex flex-col justify-between pr-1 text-[10px] text-muted-foreground" style={{ height: CELL * 5 }}>
          {ROWS.map((i) => <span key={i} className="leading-none">{i}</span>)}
        </div>
        <div>
          <div className="grid grid-cols-5 gap-0.5" style={{ width: CELL * 5, height: CELL * 5 }}>
            {ROWS.map((i) =>
              COLS.map((l) => {
                const score = i * l;
                const count = grid[`${i}-${l}`] || 0;
                return (
                  <button
                    key={`${i}-${l}`}
                    type="button"
                    disabled={count === 0}
                    onClick={count > 0 ? () => navigate(buildLink("/risk-register", { tier: "Strategic", ll: l, li: i, from: "/" })) : undefined}
                    className={`flex items-center justify-center border ${bandCell(score)} ${count > 0 ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : "cursor-default"}`}
                    style={{ width: CELL, height: CELL }}
                    title={count > 0 ? `${count} Strategic risk${count === 1 ? "" : "s"} at L${l} × I${i}` : "No risks"}
                  >
                    {count > 0 && (
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${bandBadge(score)}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" style={{ width: CELL * 5 }}>
            {COLS.map((l) => <span key={l} className="leading-none">{l}</span>)}
          </div>
        </div>
      </div>
      <div className="mt-1 flex justify-between pl-5 text-[10px] text-muted-foreground" style={{ width: CELL * 5 + 16 }}>
        <span>↑ Impact</span>
        <span>Likelihood →</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Low (1–6)</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-500" /> Medium (7–12)</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-500" /> High (13–25)</span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{plotted} Strategic risk{plotted === 1 ? "" : "s"} plotted by residual position.</p>
    </div>
  );
}