import React, { useEffect, useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { buildPersonMap } from "@/lib/people";
import { Gavel, Search } from "lucide-react";

const COMMITTEES = ["Board", "Board Risk Committee", "ERC", "Credit Committee", "Other"];
const STATUSES = ["Open", "In Progress", "Overdue", "Complete"];

export default function BoardActionsTracker() {
  const [actions, setActions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [risks, setRisks] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignee, setAssignee] = useState("");
  const [committee, setCommittee] = useState("");
  const [search, setSearch] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, m, u, r, p, emps] = await Promise.all([
        base44.entities.BoardAction.list("-created_date", 1000),
        base44.entities.Meeting.list(),
        base44.entities.User.list(),
        base44.entities.Risk.list("-created_date", 500),
        base44.entities.Policy.list(),
        base44.entities.Employee.list(),
      ]);
      setActions(a); setMeetings(m); setUsers(u); setRisks(r); setPolicies(p); setEmployees(emps);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    load();
    const u1 = base44.entities.BoardAction.subscribe(load);
    const u2 = base44.entities.Meeting.subscribe(load);
    return () => { u1(); u2(); };
  }, [load]);

  const meetingMap = useMemo(() => Object.fromEntries(meetings.map((m) => [m.id, m])), [meetings]);
  const personMap = buildPersonMap(employees, users);
  const userName = (id) => personMap[id]?.full_name || personMap[id]?.email || "—";
  const riskName = (id) => risks.find((r) => r.id === id)?.title;
  const policyName = (id) => policies.find((p) => p.id === id)?.policy_name;

  const filtered = useMemo(() => {
    let arr = actions.map((a) => ({ ...a, meetingObj: a.meeting ? meetingMap[a.meeting] : null }));
    if (assignee) arr = arr.filter((a) => a.assignee === assignee);
    if (committee) arr = arr.filter((a) => a.meetingObj?.committee === committee);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((a) => (a.description || "").toLowerCase().includes(q));
    }
    return arr;
  }, [actions, meetingMap, assignee, committee, search]);

  const byStatus = useMemo(() => {
    const groups = {};
    for (const a of filtered) {
      let st = a.status;
      if (a.due_date && a.due_date < today && a.status !== "Complete") st = "Overdue";
      (groups[st] ||= []).push(a);
    }
    return groups;
  }, [filtered, today]);

  const inputCls = "h-8 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold"><Gavel className="h-5 w-5 text-primary" /> Board Actions Tracker</h1>
        <p className="text-xs text-muted-foreground">Every board action across all committees — the single view for what's outstanding</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-white p-3">
        <div>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">Assignee</div>
          <select className={inputCls} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">All</option>
            {employees.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">Committee</div>
          <select className={inputCls} value={committee} onChange={(e) => setCommittee(e.target.value)}>
            <option value="">All</option>
            {COMMITTEES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="relative min-w-[180px] flex-1">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">Search</div>
          <Search className="pointer-events-none absolute left-2 top-6 h-3.5 w-3.5 text-muted-foreground" />
          <input className={`h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-sm`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Description…" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} actions</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : STATUSES.map((s) => {
        const items = byStatus[s] || [];
        return (
          <div key={s} className="rounded-md border border-border bg-white">
            <div className={`px-3 py-2 text-sm font-semibold ${s === "Overdue" ? "text-red-700" : s === "Complete" ? "text-emerald-700" : ""}`}>
              {s} ({items.length})
            </div>
            {items.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted-foreground">None.</div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">Committee</th>
                    <th className="px-3 py-2 text-left">Meeting</th>
                    <th className="px-3 py-2 text-left">Assignee</th>
                    <th className="px-3 py-2 text-left">Due</th>
                    <th className="px-3 py-2 text-left">Priority</th>
                    <th className="px-3 py-2 text-left">Linked Risk</th>
                    <th className="px-3 py-2 text-left">Linked Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} className={`border-t border-border ${s === "Overdue" ? "bg-red-50" : ""}`}>
                      <td className="px-3 py-2">{a.description}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.meetingObj?.committee || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.meetingObj?.title || "—"}</td>
                      <td className="px-3 py-2">{userName(a.assignee)}</td>
                      <td className="px-3 py-2">{a.due_date || "—"}</td>
                      <td className="px-3 py-2">{a.priority || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.linked_risk ? riskName(a.linked_risk) || "—" : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.linked_policy ? policyName(a.linked_policy) || "—" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}