import React from "react";
import { useNavigate } from "react-router-dom";
import { ListChecks } from "lucide-react";
import { buildLink } from "@/lib/deeplink";
import { formatDate } from "@/lib/risk-helpers";

const prioStyles = { High: "bg-red-100 text-red-800", Medium: "bg-amber-100 text-amber-800", Low: "bg-slate-100 text-slate-700" };
const stStyles = { Open: "bg-blue-100 text-blue-800", "In Progress": "bg-amber-100 text-amber-800" };

export default function DepartmentActionsPanel({ actions }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-primary" /> Open Actions
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{actions.length}</span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {actions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open actions linked to this department's risks.</p>
        ) : (
          <ul className="space-y-1.5">
            {actions.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => navigate(buildLink("/actions", { q: (a.description||"").slice(0,60), from: "/departments" }))}
                  className="w-full rounded border border-border px-3 py-1.5 text-left text-sm hover:bg-muted/40"
                >
                <div className="flex justify-between gap-2">
                  <span className="truncate font-medium">{a.description}</span>
                  <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs ${prioStyles[a.priority] || ""}`}>{a.priority}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className={`rounded px-1.5 py-0.5 ${stStyles[a.status] || ""}`}>{a.status}</span>
                  <span>{a.bucket}</span>
                  <span>Due {formatDate(a.due_date)}</span>
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