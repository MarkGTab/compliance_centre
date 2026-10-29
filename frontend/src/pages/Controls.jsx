import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, ShieldAlert, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/registers/DataTable";
import EditDialog from "@/components/registers/EditDialog";
import FilterBar from "@/components/registers/FilterBar";
import { loadLookups } from "@/lib/register-lookups";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate } from "@/lib/audit";
import { formatDate } from "@/lib/risk-helpers";
import { buildLink, useDeeplink } from "@/lib/deeplink";
import BackLink from "@/components/BackLink";

const TYPE_OPTS = ["Preventive", "Detective", "Corrective"];
const EFF_OPTS = ["Strong", "Adequate", "Weak"];
const effBadge = {
  Strong: "bg-emerald-100 text-emerald-800",
  Adequate: "bg-amber-100 text-amber-800",
  Weak: "bg-red-100 text-red-800",
};
const EFF_ORDER = { Weak: 0, Adequate: 1, Strong: 2 };

export default function Controls() {
  const { user, canCreate, canEdit, myDeptId, role } = useAccess();
  const [controls, setControls] = useState([]);
  const [extra, setExtra] = useState({});
  const [risks, setRisks] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const dl = useDeeplink();

  const allowCreate = canCreate("Control");
  const canEditRow = (r) => canEdit("Control", r.department);

  const load = useCallback(async () => {
    const [c, lk] = await Promise.all([
      base44.entities.Control.list("-created_date", 500),
      loadLookups({ risks: true, departments: true }),
    ]);
    setControls(c);
    setExtra(lk);
    setRisks(lk.risks);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!Object.keys(dl).length) return;
    const next = {};
    ["type", "design_effectiveness", "operating_effectiveness"].forEach((k) => { if (dl[k]) next[k] = dl[k]; });
    if (Object.keys(next).length) setFilterValues((v) => ({ ...v, ...next }));
    if (dl.q) setQ(dl.q);
  }, [dl]);

  const coverage = risks.map((r) => {
    const linked = controls.filter(
      (c) => Array.isArray(c.linked_risks) && c.linked_risks.includes(r.id)
    );
    let weakest = null;
    linked.forEach((c) => {
      const o = c.operating_effectiveness;
      if (o && (weakest === null || EFF_ORDER[o] < EFF_ORDER[weakest])) weakest = o;
    });
    return { risk: r, count: linked.length, weakest };
  });

  const defaultRow = () => ({
    linked_risks: [],
    department: role === "department_head" ? myDeptId : "",
  });

  const fields = [
    { key: "control_ref", label: "Control Reference", required: true },
    { key: "description", label: "Description", type: "textarea", required: true },
    { key: "type", label: "Type", type: "select", options: TYPE_OPTS },
    { key: "design_effectiveness", label: "Design Effectiveness", type: "select", options: EFF_OPTS },
    { key: "operating_effectiveness", label: "Operating Effectiveness", type: "select", options: EFF_OPTS },
    {
      key: "owner",
      label: "Owner",
      type: "select",
      options: extra.users?.map((u) => ({ value: u.id, label: u.full_name || u.email })) || [],
    },
    {
      key: "department",
      label: "Department",
      type: "select",
      options: extra.departments?.map((d) => ({ value: d.id, label: d.name })) || [],
    },
    { key: "test_frequency", label: "Test Frequency" },
    { key: "last_tested", label: "Last Tested", type: "date" },
    { key: "evidence_link", label: "Evidence Link" },
    {
      key: "linked_risks",
      label: "Linked Risks",
      type: "multiselect",
      options: risks.map((r) => ({ value: r.id, label: r.risk_ref ? [r.risk_ref, r.title].join(" ") : r.title })),
    },
  ];

  const handleSave = async (data) => {
    try {
      if (role === "department_head" && myDeptId && data.department && data.department !== myDeptId) {
        alert("You can only manage controls within your own department.");
        return;
      }
      if (editing?.id) {
        const prev = controls.find((c) => c.id === editing.id);
        await auditUpdate("Control", editing.id, data, prev, user);
      } else {
        await auditCreate("Control", data, user);
      }
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      alert("Save failed: " + (e.message || e));
    }
  };

  const filtered = controls.filter((c) => {
    if (!["type", "design_effectiveness", "operating_effectiveness"].every(
      (f) => !filterValues[f] || c[f] === filterValues[f]
    )) return false;
    if (q) {
      const hay = `${c.control_ref || ""} ${c.description || ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const columns = [
    { key: "control_ref", label: "Ref", className: "w-24" },
    { key: "description", label: "Description" },
    {
      key: "type",
      label: "Type",
      render: (r) => <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.type || "—"}</span>,
    },
    {
      key: "design_effectiveness",
      label: "Design",
      render: (r) => (
        <span className={`rounded px-1.5 py-0.5 text-xs ${effBadge[r.design_effectiveness] || "bg-muted"}`}>
          {r.design_effectiveness || "—"}
        </span>
      ),
    },
    {
      key: "operating_effectiveness",
      label: "Ops",
      render: (r) => (
        <span className={`rounded px-1.5 py-0.5 text-xs ${effBadge[r.operating_effectiveness] || "bg-muted"}`}>
          {r.operating_effectiveness || "—"}
        </span>
      ),
    },
    { key: "linked_risks", label: "Risks", className: "text-center", render: (r) => (r.linked_risks || []).length },
    { key: "owner", label: "Owner", render: (r, ex) => ex.userMap?.[r.owner]?.full_name || "—" },
    {
      key: "last_modified_date",
      label: "Last Modified",
      render: (r, ex) =>
        r.last_modified_date ? (
          <span className="text-[11px] text-muted-foreground">
            {formatDate(r.last_modified_date)}
            <br />
            {ex.userMap?.[r.last_modified_by]?.full_name || "—"}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BackLink />
          <div>
            <h1 className="text-xl font-bold">Controls Library</h1>
            <p className="text-xs text-muted-foreground">All controls and their coverage of linked risks</p>
          </div>
        </div>
        {allowCreate ? (
          <Button onClick={() => { setEditing(defaultRow()); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Control
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Read-only access
          </span>
        )}
      </div>

      <div className="rounded-md border border-border bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4 text-primary" /> Control Coverage by Risk
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {coverage.map(({ risk, count, weakest }) => (
            <Link
              key={risk.id}
              to={buildLink("/risk-register", { q: risk.risk_ref || risk.title })}
              className={`rounded-md border p-2 text-sm ${
                count === 0 ? "border-red-300 bg-red-50" : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="flex justify-between">
                <span className="truncate font-medium">{risk.title}</span>
                <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${count === 0 ? "bg-red-600 text-white" : "bg-muted"}`}>
                  {count}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {risk.risk_ref} · weakest ops: <b>{weakest || "none"}</b>
              </div>
            </Link>
          ))}
          {coverage.length === 0 && <p className="text-xs text-muted-foreground">No risks loaded.</p>}
        </div>
      </div>

      <FilterBar
        filters={[
          { key: "type", label: "Type", options: TYPE_OPTS },
          { key: "design_effectiveness", label: "Design", options: EFF_OPTS },
          { key: "operating_effectiveness", label: "Ops", options: EFF_OPTS },
        ]}
        values={filterValues}
        onChange={setFilterValues}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        extra={extra}
        onRowClick={(r) => {
          if (!canEditRow(r)) return;
          setEditing(r);
          setDialogOpen(true);
        }}
      />

      {dialogOpen && (
        <EditDialog
          open={dialogOpen}
          title={editing?.id ? "Edit Control" : "Add Control"}
          fields={fields}
          initial={editing || {}}
          onSave={handleSave}
          onClose={() => { setDialogOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}