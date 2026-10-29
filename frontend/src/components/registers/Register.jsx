import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterBar from "./FilterBar";
import DataTable from "./DataTable";
import EditDialog from "./EditDialog";
import { useDeeplink } from "@/lib/deeplink";
import BackLink from "@/components/BackLink";
import { auditCreate, auditUpdate } from "@/lib/audit";

export default function Register({
  title,
  subtitle,
  entityName,
  columns,
  fields,
  filters = [],
  addLabel = "Add",
  summary,
  enrich,
  newRow = {},
  audited = true,
  access,
  beforeSave,
  afterSave,
  extraActions,
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [extra, setExtra] = useState({});
  const [filterValues, setFilterValues] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const dl = useDeeplink();

  const allowCreate = !access || access.canCreate;
  const canEditRow = (r) => !access || access.canEdit(r);

  const load = useCallback(async () => {
    try {
      const data = await base44.entities[entityName].list("-created_date", 500);
      setRows(data);
      if (enrich) setExtra(await enrich());
    } catch (e) {
      console.error(entityName, "load failed", e);
    }
  }, [entityName, enrich]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh when the underlying entity changes (e.g. after a bulk upload).
  useEffect(() => {
    const unsub = base44.entities[entityName]?.subscribe?.(() => { load(); });
    return () => { if (unsub) unsub(); };
  }, [entityName, load]);

  // Apply any deep-link filters arriving via the URL (dashboard widgets link
  // here pre-filtered to a record or a count's slice).
  useEffect(() => {
    if (!Object.keys(dl).length) return;
    const next = {};
    filters.forEach((f) => { if (dl[f.key]) next[f.key] = dl[f.key]; });
    if (Object.keys(next).length) setFilterValues((v) => ({ ...v, ...next }));
    if (dl.q) setQ(dl.q);
  }, [dl]);

  const resolvedFields = typeof fields === "function" ? fields(extra) : fields;

  const filtered = rows.filter((r) => {
    if (!filters.every((f) => !filterValues[f.key] || String(r[f.key] ?? "") === filterValues[f.key])) return false;
    if (q) {
      const hay = columns.map((c) => String(r[c.key] ?? "")).join(" ").toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const handleSave = async (input) => {
    try {
      const prev = rows.find((r) => r.id === editing?.id);
      const data = beforeSave ? await beforeSave(input, prev) : input;
      if (data === false) return; // beforeSave vetoed (it shows its own message)
      let saved;
      if (audited) {
        if (editing?.id) saved = await auditUpdate(entityName, editing.id, data, prev, user);
        else saved = await auditCreate(entityName, data, user);
      } else {
        if (editing?.id) saved = await base44.entities[entityName].update(editing.id, data);
        else saved = await base44.entities[entityName].create(data);
      }
      if (afterSave) {
        try { await afterSave({ ...(prev || {}), ...data, id: editing?.id || saved?.id }, prev, user); }
        catch (e) { console.error(entityName, "afterSave failed", e); }
      }
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      console.error("save failed", e);
      alert("Save failed: " + (e.message || e));
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BackLink />
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {extraActions}
          {allowCreate ? (
            <Button
              onClick={() => {
                setEditing(newRow);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> {addLabel}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Read-only access
            </span>
          )}
        </div>
      </div>

      {summary && (typeof summary === "function" ? summary(rows, extra) : summary)}

      {filters.length > 0 && (
        <FilterBar filters={filters} values={filterValues} onChange={setFilterValues} />
      )}

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
          title={editing?.id ? `Edit ${title}` : `Add ${title}`}
          fields={resolvedFields}
          initial={editing || {}}
          onSave={handleSave}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}