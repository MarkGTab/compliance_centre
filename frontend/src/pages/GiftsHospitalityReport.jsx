import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DocPrintLayout from "@/components/DocPrintLayout";
import { RELATIONSHIPS, complianceStyles } from "@/lib/gift-policy";
import { buildPersonMap } from "@/lib/people";

function gbp(v) {
  if (v === null || v === undefined || v === "") return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(v));
}

export default function GiftsHospitalityReport() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, u, emps] = await Promise.all([
        base44.entities.GiftHospitalityDeclaration.list("-date", 500),
        base44.entities.User.list(),
        base44.entities.Employee.list(),
      ]);
      setRows(g); setUsers(u); setEmployees(emps);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const personMap = buildPersonMap(employees, users);
  const userName = (id) => personMap[id]?.full_name || personMap[id]?.email || "—";

  const summary = useMemo(() => {
    let within = 0, review = 0, breach = 0, value = 0;
    const byRel = {};
    for (const r of rows) {
      if (r.compliance_status === "Within Policy") within++;
      else if (r.compliance_status === "Requires Review") review++;
      else if (r.compliance_status === "BREACH") breach++;
      if (typeof r.estimated_value === "number") value += r.estimated_value;
      const rel = r.counterparty_relationship || "Unknown";
      byRel[rel] = (byRel[rel] || 0) + (typeof r.estimated_value === "number" ? r.estimated_value : 0);
    }
    return { total: rows.length, within, review, breach, value, byRel };
  }, [rows]);

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  const asAt = new Date().toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <DocPrintLayout
      title="Gifts & Hospitality Report"
      subtitle="TAB · Anti-bribery control evidence (for board, MLRO & external auditors)"
      asAt={asAt}
      orientation="landscape"
      maxW="1400px"
      toolbar={
        <Link to="/gifts-hospitality" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted">
          Register
        </Link>
      }
    >
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Count label="Total Declarations" value={summary.total} />
        <Count label="Within Policy" value={summary.within} color="emerald" />
        <Count label="Requires Review" value={summary.review} color="amber" />
        <Count label="Breaches" value={summary.breach} color="red" />
        <Count label="Total Value" value={gbp(summary.value)} />
      </div>

      <div className="mt-4 rounded-md border border-border bg-white p-3">
        <div className="mb-2 text-sm font-semibold" style={{ color: "#DD5115" }}>Total value by counterparty relationship</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {RELATIONSHIPS.map((rel) => (
            <div key={rel} className="rounded border border-border p-2 text-center">
              <div className="text-[11px] text-muted-foreground">{rel}</div>
              <div className="text-sm font-semibold">{gbp(summary.byRel[rel] || 0)}</div>
            </div>
          ))}
          {summary.byRel["Unknown"] ? (
            <div className="rounded border border-border p-2 text-center">
              <div className="text-[11px] text-muted-foreground">Unknown</div>
              <div className="text-sm font-semibold">{gbp(summary.byRel["Unknown"])}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border bg-white">
        <table className="w-full border-collapse text-xs">
          <thead style={{ background: "#DD5115" }} className="text-white">
            <tr>
              <th className="px-2 py-2 text-left">Date</th>
              <th className="px-2 py-2 text-left">Employee</th>
              <th className="px-2 py-2 text-left">Direction</th>
              <th className="px-2 py-2 text-left">Counterparty</th>
              <th className="px-2 py-2 text-left">Relationship</th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 text-left">Purpose</th>
              <th className="px-2 py-2 text-right">Value</th>
              <th className="px-2 py-2 text-left">Approval req.</th>
              <th className="px-2 py-2 text-left">Approval obt.</th>
              <th className="px-2 py-2 text-left">Compliance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={i % 2 ? "bg-muted/20" : ""}>
                <td className="px-2 py-1.5">{r.date || "—"}</td>
                <td className="px-2 py-1.5">{userName(r.employee)}</td>
                <td className="px-2 py-1.5">{r.direction || "—"}</td>
                <td className="px-2 py-1.5">{r.counterparty || "—"}</td>
                <td className="px-2 py-1.5">{r.counterparty_relationship || "—"}</td>
                <td className="px-2 py-1.5">{r.description || "—"}</td>
                <td className="px-2 py-1.5">{r.purpose || "—"}</td>
                <td className="px-2 py-1.5 text-right">{gbp(r.estimated_value)}</td>
                <td className="px-2 py-1.5">{r.prior_approval_required || "—"}</td>
                <td className="px-2 py-1.5">{r.prior_approval_obtained || "—"}</td>
                <td className="px-2 py-1.5"><span className={`rounded px-1.5 py-0.5 ${complianceStyles[r.compliance_status] || ""}`}>{r.compliance_status || "—"}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} className="px-2 py-8 text-center text-muted-foreground">No declarations recorded.</td></tr>}
          </tbody>
        </table>
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