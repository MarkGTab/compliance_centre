import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, Bell, AlertTriangle, FlaskConical } from "lucide-react";
import GlobalSearch from "@/components/search/GlobalSearch";
import { useAuth } from "@/lib/AuthContext";
import { getTestDataCounts } from "@/lib/test-data";
import { buildLink } from "@/lib/deeplink";

function days(dateStr, today) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000);
}

export default function TopBar() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [data, setData] = useState({ risks: [], actions: [], policies: [], insurance: [], boardActions: [] });
  const { user } = useAuth();
  const [testTotal, setTestTotal] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "admin") { setTestTotal(0); return; }
    let live = true;
    const poll = () => getTestDataCounts().then((c) => { if (live) setTestTotal(c.total || 0); }).catch(() => {});
    poll();
    const t = setInterval(poll, 300000);
    return () => { live = false; clearInterval(t); };
  }, [user]);

  useEffect(() => {
    let live = true;
    Promise.all([
      base44.entities.Risk.list("-created_date", 500),
      base44.entities.Action.list(),
      base44.entities.Policy.list(),
      base44.entities.InsurancePolicy.list(),
      base44.entities.BoardAction.list(),
    ]).then(([r, a, p, i, b]) => {
      if (live) setData({ risks: r, actions: a, policies: p, insurance: i, boardActions: b });
    }).catch(() => {});
    const u1 = base44.entities.Risk.subscribe(() => {});
    const u2 = base44.entities.Action.subscribe(() => {});
    return () => { live = false; u1(); u2(); };
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const overdue = useMemo(() => {
    const riskReviews = data.risks.filter((r) => r.next_review && r.next_review < today && r.status !== "Closed");
    const actions = data.actions.filter((a) => a.due_date && a.due_date < today && a.status !== "Complete");
    const policies = data.policies.filter((p) => p.next_review_date && p.next_review_date < today && p.status !== "Archived");
    const insurance = data.insurance.filter((p) => p.expiry_date && p.expiry_date < today && p.status !== "Archived");
    return { riskReviews, actions, policies, insurance, total: riskReviews.length + actions.length + policies.length + insurance.length };
  }, [data, today]);

  const notifications = useMemo(() => {
    const items = [];
    data.risks.forEach((r) => {
      const d = days(r.next_review, today);
      if (d === null) return;
      if (d < 0 && r.status !== "Closed") items.push({ sev: "red", text: `Risk review overdue: ${r.title}`, to: buildLink("/risk-register", { q: r.risk_ref || r.title }) });
      else if (d >= 0 && d <= 30 && r.status !== "Closed") items.push({ sev: "amber", text: `Risk review due in ${d}d: ${r.title}`, to: buildLink("/risk-register", { q: r.risk_ref || r.title }) });
    });
    data.actions.forEach((a) => {
      const d = days(a.due_date, today);
      if (d === null || a.status === "Complete") return;
      if (d < 0) items.push({ sev: "red", text: `Action overdue: ${a.description}`, to: buildLink("/actions", { q: (a.description||"").slice(0,60) }) });
      else if (d <= 7) items.push({ sev: "amber", text: `Action due in ${d}d: ${a.description}`, to: buildLink("/actions", { q: (a.description||"").slice(0,60) }) });
    });
    data.policies.forEach((p) => {
      const d = days(p.next_review_date, today);
      if (d === null || p.status === "Archived") return;
      if (d < 0) items.push({ sev: "red", text: `Policy review overdue: ${p.policy_name}`, to: buildLink("/policy-library", { q: p.policy_name }) });
      else if (d <= 60) items.push({ sev: "amber", text: `Policy review due in ${d}d: ${p.policy_name}`, to: buildLink("/policy-library", { q: p.policy_name }) });
    });
    data.insurance.forEach((p) => {
      const d = days(p.expiry_date, today);
      if (d === null || p.status === "Archived") return;
      if (d < 0) items.push({ sev: "red", text: `Insurance lapsed: ${p.policy_name}`, to: buildLink("/insurance-library", { q: p.policy_name }) });
      else if (d <= 60) items.push({ sev: "amber", text: `Insurance renewal due in ${d}d: ${p.policy_name}`, to: buildLink("/insurance-library", { q: p.policy_name }) });
    });
    data.boardActions.forEach((a) => {
      const d = days(a.due_date, today);
      if (d !== null && d < 0 && a.status !== "Complete") items.push({ sev: "red", text: `Board action overdue: ${a.description}`, to: buildLink("/board-actions", { q: (a.description||"").slice(0,60) }) });
    });
    return items.sort((x, y) => (x.sev === "red" ? 0 : 1) - (y.sev === "red" ? 0 : 1));
  }, [data, today]);

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white px-4 py-2 print:hidden">
      <button onClick={() => setSearchOpen(true)} className="flex flex-1 max-w-md items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
        <Search className="h-4 w-4" /> Search risks, policies, meetings, actions, controls…
      </button>
      <div className="ml-auto flex items-center gap-2">
        {testTotal > 0 && (
          <button onClick={() => navigate("/administration")} className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600" title="Test data is present — open Administration to wipe before go-live">
            <FlaskConical className="h-3.5 w-3.5" /> TEST DATA · {testTotal}
          </button>
        )}
        {overdue.total > 0 && (
          <button onClick={() => navigate("/my-work")} className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700" title="Total overdue items across the app">
            <AlertTriangle className="h-3.5 w-3.5" /> {overdue.total} overdue
          </button>
        )}
        <div className="relative">
          <button onClick={() => setBellOpen((o) => !o)} className="relative inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />}
          </button>
          {bellOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} />
              <div className="absolute right-0 z-40 mt-1 max-h-96 w-80 overflow-y-auto rounded-md border border-border bg-white p-2 shadow-lg">
                <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Notifications ({notifications.length})</div>
                {notifications.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">You're up to date.</div>
                ) : (
                  notifications.slice(0, 30).map((n, i) => (
                    <button key={i} onClick={() => { setBellOpen(false); navigate(n.to); }} className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted">
                      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.sev === "red" ? "bg-red-500" : "bg-amber-500"}`} />
                      <span>{n.text}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}