import React from "react";
import { scoreBand, bandChip } from "@/lib/risk-helpers";

export default function ScoreChip({ score }) {
  const band = scoreBand(score);
  if (!band) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-xs font-semibold ${bandChip[band]}`}>
      {score}
    </span>
  );
}