import React, { useEffect, useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import DocPrintLayout from "@/components/DocPrintLayout";
import { formatGbp } from "@/lib/risk-helpers";

const statusStyles = {
  Active: "bg-emerald-100 text-emerald-800",
  "Due for Renewal": "bg-amber-100 text-amber-800",
  Lapsed: "bg-red-100 text-red-800",
  Archived: "bg-slate-100 text-slate-600",
};

function daysTo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

export default function InsuranceReport() {
  const [policies, setPolicies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([
        base44.entities.InsurancePolicy.list("-expiry_date", 500),
        base44.entities.User.list(),
      ]);
      setPolicies(p); setUsers(u);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const userName = (id) => { const u = users.find((x) => x.id === id); return u?.full_name || u?.email || "—"; };

  const counts = useMemo(() => {
    let active = 0, due = 0, lapsed = 0, premium = 0;
    for (const p of policies) {
      const days = daysTo(p.expiry_date);
      if (p.status === "Archived") continue;
      if (p.status === "Lapsed" || (days !== null && days < 0)) lapsed++;
      else if (p.status === "Due for Renewal" || (days !== null && days >= 0 && days <= 60)) due++;
      else active++;
      if (typeof p.premium === "number") premium += p.premium;
    }
    return { total: policies.length, active, due, lapsed, premium };
  }, [policies]);

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  const asAt = new Date().toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <DocPrintLayout
      title="Insurance Report"
      subtitle="TAB · Evidence of cover maintained (for board / ERC / funders)"
      asAt={asAt}
      orientation="landscape"
      maxW="1400px"
    >
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Count label="Total Policies" value={counts.total} />
        <Count label="Active" value={counts.active} color="emerald" />
        <Count label="Due for Renewal" value={counts.due} color="amber" />
        <Count label="Lapsed" value={counts.lapsed} color="red" />
        <Count label="Total Annual Premium" value={formatGbp(counts.premium)} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border bg-white">
        <table className="w-full border-collapse text-xs">
          <thead style={{ background: "#DD5115" }} className="text-white">
            <tr>
              <th className="px-2 py-2 text-left">Policy</th>
              <th className="px-2 py-2 text-left">Cover Type</th>
              <th className="px-2 py-2 text-left">Insurer</th>
              <th className="px-2 py-2 text-left">Broker</th>
              <th className="px-2 py-2 text-right">Limit</th>
              <th className="px-2 py-2 text-right">Excess</th>
              <th className="px-2 py-2 text-right">Premium</th>
              <th className="px-2 py-2 text-left">Inception</th>
              <th className="px-2 py-2 text-left">Expiry</th>
              <th className="px-2 py-2 text-left">Owner</th>
              <th className="px-2 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p, i) => (
              <tr key={p.id} className={i % 2 ? "bg-muted/20" : ""}>
                <td className="px-2 py-1.5 font-medium">{p.policy_name}</td>
                <td className="px-2 py-1.5">{p.cover_type || "—"}</td>
                <td className="px-2 py-1.5">{p.insurer || "—"}</td>
                <td className="px-2 py-1.5">{p.broker || "—"}</td>
                <td className="px-2 py-1.5 text-right">{formatGbp(p.limit_of_indemnity)}</td>
                <td className="px-2 py-1.5 text-right">{formatGbp(p.excess)}</td>
                <td className="px-2 py-1.5 text-right">{formatGbp(p.premium)}</td>
                <td className="px-2 py-1.5">{p.inception_date || "—"}</td>
                <td className="px-2 py-1.5">{p.expiry_date || "—"}</td>
                <td className="px-2 py-1.5">{userName(p.owner)}</td>
                <td className="px-2 py-1.5"><span className={`rounded px-1.5 py-0.5 text-xs ${statusStyles[p.status] || ""}`}>{p.status || "—"}</span></td>
              </tr>
            ))}
            {policies.length === 0 && <tr><td colSpan={11} className="px-2 py-8 text-center text-muted-foreground">No insurance policies recorded.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-md border border-border bg-white p-3">
        <div className="mb-2 text-sm font-semibold" style={{ color: "#DD5115" }}>Key Exclusions</div>
        {policies.filter((p) => p.key_exclusions).length === 0 ? (
          <p className="text-xs text-muted-foreground">No exclusions recorded.</p>
        ) : (
          <ol className="space-y-1.5 text-xs">
            {policies.filter((p) => p.key_exclusions).map((p, i) => (
              <li key={p.id}><span className="font-semibold">[{i + 1}] {p.policy_name}:</span> {p.key_exclusions}</li>
            ))}
          </ol>
        )}
      </div>
    </DocPrintLayout>
  );
}

function Count({ label, value, color }) {
  const cls = color === "emerald" ? "border-emerald-300 text-emerald-700"
    : color === "amber" ? "border-amber-300 text-amber-700"
    : color === "red" ? "border-red-300 text-red-700"
    : "border-border";
  return (
    <div className={`rounded-md border bg-white p-3 text-center ${cls}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}