import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileDown, Wand2, Trash2, Upload } from "lucide-react";
import RichText from "@/components/board/RichText";
import AttendancePanel from "@/components/board/AttendancePanel";
import DecisionRecusalEditor from "@/components/board/DecisionRecusalEditor";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";
import { buildPersonMap } from "@/lib/people";
import { wrapDocHtml } from "@/lib/doc-style";

const COMMITTEES = ["Board", "Board Risk Committee", "ERC", "Credit Committee", "Other"];
const STATUSES = ["Scheduled", "Held", "Minutes Draft", "Minutes Approved"];
const DECISION_TYPES = ["Resolved", "Noted", "Approved", "Deferred"];
const PRIORITIES = ["High", "Medium", "Low"];
const ACTION_STATUSES = ["Open", "In Progress", "Complete", "Overdue"];

function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [risks, setRisks] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [actions, setActions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDecision, setNewDecision] = useState({ decision_text: "", decision_type: "Noted", related_risk: "", related_policy: "" });
  const [newAction, setNewAction] = useState({ description: "", assignee: "", due_date: "", priority: "Medium", linked_risk: "", linked_policy: "" });
  const { user, role } = useAccess();
  const canManage = role !== "read_only";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, u, r, p, d, a, emps, att, confs] = await Promise.all([
        base44.entities.Meeting.get(id),
        base44.entities.User.list(),
        base44.entities.Risk.list("-created_date", 500),
        base44.entities.Policy.list(),
        base44.entities.Decision.filter({ meeting: id }),
        base44.entities.BoardAction.filter({ meeting: id }),
        base44.entities.Employee.list(),
        base44.entities.Attendance.filter({ meeting: id }),
        base44.entities.ConflictOfInterest.list(),
      ]);
      setMeeting(m); setUsers(u); setRisks(r); setPolicies(p); setDecisions(d); setActions(a); setEmployees(emps); setAttendance(att); setConflicts(confs);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const personMap = buildPersonMap(employees, users);
  const userName = (uid) => personMap[uid]?.full_name || personMap[uid]?.email || "—";
  const riskName = (rid) => risks.find((r) => r.id === rid)?.title;
  const policyName = (pid) => policies.find((p) => p.id === pid)?.policy_name;
  const presentMembers = attendance.filter((a) => a.attendance_status === "Present");

  const reloadConflicts = async () => {
    try { setConflicts(await base44.entities.ConflictOfInterest.list()); } catch (e) {}
  };

  const saveField = async (patch) => {
    if (!canManage) return;
    try {
      const updated = await auditUpdate("Meeting", id, patch, meeting, user);
      setMeeting((prev) => ({ ...prev, ...updated }));
    } catch (e) { alert("Save failed: " + (e.message || e)); }
  };

  const addDecision = async () => {
    if (!newDecision.decision_text.trim()) return;
    try {
      const d = await auditCreate("Decision", {
        meeting: id,
        decision_text: newDecision.decision_text,
        decision_type: newDecision.decision_type,
        related_risk: newDecision.related_risk || undefined,
        related_policy: newDecision.related_policy || undefined,
      }, user);
      setDecisions((x) => [...x, d]);
      setNewDecision({ decision_text: "", decision_type: "Noted", related_risk: "", related_policy: "" });
    } catch (e) { alert("Failed: " + (e.message || e)); }
  };
  const deleteDecision = async (did) => {
    try { const prev = decisions.find((x) => x.id === did); await auditDelete("Decision", did, prev, user); setDecisions((x) => x.filter((d) => d.id !== did)); } catch (e) { alert(e.message || e); }
  };

  const addAction = async () => {
    if (!newAction.description.trim()) return;
    try {
      const a = await auditCreate("BoardAction", {
        meeting: id,
        description: newAction.description,
        assignee: newAction.assignee || undefined,
        due_date: newAction.due_date || undefined,
        priority: newAction.priority,
        status: "Open",
        linked_risk: newAction.linked_risk || undefined,
        linked_policy: newAction.linked_policy || undefined,
      }, user);
      setActions((x) => [...x, a]);
      setNewAction({ description: "", assignee: "", due_date: "", priority: "Medium", linked_risk: "", linked_policy: "" });
    } catch (e) { alert("Failed: " + (e.message || e)); }
  };
  const updateAction = async (aid, patch) => {
    if (!canManage) return;
    try {
      const prev = actions.find((x) => x.id === aid);
      const a = await auditUpdate("BoardAction", aid, patch, prev, user);
      setActions((x) => x.map((b) => (b.id === aid ? a : b)));
    } catch (e) { alert(e.message || e); }
  };
  const deleteAction = async (aid) => {
    try { const prev = actions.find((x) => x.id === aid); await auditDelete("BoardAction", aid, prev, user); setActions((x) => x.filter((b) => b.id !== aid)); } catch (e) { alert(e.message || e); }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await saveField({ pack_attachment: file_url });
    } catch (err) { alert("Upload failed: " + (err.message || err)); }
  };

  const generateMinutes = async () => {
    const present = attendance.filter((a) => a.attendance_status === "Present").map((a) => userName(a.invitee));
    const apologies = attendance.filter((a) => a.attendance_status === "Apologies").map((a) => userName(a.invitee));
    const absent = attendance.filter((a) => a.attendance_status === "Absent").map((a) => userName(a.invitee));
    const recused = attendance.filter((a) => a.attendance_status === "Recused").map((a) => `${userName(a.invitee)}${a.recusal_reason ? ` (${escapeHtml(a.recusal_reason)})` : ""}`);
    const required = meeting.required_quorum || 0;
    const presentCount = present.length;
    const quorumLine = required > 0 ? `Quorum: ${presentCount}/${required} — ${presentCount >= required ? "MET" : "NOT MET"}` : "";

    // per-decision recusals
    const recArrays = await Promise.all(decisions.map((d) => base44.entities.DecisionRecusal.filter({ decision: d.id }).catch(() => [])));
    const recMap = {};
    decisions.forEach((d, i) => { recMap[d.id] = recArrays[i]; });

    const decRows = decisions.map((d) => {
      const recs = (recMap[d.id] || []).map((r) => `${escapeHtml(userName(r.employee))}${r.reason ? ` (${escapeHtml(r.reason)})` : ""}`).join("; ");
      return `<li><b>${escapeHtml(d.decision_type)}:</b> ${escapeHtml(d.decision_text)}${d.related_risk ? ` (Risk: ${escapeHtml(riskName(d.related_risk) || "")})` : ""}${d.related_policy ? ` (Policy: ${escapeHtml(policyName(d.related_policy) || "")})` : ""}${recs ? ` — <b>Recused:</b> ${recs}` : ""}</li>`;
    }).join("");
    const actRows = actions.map((a) => `<tr><td>${escapeHtml(a.description)}</td><td>${escapeHtml(userName(a.assignee))}</td><td>${a.due_date || "—"}</td><td>${a.priority || ""}</td><td>${a.status}</td></tr>`).join("");

    const attBlock = `
      <h2>Attendance</h2>
      <div><b>Present:</b> ${escapeHtml(present.join(", ") || "—")}</div>
      <div><b>Apologies:</b> ${escapeHtml(apologies.join(", ") || "—")}</div>
      <div><b>Absent:</b> ${escapeHtml(absent.join(", ") || "—")}</div>
      ${recused.length ? `<div><b>Recused (whole meeting):</b> ${recused.map(escapeHtml).join("; ")}</div>` : ""}
      ${quorumLine ? `<div><b>${quorumLine}</b></div>` : ""}
    `;

    const bodyHtml = `
      ${attBlock}
      <h2>Agenda</h2><div>${meeting.agenda || ""}</div>
      <h2>Minutes</h2><div>${meeting.minutes || ""}</div>
      <h2>Decisions</h2>${decisions.length ? `<ol>${decRows}</ol>` : "<p>No decisions recorded.</p>"}
      <h2>Actions</h2>${actions.length ? `<table><thead><tr><th>Action</th><th>Assignee</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead><tbody>${actRows}</tbody></table>` : "<p>No actions raised.</p>"}`;
    const html = wrapDocHtml({
      title: meeting.title,
      subtitle: `${meeting.committee} · ${meeting.date || "—"}`,
      metaHtml: `<b>Chair:</b> ${escapeHtml(userName(meeting.chair))} · <b>Location:</b> ${escapeHtml(meeting.location || "—")}<br/>`,
      bodyHtml,
      orientation: "portrait",
    });
    const w = window.open("", "_blank");
    if (!w) { alert("Allow pop-ups to generate the minutes export."); return; }
    w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400);
  };

  const draftNextAgenda = async () => {
    try {
      const all = await base44.entities.Meeting.list("-date", 500);
      const prior = all.filter((m) => m.committee === meeting.committee && m.id !== meeting.id && (!m.date || m.date < (meeting.date || "")));
      if (!prior.length) { alert("No prior meeting of this committee found to carry forward."); return; }
      const last = prior[0];
      const [openActions, deferredDecs] = await Promise.all([
        base44.entities.BoardAction.filter({ meeting: last.id }),
        base44.entities.Decision.filter({ meeting: last.id }),
      ]);
      const open = openActions.filter((a) => a.status !== "Complete");
      const deferred = deferredDecs.filter((d) => d.decision_type === "Deferred");
      if (!open.length && !deferred.length) { alert("No open actions or deferred decisions to carry forward from the last meeting."); return; }
      let text = "";
      if (open.length) text += "<p><b>Open actions carried forward:</b></p><ul>" + open.map((a) => `<li>${escapeHtml(a.description)} — ${escapeHtml(userName(a.assignee))} (due ${a.due_date || "—"}, ${a.status})</li>`).join("") + "</ul>";
      if (deferred.length) text += "<p><b>Deferred decisions for re-discussion:</b></p><ul>" + deferred.map((d) => `<li>${escapeHtml(d.decision_text)}</li>`).join("") + "</ul>";
      const merged = (meeting.agenda || "") + (meeting.agenda ? "<hr/>" : "") + text;
      await saveField({ agenda: merged });
      alert("Agenda drafted with " + open.length + " open action(s) and " + deferred.length + " deferred decision(s) from the last " + meeting.committee + " meeting.");
    } catch (e) { alert("Failed: " + (e.message || e)); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  if (!meeting) return <div className="py-20 text-center text-muted-foreground">Meeting not found. <Link to="/board-governance" className="text-primary underline">Back</Link></div>;

  const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  const isOverdue = (a) => a.due_date && a.due_date < new Date().toISOString().slice(0, 10) && a.status !== "Complete";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/board-governance")}><ArrowLeft className="mr-1 h-4 w-4" /> All meetings</Button>
        <div className="flex gap-2">
          {canManage && <Button variant="outline" size="sm" onClick={draftNextAgenda}><Wand2 className="mr-1 h-4 w-4" /> Draft Next Agenda</Button>}
          <Button variant="outline" size="sm" onClick={generateMinutes}><FileDown className="mr-1 h-4 w-4" /> Generate Minutes</Button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-white p-4">
        <input className="w-full text-xl font-bold focus:outline-none" defaultValue={meeting.title} onBlur={(e) => saveField({ title: e.target.value })} />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Committee</Label>
            <select className={input} value={meeting.committee} onChange={(e) => saveField({ committee: e.target.value })}>
              {COMMITTEES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Date</Label>
            <input type="date" className={input} value={meeting.date || ""} onChange={(e) => saveField({ date: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Location</Label>
            <input className={input} value={meeting.location || ""} onChange={(e) => saveField({ location: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Status</Label>
            <select className={input} value={meeting.status || "Scheduled"} onChange={(e) => saveField({ status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Chair</Label>
            <select className={input} value={meeting.chair || ""} onChange={(e) => saveField({ chair: e.target.value || null })}>
              <option value="">—</option>
              {employees.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Next meeting</Label>
            <input type="date" className={input} value={meeting.next_meeting_date || ""} onChange={(e) => saveField({ next_meeting_date: e.target.value })} />
          </div>
        </div>

        <div className="mt-3">
          <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">Pack attachment</Label>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
              <Upload className="h-3.5 w-3.5" /> Upload
              <input type="file" className="hidden" onChange={onUpload} />
            </label>
            {meeting.pack_attachment && <a href={meeting.pack_attachment} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View current pack</a>}
          </div>
        </div>
      </div>

      <Section title="Attendance Register">
        <AttendancePanel
          meeting={meeting}
          employees={employees}
          personMap={personMap}
          conflicts={conflicts}
          reloadConflicts={reloadConflicts}
          attendance={attendance}
          setAttendance={setAttendance}
        />
      </Section>

      <Section title="Agenda">
        <RichText value={meeting.agenda} onChange={(v) => setMeeting((prev) => ({ ...prev, agenda: v }))} />
        {canManage && <div className="mt-2"><Button size="sm" variant="outline" onClick={() => saveField({ agenda: meeting.agenda })}>Save agenda</Button></div>}
      </Section>

      <Section title="Minutes">
        <RichText value={meeting.minutes} onChange={(v) => setMeeting((prev) => ({ ...prev, minutes: v }))} />
        {canManage && <div className="mt-2"><Button size="sm" variant="outline" onClick={() => saveField({ minutes: meeting.minutes })}>Save minutes</Button></div>}
      </Section>

      <Section title={`Decisions (${decisions.length})`}>
        <div className="space-y-2">
          {decisions.map((d) => (
            <div key={d.id} className="rounded border border-border px-3 py-2 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs">{d.decision_type}</span>
                  {d.decision_text}
                  {d.related_risk && <span className="ml-2 text-xs text-muted-foreground">Risk: {riskName(d.related_risk)}</span>}
                  {d.related_policy && <span className="ml-2 text-xs text-muted-foreground">Policy: {policyName(d.related_policy)}</span>}
                </div>
                {canManage && <button onClick={() => deleteDecision(d.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
              </div>
              <DecisionRecusalEditor decision={d} presentMembers={presentMembers} personMap={personMap} conflicts={conflicts} reloadConflicts={reloadConflicts} />
            </div>
          ))}
          {decisions.length === 0 && <p className="text-xs text-muted-foreground">No decisions recorded.</p>}
        </div>
        <div className="mt-3 rounded-md border border-dashed border-border p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Add decision</div>
          <textarea className="min-h-[60px] w-full rounded-md border border-input bg-background p-2 text-sm" placeholder="Decision text…" value={newDecision.decision_text} onChange={(e) => setNewDecision({ ...newDecision, decision_text: e.target.value })} />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <select className={input} value={newDecision.decision_type} onChange={(e) => setNewDecision({ ...newDecision, decision_type: e.target.value })}>
              {DECISION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className={input} value={newDecision.related_risk} onChange={(e) => setNewDecision({ ...newDecision, related_risk: e.target.value })}>
              <option value="">No related risk</option>
              {risks.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            <select className={input} value={newDecision.related_policy} onChange={(e) => setNewDecision({ ...newDecision, related_policy: e.target.value })}>
              <option value="">No related policy</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{p.policy_name}</option>)}
            </select>
          </div>
          {canManage && <Button size="sm" className="mt-2" onClick={addDecision}>Add decision</Button>}
        </div>
      </Section>

      <Section title={`Board Actions (${actions.length})`}>
        <div className="space-y-2">
          {actions.map((a) => {
            const od = isOverdue(a);
            return (
              <div key={a.id} className={`rounded border px-3 py-2 text-sm ${od ? "border-red-300 bg-red-50" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {a.description}
                    {od && <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">OVERDUE</span>}
                  </div>
                  {canManage && <button onClick={() => deleteAction(a.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Assignee</Label>
                    <select className={input} value={a.assignee || ""} onChange={(e) => updateAction(a.id, { assignee: e.target.value || null })}>
                      <option value="">—</option>
                      {employees.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Due</Label>
                    <input type="date" className={input} value={a.due_date || ""} onChange={(e) => updateAction(a.id, { due_date: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Priority</Label>
                    <select className={input} value={a.priority || "Medium"} onChange={(e) => updateAction(a.id, { priority: e.target.value })}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Status</Label>
                    <select className={input} value={a.status || "Open"} onChange={(e) => updateAction(a.id, { status: e.target.value, completed_date: e.target.value === "Complete" ? new Date().toISOString().slice(0, 10) : null })}>
                      {ACTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          {actions.length === 0 && <p className="text-xs text-muted-foreground">No actions raised.</p>}
        </div>
        <div className="mt-3 rounded-md border border-dashed border-border p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Add board action</div>
          <textarea className="min-h-[50px] w-full rounded-md border border-input bg-background p-2 text-sm" placeholder="Action description…" value={newAction.description} onChange={(e) => setNewAction({ ...newAction, description: e.target.value })} />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <select className={input} value={newAction.assignee} onChange={(e) => setNewAction({ ...newAction, assignee: e.target.value })}>
              <option value="">Assignee…</option>
              {employees.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
            <input type="date" className={input} value={newAction.due_date} onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })} />
            <select className={input} value={newAction.priority} onChange={(e) => setNewAction({ ...newAction, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select className={input} value={newAction.linked_risk} onChange={(e) => setNewAction({ ...newAction, linked_risk: e.target.value })}>
              <option value="">Linked risk…</option>
              {risks.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            <select className={input} value={newAction.linked_policy} onChange={(e) => setNewAction({ ...newAction, linked_policy: e.target.value })}>
              <option value="">Linked policy…</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{p.policy_name}</option>)}
            </select>
          </div>
          {canManage && <Button size="sm" className="mt-2" onClick={addAction}>Add action</Button>}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-md border border-border bg-white p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}