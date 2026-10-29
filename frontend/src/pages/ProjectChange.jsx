import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Rocket, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScoreChip from "@/components/risk/ScoreChip";
import RagDot from "@/components/risk/RagDot";
import { escalationTarget } from "@/lib/risk-helpers";
import { auditUpdate } from "@/lib/audit";
import { useAccess } from "@/lib/access";

export default function ProjectChange() {
  const [risks, setRisks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, canEdit } = useAccess();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c, u] = await Promise.all([
        base44.entities.Risk.list("-created_date", 500),
        base44.entities.RiskCategory.list(),
        base44.entities.User.list(),
      ]);
      setRisks(r); setCategories(c); setUsers(u);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const u = base44.entities.Risk.subscribe(load);
    return u;
  }, [load]);

  const nameOf = (list, id) => list.find((x) => x.id === id);
  const catName = (id) => nameOf(categories, id)?.name;
  const ownerName = (id) => nameOf(users, id)?.full_name || nameOf(users, id)?.email;

  const projectRisks = useMemo(() => risks.filter((r) => r.tier === "Project & Change"), [risks]);

  const initiatives = useMemo(() => {
    const map = {};
    projectRisks.forEach((r) => {
      const key = r.initiative || "Unassigned initiative";
      if (!map[key]) map[key] = { name: key, risks: [], status: "Closed" };
      map[key].risks.push(r);
      if (r.project_status === "Active") map[key].status = "Active";
    });
    return Object.values(map);
  }, [projectRisks]);

  const active = initiatives.filter((i) => i.status === "Active").sort((a, b) => a.name.localeCompare(b.name));
  const closed = initiatives.filter((i) => i.status === "Closed").sort((a, b) => a.name.localeCompare(b.name));

  const closeInitiative = async (init) => {
    const openRisks = init.risks.filter((r) => r.status !== "Closed");
    if (openRisks.length) {
      const ok = window.confirm(
        `"${init.name}" has ${openRisks.length} still-open risk(s). They should be escalated to the Operational register before closing.\n\nClose initiative anyway?`
      );
      if (!ok) return;
    }
    try {
      for (const r of init.risks) {
        await auditUpdate("Risk", r.id, { ...r, project_status: "Closed" }, r, user);
      }
    } catch (e) {
      alert("Close failed: " + (e.message || e));
    }
  };

  const escalate = (r) => {
    const target = escalationTarget(r.tier) || "Operational";
    window.alert(
      `Escalate "${r.title}" to the ${target} register.\n\nOpen the risk in the Risk Register and set its parent to a ${target} risk (New/Edit Risk form prompts for the escalation parent).`
    );
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Rocket className="h-5 w-5 text-primary" /> Project &amp; Change Registers</h1>
          <p className="text-xs text-muted-foreground">Level 4 · Owner: Project / Programme Lead · Review: per milestone · escalate up to Operational (L2)</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/risk-register?new=1">+ New project risk</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Project risks" value={projectRisks.length} />
        <Stat label="Initiatives" value={initiatives.length} />
        <Stat label="Active initiatives" value={active.length} />
        <Stat label="Closed initiatives" value={closed.length} />
      </div>

      <Section title="Active Initiatives" count={active.length}>
        {active.length === 0 ? <Empty msg="No active initiatives." /> : active.map((init) => (
          <InitiativeCard key={init.name} init={init} catName={catName} ownerName={ownerName} canEdit={canEdit("Risk")} onClose={closeInitiative} onEscalate={escalate} />
        ))}
      </Section>

      <Section title="Closed Initiatives" count={closed.length} muted>
        {closed.length === 0 ? <Empty msg="No closed initiatives." /> : closed.map((init) => (
          <InitiativeCard key={init.name} init={init} catName={catName} ownerName={ownerName} canEdit={false} />
        ))}
      </Section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function Section({ title, count, muted, children }) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <FolderGit2 className="h-4 w-4 text-primary" /> {title} <span className="text-muted-foreground">({count})</span>
      </div>
      <div className={muted ? "opacity-70" : ""}>{children}</div>
    </div>
  );
}

function Empty({ msg }) {
  return <p className="text-xs text-muted-foreground">{msg}</p>;
}

function InitiativeCard({ init, catName, ownerName, canEdit, onClose, onEscalate }) {
  return (
    <div className="mb-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{init.name}</span>
          <span className={`rounded border px-1.5 py-0.5 text-xs ${init.status === "Active" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-50 text-slate-600"}`}>{init.status}</span>
          <span className="text-xs text-muted-foreground">{init.risks.length} risk{init.risks.length === 1 ? "" : "s"}</span>
        </div>
        {canEdit && onClose && (
          <button onClick={() => onClose(init)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
            Close initiative
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 py-1 text-left font-semibold">Ref</th>
              <th className="px-2 py-1 text-left font-semibold">Risk</th>
              <th className="px-2 py-1 text-left font-semibold">Category</th>
              <th className="px-2 py-1 text-left font-semibold">Owner</th>
              <th className="px-2 py-1 text-center font-semibold">Res.</th>
              <th className="px-2 py-1 text-center font-semibold">App.</th>
              <th className="px-2 py-1 text-left font-semibold">Status</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {init.risks.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-1 font-mono text-xs text-muted-foreground">{r.risk_ref || "—"}</td>
                <td className="px-2 py-1 font-medium">{r.title}</td>
                <td className="px-2 py-1 text-muted-foreground">{catName(r.category) || "—"}</td>
                <td className="px-2 py-1 text-muted-foreground">{ownerName(r.owner) || "—"}</td>
                <td className="px-2 py-1 text-center"><ScoreChip score={r.residual_score} /></td>
                <td className="px-2 py-1 text-center"><RagDot value={r.appetite_status} /></td>
                <td className="px-2 py-1 text-muted-foreground">{r.status}</td>
                <td className="px-2 py-1 text-right">
                  {canEdit && onEscalate && !r.parent_risk && r.appetite_status === "Red" && (
                    <button onClick={() => onEscalate(r)} className="text-xs text-primary hover:underline">Escalate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}