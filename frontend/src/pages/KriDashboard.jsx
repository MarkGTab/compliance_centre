import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Register from "@/components/registers/Register";
import { loadLookups } from "@/lib/register-lookups";
import { kriRag, ragDot, isKriStale, kriDirection, formatDate } from "@/lib/risk-helpers";
import { buildLink } from "@/lib/deeplink";
import { useAccess } from "@/lib/access";

const TREND = ["Improving", "Stable", "Worsening"];
const UNITS = ["%", "GBP", "Count", "Ratio", "Days", "Months", "bps", "Other"];
const DIRECTIONS = ["Higher is worse", "Lower is worse"];
const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Quarterly"];
const ragText = { Green: "text-emerald-700", Amber: "text-amber-700", Red: "text-red-700" };

const fmtVal = (v, unit) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (unit === "GBP") return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
  if (unit === "%") return `${n}%`;
  if (unit === "bps") return `${n}bps`;
  return n.toLocaleString("en-GB");
};

const addFreq = (iso, freq) => {
  const d = new Date(iso || new Date());
  if (freq === "Daily") d.setDate(d.getDate() + 1);
  else if (freq === "Weekly") d.setDate(d.getDate() + 7);
  else if (freq === "Quarterly") d.setMonth(d.getMonth() + 3);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

// Validate triggers are in the right order for the KRI's direction and stamp
// the update dates when a new value is entered.
const beforeSave = async (d, prev) => {
  const lowerWorse = (d.direction || kriDirection(d)) === "Lower is worse";
  if (d.amber_trigger != null && d.red_trigger != null) {
    const ok = lowerWorse ? d.red_trigger <= d.amber_trigger : d.red_trigger >= d.amber_trigger;
    if (!ok) {
      alert(lowerWorse
        ? "For a 'lower is worse' KRI the red trigger must be at or below the amber trigger."
        : "For a 'higher is worse' KRI the red trigger must be at or above the amber trigger.");
      return false;
    }
  }
  const out = { ...d };
  const valueChanged = d.current_value_num != null && d.current_value_num !== prev?.current_value_num;
  if (valueChanged) {
    const today = new Date().toISOString().slice(0, 10);
    out.last_updated = d.last_updated && d.last_updated !== prev?.last_updated ? d.last_updated : today;
    out.next_update_due = addFreq(out.last_updated, d.frequency);
    out.current_value = fmtVal(d.current_value_num, d.unit); // keep the text field in step for older screens
    if (prev?.current_value_num != null) {
      const worse = lowerWorse ? d.current_value_num < prev.current_value_num : d.current_value_num > prev.current_value_num;
      const better = lowerWorse ? d.current_value_num > prev.current_value_num : d.current_value_num < prev.current_value_num;
      out.trend = worse ? "Worsening" : better ? "Improving" : "Stable";
    }
  }
  return out;
};

// Every new value is kept as a dated reading, so trend and breach history are
// evidenced rather than typed in.
const afterSave = async (saved, prev, user) => {
  if (saved.current_value_num == null || saved.current_value_num === prev?.current_value_num) return;
  let recordedBy = null;
  try {
    const emps = await base44.entities.Employee.filter({ linked_user: user?.id });
    recordedBy = emps?.[0]?.id || null;
  } catch { /* ignore */ }
  await base44.entities.KRIReading.create({
    kri: saved.id,
    period_date: saved.last_updated || new Date().toISOString().slice(0, 10),
    value: saved.current_value_num,
    rag: kriRag(saved),
    recorded_by: recordedBy,
  });
};

export default function KriDashboard() {
  const { canCreate, canEdit } = useAccess();
  return (
    <Register
      title="KRI Dashboard"
      subtitle="Key Risk Indicators — RAG against numeric amber / red triggers; every update is kept as a dated reading"
      entityName="KRI"
      addLabel="Add KRI"
      newRow={{ trend: "Stable", direction: "Higher is worse", frequency: "Monthly" }}
      access={{ canCreate: canCreate("KRI"), canEdit: () => canEdit("KRI") }}
      enrich={async () => loadLookups({ risks: true, categories: true })}
      beforeSave={beforeSave}
      afterSave={afterSave}
      summary={(rows) => {
        const rags = rows.map(kriRag);
        const n = (c) => rags.filter((r) => r === c).length;
        const stale = rows.filter(isKriStale).length;
        const noValue = rags.filter((r) => r == null).length;
        const tile = (label, v, cls = "") => (
          <div className="rounded-md border border-border bg-white p-3">
            <div className={`text-2xl font-bold ${cls}`}>{v}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          </div>
        );
        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {tile("Red", n("Red"), "text-red-600")}
            {tile("Amber", n("Amber"), "text-amber-600")}
            {tile("Green", n("Green"), "text-emerald-600")}
            {tile("No value / not set up", noValue, "text-slate-500")}
            {tile("Update overdue", stale, stale ? "text-red-600" : "")}
          </div>
        );
      }}
      columns={[
        { key: "indicator", label: "Indicator" },
        {
          key: "linked_risk",
          label: "Linked Risk",
          render: (r, ex) => {
            const rk = ex.riskMap?.[r.linked_risk];
            return rk ? <Link to={buildLink("/risk-register", { q: rk.risk_ref || rk.title })} className="text-primary underline">{rk.title}</Link> : "—";
          },
        },
        {
          key: "current_value",
          label: "Current",
          className: "text-center",
          render: (r) => <b>{r.current_value_num != null ? fmtVal(r.current_value_num, r.unit) : (r.current_value || "—")}</b>,
        },
        {
          key: "triggers",
          label: "Amber / Red",
          className: "text-center",
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {r.amber_trigger != null ? fmtVal(r.amber_trigger, r.unit) : (r.amber_threshold || "—")} / {r.red_trigger != null ? fmtVal(r.red_trigger, r.unit) : (r.red_threshold || "—")}
              <span className="ml-1">{kriDirection(r) === "Lower is worse" ? "↓ bad" : "↑ bad"}</span>
            </span>
          ),
        },
        {
          key: "rag",
          label: "RAG",
          className: "text-center",
          render: (r) => {
            const rag = kriRag(r);
            return (
              <span className="flex items-center justify-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${rag ? ragDot[rag] : "bg-slate-300"}`} />
                <span className={`text-xs font-semibold ${rag ? ragText[rag] : ""}`}>{rag || "—"}</span>
              </span>
            );
          },
        },
        { key: "trend", label: "Trend", render: (r) => <span className="text-xs">{r.trend || "—"}</span> },
        {
          key: "last_updated",
          label: "Updated",
          render: (r) => (
            <span className="text-xs">
              {formatDate(r.last_updated)}
              {isKriStale(r) && <span className="ml-1 rounded bg-red-100 px-1 text-[10px] font-semibold text-red-700">OVERDUE</span>}
            </span>
          ),
        },
        { key: "owner", label: "Owner", render: (r, ex) => ex.userMap?.[r.owner]?.full_name || "—" },
      ]}
      fields={(extra) => [
        { key: "indicator", label: "Indicator", required: true },
        {
          key: "linked_risk",
          label: "Linked Risk",
          type: "select",
          options: extra.risks?.map((r) => ({ value: r.id, label: r.risk_ref ? [r.risk_ref, r.title].join(" ") : r.title })) || [],
        },
        {
          key: "linked_category",
          label: "Linked Category",
          type: "select",
          options: extra.categories?.map((c) => ({ value: c.id, label: c.name })) || [],
        },
        { key: "unit", label: "Unit", type: "select", options: UNITS },
        { key: "direction", label: "Direction (which way is bad?)", type: "select", options: DIRECTIONS },
        { key: "amber_trigger", label: "Amber trigger (number, in the unit above — e.g. 5000000 for £5m)", type: "number" },
        { key: "red_trigger", label: "Red trigger / limit (number)", type: "number" },
        { key: "current_value_num", label: "Current value (number) — saving a new value records a dated reading", type: "number" },
        { key: "last_updated", label: "As-at date of current value", type: "date" },
        { key: "frequency", label: "Update frequency", type: "select", options: FREQUENCIES },
        { key: "data_source", label: "Data Source" },
        {
          key: "owner",
          label: "Owner",
          type: "select",
          options: extra.users?.map((u) => ({ value: u.id, label: u.full_name || u.email })) || [],
        },
        { key: "green_threshold", label: "Green threshold (description, optional)" },
        { key: "amber_threshold", label: "Amber threshold (description, optional)" },
        { key: "red_threshold", label: "Red threshold (description, optional)" },
      ]}
      filters={[{ key: "trend", label: "Trend", options: TREND }]}
    />
  );
}
