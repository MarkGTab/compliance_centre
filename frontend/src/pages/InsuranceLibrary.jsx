import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Umbrella, Search, Plus, Pencil, Download, FileBarChart, ShieldAlert } from "lucide-react";
import InsuranceForm from "@/components/insurance/InsuranceForm";
import { formatGbp } from "@/lib/risk-helpers";
import { buildPersonMap } from "@/lib/people";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate } from "@/lib/audit";
import { useDeeplink } from "@/lib/deeplink";
import BackLink from "@/components/BackLink";

const COVER_TYPES = ["PI", "D&O", "Cyber", "Buildings", "Contents", "Employers' Liability", "Public Liability", "Key Person", "Other"];
const STATUSES = ["Active", "Due for Renewal", "Lapsed", "Archived"];
const statusStyles = {
  Active: "bg-emerald-100 text-emerald-800",
  "Due for Renewal": "bg-amber-100 text-amber-800",
  Lapsed: "bg-red-100 text-red-800",
  Archived: "bg-slate-100 text-slate-600",
};

export default function InsuranceLibrary() {
  const [policies, setPolicies] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [search, setSearch] = useState("");
  const [fCover, setFCover] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fStatus, setFStatus] = useState("");
  const { user, canCreate, canEdit } = useAccess();
  const dl = useDeeplink();

  // Deep-link filters from dashboards / My Work.
  useEffect(() => {
    if (!Object.keys(dl).length) return;
    if (dl.q) setSearch(dl.q);
    if (dl.status) setFStatus(dl.status);
    if (dl.cover) setFCover(dl.cover);
    if (dl.owner) setFOwner(dl.owner);
  }, [dl]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u, r, emps] = await Promise.all([
        base44.entities.InsurancePolicy.list("-created_date", 500),
        base44.entities.User.list(),
        base44.entities.Risk.list("-created_date", 500),
        base44.entities.Employee.list(),
      ]);
      setPolicies(p); setUsers(u); setRisks(r); setEmployees(emps);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const u = base44.entities.InsurancePolicy.subscribe(load); return u; }, [load]);

  const personMap = buildPersonMap(employees, users);
  const userName = (id) => personMap[id]?.full_name || personMap[id]?.email || "—";
  const riskNames = (ids = []) => ids.map((id) => risks.find((r) => r.id === id)?.title).filter(Boolean);

  const rows = useMemo(() => {
    let arr = [...policies];
    if (search) { const q = search.toLowerCase(); arr = arr.filter((p) => (p.policy_name || "").toLowerCase().includes(q) || (p.insurer || "").toLowerCase().includes(q)); }
    if (fCover) arr = arr.filter((p) => p.cover_type === fCover);
    if (fOwner) arr = arr.filter((p) => p.owner === fOwner);
    if (fStatus) arr = arr.filter((p) => p.status === fStatus);
    return arr;
  }, [policies, search, fCover, fOwner, fStatus]);

  const save = async (payload) => {
    try {
      if (editPolicy) await auditUpdate("InsurancePolicy", editPolicy.id, payload, editPolicy, user);
      else await auditCreate("InsurancePolicy", payload, user);
      setShowForm(false); setEditPolicy(null);
    } catch (e) { alert("Failed: " + (e.message || e)); }
  };

  const inputCls = "h-8 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackLink />
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold"><Umbrella className="h-5 w-5 text-primary" /> Insurance</h1>
            <p className="text-xs text-muted-foreground">Central register of every insurance policy the business holds</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/insurance-report"><FileBarChart className="mr-1 h-4 w-4" /> Insurance Report</Link></Button>
          {canCreate("InsurancePolicy") && <Button onClick={() => { setEditPolicy(null); setShowForm(true); }}><Plus className="mr-1 h-4 w-4" /> New Policy</Button>}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-white p-3">
        <div>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">Search</div>
          <div className="relative"><Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input className={`${inputCls} pl-7`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name / insurer…" />
          </div>
        </div>
        <div><div className="mb-1 text-[11px] font-medium text-muted-foreground">Cover type</div>
          <select className={inputCls} value={fCover} onChange={(e) => setFCover(e.target.value)}><option value="">All</option>{COVER_TYPES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div><div className="mb-1 text-[11px] font-medium text-muted-foreground">Owner</div>
          <select className={inputCls} value={fOwner} onChange={(e) => setFOwner(e.target.value)}><option value="">All</option>{employees.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}</select>
        </div>
        <div><div className="mb-1 text-[11px] font-medium text-muted-foreground">Status</div>
          <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <span className="text-xs text-muted-foreground">{rows.length} policies</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-md border border-border bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.policy_name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.cover_type || "—"}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${statusStyles[p.status] || ""}`}>{p.status || "—"}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{p.insurer || "—"} · via {p.broker || "—"} · Policy no. {p.policy_number || "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  {p.policy_document && <a href={p.policy_document} target="_blank" rel="noreferrer" className="text-primary"><Download className="h-4 w-4" /></a>}
                  {canEdit("InsurancePolicy") && <button onClick={() => { setEditPolicy(p); setShowForm(true); }} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Field label="Limit" value={formatGbp(p.limit_of_indemnity)} />
                <Field label="Excess" value={formatGbp(p.excess)} />
                <Field label="Premium" value={formatGbp(p.premium)} />
                <Field label="Expiry" value={p.expiry_date || "—"} />
              </div>
              {p.key_exclusions && (
                <div className="mt-2 flex items-start gap-1.5 rounded bg-amber-50 p-2 text-xs text-amber-900">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div><span className="font-semibold">Key exclusions:</span> {p.key_exclusions}</div>
                </div>
              )}
              {riskNames(p.linked_risks).length > 0 && (
                <div className="mt-1.5 text-xs text-muted-foreground">Mitigates: {riskNames(p.linked_risks).join(", ")}</div>
              )}
            </div>
          ))}
          {rows.length === 0 && <div className="rounded-md border border-border bg-white p-8 text-center text-sm text-muted-foreground">No insurance policies.</div>}
        </div>
      )}

      <InsuranceForm open={showForm} onClose={() => { setShowForm(false); setEditPolicy(null); }} onSave={save} users={employees} risks={risks} policy={editPolicy} />
    </div>
  );
}

function Field({ label, value }) {
  return <div><div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div><div>{value}</div></div>;
}