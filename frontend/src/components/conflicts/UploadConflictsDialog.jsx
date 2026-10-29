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

const STATUSES = ["Under Review", "Active", "Mitigated", "Closed"];
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

function enrichRow(r, employees) {
  const status = pickEnum(r.status, STATUSES, "Active");
  const raised_by = findByName(employees, r.raised_by_name, ["full_name", "email"])?.id || null;

  return {
    person: String(r.person || "").trim(),
    nature_of_conflict: r.nature_of_conflict || "",
    related_parties: r.related_parties || "",
    date_identified: cleanDate(r.date_identified),
    mitigation: r.mitigation || "",
    review_date: cleanDate(r.review_date),
    status,
    raised_by,
    raised_by_name: r.raised_by_name || "",
    warnings: [
      !raised_by && r.raised_by_name ? "raised by not matched" : null,
    ].filter(Boolean),
  };
}

export default function UploadConflictsDialog({ open, onClose, employees, onImported }) {
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
    const raiserNames = employees.map((e) => e.full_name || e.email).join(" | ") || "none";

    const prompt = `You are importing an existing conflicts of interest register from a spreadsheet into a risk management system.
Each row is one declared conflict. Map the spreadsheet's columns onto the target schema below, choosing the closest matching field for each source column. Use the data verbatim where it fits; do not invent content that is not in the row. Leave a field empty ("") when there is no equivalent.

Target schema per conflict:
- person (string, required): the person who has the conflict
- nature_of_conflict (string, required): description of the nature of the conflict
- related_parties (string): related parties involved
- date_identified (date YYYY-MM-DD, or null)
- mitigation (string): mitigation actions
- review_date (date YYYY-MM-DD, or null)
- status (one of: ${STATUSES.join(", ")}); default "Active"
- raised_by_name (string): the employee who raised/declared the conflict — match one of these if possible: ${raiserNames}

Return ONLY a JSON object: { "conflicts": [ { ...one mapped conflict per row... } ] }.

Raw spreadsheet rows (JSON):
${JSON.stringify(capped)}`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            conflicts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  person: { type: "string" },
                  nature_of_conflict: { type: "string" },
                  related_parties: { type: "string" },
                  date_identified: { type: "string" },
                  mitigation: { type: "string" },
                  review_date: { type: "string" },
                  status: { type: "string" },
                  raised_by_name: { type: "string" },
                },
                required: ["person", "nature_of_conflict"],
              },
            },
          },
        },
      });
      const list = Array.isArray(res?.conflicts) ? res.conflicts : [];
      if (!list.length) {
        setError("AI could not map any rows from this file.");
        setStep("select");
        return;
      }
      const enriched = list
        .map((r) => enrichRow(r, employees))
        .filter((r) => r.person && r.nature_of_conflict);
      if (!enriched.length) {
        setError("No rows with a person and nature of conflict were found.");
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
    setMapped((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const doImport = async () => {
    setStep("importing");
    setProgress(`Creating ${mapped.length} conflicts…`);
    try {
      const now = new Date().toISOString();
      const records = mapped.map((r) => ({
        person: r.person,
        nature_of_conflict: r.nature_of_conflict,
        related_parties: r.related_parties,
        date_identified: r.date_identified,
        mitigation: r.mitigation,
        review_date: r.review_date,
        status: r.status,
        raised_by: r.raised_by || null,
      }));

      const created = await base44.entities.ConflictOfInterest.bulkCreate(records);

      const logs = created.map((rec) => ({
        entity: "ConflictOfInterest",
        record_id: rec?.id || null,
        record_ref: rec?.person || "",
        action: "created",
        changes: JSON.stringify({ snapshot: rec }),
        user: user?.id || null,
        user_name: user?.full_name || user?.email || "",
        timestamp: now,
      }));
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
              Upload an Excel (.xlsx) or CSV conflicts register. The AI reads the columns, maps them to the
              conflict schema, matches the declarant to your existing employees, and shows a preview you can
              review before importing.
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
            <p className="text-sm text-muted-foreground">
              Review the mapped conflicts. Fix any unmatched declarant using the dropdown, then import.
            </p>
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
                    <th className="px-2 py-1.5 font-semibold">Person</th>
                    <th className="px-2 py-1.5 font-semibold">Nature of Conflict</th>
                    <th className="px-2 py-1.5 font-semibold">Raised By</th>
                    <th className="px-2 py-1.5 font-semibold">Date Identified</th>
                    <th className="px-2 py-1.5 font-semibold">Review Date</th>
                    <th className="px-2 py-1.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mapped.map((r, i) => (
                    <tr key={i} className="border-t border-border align-top">
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="max-w-[200px] px-2 py-1.5">
                        <div className="font-medium">{r.person}</div>
                        {r.warnings.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {r.warnings.map((w) => (
                              <span key={w} className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">{w}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="max-w-[260px] px-2 py-1.5">{r.nature_of_conflict}</td>
                      <td className="px-2 py-1.5">
                        <select className={selectCls} value={r.raised_by || ""} onChange={(e) => updateRow(i, { raised_by: e.target.value || null })}>
                          <option value="">—</option>
                          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.email}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">{r.date_identified || "—"}</td>
                      <td className="px-2 py-1.5">{r.review_date || "—"}</td>
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
            <p className="text-sm font-medium">{importedCount} conflicts imported into the register.</p>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button type="button" onClick={doImport}>Import {mapped.length} conflicts</Button>
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