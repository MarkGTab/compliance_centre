import React from "react";
import { ragDot } from "@/lib/risk-helpers";

export default function RagDot({ value, label }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${ragDot[value] || "bg-slate-300"}`} />
      {label && <span className="text-xs">{value}</span>}
    </span>
  );
}