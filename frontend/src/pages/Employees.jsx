import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/lib/permissions";
import { UserPlus, Upload, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmployeeForm from "@/components/employees/EmployeeForm";
import EmployeeImport from "@/components/employees/EmployeeImport";
import NoAccess from "@/components/NoAccess";
import { auditCreate, auditUpdate } from "@/lib/audit";
import { provisionLogin } from "@/lib/employee-provision";

export default function Employees() {
  const { user } = useAuth();
  const { canView, canEdit } = usePermissions();
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [emps, depts, us] = await Promise.all([
        base44.entities.Employee.list("-created_date", 1000),
        base44.entities.Department.list(),
        base44.entities.User.list(),
      ]);
      setRows(emps || []);
      setDepartments(depts || []);
      setUsers(us || []);
    } catch (e) {
      console.error("employees load", e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!canView("Employees")) return <NoAccess />;

  const canEditRow = canEdit("Employees");
  const deptName = (id) => departments.find((d) => d.id === id)?.name || "—";
  const mgrName = (id) => rows.find((e) => e.id === id)?.full_name || "—";
  const linkedEmail = (id) => users.find((u) => u.id === id)?.email || "—";

  const filtered = rows.filter((r) => {
    if (deptFilter && r.department !== deptFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (q) {
      const s = `${r.full_name || ""} ${r.email || ""} ${r.job_title || ""}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const counts = {
    total: rows.length,
    active: rows.filter((r) => r.status === "Active").length,
    leavers: rows.filter((r) => r.status === "Leaver").length,
    login: rows.filter((r) => r.requires_login === "Yes").length,
  };

  const openAdd = () => { setEditing({ requires_login: "No", status: "Active" }); setDialogOpen(true); };
  const openEdit = (r) => { setEditing(r); setDialogOpen(true); };

  const handleSave = async (data) => {
    setBusy(true);
    try {
      const prev = editing?.id ? rows.find((r) => r.id === editing.id) : null;
      const goingLeaver = data.status === "Leaver" && prev?.status !== "Leaver";

      let linked = data.linked_user;
      if (data.requires_login === "Yes" && !linked && data.email) {
        try { linked = await provisionLogin(data.email); } catch (e) { /* ignore */ }
      }
      const payload = { ...data, linked_user: linked || null };

      let savedId = editing?.id;
      if (editing?.id) {
        await auditUpdate("Employee", editing.id, payload, prev, user);
      } else {
        const rec = await auditCreate("Employee", payload, user);
        savedId = rec?.id;
      }

      if (goingLeaver && savedId) {
        try {
          await base44.functions.invoke("handleEmployeeLeaver", { employee_id: savedId });
        } catch (e) {
          console.error("leaver flag", e);
          alert("Saved, but leaver reassignment flagging failed: " + (e.message || e));
        }
      }

      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      alert("Save failed: " + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Employees</h1>
          <p className="text-xs text-muted-foreground">Master directory for all people — login optional. Drives attestation audiences and ownership.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} disabled={!canEditRow}>
            <Upload className="h-4 w-4" /> Bulk import
          </Button>
          <Button onClick={openAdd} disabled={!canEditRow}>
            <UserPlus className="h-4 w-4" /> Add employee
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-border bg-white p-3">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-lg font-semibold">{counts.total}</div>
        </div>
        <div className="rounded-md border border-border bg-white p-3">
          <div className="text-xs text-muted-foreground">Active</div>
          <div className="text-lg font-semibold text-green-700">{counts.active}</div>
        </div>
        <div className="rounded-md border border-border bg-white p-3">
          <div className="text-xs text-muted-foreground">Leavers</div>
          <div className="text-lg font-semibold text-amber-700">{counts.leavers}</div>
        </div>
        <div className="rounded-md border border-border bg-white p-3">
          <div className="text-xs text-muted-foreground">With login</div>
          <div className="text-lg font-semibold">{counts.login}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8 w-64" placeholder="Search name, email, role" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
        </select>
        <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Leaver">Leaver</option>
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>

      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Mobile</th>
              <th className="p-2 text-left">Department</th>
              <th className="p-2 text-left">Job title</th>
              <th className="p-2 text-left">Line manager</th>
              <th className="p-2 text-left">Login</th>
              <th className="p-2 text-left">Account</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="cursor-pointer border-t border-border hover:bg-muted/50" onClick={() => canEditRow && openEdit(r)}>
                <td className="p-2 font-medium">{r.full_name}</td>
                <td className="p-2 text-muted-foreground">{r.email}</td>
                <td className="p-2 text-muted-foreground">{r.mobile || "—"}</td>
                <td className="p-2">{deptName(r.department)}</td>
                <td className="p-2">{r.job_title || "—"}</td>
                <td className="p-2">{mgrName(r.line_manager)}</td>
                <td className="p-2">
                  {r.requires_login === "Yes"
                    ? <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">Yes</span>
                    : <span className="text-xs text-muted-foreground">No</span>}
                </td>
                <td className="p-2 text-xs text-muted-foreground">{r.linked_user ? linkedEmail(r.linked_user) : "—"}</td>
                <td className="p-2">
                  {r.status === "Leaver"
                    ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Leaver</span>
                    : <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">Active</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-sm text-muted-foreground">No employees match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <EmployeeForm
          open={dialogOpen}
          initial={editing || {}}
          departments={departments}
          employees={rows}
          users={users}
          onSave={handleSave}
          onClose={() => { setDialogOpen(false); setEditing(null); }}
        />
      )}

      {importOpen && (
        <EmployeeImport
          open={importOpen}
          departments={departments}
          employees={rows}
          onDone={load}
          onClose={() => setImportOpen(false)}
        />
      )}
      {busy && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-primary" /></div>}
    </div>
  );
}