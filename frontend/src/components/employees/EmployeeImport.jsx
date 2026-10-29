import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { provisionLogin } from "@/lib/employee-provision";
import { Upload, Download, FileUp } from "lucide-react";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileRe = /^[+]?[\d\s()\-]{7,20}$/;

const HEADERS = ["full_name", "email", "mobile", "department", "job_title", "line_manager", "requires_login"];

function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.length && r.some((c) => String(c).trim() !== ""));
}

function downloadTemplate() {
  const example = ["Jane Smith", "jane.smith@tab.co.uk", "07700 900123", "Risk", "Risk Manager", "John Doe", "No"];
  const csv = [HEADERS.join(","), example.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "employees_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function EmployeeImport({ open, departments, employees, onDone, onClose }) {
  const [parsed, setParsed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const deptByName = (name) => {
    if (!name) return null;
    const n = name.trim().toLowerCase();
    return departments.find((d) => d.name.trim().toLowerCase() === n) || null;
  };
  const mgrByNameOrEmail = (val) => {
    if (!val) return null;
    const v = val.trim().toLowerCase();
    return employees.find((e) => e.full_name?.toLowerCase() === v || e.email?.toLowerCase() === v) || null;
  };

  const handleFile = async (file) => {
    setResult(null);
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) { setParsed({ error: "File is empty" }); return; }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name) => header.indexOf(name);
    const missing = HEADERS.filter((h) => idx(h) === -1);
    if (missing.length) { setParsed({ error: `Missing columns: ${missing.join(", ")}` }); return; }

    const dataRows = rows.slice(1).map((raw, i) => {
      const get = (h) => (raw[idx(h)] || "").trim();
      const full_name = get("full_name");
      const email = get("email").toLowerCase();
      const mobile = get("mobile");
      const deptName = get("department");
      const job_title = get("job_title");
      const mgrVal = get("line_manager");
      const rl = (get("requires_login") || "No").toLowerCase();
      const requires_login = rl.startsWith("y") || rl === "yes" || rl === "true" ? "Yes" : "No";

      const errs = [];
      if (!full_name) errs.push("name required");
      if (!email) errs.push("email required");
      else if (!emailRe.test(email)) errs.push("invalid email");
      if (mobile && !mobileRe.test(mobile)) errs.push("invalid mobile");
      const dept = deptByName(deptName);
      if (deptName && !dept) errs.push(`department "${deptName}" not found`);
      const mgr = mgrByNameOrEmail(mgrVal);
      if (mgrVal && !mgr) errs.push(`manager "${mgrVal}" not found`);

      return {
        row: i + 2,
        full_name, email, mobile, department: deptName, job_title, line_manager: mgrVal, requires_login,
        valid: errs.length === 0,
        errors: errs,
        _deptId: dept?.id || null,
        _mgrId: mgr?.id || null,
      };
    });

    setParsed({ rows: dataRows });
  };

  const doImport = async () => {
    const valid = parsed.rows.filter((r) => r.valid);
    if (!valid.length) return;
    setBusy(true);
    try {
      const records = valid.map((r) => ({
        full_name: r.full_name,
        email: r.email,
        mobile: r.mobile || null,
        department: r._deptId,
        job_title: r.job_title || null,
        line_manager: r._mgrId,
        requires_login: r.requires_login,
        status: "Active",
        linked_user: null,
      }));
      const created = await base44.entities.Employee.bulkCreate(records);
      const list = Array.isArray(created) ? created : [];
      let provisioned = 0;
      for (let i = 0; i < list.length; i++) {
        if (records[i].requires_login === "Yes" && list[i]?.id) {
          try {
            const uid = await provisionLogin(records[i].email);
            if (uid) {
              await base44.entities.Employee.update(list[i].id, { linked_user: uid });
              provisioned += 1;
            }
          } catch (e) { /* ignore individual provision failure */ }
        }
      }
      setResult({ created: list.length, provisioned, provisionFailed: valid.filter((r) => r.requires_login === "Yes").length - provisioned });
      setParsed(null);
      onDone && onDone();
    } catch (e) {
      setResult({ error: e.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  const close = () => { setParsed(null); setResult(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk import employees</DialogTitle>
        </DialogHeader>

        {!parsed && !result && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with columns: <code className="text-xs">{HEADERS.join(", ")}</code>.
              <code>department</code> is matched by name; <code>line_manager</code> by name or email. <code>requires_login</code> accepts Yes/No.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4" /> Download template
              </Button>
              <Button onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4" /> Choose CSV file
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>
        )}

        {parsed?.error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {parsed.error}
          </div>
        )}

        {parsed?.rows && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-xs">
              <span>Rows: {parsed.rows.length}</span>
              <span className="text-green-700">Valid: {parsed.rows.filter((r) => r.valid).length}</span>
              <span className="text-destructive">Invalid: {parsed.rows.filter((r) => !r.valid).length}</span>
            </div>
            <div className="max-h-72 overflow-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Dept</th>
                    <th className="p-2 text-left">Login</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r) => (
                    <tr key={r.row} className={r.valid ? "" : "bg-destructive/10"}>
                      <td className="p-2">{r.row}</td>
                      <td className="p-2">{r.full_name}</td>
                      <td className="p-2">{r.email}</td>
                      <td className="p-2">{r.department}</td>
                      <td className="p-2">{r.requires_login}</td>
                      <td className="p-2">{r.valid ? <span className="text-green-700">OK</span> : <span className="text-destructive">{r.errors.join(" · ")}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setParsed(null)}>Back</Button>
              <Button onClick={doImport} disabled={busy || parsed.rows.filter((r) => r.valid).length === 0}>
                <Upload className="h-4 w-4" /> {busy ? "Importing…" : `Import ${parsed.rows.filter((r) => r.valid).length} rows`}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {result.error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Import failed: {result.error}
              </div>
            ) : (
              <div className="rounded-md border border-green-500/40 bg-green-50 p-3 text-sm text-green-800">
                Imported <b>{result.created}</b> employee record(s).
                {result.provisioned > 0 && <> Provisioned <b>{result.provisioned}</b> platform account(s).</>}
                {result.provisionFailed > 0 && <> {result.provisionFailed} account invite(s) pending — re-open the employee to link.</>}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}