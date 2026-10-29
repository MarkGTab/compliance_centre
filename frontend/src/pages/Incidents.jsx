import React from "react";
import { Link } from "react-router-dom";
import Register from "@/components/registers/Register";
import { loadLookups } from "@/lib/register-lookups";
import { formatDate, formatGbp } from "@/lib/risk-helpers";
import { useAccess } from "@/lib/access";

const isOpen = (s) => !/(closed|complete|resolved)/i.test(s || "");

const Stat = ({ label, value, tone }) => (
  <div className="rounded-md border border-border bg-white p-3">
    <div className={`text-2xl font-bold ${tone || ""}`}>{value}</div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
);

export default function Incidents() {
  const { canCreate, canEdit } = useAccess();
  return (
    <Register
      title="Incident & Loss Register"
      subtitle="All incidents with total financial impact and remediation status"
      entityName="Incident"
      addLabel="Add Incident"
      audited
      access={{ canCreate: canCreate("Incident"), canEdit: () => canEdit("Incident") }}
      enrich={async () => loadLookups({ risks: true, categories: true })}
      summary={(rows) => {
        const total = rows.reduce((s, r) => s + (Number(r.financial_impact) || 0), 0);
        const open = rows.filter((r) => isOpen(r.remediation_status)).length;
        const closed = rows.length - open;
        return (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total Financial Impact" value={formatGbp(total)} />
            <Stat label="Open Remediation" value={open} tone="text-amber-600" />
            <Stat label="Closed Remediation" value={closed} tone="text-emerald-600" />
          </div>
        );
      }}
      columns={[
        { key: "incident_ref", label: "Ref", className: "w-28" },
        { key: "date", label: "Date", render: (r) => formatDate(r.date) },
        { key: "category", label: "Category", render: (r, ex) => ex.categoryMap?.[r.category]?.name || "—" },
        { key: "description", label: "Description" },
        {
          key: "financial_impact",
          label: "Impact",
          className: "text-right",
          render: (r) => formatGbp(r.financial_impact),
        },
        {
          key: "remediation_status",
          label: "Remediation",
          render: (r) => (
            <span className={`rounded px-1.5 py-0.5 text-xs ${isOpen(r.remediation_status) ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              {r.remediation_status || "—"}
            </span>
          ),
        },
        {
          key: "linked_risk",
          label: "Linked Risk",
          render: (r, ex) => {
            const rk = ex.riskMap?.[r.linked_risk];
            return rk ? <Link to="/risk-register" className="text-primary underline">{rk.title}</Link> : "—";
          },
        },
      ]}
      fields={(extra) => [
        { key: "incident_ref", label: "Incident Reference", required: true },
        { key: "date", label: "Date", type: "date" },
        {
          key: "category",
          label: "Category",
          type: "select",
          options: extra.categories?.map((c) => ({ value: c.id, label: c.name })) || [],
        },
        { key: "description", label: "Description", type: "textarea", required: true },
        { key: "financial_impact", label: "Financial Impact (GBP)", type: "number" },
        { key: "root_cause", label: "Root Cause" },
        {
          key: "linked_risk",
          label: "Linked Risk",
          type: "select",
          options: extra.risks?.map((r) => ({ value: r.id, label: r.risk_ref ? [r.risk_ref, r.title].join(" ") : r.title })) || [],
        },
        { key: "remediation_status", label: "Remediation Status" },
        { key: "lessons_learned_status", label: "Lessons Learned Status" },
      ]}
    />
  );
}