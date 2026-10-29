import React from "react";
import { Link } from "react-router-dom";
import { buildLink } from "@/lib/deeplink";
import DepartmentRisksPanel from "./DepartmentRisksPanel";
import DepartmentControls from "./DepartmentControls";
import DepartmentKriPanel from "./DepartmentKriPanel";
import DepartmentActionsPanel from "./DepartmentActionsPanel";

const Stat = ({ label, value, to }) => (
  <Link to={to} className="block rounded px-2 py-1 text-center hover:bg-muted/60" title={`Open ${label} for this department`}>
    <div className="text-2xl font-bold text-primary">{value}</div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
  </Link>
);

export default function DepartmentView({ department, risks, controls, kris, actions, users }) {
  if (!department) return <p className="text-sm text-muted-foreground">No department selected.</p>;

  const head = users.find((u) => u.id === department.head);
  const headName = head?.full_name || head?.email || "—";
  const deptRiskIds = new Set(risks.filter((r) => r.department === department.id).map((r) => r.id));
  const deptRisks = risks.filter((r) => r.tier === "Departmental" && r.department === department.id);
  const deptControls = controls.filter((c) => c.owner === department.head);
  const deptKris = kris.filter((k) => deptRiskIds.has(k.linked_risk));
  const deptActions = actions.filter((a) => deptRiskIds.has(a.linked_risk) && a.status !== "Complete");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6 rounded-md border border-border bg-white p-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Department</div>
          <div className="text-lg font-semibold">{department.name}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Head of Function</div>
          <div className="text-sm">{headName}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Line of Defence</div>
          <div className="text-sm">{department.line_of_defence || "—"}</div>
        </div>
        <div className="ml-auto flex gap-4">
          <Stat label="Risks" value={deptRisks.length} to={buildLink("/risk-register", { department: department.id, from: "/departments" })} />
          <Stat label="Controls" value={deptControls.length} to={buildLink("/controls", { from: "/departments" })} />
          <Stat label="KRIs" value={deptKris.length} to={buildLink("/kri-dashboard", { from: "/departments" })} />
          <Stat label="Actions" value={deptActions.length} to={buildLink("/actions", { from: "/departments" })} />
        </div>
      </div>

      <DepartmentRisksPanel risks={deptRisks} users={users} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DepartmentControls controls={deptControls} />
        <DepartmentKriPanel kris={deptKris} />
        <DepartmentActionsPanel actions={deptActions} />
      </div>
    </div>
  );
}