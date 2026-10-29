import React from "react";
import Register from "@/components/registers/Register";
import { loadLookups } from "@/lib/register-lookups";
import { formatDate, ragDot } from "@/lib/risk-helpers";
import { useAccess } from "@/lib/access";

const CRIT = ["Critical", "High", "Medium", "Low"];
const RATING = ["Red", "Amber", "Green"];
const critBadge = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-amber-100 text-amber-800",
  Medium: "bg-sky-100 text-sky-800",
  Low: "bg-slate-100 text-slate-700",
};

export default function ThirdParties() {
  const { canCreate, canEdit } = useAccess();
  return (
    <Register
      title="Third-Party / Outsourcing Register"
      subtitle="Providers, criticality and risk rating"
      entityName="ThirdParty"
      addLabel="Add Third Party"
      access={{ canCreate: canCreate("ThirdParty"), canEdit: () => canEdit("ThirdParty") }}
      enrich={async () => loadLookups({})}
      columns={[
        { key: "provider", label: "Provider" },
        { key: "service", label: "Service" },
        {
          key: "criticality",
          label: "Criticality",
          render: (r) => (
            <span className={`rounded px-1.5 py-0.5 text-xs ${critBadge[r.criticality] || ""}`}>{r.criticality || "—"}</span>
          ),
        },
        { key: "contract_owner", label: "Contract Owner", render: (r, ex) => ex.userMap?.[r.contract_owner]?.full_name || "—" },
        { key: "review_date", label: "Review Date", render: (r) => formatDate(r.review_date) },
        {
          key: "risk_rating",
          label: "Risk Rating",
          className: "text-center",
          render: (r) => (
            <span className="flex items-center justify-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${ragDot[r.risk_rating] || "bg-slate-300"}`} />
              {r.risk_rating || "—"}
            </span>
          ),
        },
      ]}
      fields={(extra) => [
        { key: "provider", label: "Provider", required: true },
        { key: "service", label: "Service" },
        { key: "criticality", label: "Criticality", type: "select", options: CRIT },
        {
          key: "contract_owner",
          label: "Contract Owner",
          type: "select",
          options: extra.users?.map((u) => ({ value: u.id, label: u.full_name || u.email })) || [],
        },
        { key: "review_date", label: "Review Date", type: "date" },
        { key: "risk_rating", label: "Risk Rating", type: "select", options: RATING },
      ]}
      filters={[
        { key: "criticality", label: "Criticality", options: CRIT },
        { key: "risk_rating", label: "Rating", options: RATING },
      ]}
    />
  );
}