import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";
import { seedAttendanceFromLegacy } from "@/lib/board-attendance";
import ConflictPicker from "@/components/ConflictPicker";
import { UserPlus, Trash2, CheckCircle2, XCircle } from "lucide-react";

const ROLES = ["Chair", "Member", "Secretary", "Attendee", "Guest"];
const STATUSES = ["Invited", "Present", "Apologies", "Absent", "Recused"];

export default function AttendancePanel({ meeting, employees, personMap, conflicts, reloadConflicts, attendance, setAttendance }) {
  const { user, role } = useAccess();
  const canManage = role !== "read_only";
  const [guest, setGuest] = useState("");
  const [guestRole, setGuestRole] = useState("Guest");
  const inputCls = "h-8 rounded-md border border-input bg-background px-2 text-sm";

  const empName = (id) => personMap[id]?.full_name || personMap[id]?.email || "—";

  const counts = { Invited: 0, Present: 0, Apologies: 0, Absent: 0, Recused: 0 };
  attendance.forEach((a) => { counts[a.attendance_status] = (counts[a.attendance_status] || 0) + 1; });
  const required = meeting.required_quorum || 0;
  const quorumMet = required > 0 ? counts.Present >= required : null;

  const update = async (id, patch) => {
    if (!canManage) return;
    const prev = attendance.find((a) => a.id === id);
    try {
      const updated = await auditUpdate("Attendance", id, patch, prev, user);
      setAttendance((arr) => arr.map((a) => (a.id === id ? { ...a, ...updated } : a)));
    } catch (e) { alert(e.message || e); }
  };
  const remove = async (id) => {
    if (!canManage) return;
    try {
      await auditDelete("Attendance", id, attendance.find((a) => a.id === id), user);
      setAttendance((arr) => arr.filter((a) => a.id !== id));
    } catch (e) { alert(e.message || e); }
  };
  const addGuest = async () => {
    if (!canManage || !guest) return;
    try {
      const rec = await auditCreate("Attendance", { meeting: meeting.id, invitee: guest, role_at_meeting: guestRole, attendance_status: "Invited" }, user);
      setAttendance((arr) => [...arr, rec]);
      setGuest("");
      setGuestRole("Guest");
    } catch (e) { alert(e.message || e); }
  };
  const seedLegacy = async () => {
    if (!canManage) return;
    try {
      const n = await seedAttendanceFromLegacy(meeting, user);
      if (n > 0) setAttendance(await base44.entities.Attendance.filter({ meeting: meeting.id }));
    } catch (e) { alert(e.message || e); }
  };

  const existing = new Set(attendance.map((a) => a.invitee));
  const availableEmployees = employees.filter((e) => !existing.has(e.id));
  const legacyCount = (meeting.attendees?.length || 0) + (meeting.apologies?.length || 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-muted px-2 py-0.5">Invited {counts.Invited}</span>
        <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">Present {counts.Present}</span>
        <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">Apologies {counts.Apologies}</span>
        <span className="rounded bg-slate-100 px-2 py-0.5">Absent {counts.Absent}</span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Recused {counts.Recused}</span>
        <span className="ml-auto">
          {required > 0 ? (
            quorumMet ? (
              <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 font-semibold text-green-800"><CheckCircle2 className="h-3.5 w-3.5" /> Quorum met ({counts.Present}/{required})</span>
            ) : (
              <span className="flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 font-semibold text-red-800"><XCircle className="h-3.5 w-3.5" /> Quorum NOT met ({counts.Present}/{required})</span>
            )
          ) : (
            <span className="text-muted-foreground">No quorum set</span>
          )}
        </span>
      </div>

      {attendance.length === 0 && legacyCount > 0 && canManage && (
        <button onClick={seedLegacy} className="mb-2 text-xs text-primary underline">
          Import {meeting.attendees?.length || 0} attendee(s) + {meeting.apologies?.length || 0} apology from legacy fields
        </button>
      )}

      <div className="space-y-1.5">
        {attendance.map((a) => (
          <div key={a.id} className="rounded border border-border px-2.5 py-1.5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-[160px] font-medium">{empName(a.invitee)}</span>
              <select disabled={!canManage} className={inputCls} value={a.role_at_meeting || "Member"} onChange={(e) => update(a.id, { role_at_meeting: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select
                disabled={!canManage}
                className={inputCls}
                value={a.attendance_status || "Invited"}
                onChange={(e) => update(a.id, { attendance_status: e.target.value, recusal_reason: e.target.value === "Recused" ? (a.recusal_reason || "") : null })}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {canManage && <button onClick={() => remove(a.id)} className="ml-auto text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
            </div>
            {a.attendance_status === "Recused" && (
              <div className="mt-2 space-y-1.5 pl-1">
                <textarea
                  key={a.id + "-reason"}
                  disabled={!canManage}
                  className="min-h-[44px] w-full rounded-md border border-input bg-background p-2 text-sm"
                  placeholder="Recusal reason…"
                  defaultValue={a.recusal_reason || ""}
                  onBlur={(e) => update(a.id, { recusal_reason: e.target.value })}
                />
                <ConflictPicker
                  value={a.linked_conflict}
                  onChange={(v) => update(a.id, { linked_conflict: v })}
                  conflicts={conflicts}
                  onCreated={reloadConflicts}
                  employeeId={a.invitee}
                  employeeName={empName(a.invitee)}
                  reason={a.recusal_reason}
                />
              </div>
            )}
          </div>
        ))}
        {attendance.length === 0 && <p className="text-xs text-muted-foreground">No invitees. Add a guest below{legacyCount > 0 ? " or import the legacy attendees." : "."}</p>}
      </div>

      {canManage && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border p-2.5">
          <div className="w-full text-xs font-semibold text-muted-foreground">Add guest / attendee</div>
          <select className={inputCls} value={guest} onChange={(e) => setGuest(e.target.value)}>
            <option value="">Select employee…</option>
            {availableEmployees.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.email}</option>)}
          </select>
          <select className={inputCls} value={guestRole} onChange={(e) => setGuestRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={addGuest} disabled={!guest} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">
            <UserPlus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      )}
    </div>
  );
}