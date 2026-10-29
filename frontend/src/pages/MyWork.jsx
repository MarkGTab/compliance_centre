import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Briefcase } from "lucide-react";
import { buildLink } from "@/lib/deeplink";

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function MyWork() {
  const [me, setMe] = useState(null);
  const [risks, setRisks] = useState([]);
  const [boardActions, setBoardActions] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [actions, setActions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r, b, p, i, a, emps] = await Promise.all([
      base44.auth.me(),
      base44.entities.Risk.list("-created_date", 500),
      base44.entities.BoardAction.list("-created_date", 1000),
      base44.entities.Policy.list(),
      base44.entities.InsurancePolicy.list(),
      base44.entities.Action.list(),
      base44.entities.Employee.list()]
      );
      setMe(m);setRisks(r);setBoardActions(b);setPolicies(p);setInsurance(i);setActions(a);setEmployees(emps);
    } catch (e) {console.error(e);} finally {setLoading(false);}
  }, []);
  useEffect(() => {
    load();
    const u1 = base44.entities.Risk.subscribe(load);
    const u2 = base44.entities.BoardAction.subscribe(load);
    return () => {u1();u2();};
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const myEmpId = (employees.find((e) => e.linked_user === me?.id) || {}).id || null;
  const myRisks = useMemo(() => risks.filter((r) => r.owner === myEmpId), [risks, me]);
  const myBoardActions = useMemo(() => boardActions.filter((a) => a.assignee === myEmpId && a.status !== "Complete"), [boardActions, me]);
  const myPoliciesDue = useMemo(() => policies.filter((p) => p.owner === myEmpId && p.next_review_date && p.status !== "Archived" && p.next_review_date <= addDays(today, 60)).sort((a, b) => a.next_review_date.localeCompare(b.next_review_date)), [policies, me, today]);
  const myInsuranceDue = useMemo(() => insurance.filter((p) => p.owner === myEmpId && p.expiry_date && p.status !== "Archived" && p.expiry_date <= addDays(today, 60)).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)), [insurance, me, today]);

  const myOverdue = useMemo(() => {
    const items = [];
    myRisks.forEach((r) => {if (r.next_review && r.next_review < today && r.status !== "Closed") items.push({ text: `Risk review overdue: ${r.title}`, to: buildLink("/risk-register", { q: r.risk_ref || r.title, from: "/my-work" }) });});
    actions.filter((a) => a.owner === myEmpId).forEach((a) => {if (a.due_date && a.due_date < today && a.status !== "Complete") items.push({ text: `Action overdue: ${a.description}`, to: buildLink("/actions", { q: (a.description||"").slice(0,60), from: "/my-work" }) });});
    myBoardActions.forEach((a) => {if (a.due_date && a.due_date < today) items.push({ text: `Board action overdue: ${a.description}`, to: buildLink("/board-actions", { q: (a.description||"").slice(0,60), from: "/my-work" }) });});
    myPoliciesDue.forEach((p) => {if (p.next_review_date < today) items.push({ text: `Policy review overdue: ${p.policy_name}`, to: buildLink("/policy-library", { q: p.policy_name, from: "/my-work" }) });});
    myInsuranceDue.forEach((p) => {if (p.expiry_date < today) items.push({ text: `Insurance lapsed: ${p.policy_name}`, to: buildLink("/insurance-library", { q: p.policy_name, from: "/my-work" }) });});
    return items;
  }, [myRisks, myBoardActions, myPoliciesDue, myInsuranceDue, actions, me, today]);

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  if (!me) return <div className="py-16 text-center text-muted-foreground">Sign in to see your work.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold"><Briefcase className="h-5 w-5 text-primary mx-1" /> My Work</h1>
        <p className="text-xs text-muted-foreground">Everything on {me.full_name || me.email}'s plate — one place</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={`My risks (${myRisks.length})`} to="/risk-register" items={myRisks.map((r) => ({ text: r.title, sub: `Review ${r.next_review || "—"}`, to: buildLink("/risk-register", { q: r.risk_ref || r.title, from: "/my-work" }) }))} />
        <Card title={`My board actions (${myBoardActions.length})`} to="/my-board-actions" items={myBoardActions.map((a) => ({ text: a.description, sub: `Due ${a.due_date || "—"}`, to: buildLink("/my-board-actions", { q: (a.description||"").slice(0,60), from: "/my-work" }) }))} />
        <Card title={`My policies due (${myPoliciesDue.length})`} to="/policy-library" items={myPoliciesDue.map((p) => ({ text: p.policy_name, sub: `Review ${p.next_review_date}`, to: buildLink("/policy-library", { q: p.policy_name, from: "/my-work" }) }))} />
        <Card title={`My insurance renewals due (${myInsuranceDue.length})`} to="/insurance-library" items={myInsuranceDue.map((p) => ({ text: p.policy_name, sub: `Expiry ${p.expiry_date}`, to: buildLink("/insurance-library", { q: p.policy_name, from: "/my-work" }) }))} />
        <Card title={`My overdue items (${myOverdue.length})`} to="/my-work" items={myOverdue} red />
      </div>
    </div>);

}

function Card({ title, to, items, red }) {
  return (
    <div className={`rounded-md border bg-white p-4 ${red && items.length ? "border-red-300" : "border-border"}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <Link to={to} className="text-xs text-primary">Open</Link>
      </div>
      {items.length === 0 ?
      <div className="text-xs text-muted-foreground">Nothing here.</div> :

      <ul className="space-y-1.5 text-sm">
          {items.map((it, i) =>
        <li key={i}>
              {it.to ? (
                <Link to={it.to} className="block rounded px-1 py-0.5 -mx-1 hover:bg-muted">
                  <div className="font-medium">{it.text}</div>
                  {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
                </Link>
              ) : (
                <>
                  <div className="font-medium">{it.text}</div>
                  {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
                </>
              )}
            </li>
        )}
        </ul>
      }
    </div>);

}