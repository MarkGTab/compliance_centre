import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAccess } from "@/lib/access";
import { auditCreate, auditDelete } from "@/lib/audit";
import ConflictPicker from "@/components/ConflictPicker";
import { Trash2, UserMinus } from "lucide-react";

const inputCls = "h-8 rounded-md border border-input bg-background px-2 text-sm";

export default function DecisionRecusalEditor({ decision, presentMembers, personMap, conflicts, reloadConflicts }) {
  const { user, role } = useAccess();
  const canManage = role !== "read_only";
  const [recusals, setRecusals] = useState([]);
  const [pick, setPick] = useState("");
  const [reason, setReason] = useState("");

  const empName = (id) => personMap[id]?.full_name || personMap[id]?.email || "—";

  const load = async () => {
    try { setRecusals(await base44.entities.DecisionRecusal.filter({ decision: decision.id })); } catch (e) {}
  };
  useEffect(() => { load(); }, [decision.id]);

  const recusedIds = new Set(recusals.map((r) => r.employee));
  const eligible = presentMembers.filter((a) => !recusedIds.has(a.invitee));

  const add = async () => {
    if (!canManage || !pick) return;
    try {
      const rec = await auditCreate("DecisionRecusal", { decision: decision.id, employee: pick, reason, linked_conflict: null }, user);
      setRecusals((r) => [...r, rec]);
      setPick("");
      setReason("");
    } catch (e) { alert(e.message || e); }
  };
  const remove = async (id) => {
    try { await auditDelete("DecisionRecusal", id, recusals.find((r) => r.id === id), user); setRecusals((r) => r.filter((x) => x.id !== id)); } catch (e) { alert(e.message || e); }
  };
  const linkConflict = async (id, conflictId) => {
    try {
      const upd = await base44.entities.DecisionRecusal.update(id, { linked_conflict: conflictId });
      setRecusals((r) => r.map((x) => (x.id === id ? { ...x, ...upd } : x)));
    } catch (e) { alert(e.message || e); }
  };

  if (recusals.length === 0 && !canManage) return null;

  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/50 p-2 text-xs">
      <div className="mb-1 flex items-center gap-1 font-semibold text-amber-800"><UserMinus className="h-3.5 w-3.5" /> Item-level recusals{recusals.length ? ` (${recusals.length})` : ""}</div>
      {recusals.length > 0 && (
        <ul className="mb-2 space-y-1">
          {recusals.map((r) => (
            <li key={r.id} className="rounded border border-amber-200 bg-white p-1.5">
              <div className="flex items-center gap-2">
                <span className="font-medium">{empName(r.employee)}</span>
                {canManage && <button onClick={() => remove(r.id)} className="ml-auto text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
              {r.reason && <div className="text-muted-foreground">Reason: {r.reason}</div>}
              <div className="mt-1">
                <ConflictPicker value={r.linked_conflict} onChange={(v) => linkConflict(r.id, v)} conflicts={conflicts} onCreated={reloadConflicts} employeeId={r.employee} employeeName={empName(r.employee)} reason={r.reason} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <div className="flex flex-wrap items-end gap-2">
          <select className={inputCls} value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Recuse a present member…</option>
            {eligible.map((a) => <option key={a.id} value={a.invitee}>{empName(a.invitee)}</option>)}
          </select>
          <input className={`${inputCls} min-w-[140px] flex-1`} placeholder="Reason…" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button onClick={add} disabled={!pick} className="rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-50">Recuse</button>
        </div>
      )}
      {canManage && presentMembers.length === 0 && <p className="text-muted-foreground">Mark members Present in the attendance register to enable item-level recusals.</p>}
    </div>
  );
}