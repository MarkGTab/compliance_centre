import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditDialog from "@/components/registers/EditDialog";
import { loadLookups } from "@/lib/register-lookups";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate } from "@/lib/audit";
import { appetiteFor, computeAppetite, APPETITE_DEFAULT_LIMITS, APPETITE_TOLERANCE_GAP } from "@/lib/risk-helpers";

const LEVELS = ["Open", "Cautious", "Moderate", "Averse", "Zero"];
const levelRag = { Open: "Green", Cautious: "Green", Moderate: "Amber", Averse: "Red", Zero: "Red" };
const ragBg = { Green: "bg-emerald-50", Amber: "bg-amber-50", Red: "bg-red-50" };
const ragText = { Green: "text-emerald-700", Amber: "text-amber-700", Red: "text-red-700" };

export default function Appetite() {
  const { user, canCreate, canEdit } = useAccess();
  const [rows, setRows] = useState([]);
  const [extra, setExtra] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const [a, lk] = await Promise.all([
      base44.entities.Appetite.list(),
      loadLookups({ categories: true }),
    ]);
    setRows(a);
    setExtra(lk);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Re-rate every risk in a category against the (new) appetite so RAGs never
  // go stale when the Board changes appetite.
  const rerateCategory = async (categoryId) => {
    if (!categoryId) return 0;
    const [apps, risks] = await Promise.all([
      base44.entities.Appetite.list(),
      base44.entities.Risk.filter({ category: categoryId }),
    ]);
    const ap = appetiteFor(apps, categoryId);
    let changed = 0;
    for (const r of risks) {
      const next = computeAppetite(r.residual_score, r.target_score, ap);
      if (next && next !== r.appetite_status) {
        await auditUpdate("Risk", r.id, { appetite_status: next }, r, user);
        changed += 1;
      }
    }
    return changed;
  };

  const handleSave = async (d) => {
    try {
      if (d.max_residual_score != null && d.tolerance_score != null && d.tolerance_score < d.max_residual_score) {
        alert("Tolerance must be at or above the appetite limit.");
        return;
      }
      const prev = editing?.id ? rows.find((x) => x.id === editing.id) : null;
      if (editing?.id) {
        await auditUpdate("Appetite", editing.id, d, prev, user);
      } else {
        await auditCreate("Appetite", d, user);
      }
      let changed = await rerateCategory(d.category);
      if (prev?.category && prev.category !== d.category) changed += await rerateCategory(prev.category);
      if (changed) alert(`${changed} risk${changed > 1 ? "s" : ""} re-rated against the updated appetite.`);
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      alert("Save failed: " + (e.message || e));
    }
  };

  const fields = [
    {
      key: "category",
      label: "Category",
      type: "select",
      required: true,
      options: extra.categories?.map((c) => ({ value: c.id, label: c.name })) || [],
    },
    { key: "appetite_level", label: "Appetite Level", type: "select", options: LEVELS },
    { key: "qualitative_statement", label: "Qualitative Statement", type: "textarea" },
    { key: "metric", label: "Metric" },
    { key: "threshold", label: "Threshold" },
    {
      key: "max_residual_score",
      label: `Appetite limit — max residual score 1-25 (blank = default for level: ${Object.entries(APPETITE_DEFAULT_LIMITS).map(([k, v]) => `${k} ${v}`).join(", ")})`,
      type: "number",
    },
    {
      key: "tolerance_score",
      label: `Tolerance — max residual score before Red (blank = limit + ${APPETITE_TOLERANCE_GAP})`,
      type: "number",
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Appetite Statement</h1>
          <p className="text-xs text-muted-foreground">One row per category — appetite level, statement, metric and threshold</p>
        </div>
        {canCreate("Appetite") ? (
          <Button
            onClick={() => {
              setEditing({ appetite_level: "Open" });
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Appetite
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Read-only access
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Category</th>
              <th className="px-3 py-2 text-left font-semibold">Level</th>
              <th className="px-3 py-2 text-left font-semibold">Qualitative Statement</th>
              <th className="px-3 py-2 text-left font-semibold">Metric</th>
              <th className="px-3 py-2 text-left font-semibold">Threshold</th>
              <th className="px-3 py-2 text-center font-semibold" title="Max residual score in appetite / tolerance">Limit / Tol.</th>
              <th className="px-3 py-2 text-center font-semibold">RAG</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rag = levelRag[r.appetite_level] || "Amber";
              return (
                <tr key={r.id} className={`border-t border-border ${ragBg[rag]}`}>
                  <td className="px-3 py-2 font-medium">{extra.categoryMap?.[r.category]?.name || "—"}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-white/70 px-1.5 py-0.5 text-xs">{r.appetite_level || "—"}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.qualitative_statement || "—"}</td>
                  <td className="px-3 py-2">{r.metric || "—"}</td>
                  <td className="px-3 py-2">{r.threshold || "—"}</td>
                  <td className="px-3 py-2 text-center font-mono text-xs">
                    {(() => { const a = appetiteFor([r], r.category); return a ? `≤${a.limit} / ≤${a.tolerance}` : "—"; })()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-semibold ${ragText[rag]}`}>{rag}</span>
                  </td>
                  <td className="px-3 py-2">
                    {canEdit("Appetite") ? (
                      <button
                        onClick={() => {
                          setEditing(r);
                          setDialogOpen(true);
                        }}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  No appetite statements defined.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EditDialog
        open={dialogOpen}
        title={editing?.id ? "Edit Appetite" : "Add Appetite"}
        fields={fields}
        initial={editing || {}}
        onSave={handleSave}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}