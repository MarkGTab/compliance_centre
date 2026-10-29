import React, { useEffect, useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Search, Lock, Upload } from "lucide-react";
import RiskFilters from "@/components/risk/RiskFilters";
import RiskTable from "@/components/risk/RiskTable";
import RiskDetailPanel from "@/components/risk/RiskDetailPanel";
import RiskForm from "@/components/risk/RiskForm";
import UploadRegisterDialog from "@/components/risk/UploadRegisterDialog";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";
import { buildPersonMap } from "@/lib/people";
import { useDeeplink, buildLink } from "@/lib/deeplink";
import BackLink from "@/components/BackLink";
import { useNavigate } from "react-router-dom";
import { nextRiskRef, ensureUniqueRiskRef } from "@/lib/risk-ref";

export default function RiskRegister() {
  const [risks, setRisks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [controls, setControls] = useState([]);
  const [appetites, setAppetites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ tier: null, category: "", department: "", owner: "", appetite: "", status: "", search: "" });
  const [sort, setSort] = useState({ key: "residual_score", dir: "desc" });
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState({ parentChain: [], children: [], controls: [], kris: [], actions: [], incidents: [] });
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [extraFilters, setExtraFilters] = useState({ ll: "", li: "" });
  const dl = useDeeplink();
  const navigate = useNavigate();
  const { user, canCreate, canEdit, canDelete, myDeptId, role } = useAccess();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c, d, u, ctrl, emps, apps] = await Promise.all([
        base44.entities.Risk.list("-created_date", 5000),
        base44.entities.RiskCategory.list(),
        base44.entities.Department.list(),
        base44.entities.User.list(),
        base44.entities.Control.list(),
        base44.entities.Employee.list("-created_date", 5000),
        base44.entities.Appetite.list(),
      ]);
      setAppetites(apps);
      setRisks(r);
      setCategories(c);
      setDepartments(d);
      setUsers(u);
      setEmployees(emps);
      setControls(ctrl);
    } catch (e) {
      console.error("Failed to load register data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // realtime refresh on risk changes
  useEffect(() => {
    const unsub = base44.entities.Risk.subscribe(() => { loadAll(); });
    return unsub;
  }, [loadAll]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("new") === "1") { setEditingRisk(null); setShowForm(true); }
  }, []);

  // Deep-link filters from dashboards (e.g. ?appetite=Red, ?q=R-S-02, ?ll=4&li=4).
  useEffect(() => {
    if (!Object.keys(dl).length) return;
    const next = { ...filters };
    if (dl.tier) next.tier = dl.tier;
    if (dl.category) next.category = dl.category;
    if (dl.department) next.department = dl.department;
    if (dl.owner) next.owner = dl.owner;
    if (dl.appetite) next.appetite = dl.appetite;
    if (dl.status) next.status = dl.status;
    if (dl.q) next.search = dl.q;
    setFilters(next);
    setExtraFilters({ ll: dl.ll || "", li: dl.li || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dl]);

  const deleteRisk = async (r) => {
    if (!canDelete("Risk")) { alert("You don't have permission to delete risks."); return; }
    try {
      // Remove this risk from any controls that reference it, then delete.
      const linkedControls = controls.filter((c) => (c.linked_risks || []).includes(r.id));
      if (linkedControls.length) {
        await base44.entities.Control.updateMany(
          { id: { $in: linkedControls.map((c) => c.id) } },
          { $pull: { linked_risks: r.id } }
        );
      }
      await auditDelete("Risk", r.id, r, user);
      setSelectedId(null);
    } catch (e) {
      console.error(e);
      alert("Delete failed: " + (e.message || e));
    }
  };

  const cloneRisk = async (r) => {
    const { id, created_date, updated_date, created_by_id, last_modified_by, last_modified_date, risk_ref, ...rest } = r;
    if (!canCreate("Risk")) { alert("You don't have permission to create risks."); return; }
    if (role === "department_head" && myDeptId && rest.department !== myDeptId) { alert("You can only manage risks within your own department."); return; }
    try {
      const new_ref = await nextRiskRef();
      const rec = await auditCreate("Risk", { ...rest, risk_ref: new_ref, title: `${r.title} (copy)` }, user);
      await ensureUniqueRiskRef(rec);
    }
    catch (e) { alert("Clone failed: " + (e.message || e)); }
  };

  const nameOf = (list, id) => list.find((x) => x.id === id);
  const personMap = buildPersonMap(employees, users);

  const rows = useMemo(() => {
    let arr = risks.map((r) => ({
      ...r,
      categoryName: nameOf(categories, r.category)?.name,
      ownerName: personMap[r.owner]?.full_name || personMap[r.owner]?.email,
    }));
    if (filters.tier) arr = arr.filter((r) => r.tier === filters.tier);
    if (filters.category) arr = arr.filter((r) => r.category === filters.category);
    if (filters.department) arr = arr.filter((r) => r.department === filters.department);
    if (filters.owner) arr = arr.filter((r) => r.owner === filters.owner);
    if (filters.appetite) arr = arr.filter((r) => r.appetite_status === filters.appetite);
    if (filters.status) arr = arr.filter((r) => r.status === filters.status);
    if (extraFilters.ll) arr = arr.filter((r) => String(r.residual_likelihood) === extraFilters.ll);
    if (extraFilters.li) arr = arr.filter((r) => String(r.residual_impact) === extraFilters.li);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      arr = arr.filter((r) =>
        (r.title || "").toLowerCase().includes(q) ||
        (r.risk_ref || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
      );
    }
    const { key, dir } = sort;
    arr.sort((a, b) => {
      const av = a[key] ?? -1, bv = b[key] ?? -1;
      if (typeof av === "string" && typeof bv === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [risks, categories, employees, filters, sort, extraFilters]);

  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const openRisk = useCallback(async (id) => {
    setSelectedId(id);
    const risk = risks.find((r) => r.id === id);
    if (!risk) return;
    // parent chain — walk up
    const chain = [];
    let cur = risk;
    const guard = new Set();
    while (cur?.parent_risk && !guard.has(cur.id)) {
      guard.add(cur.id);
      const parent = risks.find((r) => r.id === cur.parent_risk);
      if (!parent) break;
      chain.unshift(parent);
      cur = parent;
    }
    const children = risks.filter((r) => r.parent_risk === id);
    const linkedControls = controls.filter((c) => (c.linked_risks || []).includes(id));
    try {
      const [k, a, i] = await Promise.all([
        base44.entities.KRI.filter({ linked_risk: id }),
        base44.entities.Action.filter({ linked_risk: id }),
        base44.entities.Incident.filter({ linked_risk: id }),
      ]);
      setDetail({ parentChain: chain, children, controls: linkedControls, kris: k, actions: a, incidents: i });
    } catch (e) {
      setDetail({ parentChain: chain, children, controls: linkedControls, kris: [], actions: [], incidents: [] });
    }
  }, [risks, controls]);

  const navigateTo = (id) => openRisk(id);

  const saveRisk = async (payload) => {
    try {
      if (role === "department_head" && myDeptId && payload.department && payload.department !== myDeptId) {
        alert("You can only manage risks within your own department.");
        return;
      }
      const { linked_controls = [], ...riskPayload } = payload;
      let riskId = editingRisk?.id;
      if (editingRisk?.id) {
        await auditUpdate("Risk", editingRisk.id, riskPayload, editingRisk, user);
      } else {
        const risk_ref = await nextRiskRef();
        const rec = await auditCreate("Risk", { ...riskPayload, risk_ref }, user);
        await ensureUniqueRiskRef(rec);
        riskId = rec.id;
      }
      // Sync linked controls (Control.linked_risks owns the relationship).
      if (riskId) {
        const want = Array.from(new Set(linked_controls.filter(Boolean)));
        const prior = controls.filter((c) => (c.linked_risks || []).includes(riskId)).map((c) => c.id);
        const toAdd = want.filter((id) => !prior.includes(id));
        const toRemove = prior.filter((id) => !want.includes(id));
        if (toAdd.length) {
          await base44.entities.Control.updateMany({ id: { $in: toAdd } }, { $addToSet: { linked_risks: riskId } });
        }
        if (toRemove.length) {
          await base44.entities.Control.updateMany({ id: { $in: toRemove } }, { $pull: { linked_risks: riskId } });
        }
      }
      setShowForm(false);
      setEditingRisk(null);
    } catch (e) {
      console.error(e);
      alert("Save failed: " + (e.message || e));
    }
  };

  const selectedRisk = risks.find((r) => r.id === selectedId);

  return (
    <div className="min-h-screen bg-background">
      {/* App header */}
      <header className="sticky top-0 z-10 border-b border-border bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">TAB Risk Management</div>
              <div className="text-[11px] text-muted-foreground">Risk Register</div>
            </div>
          </div>
          {canCreate("Risk") ? (
            <div className="flex items-center gap-2">
              <Button onClick={() => { setEditingRisk(null); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-1 h-4 w-4" /> New Risk
              </Button>
              <Button variant="outline" onClick={() => setShowUpload(true)}>
                <Upload className="mr-1 h-4 w-4" /> Upload Existing Register
              </Button>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Read-only access
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-5">
        <BackLink />
        {/* Tier + filters */}
        <div className="rounded-md border border-border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold">Tier</span>
            <span className="text-xs text-muted-foreground">Filter the register by risk tier</span>
          </div>
          <RiskFilters filters={filters} setFilters={setFilters} categories={categories} departments={departments} users={employees} />
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filters.search || ""}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search ref, title, description…"
                className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <span className="text-xs text-muted-foreground">{rows.length} of {risks.length} risks</span>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          ) : (
            <RiskTable rows={rows} sort={sort} onSort={onSort} onOpen={openRisk} selectedId={selectedId} />
          )}
        </div>
      </main>

      <RiskDetailPanel
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        risk={selectedRisk}
        parentChain={detail.parentChain}
        children={detail.children}
        controls={detail.controls}
        kris={detail.kris}
        actions={detail.actions}
        incidents={detail.incidents}
        onNavigate={navigateTo}
        onEdit={(r) => { setEditingRisk(r); setSelectedId(null); setShowForm(true); }}
        onOpenLinked={(type, it) => {
          const path = { Control: "/controls", KRI: "/kri-dashboard", Action: "/actions", Incident: "/incidents" }[type] || "/risk-register";
          const qq = it.control_ref || it.indicator || it.incident_ref || (it.description || "").slice(0, 60);
          setSelectedId(null);
          navigate(buildLink(path, { q: qq }));
        }}
        onClone={canCreate("Risk") ? cloneRisk : undefined}
        onDelete={deleteRisk}
        canEdit={canEdit("Risk", selectedRisk?.department)}
        canDelete={canDelete("Risk")}
        modifierName={personMap[selectedRisk?.last_modified_by]?.full_name}
        categoryName={nameOf(categories, selectedRisk?.category)?.name}
        departmentName={nameOf(departments, selectedRisk?.department)?.name}
        ownerName={personMap[selectedRisk?.owner]?.full_name || personMap[selectedRisk?.owner]?.email}
      />

      <RiskForm
        key={showForm ? (editingRisk?.id || "new") : "closed"}
        open={showForm}
        onClose={() => { setShowForm(false); setEditingRisk(null); }}
        onSave={saveRisk}
        risk={editingRisk}
        categories={categories}
        departments={departments}
        users={employees}
        parentOptions={risks}
        defaultTier={filters.tier}
        defaultDepartment={role === "department_head" ? myDeptId : undefined}
        lockDepartment={role === "department_head"}
        appetites={appetites}
        controls={controls}
      />

      <UploadRegisterDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        categories={categories}
        departments={departments}
        employees={employees}
        appetites={appetites}
        onImported={loadAll}
      />
    </div>
  );
}