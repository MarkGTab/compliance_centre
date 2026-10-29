import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileText, Search, Plus, Pencil, Download, FileBarChart, Copy } from "lucide-react";
import PolicyForm from "@/components/policy/PolicyForm";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate } from "@/lib/audit";
import { buildPersonMap } from "@/lib/people";
import { useDeeplink } from "@/lib/deeplink";
import BackLink from "@/components/BackLink";

const STATUSES = ["Current", "Due for Review", "Overdue", "Archived"];
const statusStyles = {
  Current: "bg-emerald-100 text-emerald-800",
  "Due for Review": "bg-amber-100 text-amber-800",
  Overdue: "bg-red-100 text-red-800",
  Archived: "bg-slate-100 text-slate-600",
};

export default function PolicyLibrary() {
  const [policies, setPolicies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [search, setSearch] = useState("");
  const [fDept, setFDept] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fStatus, setFStatus] = useState("");
  const { user, canCreate, canEdit } = useAccess();
  const dl = useDeeplink();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("new") === "1") { setEditPolicy(null); setShowForm(true); }
  }, []);

  // Deep-link filters from dashboards / My Work.
  useEffect(() => {
    if (!Object.keys(dl).length) return;
    if (dl.q) setSearch(dl.q);
    if (dl.status) setFStatus(dl.status);
    if (dl.dept) setFDept(dl.dept);
    if (dl.owner) setFOwner(dl.owner);
  }, [dl]);

  const clonePolicy = async (pol) => {
    const { id, created_date, updated_date, created_by_id, last_modified_by, last_modified_date, ...rest } = pol;
    try { await base44.entities.Policy.create({ ...rest, policy_name: `${pol.policy_name || "Policy"} (copy)` }); }
    catch (e) { alert("Clone failed: " + (e.message || e)); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d, u, emps] = await Promise.all([
        base44.entities.Policy.list("-created_date", 500),
        base44.entities.Department.list(),
        base44.entities.User.list(),
        base44.entities.Employee.list(),
      ]);
      setPolicies(p); setDepartments(d); setUsers(u); setEmployees(emps);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const u = base44.entities.Policy.subscribe(load); return u; }, [load]);

  const deptName = (id) => departments.find((d) => d.id === id)?.name;
  const personMap = buildPersonMap(employees, users);
  const userName = (id) => personMap[id]?.full_name || personMap[id]?.email || "—";

  const rows = useMemo(() => {
    let arr = [...policies];
    if (search) { const q = search.toLowerCase(); arr = arr.filter((p) => (p.policy_name || "").toLowerCase().includes(q)); }
    if (fDept) arr = arr.filter((p) => p.department === fDept);
    if (fOwner) arr = arr.filter((p) => p.owner === fOwner);
    if (fStatus) arr = arr.filter((p) => p.status === fStatus);
    return arr;
  }, [policies, search, fDept, fOwner, fStatus]);

  const save = async (payload) => {
    try {
      let savedId = editPolicy?.id;
      if (editPolicy) await auditUpdate("Policy", editPolicy.id, payload, editPolicy, user);
      else { const created = await auditCreate("Policy", payload, user); savedId = created?.id; }
      // Only one policy may govern the Gifts & Hospitality register at a time:
      // flagging a new governing policy supersedes the previous one.
      if (payload.governs_gh_register === "Yes" && savedId) {
        const all = await base44.entities.Policy.list();
        const others = all.filter((p) => p.governs_gh_register === "Yes" && p.id !== savedId);
        if (others.length) await base44.entities.Policy.bulkUpdate(others.map((p) => ({ id: p.id, governs_gh_register: "No" })));
      }
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
            <h1 className="flex items-center gap-2 text-xl font-bold"><FileText className="h-5 w-5 text-primary" /> Policy Suite</h1>
            <p className="text-xs text-muted-foreground">Central library of company policies, tracked and reported</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/policy-report"><FileBarChart className="mr-1 h-4 w-4" /> Policy Report</Link></Button>
          {canCreate("Policy") && <Button onClick={() => { setEditPolicy(null); setShowForm(true); }}><Plus className="mr-1 h-4 w-4" /> New Policy</Button>}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-white p-3">
        <div>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">Search</div>
          <div className="relative"><Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input className={`${inputCls} pl-7`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Policy name…" />
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">Department</div>
          <select className={inputCls} value={fDept} onChange={(e) => setFDept(e.target.value)}><option value="">All</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">Owner</div>
          <select className={inputCls} value={fOwner} onChange={(e) => setFOwner(e.target.value)}><option value="">All</option>{employees.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}</select>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">Status</div>
          <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <span className="text-xs text-muted-foreground">{rows.length} policies</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 text-left">Policy</th>
                <th className="px-3 py-2 text-left">Department</th>
                <th className="px-3 py-2 text-left">Owner</th>
                <th className="px-3 py-2 text-left">Version</th>
                <th className="px-3 py-2 text-left">Next review</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Document</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2 font-medium">{p.policy_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{deptName(p.department) || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{userName(p.owner)}</td>
                  <td className="px-3 py-2">{p.version || "—"}</td>
                  <td className="px-3 py-2">{p.next_review_date || "—"}</td>
                  <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${statusStyles[p.status] || ""}`}>{p.status || "—"}</span></td>
                  <td className="px-3 py-2">{p.policy_document ? <a href={p.policy_document} target="_blank" rel="noreferrer" className="text-primary"><Download className="h-4 w-4" /></a> : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => clonePolicy(p)} title="Clone" className="text-muted-foreground hover:text-primary"><Copy className="h-4 w-4" /></button>
                      {canEdit("Policy") && <button onClick={() => { setEditPolicy(p); setShowForm(true); }} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No policies.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <PolicyForm open={showForm} onClose={() => { setShowForm(false); setEditPolicy(null); }} onSave={save} departments={departments} users={employees} policy={editPolicy} />
    </div>
  );
}