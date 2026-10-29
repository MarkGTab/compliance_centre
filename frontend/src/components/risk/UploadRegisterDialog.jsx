import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, AlertTriangle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";
import { useAccess } from "@/lib/access";
import { calcScore, computeAppetite, appetiteFor } from "@/lib/risk-helpers";

const TIERS = ["Strategic", "Operational", "Departmental", "Project & Change"];
const TRENDS = ["Improving", "Stable", "Worsening"];
const STATUSES = ["Open", "Monitoring", "Closed"];
const MAX_ROWS = 200;

const norm = (v) => String(v ?? "").trim().toLowerCase();

const findByName = (list, name, fields) => {
  if (!name) return null;
  const n = norm(name);
  if (!n) return null;
  return list.find((x) => fields.some((f) => norm(x[f]) === n && norm(x[f]) !== "")) || null;
};

const pickEnum = (v, allowed, fallback) => {
  const n = norm(v);
  return allowed.find((a) => norm(a) === n) || fallback;
};

const cleanDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const cleanNum = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const clampInt = (v, lo, hi) => {
  const n = cleanNum(v);
  if (n == null) return null;
  return Math.max(lo, Math.min(hi, Math.round(n)));
};

// Turn one AI-mapped row into a full risk record with resolved relations,
// computed scores and appetite, plus flags for anything that didn't match.
function enrichRow(r, categories, departments, employees, appetites) {
  const tier = pickEnum(r.tier, TIERS, "Departmental");
  const status = pickEnum(r.status, STATUSES, "Open");
  const trend = pickEnum(r.trend, TRENDS, "") || "";

  const category = findByName(categories, r.category_name, ["name"])?.id || null;
  const department = findByName(departments, r.department_name, ["name"])?.id || null;
  const owner = findByName(employees, r.owner_name, ["full_name", "email"])?.id || null;

  const inherent_likelihood = clampInt(r.inherent_likelihood, 1, 5);
  const inherent_impact = clampInt(r.inherent_impact, 1, 5);
  const residual_likelihood = clampInt(r.residual_likelihood, 1, 5);
  const residual_impact = clampInt(r.residual_impact, 1, 5);
  const inherent_score = calcScore(inherent_likelihood, inherent_impact);
  const residual_score = calcScore(residual_likelihood, residual_impact);
  const target_score = cleanNum(r.target_score);
  const appetite = appetiteFor(appetites, category);
  const appetite_status = computeAppetite(residual_score, target_score, appetite);

  return {
    title: String(r.title || "").trim(),
    description: r.description || "",
    cause: r.cause || "",
    event: r.event || "",
    consequence: r.consequence || "",
    tier,
    status,
    trend,
    category_name: r.category_name || "",
    department_name: r.department_name || "",
    owner_name: r.owner_name || "",
    category,
    department,
    owner,
    inherent_likelihood,
    inherent_impact,
    inherent_score,
    residual_likelihood,
    residual_impact,
    residual_score,
    target_score,
    target_date: cleanDate(r.target_date),
    last_reviewed: cleanDate(r.last_reviewed),
    next_review: cleanDate(r.next_review),
    initiative: r.initiative || "",
    appetite_status,
    warnings: [
      !category && r.category_name ? "category not matched" : null,
      !department && r.department_name ? "department not matched" : null,
      !owner && r.owner_name ? "owner not matched" : null,
    ].filter(Boolean),
  };
}

