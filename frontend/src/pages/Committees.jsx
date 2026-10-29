import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Users, Plus, Trash2, Sparkles } from "lucide-react";
import NoAccess from "@/components/NoAccess";
import { usePermissions } from "@/lib/permissions";

const COMMITTEES = ["Board", "Board Risk Committee", "ERC", "Credit Committee", "Other"];
const ROLES = ["Chair", "Member", "Secretary", "Attendee", "Guest"];
const inputCls = "h-8 rounded-md border border-input bg-background px-2 text-sm";

export default function Committees() {
  const { user, role } = useAccess();
  const canManage = role !== "read_only";
  const { canView } = usePermissions();
  const [committees, setCommittees] = useState([]);
  const [standing, setStanding] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s, e] = await Promise.all([
        base44.entities.Committee.list(),
        base44.entities.StandingMember.list(),
        base44.entities.Employee.list(),
      ]);
      setCommittees(c); setStanding(s); setEmployees(e);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    load();
    const u1 = base44.entities.Committee.subscribe(load);
    const u2 = base44.entities.StandingMember.subscribe(load);
    return () => { u1(); u2(); };
  }, [load]);

  const empName = (id) => {
    const e = employees.find((x) => x.id === id);
    return e?.full_name || e?.email || "—";
  };

  const setD = (cid, k, v) => setDraft((d) => ({ ...d, [cid]: { ...(d[cid] || { emp: "", role: "Member" }), [k]: v } }));

  const initDefaults = async () => {
    if (!canManage) return;
    try {
      const existing = new Set(committees.map((c) => c.name));
      const toCreate = COMMITTEES.filter((n) => !existing.has(n)).map((n) => ({ name: n, quorum: 1 }));
      if (toCreate.length) await base44.entities.Committee.bulkCreate(toCreate);
      alert("Default committees initialised.");
    } catch (e) { alert(e.message || e); }
  };

  const updateQuorum = async (c, quorum) => {
    try { const upd = await auditUpdate("Committee", c.id, { quorum: Number(quorum) || 0 }, c, user); setCommittees((arr) => arr.map((x) => (x.id === c.id ? upd : x))); } catch (e) { alert(e.message || e); }
  };

  const addMember = async (cid) => {
    const dd = draft[cid] || { emp: "", role: "Member" };
    if (!dd.emp) return;
    try {
      await auditCreate("StandingMember", { committee: cid, employee: dd.emp, role_at_meeting: dd.role, active: true }, user);
      setDraft((d) => ({ ...d, [cid]: { emp: "", role: "Member" } }));
    } catch (e) { alert(e.message || e); }
  };
  const removeMember = async (m) => {
    try { await auditDelete("StandingMember", m.id, m, user); } catch (e) { alert(e.message || e); }
  };
  const toggleActive = async (m) => {
    try { await auditUpdate("StandingMember", m.id, { active: !m.active }, m, user); } catch (e) { alert(e.message || e); }
  };

  if (!canView("Committees")) return <NoAccess section={{ id: "Committees" }} />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Users className="h-5 w-5 text-primary" /> Committees</h1>
          <p className="text-xs text-muted-foreground">Standing membership & quorum per committee — used to auto-populate new meeting attendance registers.</p>
        </div>
        {canManage && committees.length < COMMITTEES.length && (
          <Button variant="outline" onClick={initDefaults}><Sparkles className="mr-1 h-4 w-4" /> Initialise defaults</Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : committees.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          No committees yet. {canManage && <button onClick={initDefaults} className="text-primary underline">Initialise the five defaults</button>} to get started.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {committees.map((c) => {
            const members = standing.filter((s) => s.committee === c.id);
            const active = members.filter((m) => m.active !== false);
            const dd = draft[c.id] || { emp: "", role: "Member" };
            return (
              <div key={c.id} className="rounded-md border border-border bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    Quorum
                    <input
                      type="number"
                      min={0}
                      disabled={!canManage}
                      className={`${inputCls} w-16`}
                      defaultValue={c.quorum || 0}
                      onBlur={(e) => updateQuorum(c, e.target.value)}
                    />
                  </label>
                </div>
                <p className="mb-2 text-[11px] text-muted-foreground">{active.length} active standing member{active.length === 1 ? "" : "s"}</p>

                <div className="space-y-1">
                  {members.map((m) => (
                    <div key={m.id} className={`flex items-center gap-2 rounded border px-2 py-1 text-sm ${m.active === false ? "border-dashed border-border bg-muted/40 text-muted-foreground" : "border-border"}`}>
                      <span className="flex-1">{empName(m.employee)}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{m.role_at_meeting || "Member"}</span>
                      {canManage && (
                        <>
                          <button onClick={() => toggleActive(m)} className="text-[11px] text-primary underline">{m.active === false ? "Reactivate" : "Retire"}</button>
                          <button onClick={() => removeMember(m)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                    </div>
                  ))}
                  {members.length === 0 && <p className="text-xs text-muted-foreground">No standing members yet.</p>}
                </div>

                {canManage && (
                  <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border p-2">
                    <select className={inputCls} value={dd.emp} onChange={(e) => setD(c.id, "emp", e.target.value)}>
                      <option value="">Add member…</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.email}</option>)}
                    </select>
                    <select className={inputCls} value={dd.role} onChange={(e) => setD(c.id, "role", e.target.value)}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={() => addMember(c.id)} disabled={!dd.emp} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Add</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}