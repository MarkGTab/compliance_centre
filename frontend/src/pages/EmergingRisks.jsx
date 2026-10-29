import React from "react";
import Register from "@/components/registers/Register";
import { loadLookups } from "@/lib/register-lookups";
import { useAccess } from "@/lib/access";

const HORIZON = ["0-3 months", "3-6 months", "6-12 months", "12+ months"];
const WATCH = ["Watching", "Escalated", "Monitoring", "Closed"];
const watchBadge = {
  Watching: "bg-sky-100 text-sky-800",
  Escalated: "bg-red-100 text-red-800",
  Monitoring: "bg-amber-100 text-amber-800",
  Closed: "bg-emerald-100 text-emerald-800",
};

export default function EmergingRisks() {
  const { canCreate, canEdit } = useAccess();
  return (
    <Register
      title="Emerging / Horizon Risks"
      subtitle="Lightweight log of emerging themes on the risk horizon"
      entityName="EmergingRisk"
      addLabel="Add Emerging Risk"
      access={{ canCreate: canCreate("EmergingRisk"), canEdit: () => canEdit("EmergingRisk") }}
      newRow={{ watch_status: "Watching" }}
      enrich={async () => loadLookups({})}
      columns={[
        { key: "theme", label: "Theme" },
        { key: "description", label: "Description" },
        { key: "potential_impact", label: "Potential Impact" },
        {
          key: "likelihood_horizon",
          label: "Horizon",
          render: (r) => <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.likelihood_horizon || "—"}</span>,
        },
        { key: "owner", label: "Owner", render: (r, ex) => ex.userMap?.[r.owner]?.full_name || "—" },
        {
          key: "watch_status",
          label: "Watch Status",
          render: (r) => (
            <span className={`rounded px-1.5 py-0.5 text-xs ${watchBadge[r.watch_status] || ""}`}>{r.watch_status || "—"}</span>
          ),
        },
      ]}
      fields={(extra) => [
        { key: "theme", label: "Theme", required: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "potential_impact", label: "Potential Impact" },
        { key: "likelihood_horizon", label: "Likelihood Horizon", type: "select", options: HORIZON },
        {
          key: "owner",
          label: "Owner",
          type: "select",
          options: extra.users?.map((u) => ({ value: u.id, label: u.full_name || u.email })) || [],
        },
        { key: "watch_status", label: "Watch Status", type: "select", options: WATCH },
      ]}
      filters={[
        { key: "likelihood_horizon", label: "Horizon", options: HORIZON },
        { key: "watch_status", label: "Status", options: WATCH },
      ]}
    />
  );
}