import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Gavel, Search, Users, Copy } from "lucide-react";
import MeetingForm from "@/components/board/MeetingForm";
import { useAccess } from "@/lib/access";
import { auditCreate } from "@/lib/audit";
import { buildPersonMap } from "@/lib/people";
import { populateAttendanceForMeeting } from "@/lib/board-attendance";

const COMMITTEES = ["Board", "Board Risk Committee", "ERC", "Credit Committee", "Other"];
const statusStyles = {
  Scheduled: "bg-blue-100 text-blue-800",
  Held: "bg-slate-100 text-slate-800",
  "Minutes Draft": "bg-amber-100 text-amber-800",
  "Minutes Approved": "bg-emerald-100 text-emerald-800",
};

export default function BoardGovernance() {
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCommittee, setFilterCommittee] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user, canCreate } = useAccess();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("new") === "1") setShowForm(true);
  }, []);

  const cloneMeeting = async (m) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = m;
    try {
      const created = await auditCreate("Meeting", { ...rest, title: `${m.title} (copy)`, status: "Scheduled" }, user);
      try { await populateAttendanceForMeeting(created.id, rest.committee, user); } catch (e) { console.error("populate attendance", e); }
    }
    catch (e) { alert("Clone failed: " + (e.message || e)); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, u, emps] = await Promise.all([
        base44.entities.Meeting.list("-date", 500),
        base44.entities.User.list(),
        base44.entities.Employee.list(),
      ]);
      setMeetings(m); setUsers(u); setEmployees(emps);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const u = base44.entities.Meeting.subscribe(load); return u; }, [load]);

  const personMap = buildPersonMap(employees, users);
  const userName = (id) => personMap[id]?.full_name || personMap[id]?.email || "—";

  const rows = useMemo(() => {
    let arr = [...meetings];
    if (filterCommittee) arr = arr.filter((m) => m.committee === filterCommittee);
    if (fromDate) arr = arr.filter((m) => m.date && m.date >= fromDate);
    if (toDate) arr = arr.filter((m) => m.date && m.date <= toDate);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((m) => (m.title || "").toLowerCase().includes(q));
    }
    return arr;
  }, [meetings, filterCommittee, fromDate, toDate, search]);

  const saveMeeting = async (payload) => {
    try {
      const created = await auditCreate("Meeting", payload, user);
      try { await populateAttendanceForMeeting(created.id, payload.committee, user); } catch (e) { console.error("populate attendance", e); }
      setShowForm(false);
      navigate(`/board-governance/meeting/${created.id}`);
    } catch (e) { alert("Failed: " + (e.message || e)); }
  };

  const inputCls = "h-8 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Gavel className="h-5 w-5 text-primary" /> Board & Governance</h1>
          <p className="text-xs text-muted-foreground">Meetings, decisions and follow-ups for the Board, BRC and ERC</p>
        </div>
        {canCreate("Meeting") && <Button onClick={() => setShowForm(true)}><Users className="mr-1 h-4 w-4" /> New Meeting</Button>}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-white p-3">
        <div>
          <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Committee</Label>
          <select className={inputCls} value={filterCommittee} onChange={(e) => setFilterCommittee(e.target.value)}>
            <option value="">All</option>
            {COMMITTEES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">From</Label>
          <input type="date" className={inputCls} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">To</Label>
          <input type="date" className={inputCls} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="relative min-w-[180px] flex-1">
          <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Search</Label>
          <Search className="pointer-events-none absolute left-2 top-6 h-3.5 w-3.5 text-muted-foreground" />
          <input className={`h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-sm`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title…" />
        </div>
        <span className="text-xs text-muted-foreground">{rows.length} meetings</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-border bg-white p-8 text-center text-sm text-muted-foreground">No meetings yet. Click "New Meeting" to create the first.</div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Committee</th>
                <th className="px-3 py-2 text-left">Chair</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Next</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="cursor-pointer border-t border-border hover:bg-muted/40" onClick={() => navigate(`/board-governance/meeting/${m.id}`)}>
                  <td className="px-3 py-2">{m.date || "—"}</td>
                  <td className="px-3 py-2 font-medium">{m.title}</td>
                  <td className="px-3 py-2">{m.committee}</td>
                  <td className="px-3 py-2 text-muted-foreground">{userName(m.chair)}</td>
                  <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${statusStyles[m.status] || ""}`}>{m.status || "—"}</span></td>
                  <td className="px-3 py-2 text-muted-foreground">{m.next_meeting_date || "—"}</td>
                  <td className="px-3 py-2 text-right"><button onClick={(e) => { e.stopPropagation(); cloneMeeting(m); }} title="Clone" className="text-muted-foreground hover:text-primary"><Copy className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MeetingForm open={showForm} onClose={() => setShowForm(false)} onSave={saveMeeting} users={employees} />
    </div>
  );
}