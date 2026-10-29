import React from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeatMap from "@/components/dashboard/DashboardHeatMap";
import ScoreChip from "@/components/risk/ScoreChip";
import RagDot from "@/components/risk/RagDot";
import { buildLink } from "@/lib/deeplink";
import { statusStyles } from "@/lib/risk-helpers";

export default function DepartmentRisksPanel({ risks, users }) {
  const navigate = useNavigate();
  const ownerName = (id) => {
    const u = users.find((x) => x.id === id);
    return u?.full_name || u?.email;
  };
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-md border border-border bg-white p-4">
        <div className="mb-2 text-sm font-semibold">Departmental Heat Map</div>
        <DashboardHeatMap risks={risks} />
      </div>
      <div className="overflow-x-auto rounded-md border border-border lg:col-span-2">
        <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
          Departmental-tier Risks ({risks.length})
        </div>
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Risk</th>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2 text-center">Res.</th>
              <th className="px-3 py-2 text-center">App.</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr
                key={r.id}
                onClick={() => navigate(buildLink("/risk-register", { q: r.risk_ref || r.title, from: "/departments" }))}
                className="cursor-pointer border-t border-border hover:bg-muted/40"
              >
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.risk_ref || ""} </span>
                  <span className="font-medium">{r.title}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{ownerName(r.owner) || "—"}</td>
                <td className="px-3 py-2 text-center"><ScoreChip score={r.residual_score} /></td>
                <td className="px-3 py-2 text-center"><RagDot value={r.appetite_status} /></td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${statusStyles[r.status] || ""}`}>{r.status}</span>
                </td>
              </tr>
            ))}
            {risks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No Departmental-tier risks linked to this department.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}