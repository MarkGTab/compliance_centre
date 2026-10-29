import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditDialog from "@/components/registers/EditDialog";
import { loadLookups } from "@/lib/register-lookups";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate } from "@/lib/audit";
import { formatDate } from "@/lib/risk-helpers";
import { useDeeplink, buildLink } from "@/lib/deeplink";
import BackLink from "@/components/BackLink";

const BUCKETS = ["30-day", "60-day", "90-day"];
const STATUSES = ["Open", "In Progress", "Complete"];
const PRIO = ["High", "Medium", "Low"];
const prioBadge = { High: "bg-red-100 text-red-800", Medium: "bg-amber-100 text-amber-800", Low: "bg-slate-100 text-slate-700" };
const stBadge = { Open: "bg-blue-100 text-blue-800", "In Progress": "bg-amber-100 text-amber-800", Complete: "bg-emerald-100 text-emerald-800" };

function isOverdue(a) {
  if (!a.due_date || a.status === "Complete") return false;
  return new Date(a.due_date) < new Date(new Date().toDateString());
}

export default function ActionsTracker() {
  const { user, canCreate, canEdit, myDeptId, role } = useAccess();
  const [rows, setRows] = useState([]);
  const [extra, setExtra] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("buckets");

  const allowCreate = canCreate("Action");
  const deptOf = (a) => extra.riskMap?.[a.linked_risk]?.department || null;
  const canEditAction = (a) => canEdit("Action", deptOf(a));

  const load = useCallback(async () => {
    const [a, lk] = await Promise.all([base44.entities.Action.list(), loadLookups({ risks: true })]);
    setRows(a);
    setExtra(lk);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (d) => {
    try {
      if (role === "department_head" && myDeptId) {
        const rDept = extra.riskMap?.[d.linked_risk]?.department;
        if (rDept && rDept !== myDeptId) {
          alert("You can only manage actions linked to risks in your own department.");
          return;
        }
      }
      if (editing?.id) {
        const prev = rows.find((x) => x.id === editing.id);
        await auditUpdate("Action", editing.id, d, prev, user);
      } else {
        await auditCreate("Action", d, user);
      }
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      alert("Save failed: " + (e.message || e));
    }
  };

  const fields = (ex) => [
    { key: "description", label: "Description", type: "textarea", required: true },
    {
      key: "linked_risk",
      label: "Linked Risk",
      type: "select",
      options: ex.risks?.map((r) => ({ value: r.id, label: r.risk_ref ? [r.risk_ref, r.title].join(" ") : r.title })) || [],
    },
    {
      key: "owner",
      label: "Owner",
      type: "select",
      options: ex.users?.map((u) => ({ value: u.id, label: u.full_name || u.email })) || [],
    },
    { key: "due_date", label: "Due Date", type: "date" },
    { key: "bucket", label: "Bucket", type: "select", options: BUCKETS },
    { key: "priority", label: "Priority", type: "select", options: PRIO },
    { key: "status", label: "Status", type: "select", options: STATUSES },
  ];

  const Card = ({ a }) => (
    <div className={`rounded-md border p-2 text-sm ${isOverdue(a) ? "border-red-300 bg-red-50" : "border-border bg-white"}`}>
      <div className="flex justify-between gap-2">
        <span className="truncate font-medium">{a.description}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs ${prioBadge[a.priority] || ""}`}>{a.priority}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className={`rounded px-1.5 py-0.5 ${stBadge[a.status] || ""}`}>{a.status}</span>
        {a.due_date && (
          <span className={isOverdue(a) ? "font-semibold text-red-600" : ""}>
            Due {formatDate(a.due_date)}
            {isOverdue(a) ? " · OVERDUE" : ""}
          </span>
        )}
      </div>
      {a.linked_risk && extra.riskMap?.[a.linked_risk] && (
        <div className="mt-1 truncate text-[11px]">
          <Link to={buildLink("/risk-register", { q: extra.riskMap[a.linked_risk].risk_ref || extra.riskMap[a.linked_risk].title })} className="text-primary underline">{extra.riskMap[a.linked_risk].title}</Link>
        </div>
      )}
      {a.last_modified_date && (
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          Modified {formatDate(a.last_modified_date)} by {extra.userMap?.[a.last_modified_by]?.full_name || "—"}
        </div>
      )}
      {canEditAction(a) && (
        <div className="mt-1 flex justify-end">
          <button
            onClick={() => { setEditing(a); setDialogOpen(true); }}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
      )}
    </div>
  );

  const dl = useDeeplink();
  const matchesDl = (a) => {
    if (dl.priority && a.priority !== dl.priority) return false;
    if (dl.status && a.status !== dl.status) return false;
    if (dl.bucket && a.bucket !== dl.bucket) return false;
    if (dl.overdue && !isOverdue(a)) return false;
    if (dl.q && !(a.description || "").toLowerCase().includes(dl.q.toLowerCase())) return false;
    return true;
  };
  const openIncomplete = rows.filter((a) => a.status !== "Complete" && matchesDl(a));

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BackLink />
          <div>
            <h1 className="text-xl font-bold">Actions & Remediation Tracker</h1>
            <p className="text-xs text-muted-foreground">30/60/90-day buckets with overdue items flagged</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5 text-xs">
            {["buckets", "board"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-2 py-1 ${view === v ? "bg-primary text-primary-foreground" : ""}`}
              >
                {v === "buckets" ? "Buckets" : "Status Board"}
              </button>
            ))}
          </div>
          {allowCreate ? (
            <Button onClick={() => { setEditing({ status: "Open", bucket: "30-day", priority: "Medium" }); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Action
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Read-only access
            </span>
          )}
        </div>
      </div>

      {view === "buckets" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {BUCKETS.map((b) => {
            const items = openIncomplete
              .filter((a) => a.bucket === b)
              .sort((x, y) => (isOverdue(y) ? 1 : 0) - (isOverdue(x) ? 1 : 0));
            return (
              <div key={b} className="rounded-md border border-border bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{b}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => (<Card key={a.id} a={a} />))}
                  {items.length === 0 && <p className="text-xs text-muted-foreground">No open actions.</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {STATUSES.map((s) => {
            const items = rows.filter((a) => a.status === s && matchesDl(a));
            return (
              <div key={s} className="rounded-md border border-border bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{s}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => (<Card key={a.id} a={a} />))}
                  {items.length === 0 && <p className="text-xs text-muted-foreground">No actions.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && (
        <EditDialog
          open={dialogOpen}
          title={editing?.id ? "Edit Action" : "Add Action"}
          fields={fields(extra)}
          initial={editing || {}}
          onSave={handleSave}
          onClose={() => { setDialogOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}