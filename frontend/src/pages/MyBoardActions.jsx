import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle2 } from "lucide-react";
import { useAccess } from "@/lib/access";
import { auditUpdate } from "@/lib/audit";

const STATUSES = ["Open", "In Progress", "Overdue", "Complete"];

export default function MyBoardActions() {
  const [me, setMe] = useState(null);
  const [actions, setActions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const { role, user } = useAccess();
  const canManage = role !== "read_only";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a, mt, emps] = await Promise.all([
        base44.auth.me(),
        base44.entities.BoardAction.list("-created_date", 1000),
        base44.entities.Meeting.list(),
        base44.entities.Employee.list(),
      ]);
      setMe(m); setActions(a); setMeetings(mt); setEmployees(emps);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const u = base44.entities.BoardAction.subscribe(load); return u; }, [load]);

  const meetingMap = useMemo(() => Object.fromEntries(meetings.map((m) => [m.id, m])), [meetings]);
  const myEmpId = (employees.find((e) => e.linked_user === me?.id) || {}).id || null;
  const mine = useMemo(() => actions.filter((a) => a.assignee === myEmpId), [actions, myEmpId]);

  const update = async (id, patch) => {
    if (!canManage) return;
    try { const prev = actions.find((x) => x.id === id); const a = await auditUpdate("BoardAction", id, patch, prev, user); setActions((x) => x.map((b) => (b.id === id ? a : b))); } catch (e) { alert(e.message || e); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  if (!me) return <div className="py-16 text-center text-muted-foreground">Sign in to see your board actions.</div>;

  const inputCls = "h-8 rounded-md border border-input bg-background px-2 text-sm";
  const groups = {};
  for (const a of mine) {
    let st = a.status;
    if (a.due_date && a.due_date < today && a.status !== "Complete") st = "Overdue";
    (groups[st] ||= []).push(a);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold"><CheckCircle2 className="h-5 w-5 text-primary" /> My Board Actions</h1>
        <p className="text-xs text-muted-foreground">Actions assigned to {me.full_name || me.email}</p>
      </div>
      {mine.length === 0 ? (
        <div className="rounded-md border border-border bg-white p-8 text-center text-sm text-muted-foreground">No board actions assigned to you. <Link to="/board-actions" className="text-primary underline">View all</Link></div>
      ) : (
        STATUSES.map((s) => {
          const items = groups[s] || [];
          if (items.length === 0) return null;
          return (
            <div key={s} className="rounded-md border border-border bg-white">
              <div className={`px-3 py-2 text-sm font-semibold ${s === "Overdue" ? "text-red-700" : s === "Complete" ? "text-emerald-700" : ""}`}>{s} ({items.length})</div>
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">Meeting</th>
                    <th className="px-3 py-2 text-left">Due</th>
                    <th className="px-3 py-2 text-left">Priority</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} className={`border-t border-border ${s === "Overdue" ? "bg-red-50" : ""}`}>
                      <td className="px-3 py-2">{a.description}</td>
                      <td className="px-3 py-2 text-muted-foreground">{meetingMap[a.meeting]?.title || "—"}</td>
                      <td className="px-3 py-2">{a.due_date || "—"}</td>
                      <td className="px-3 py-2">{a.priority || "—"}</td>
                      <td className="px-3 py-2">
                        {canManage ? (
                          <select className={inputCls} value={a.status || "Open"} onChange={(e) => update(a.id, { status: e.target.value, completed_date: e.target.value === "Complete" ? new Date().toISOString().slice(0, 10) : null })}>
                            <option>Open</option>
                            <option>In Progress</option>
                            <option>Complete</option>
                            <option>Overdue</option>
                          </select>
                        ) : <span>{a.status || "Open"}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}