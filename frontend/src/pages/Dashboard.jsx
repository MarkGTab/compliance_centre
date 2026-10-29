import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Building2, Printer, ArrowUpCircle } from "lucide-react";
import DashboardHeatMap from "@/components/dashboard/DashboardHeatMap";
import RagSummaryStrip from "@/components/dashboard/RagSummaryStrip";
import PrincipalRisksTable from "@/components/dashboard/PrincipalRisksTable";
import OutOfAppetitePanel from "@/components/dashboard/OutOfAppetitePanel";
import KriStatusPanel from "@/components/dashboard/KriStatusPanel";
import ReviewsPanel from "@/components/dashboard/ReviewsPanel";
import ActionsSummary from "@/components/dashboard/ActionsSummary";
import AwaitingEscalationPanel from "@/components/dashboard/AwaitingEscalationPanel";
import { buildPrevScoreMap } from "@/lib/risk-helpers";
import { buildPersonMap } from "@/lib/people";

const Panel = ({ title, icon: Icon, children, right }) => (
  <div className="rounded-md border border-border bg-white p-4">
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      {right}
    </div>
    {children}
  </div>
);

export default function Dashboard() {
  const [risks, setRisks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [actions, setActions] = useState([]);
  const [kris, setKris] = useState([]);
  const [changeLogs, setChangeLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c, u, a, k, cl, emps] = await Promise.all([
        base44.entities.Risk.list("-created_date", 500),
        base44.entities.RiskCategory.list(),
        base44.entities.User.list(),
        base44.entities.Action.list(),
        base44.entities.KRI.list(),
        base44.entities.ChangeLog.list("-timestamp", 500),
        base44.entities.Employee.list(),
      ]);
      setRisks(r); setCategories(c); setUsers(u); setActions(a); setKris(k); setChangeLogs(cl); setEmployees(emps);
    } catch (e) {
      console.error("Dashboard load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const u1 = base44.entities.Risk.subscribe(loadAll);
    const u2 = base44.entities.Action.subscribe(loadAll);
    const u3 = base44.entities.KRI.subscribe(loadAll);
    return () => { u1(); u2(); u3(); };
  }, [loadAll]);

  const nameOf = (list, id) => list.find((x) => x.id === id);
  const personMap = buildPersonMap(employees, users);
  const ownerName = (id) => { const p = personMap[id]; return p?.full_name || p?.email; };
  const catName = (id) => nameOf(categories, id)?.name;

  const enriched = useMemo(
    () => risks.map((r) => ({ ...r, categoryName: catName(r.category), ownerName: ownerName(r.owner) })),
    [risks, categories, employees, users]
  );
  const strategic = useMemo(() => enriched.filter((r) => r.tier === "Strategic"), [enriched]);
  const prevScoreMap = useMemo(() => buildPrevScoreMap(changeLogs), [changeLogs]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  const asAt = new Date().toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <header className="sticky top-0 z-10 border-b border-border bg-white print:static">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">TAB Risk Management</div>
              <div className="text-[11px] text-muted-foreground">Executive Risk Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/departments">Departments</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/risk-register">Risk Register</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print / Export
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Executive Risk Dashboard</h1>
            <p className="text-xs text-muted-foreground">As at {asAt} · TAB · Prepared for the Board Risk Committee</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/risk-register?new=1">Log a risk</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/policy-library?new=1">Add a policy</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/board-governance?new=1">Minute a meeting</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/actions">Raise an action</Link></Button>
          </div>
        </div>

        {/* RAG summary strip */}
        <RagSummaryStrip risks={enriched} />

        {/* Heat map + Out of appetite */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Strategic Risk Heat Map (Residual)" icon={Building2}>
            <DashboardHeatMap risks={strategic} />
          </Panel>
          <OutOfAppetitePanel risks={enriched} />
        </div>

        {/* Awaiting escalation */}
        <div className="mt-4">
          <Panel title="Awaiting Escalation" icon={ArrowUpCircle}>
            <AwaitingEscalationPanel risks={enriched} />
          </Panel>
        </div>

        {/* Top 10 strategic risks */}
        <div className="mt-4">
          <Panel title="Top 10 Strategic Risks" icon={Building2}>
            <PrincipalRisksTable risks={strategic} prevScoreMap={prevScoreMap} />
          </Panel>
        </div>

        {/* KRI / Reviews / Actions */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <KriStatusPanel kris={kris} />
          <ReviewsPanel risks={enriched} />
          <ActionsSummary actions={actions} />
        </div>

        <div className="mt-6 text-center text-[11px] text-muted-foreground">
          Source: TAB Strategic Risk Register · Generated {asAt}
        </div>
      </main>
    </div>
  );
}