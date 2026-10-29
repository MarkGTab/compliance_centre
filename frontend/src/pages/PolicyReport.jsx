import React, { useEffect, useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import DocPrintLayout from "@/components/DocPrintLayout";

const statusStyles = {
  Current: "bg-emerald-100 text-emerald-800",
  "Due for Review": "bg-amber-100 text-amber-800",
  Overdue: "bg-red-100 text-red-800",
  Archived: "bg-slate-100 text-slate-600",
};

function daysTo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

export default function PolicyReport() {
  const [policies, setPolicies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d, u] = await Promise.all([
        base44.entities.Policy.list("-next_review_date", 500),
        base44.entities.Department.list(),
        base44.entities.User.list(),
      ]);
      setPolicies(p); setDepartments(d); setUsers(u);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const deptName = (id) => departments.find((d) => d.id === id)?.name;
  const userName = (id) => { const u = users.find((x) => x.id === id); return u?.full_name || u?.email || "—"; };

  const counts = useMemo(() => {
    let current = 0, due = 0, overdue = 0;
    for (const p of policies) {
      const days = daysTo(p.next_review_date);
      if (p.status === "Archived") continue;
      if (p.status === "Overdue" || (days !== null && days < 0)) overdue++;
      else if (p.status === "Due for Review" || (days !== null && days >= 0 && days <= 60)) due++;
      else current++;
    }
    return { total: policies.length, current, due, overdue };
  }, [policies]);

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  const asAt = new Date().toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <DocPrintLayout
      title="Policy Report"
      subtitle="TAB · Policy Suite — review status and ownership"
      asAt={asAt}
      orientation="landscape"
    >
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Count label="Total Policies" value={counts.total} />
        <Count label="Current" value={counts.current} color="emerald" />
        <Count label="Due for Review" value={counts.due} color="amber" />
        <Count label="Overdue" value={counts.overdue} color="red" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border bg-white">
        <table className="w-full border-collapse text-xs">
          <thead style={{ background: "#DD5115" }} className="text-white">
            <tr>
              <th className="px-2 py-2 text-left">Policy</th>
              <th className="px-2 py-2 text-left">Department</th>
              <th className="px-2 py-2 text-left">Owner</th>
              <th className="px-2 py-2 text-left">Approved By</th>
              <th className="px-2 py-2 text-left">Approval Date</th>
              <th className="px-2 py-2 text-left">Next Review</th>
              <th className="px-2 py-2 text-left">Frequency</th>
              <th className="px-2 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p, i) => (
              <tr key={p.id} className={i % 2 ? "bg-muted/20" : ""}>
                <td className="px-2 py-1.5 font-medium">{p.policy_name}</td>
                <td className="px-2 py-1.5">{deptName(p.department) || "—"}</td>
                <td className="px-2 py-1.5">{userName(p.owner)}</td>
                <td className="px-2 py-1.5">{p.approved_by || "—"}</td>
                <td className="px-2 py-1.5">{p.approval_date || "—"}</td>
                <td className="px-2 py-1.5">{p.next_review_date || "—"}</td>
                <td className="px-2 py-1.5">{p.review_frequency || "—"}</td>
                <td className="px-2 py-1.5"><span className={`rounded px-1.5 py-0.5 text-xs ${statusStyles[p.status] || ""}`}>{p.status || "—"}</span></td>
              </tr>
            ))}
            {policies.length === 0 && <tr><td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">No policies recorded.</td></tr>}
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
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}