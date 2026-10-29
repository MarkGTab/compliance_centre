import React, { useEffect, useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Search, Gift, Flag, FileBarChart, AlertTriangle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import GiftForm from "@/components/gifts/GiftForm";
import GiftDetail from "@/components/gifts/GiftDetail";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate } from "@/lib/audit";
import { buildPersonMap } from "@/lib/people";
import {
  DIRECTIONS,
  RELATIONSHIPS,
  GIFT_TYPES,
  complianceStyles,
  getGoverningPolicy,
} from "@/lib/gift-policy";

function gbp(v) {
  if (v === null || v === undefined || v === "") return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(v));
}

function genRef() {
  return `GH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function GiftsHospitality() {
  const { user, canCreate, canEdit } = useAccess();
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);

  const [search, setSearch] = useState("");
  const [fDir, setFDir] = useState("");
  const [fRel, setFRel] = useState("");
  const [fType, setFType] = useState("");
  const [fEmp, setFEmp] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, u, c, p, emps] = await Promise.all([
        base44.entities.GiftHospitalityDeclaration.list("-created_date", 500),
        base44.entities.User.list(),
        base44.entities.ConflictOfInterest.list(),
        base44.entities.Policy.list(),
        base44.entities.Employee.list(),
      ]);
      setRows(g); setUsers(u); setConflicts(c); setPolicies(p); setEmployees(emps);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const u = base44.entities.GiftHospitalityDeclaration.subscribe(load); return u; }, [load]);

  const personMap = buildPersonMap(employees, users);
  const userName = (id) => personMap[id]?.full_name || personMap[id]?.email || "—";
  const governing = useMemo(() => getGoverningPolicy(policies), [policies]);

  const filtered = useMemo(() => {
    let arr = [...rows];
    if (search) { const q = search.toLowerCase(); arr = arr.filter((r) => (r.counterparty || "").toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q) || (r.declaration_ref || "").toLowerCase().includes(q)); }
    if (fDir) arr = arr.filter((r) => r.direction === fDir);
    if (fRel) arr = arr.filter((r) => r.counterparty_relationship === fRel);
    if (fType) arr = arr.filter((r) => r.type === fType);
    if (fEmp) arr = arr.filter((r) => r.employee === fEmp);
    if (fStatus) arr = arr.filter((r) => r.compliance_status === fStatus);
    if (fFrom) arr = arr.filter((r) => (r.date || "") >= fFrom);
    if (fTo) arr = arr.filter((r) => (r.date || "") <= fTo);
    return arr;
  }, [rows, search, fDir, fRel, fType, fEmp, fStatus, fFrom, fTo]);

  const totals = useMemo(() => {
    let within = 0, review = 0, breach = 0, value = 0;
    for (const r of rows) {
      if (r.compliance_status === "Within Policy") within++;
      else if (r.compliance_status === "Requires Review") review++;
      else if (r.compliance_status === "BREACH") breach++;
      if (typeof r.estimated_value === "number") value += r.estimated_value;
    }
    return { total: rows.length, within, review, breach, value };
  }, [rows]);

  const save = async (payload) => {
    try {
      if (editing?.id) {
        await auditUpdate("GiftHospitalityDeclaration", editing.id, payload, editing, user);
      } else {
        await auditCreate("GiftHospitalityDeclaration", { ...payload, declaration_ref: payload.declaration_ref || genRef() }, user);
      }
      setShowForm(false); setEditing(null);
    } catch (e) { alert("Failed: " + (e.message || e)); }
  };

  const input = "h-8 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Gift className="h-5 w-5 text-primary" /> Gifts & Hospitality Register</h1>
          <p className="text-xs text-muted-foreground">Anti-bribery control — declarations tested against TAB's gifts & hospitality policy (Financial Crime)</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/gifts-hospitality-report"><FileBarChart className="mr-1 h-4 w-4" /> Report</Link></Button>
          {canCreate("GiftHospitalityDeclaration") ? (
            <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="mr-1 h-4 w-4" /> New Declaration</Button>
          ) : null}
        </div>
      </div>

      {governing ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <ShieldCheck className="h-4 w-4" />
          <span>
            Limits drawn from <strong>{governing.policy_name}{governing.version ? ` v${governing.version}` : ""}</strong>
            {governing.limits_effective_date ? ` (effective ${governing.limits_effective_date})` : ""} —
            gift ≥ £{governing.gift_approval_threshold ?? "—"}, hospitality ≥ £{governing.hospitality_approval_threshold ?? "—"}
            {governing.absolute_prohibition_limit != null ? `, absolute cap £${governing.absolute_prohibition_limit}` : ""}.
          </span>
          <Link to="/policy-library" className="ml-auto underline hover:text-emerald-900">View policy</Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4" />
          <span>No governing anti-bribery policy set — limits not configured. Flag a policy as “Governs G&H register” in the Policy Suite to activate the compliance test.</span>
          <Link to="/policy-library" className="ml-auto underline hover:text-red-900">Policy Suite</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={totals.total} />
        <Stat label="Within Policy" value={totals.within} color="emerald" />
        <Stat label="Requires Review" value={totals.review} color="amber" />
        <Stat label="Breaches" value={totals.breach} color="red" />
        <Stat label="Total Value" value={gbp(totals.value)} />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-white p-3">
        <Filter label="Search">
          <div className="relative"><Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input className={`${input} pl-7`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Counterparty / description / ref" />
          </div>
        </Filter>
        <Filter label="Direction"><select className={input} value={fDir} onChange={(e) => setFDir(e.target.value)}><option value="">All</option>{DIRECTIONS.map((d) => <option key={d}>{d}</option>)}</select></Filter>
        <Filter label="Type"><select className={input} value={fType} onChange={(e) => setFType(e.target.value)}><option value="">All</option>{GIFT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Filter>
        <Filter label="Relationship"><select className={input} value={fRel} onChange={(e) => setFRel(e.target.value)}><option value="">All</option>{RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}</select></Filter>
        <Filter label="Employee"><select className={input} value={fEmp} onChange={(e) => setFEmp(e.target.value)}><option value="">All</option>{employees.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}</select></Filter>
        <Filter label="Compliance"><select className={input} value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">All</option><option>Within Policy</option><option>Requires Review</option><option>BREACH</option></select></Filter>
        <Filter label="From"><input type="date" className={input} value={fFrom} onChange={(e) => setFFrom(e.target.value)} /></Filter>
        <Filter label="To"><input type="date" className={input} value={fTo} onChange={(e) => setFTo(e.target.value)} /></Filter>
        <span className="text-xs text-muted-foreground">{filtered.length} declarations</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 text-left">Ref</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Direction</th>
                <th className="px-3 py-2 text-left">Employee</th>
                <th className="px-3 py-2 text-left">Counterparty</th>
                <th className="px-3 py-2 text-left">Relationship</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-left">Compliance</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="cursor-pointer border-t border-border hover:bg-muted/40" onClick={() => setDetail(r)}>
                  <td className="px-3 py-2 font-medium">{r.declaration_ref || "—"}</td>
                  <td className="px-3 py-2">{r.date || "—"}</td>
                  <td className="px-3 py-2">{r.type || "—"}</td>
                  <td className="px-3 py-2">{r.direction || "—"}</td>
                  <td className="px-3 py-2">{userName(r.employee)}</td>
                  <td className="px-3 py-2">{r.counterparty || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.counterparty_relationship || "—"}</td>
                  <td className="px-3 py-2 text-right">{gbp(r.estimated_value)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${complianceStyles[r.compliance_status] || ""}`}>
                      {r.cumulative_flag && <Flag className="h-3 w-3" />}{r.compliance_status || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.status || "—"}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    {canEdit("GiftHospitalityDeclaration") && (
                      <button onClick={() => { setEditing(r); setShowForm(true); }} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">No declarations.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <GiftForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={save}
        users={employees}
        conflicts={conflicts}
        gift={editing}
        governingPolicy={governing}
      />
      <GiftDetail
        open={!!detail}
        onClose={() => setDetail(null)}
        gift={detail}
        users={employees}
        conflicts={conflicts}
        canEdit={canEdit("GiftHospitalityDeclaration")}
        onEdit={() => { setEditing(detail); setDetail(null); setShowForm(true); }}
      />
    </div>
  );
}

function Stat({ label, value, color }) {
  const cls = color === "emerald" ? "border-emerald-300 text-emerald-700"
    : color === "amber" ? "border-amber-300 text-amber-700"
    : color === "red" ? "border-red-300 text-red-700"
    : "border-border";
  return (
    <div className={`rounded-md border bg-white p-3 text-center ${cls}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Filter({ label, children }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}