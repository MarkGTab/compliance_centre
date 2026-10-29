import React, { useEffect, useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import DocPrintLayout from "@/components/DocPrintLayout";
import DashboardHeatMap from "@/components/dashboard/DashboardHeatMap";
import PrincipalRisksTable from "@/components/dashboard/PrincipalRisksTable";
import OutOfAppetitePanel from "@/components/dashboard/OutOfAppetitePanel";
import KriStatusPanel from "@/components/dashboard/KriStatusPanel";
import ActionsSummary from "@/components/dashboard/ActionsSummary";
import { buildPrevScoreMap, formatDate, formatGbp } from "@/lib/risk-helpers";
import { buildPersonMap } from "@/lib/people";

const PERIOD_DAYS = 30;

const watchBadge = {
  Watching: "bg-sky-100 text-sky-800",
  Escalated: "bg-red-100 text-red-800",
  Monitoring: "bg-amber-100 text-amber-800",
  Closed: "bg-emerald-100 text-emerald-800",
};

export default function ErcPack() {
  const [risks, setRisks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [actions, setActions] = useState([]);
  const [kris, setKris] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [changeLogs, setChangeLogs] = useState([]);
  const [emerging, setEmerging] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c, u, a, k, inc, cl, er, emps] = await Promise.all([
        base44.entities.Risk.list("-created_date", 500),
        base44.entities.RiskCategory.list(),
        base44.entities.User.list(),
        base44.entities.Action.list(),
        base44.entities.KRI.list(),
        base44.entities.Incident.list("-created_date", 500),
        base44.entities.ChangeLog.list("-timestamp", 500),
        base44.entities.EmergingRisk.list("-created_date", 200),
        base44.entities.Employee.list(),
      ]);
      setRisks(r); setCategories(c); setUsers(u); setActions(a); setKris(k); setIncidents(inc); setChangeLogs(cl); setEmerging(er); setEmployees(emps);
    } catch (e) {
      console.error("ERC Pack load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

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

  const periodStart = new Date(); periodStart.setDate(periodStart.getDate() - PERIOD_DAYS); periodStart.setHours(0, 0, 0, 0);
  const newIncidents = incidents.filter((i) => i.created_date && new Date(i.created_date) >= periodStart);
  const closedIncidents = incidents.filter((i) => {
    const s = (i.remediation_status || "").toLowerCase();
    return s.includes("closed") || s.includes("resolved");
  });
  const openActions = actions.filter((a) => a.status !== "Complete");

  const asAt = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  const Section = ({ title, children }) => (
    <section className="break-inside-avoid rounded-md border border-border bg-white p-4 print:break-inside-avoid">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">{title}</h2>
      {children}
    </section>
  );

  return (
    <DocPrintLayout
      title="Enterprise Risk Committee Pack"
      subtitle={`TAB · Prepared for the ERC · reporting period: last ${PERIOD_DAYS} days`}
      asAt={asAt}
      orientation="portrait"
      maxW="1100px"
    >
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 print:block">
        <Section title="1 · Strategic Risk Heat Map (Residual)">
          <DashboardHeatMap risks={strategic} />
        </Section>
        <Section title="2 · Out of Appetite Risks">
          <OutOfAppetitePanel risks={enriched} />
        </Section>
      </div>

      <div className="mt-4 print:mt-3">
        <Section title="3 · Top 10 Strategic Risks — movement vs last review">
          <PrincipalRisksTable risks={strategic} prevScoreMap={prevScoreMap} />
        </Section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 print:block">
        <Section title="4 · KRI Status">
          <KriStatusPanel kris={kris} />
        </Section>
        <Section title="5 · Open Actions">
          <ActionsSummary actions={openActions} />
        </Section>
        <Section title="6 · Reviews Overdue / Upcoming">
          <ReviewsMini risks={enriched} />
        </Section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 print:block">
        <Section title={`7 · New Incidents (last ${PERIOD_DAYS} days)`}>
          <IncidentMini rows={newIncidents} />
        </Section>
        <Section title="8 · Closed / Resolved Incidents">
          <IncidentMini rows={closedIncidents} />
        </Section>
      </div>

      <div className="mt-4 print:mt-3">
        <Section title="9 · Emerging Risks — discussion point">
          <EmergingMini rows={emerging} ownerName={ownerName} />
        </Section>
      </div>

      <div className="mt-6 text-center text-[11px] text-muted-foreground print:mt-3">
        Source: TAB Strategic Risk Register · Generated {asAt}
      </div>
    </DocPrintLayout>
  );
}

function ReviewsMini({ risks }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = risks.filter((r) => r.next_review && r.status !== "Closed" && new Date(r.next_review) < today)
    .sort((a, b) => new Date(a.next_review) - new Date(b.next_review));
  const horizon = new Date(today); horizon.setDate(horizon.getDate() + 30);
  const upcoming = risks.filter((r) => r.next_review && r.status !== "Closed" && new Date(r.next_review) >= today && new Date(r.next_review) <= horizon)
    .sort((a, b) => new Date(a.next_review) - new Date(b.next_review));
  const Item = ({ r, od }) => (
    <li className="flex justify-between text-xs">
      <span className="truncate"><span className="font-mono text-muted-foreground">{r.risk_ref || ""} </span>{r.title}</span>
      <span className={od ? "font-semibold text-red-700" : "text-amber-700"}>{formatDate(r.next_review)}</span>
    </li>
  );
  return (
    <div className="space-y-2">
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase text-red-600">Overdue ({overdue.length})</div>
        <ul className="space-y-1">{overdue.length ? overdue.map((r) => <Item key={r.id} r={r} od />) : <li className="text-muted-foreground">None</li>}</ul>
      </div>
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase text-amber-600">Due ≤30d ({upcoming.length})</div>
        <ul className="space-y-1">{upcoming.length ? upcoming.map((r) => <Item key={r.id} r={r} />) : <li className="text-muted-foreground">None</li>}</ul>
      </div>
    </div>
  );
}

function IncidentMini({ rows }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">None this period.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-2 py-1 text-left">Ref</th>
            <th className="px-2 py-1 text-left">Date</th>
            <th className="px-2 py-1 text-left">Description</th>
            <th className="px-2 py-1 text-right">Impact</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id} className="border-t border-border">
              <td className="px-2 py-1 font-mono">{i.incident_ref || "—"}</td>
              <td className="px-2 py-1">{formatDate(i.date)}</td>
              <td className="px-2 py-1 truncate max-w-[260px]">{i.description}</td>
              <td className="px-2 py-1 text-right">{formatGbp(i.financial_impact)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmergingMini({ rows, ownerName }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">No emerging risks currently logged.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-2 py-1 text-left">Theme</th>
            <th className="px-2 py-1 text-left">Description</th>
            <th className="px-2 py-1 text-left">Potential Impact</th>
            <th className="px-2 py-1 text-left">Horizon</th>
            <th className="px-2 py-1 text-left">Owner</th>
            <th className="px-2 py-1 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-t border-border align-top">
              <td className="px-2 py-1 font-medium">{e.theme || "—"}</td>
              <td className="px-2 py-1 max-w-[280px]">{e.description || "—"}</td>
              <td className="px-2 py-1 max-w-[200px]">{e.potential_impact || "—"}</td>
              <td className="px-2 py-1">{e.likelihood_horizon || "—"}</td>
              <td className="px-2 py-1">{ownerName(e.owner) || "—"}</td>
              <td className="px-2 py-1"><span className={`rounded px-1.5 py-0.5 ${watchBadge[e.watch_status] || ""}`}>{e.watch_status || "—"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Discussion point — themes on the risk horizon that may warrant new entries in the Strategic, Operational or Departmental risk registers.
      </p>
    </div>
  );
}