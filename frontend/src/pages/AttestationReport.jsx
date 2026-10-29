import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import DocPrintLayout from "@/components/DocPrintLayout";
import { buildPersonMap } from "@/lib/people";

const statusBadge = {
  Pending: "bg-slate-100 text-slate-700",
  Completed: "bg-emerald-100 text-emerald-800",
  "Exception Raised": "bg-amber-100 text-amber-800",
  Overdue: "bg-red-100 text-red-800",
};

export default function AttestationReport() {
  const [campaigns, setCampaigns] = useState([]);
  const [responses, setResponses] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sel, setSel] = useState("all");

  const load = useCallback(async () => {
    const [c, r, u, emps] = await Promise.all([
      base44.entities.AttestationCampaign.list("-created_date", 500),
      base44.entities.AttestationResponse.list("-created_date", 2000),
      base44.entities.User.list(),
      base44.entities.Employee.list(),
    ]);
    setCampaigns(c);
    setResponses(r);
    setUsers(u);
    setEmployees(emps);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const personMap = buildPersonMap(employees, users);
  const campMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));
  const shown = sel === "all" ? responses : responses.filter((r) => r.campaign === sel);
  const reportTitle =
    sel === "all" ? "All Attestations — combined" : campMap[sel]?.title || "Attestation Report";

  const asAt = new Date().toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <DocPrintLayout
      title="Attestation Report"
      subtitle={reportTitle}
      asAt={asAt}
      orientation="portrait"
      toolbar={
        <select
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
        >
          <option value="all">All campaigns (combined)</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      }
    >
      <div className="mt-4 overflow-x-auto rounded-md border border-border bg-white">
        <table className="w-full text-sm">
          <thead style={{ background: "#DD5115" }} className="text-white text-xs">
            <tr>
              <th className="px-2 py-2 text-left">Campaign</th>
              <th className="px-2 py-2 text-left">Responder</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">Response</th>
              <th className="px-2 py-2 text-left">Signed</th>
              <th className="px-2 py-2 text-left">Signature</th>
              <th className="px-2 py-2 text-left">Exceptions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const c = campMap[r.campaign];
              const u = personMap[r.employee] || personMap[r.user];
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-2 py-1">{c?.title || "—"}</td>
                  <td className="px-2 py-1">{u?.full_name || u?.email || "—"}</td>
                  <td className="px-2 py-1">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${statusBadge[r.status] || ""}`}>{r.status}</span>
                  </td>
                  <td className="px-2 py-1">{r.response_type || "—"}</td>
                  <td className="px-2 py-1 text-xs">{r.signed_datetime ? new Date(r.signed_datetime).toLocaleString() : "—"}</td>
                  <td className="px-2 py-1 text-xs">{r.signature_name || "—"}</td>
                  <td className="px-2 py-1 text-xs max-w-[240px]">{r.exception_detail || "—"}</td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">No responses.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DocPrintLayout>
  );
}