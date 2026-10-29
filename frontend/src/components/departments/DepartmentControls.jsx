import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { buildLink } from "@/lib/deeplink";

const effBadge = {
  Strong: "bg-emerald-100 text-emerald-800",
  Adequate: "bg-amber-100 text-amber-800",
  Weak: "bg-red-100 text-red-800",
};

export default function DepartmentControls({ controls }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="h-4 w-4 text-primary" /> Controls
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{controls.length}</span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {controls.length === 0 ? (
          <p className="text-xs text-muted-foreground">No controls owned by this department's head.</p>
        ) : (
          <ul className="space-y-1.5">
            {controls.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => navigate(buildLink("/controls", { q: c.control_ref || c.description, from: "/departments" }))}
                  className="w-full rounded border border-border px-3 py-1.5 text-left text-sm hover:bg-muted/40"
                >
                <div className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="font-mono text-xs text-muted-foreground">{c.control_ref || ""} </span>
                    {c.description}
                  </span>
                  <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-xs">{c.type || "—"}</span>
                </div>
                <div className="mt-1 flex gap-1.5 text-[11px]">
                  <span className={`rounded px-1.5 py-0.5 ${effBadge[c.design_effectiveness] || "bg-muted text-muted-foreground"}`}>
                    Design: {c.design_effectiveness || "—"}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 ${effBadge[c.operating_effectiveness] || "bg-muted text-muted-foreground"}`}>
                    Ops: {c.operating_effectiveness || "—"}
                  </span>
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