export default function UploadRegisterDialog({ open, onClose, categories, departments, employees, appetites, onImported }) {
  const { user } = useAccess();
  const [step, setStep] = useState("select"); // select | mapping | preview | importing | done
  const [fileName, setFileName] = useState("");
  const [mapped, setMapped] = useState([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const fileRef = useRef(null);

  const reset = () => {
    setStep("select");
    setFileName("");
    setMapped([]);
    setError("");
    setProgress("");
    setImportedCount(0);
    setTruncated(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!rows.length) {
        setError("No rows found in the first sheet.");
        return;
      }
      setTruncated(rows.length > MAX_ROWS);
      setStep("mapping");
      await mapWithAI(rows);
    } catch (err) {
      setError("Could not read the file: " + (err.message || err));
      setStep("select");
    }
  };

  const mapWithAI = async (rows) => {
    const capped = rows.slice(0, MAX_ROWS);
    const catNames = categories.map((c) => c.name).join(" | ") || "none";
    const deptNames = departments.map((d) => d.name).join(" | ") || "none";
    const ownerNames = employees.map((e) => e.full_name || e.email).join(" | ") || "none";

    const prompt = `You are importing an existing risk register from a spreadsheet into a risk management system.
Each row is one risk. Map the spreadsheet's columns onto the target schema below, choosing the closest matching field for each source column. Use the data verbatim where it fits; do not invent content that is not in the row. Leave a field empty ("") when there is no equivalent.

Target schema per risk:
- title (string, required): the risk title or name
- description (string): detailed description
- cause (string): root cause
- event (string): the risk event
- consequence (string): impact or consequence
- tier (one of: ${TIERS.join(", ")}); default "Departmental" when unclear
- category_name (string): the risk category name — match one of these if possible: ${catNames}
- department_name (string): the department name — match one of these if possible: ${deptNames}
- owner_name (string): the risk owner's full name or email — match one of these if possible: ${ownerNames}
- inherent_likelihood (integer 1-5)
- inherent_impact (integer 1-5)
- residual_likelihood (integer 1-5)
- residual_impact (integer 1-5)
- target_score (number 1-25, or null)
- target_date (date YYYY-MM-DD, or null)
- trend (one of: ${TRENDS.join(", ")}, or "")
- status (one of: ${STATUSES.join(", ")}); default "Open"
- last_reviewed (date YYYY-MM-DD, or null)
- next_review (date YYYY-MM-DD, or null)
- initiative (string): project or programme name if present

Return ONLY a JSON object: { "risks": [ { ...one mapped risk per row... } ] }.

Raw spreadsheet rows (JSON):
${JSON.stringify(capped)}`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  cause: { type: "string" },
                  event: { type: "string" },
                  consequence: { type: "string" },
                  tier: { type: "string" },
                  category_name: { type: "string" },
                  department_name: { type: "string" },
                  owner_name: { type: "string" },
                  inherent_likelihood: { type: "integer" },
                  inherent_impact: { type: "integer" },
                  residual_likelihood: { type: "integer" },
                  residual_impact: { type: "integer" },
                  target_score: { type: "number" },
                  target_date: { type: "string" },
                  trend: { type: "string" },
                  status: { type: "string" },
                  last_reviewed: { type: "string" },
                  next_review: { type: "string" },
                  initiative: { type: "string" },
                },
                required: ["title"],
              },
            },
          },
        },
      });
      const list = Array.isArray(res?.risks) ? res.risks : [];
      if (!list.length) {
        setError("AI could not map any rows from this file.");
        setStep("select");
        return;
      }
      const enriched = list
        .map((r) => enrichRow(r, categories, departments, employees, appetites))
        .filter((r) => r.title);
      if (!enriched.length) {
        setError("No rows with a usable title were found.");
        setStep("select");
        return;
      }
      setMapped(enriched);
      setStep("preview");
    } catch (err) {
      setError("AI mapping failed: " + (err.message || err));
      setStep("select");
    }
  };

  const updateRow = (idx, patch) => {
    setMapped((rows) =>
      rows.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        next.inherent_score = calcScore(next.inherent_likelihood, next.inherent_impact);
        next.residual_score = calcScore(next.residual_likelihood, next.residual_impact);
        const appetite = appetiteFor(appetites, next.category);
        next.appetite_status = computeAppetite(next.residual_score, next.target_score, appetite);
        return next;
      })
    );
  };

  const doImport = async () => {
    setStep("importing");
    setProgress("Generating risk references…");
    try {
      const existing = await base44.entities.Risk.list("-created_date", 10000);
      let maxNum = existing.reduce((m, r) => {
        const mm = String(r.risk_ref || "").match(/(\d+)/);
        return Math.max(m, mm ? parseInt(mm[1], 10) : 0);
      }, 0);
      const now = new Date().toISOString();
      const records = mapped.map((r) => {
        maxNum += 1;
        return {
          risk_ref: `RISK-${String(maxNum).padStart(4, "0")}`,
          title: r.title,
          description: r.description,
          cause: r.cause,
          event: r.event,
          consequence: r.consequence,
          tier: r.tier,
          category: r.category || null,
          department: r.department || null,
          owner: r.owner || null,
          inherent_likelihood: r.inherent_likelihood,
          inherent_impact: r.inherent_impact,
          inherent_score: r.inherent_score,
          residual_likelihood: r.residual_likelihood,
          residual_impact: r.residual_impact,
          residual_score: r.residual_score,
          appetite_status: r.appetite_status,
          target_score: r.target_score,
          target_date: r.target_date,
          trend: r.trend || null,
          status: r.status,
          last_reviewed: r.last_reviewed,
          next_review: r.next_review,
          initiative: r.initiative,
          project_status: "Active",
          last_modified_by: user?.id || null,
          last_modified_date: now,
        };
      });

      setProgress(`Creating ${records.length} risks…`);
      const created = await base44.entities.Risk.bulkCreate(records);

      // One audit-trail entry per imported risk, written in a single batch.
      const logs = created.map((rec) => {
        const { last_modified_by, last_modified_date, ...snapshot } = rec || {};
        return {
          entity: "Risk",
          record_id: rec?.id || null,
          record_ref: rec?.risk_ref || rec?.title || "",
          action: "created",
          changes: JSON.stringify({ snapshot }),
          user: user?.id || null,
          user_name: user?.full_name || user?.email || "",
          timestamp: now,
        };
      });
      try {
        await base44.entities.ChangeLog.bulkCreate(logs);
      } catch (e) {
        console.error("Audit log batch failed", e);
      }

      setImportedCount(records.length);
      setStep("done");
      onImported?.();
    } catch (err) {
      setError("Import failed: " + (err.message || err));
      setStep("preview");
    }
  };

  const selectCls = "h-7 w-full rounded border border-input bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Upload Existing Register
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload an Excel (.xlsx) or CSV risk register. The AI reads the columns, maps them to the
              risk schema, matches categories, departments and owners to your existing records, and
              shows a preview you can review before importing.
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center hover:bg-muted/50">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName || "Choose a file to upload"}</span>
              <span className="text-xs text-muted-foreground">.xlsx, .xls or .csv — up to {MAX_ROWS} rows</span>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
            </label>
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
            )}
          </div>
        )}

        {step === "mapping" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Reading {fileName} and mapping columns with AI…</p>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Review the mapped risks. Fix any unmatched category, department or owner using the dropdowns,
                then import.
              </p>
            </div>
            {truncated && (
              <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" /> Only the first {MAX_ROWS} rows were mapped.
              </div>
            )}
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
            )}
            <div className="max-h-[55vh] overflow-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">#</th>
                    <th className="px-2 py-1.5 font-semibold">Title</th>
                    <th className="px-2 py-1.5 font-semibold">Tier</th>
                    <th className="px-2 py-1.5 font-semibold">Category</th>
                    <th className="px-2 py-1.5 font-semibold">Department</th>
                    <th className="px-2 py-1.5 font-semibold">Owner</th>
                    <th className="px-2 py-1.5 font-semibold">Inh</th>
                    <th className="px-2 py-1.5 font-semibold">Res</th>
                    <th className="px-2 py-1.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mapped.map((r, i) => (
                    <tr key={i} className="border-t border-border align-top">
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="max-w-[220px] px-2 py-1.5">
                        <div className="font-medium">{r.title}</div>
                        {r.warnings.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {r.warnings.map((w) => (
                              <span key={w} className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">{w}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <select className={selectCls} value={r.tier} onChange={(e) => updateRow(i, { tier: e.target.value })}>
                          {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select className={selectCls} value={r.category || ""} onChange={(e) => updateRow(i, { category: e.target.value || null })}>
                          <option value="">—</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select className={selectCls} value={r.department || ""} onChange={(e) => updateRow(i, { department: e.target.value || null })}>
                          <option value="">—</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select className={selectCls} value={r.owner || ""} onChange={(e) => updateRow(i, { owner: e.target.value || null })}>
                          <option value="">—</option>
                          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.email}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 font-mono">{r.inherent_score ?? "—"}</td>
                      <td className="px-2 py-1.5 font-mono">{r.residual_score ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        <select className={selectCls} value={r.status} onChange={(e) => updateRow(i, { status: e.target.value })}>
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{progress}</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <p className="text-sm font-medium">{importedCount} risks imported into the register.</p>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button type="button" onClick={doImport}>Import {mapped.length} risks</Button>
            </>
          )}
          {step === "done" && (
            <Button type="button" onClick={close}>Done</Button>
          )}
          {step === "select" && (
            <Button type="button" variant="outline" onClick={close}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}