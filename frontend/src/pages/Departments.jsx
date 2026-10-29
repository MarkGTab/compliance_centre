import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DepartmentSwitcher from "@/components/departments/DepartmentSwitcher";
import DepartmentView from "@/components/departments/DepartmentView";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [risks, setRisks] = useState([]);
  const [controls, setControls] = useState([]);
  const [kris, setKris] = useState([]);
  const [actions, setActions] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [me, setMe] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r, c, k, a, u, m, emps] = await Promise.all([
        base44.entities.Department.list(),
        base44.entities.Risk.list("-created_date", 500),
        base44.entities.Control.list(),
        base44.entities.KRI.list(),
        base44.entities.Action.list(),
        base44.entities.User.list(),
        base44.auth.me().catch(() => null),
        base44.entities.Employee.list(),
      ]);
      setDepartments(d); setRisks(r); setControls(c); setKris(k); setActions(a); setUsers(u); setMe(m); setEmployees(emps);
    } catch (e) {
      console.error("Departments load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const myEmpId = (employees.find((e) => e.linked_user === me?.id) || {}).id || null;
  const myDept = departments.find((d) => d.head === myEmpId);
  const isAdmin = me?.role === "admin";
  const locked = !!myDept && !isAdmin;
  const availableDepts = locked ? departments.filter((d) => d.id === myDept.id) : departments;

  useEffect(() => {
    if (selectedId || !departments.length) return;
    const my = departments.find((d) => d.head === myEmpId);
    setSelectedId(my ? my.id : departments[0].id);
  }, [departments, employees, selectedId]);

  const selected = departments.find((d) => d.id === selectedId);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b border-border bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">TAB Risk Management</div>
              <div className="text-[11px] text-muted-foreground">Departments</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/">Dashboard</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/risk-register">Risk Register</Link></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Department Risk Views</h1>
            <p className="text-xs text-muted-foreground">
              {locked
                ? "Your departmental register — restricted to your function"
                : "Select a department to view its risks, controls, KRIs and actions"}
            </p>
          </div>
          <DepartmentSwitcher
            departments={availableDepts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            locked={locked}
          />
        </div>

        <DepartmentView
          department={selected}
          risks={risks}
          controls={controls}
          kris={kris}
          actions={actions}
          users={employees}
        />
      </main>
    </div>
  );
}