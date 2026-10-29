import React from "react";
import { useNavigate } from "react-router-dom";
import { Gauge } from "lucide-react";
import { buildLink } from "@/lib/deeplink";
import { kriRag, ragDot } from "@/lib/risk-helpers";

const ragText = { Green: "text-emerald-700", Amber: "text-amber-700", Red: "text-red-700" };

export default function DepartmentKriPanel({ kris }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Gauge className="h-4 w-4 text-primary" /> KRIs
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{kris.length}</span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {kris.length === 0 ? (
          <p className="text-xs text-muted-foreground">No KRIs linked to this department's risks.</p>
        ) : (
          <ul className="space-y-1.5">
            {kris.map((k) => {
              const rag = kriRag(k);
              return (
                <li key={k.id}>
                <button
                  onClick={() => navigate(buildLink("/kri-dashboard", { q: k.indicator, from: "/departments" }))}
                  className="w-full rounded border border-border px-3 py-1.5 text-left text-sm hover:bg-muted/40"
                >
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-medium">{k.indicator}</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${rag ? ragDot[rag] : "bg-slate-300"}`} />
                      <span className={`text-xs font-semibold ${rag ? ragText[rag] : "text-muted-foreground"}`}>{rag || "—"}</span>
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Current: <b>{k.current_value || "—"}</b>{k.trend && ` · ${k.trend}`}
                  </div>
                </button>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}