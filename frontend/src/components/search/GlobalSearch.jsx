import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Search } from "lucide-react";

export default function GlobalSearch({ open, onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open) { setQ(""); return; }
    let live = true;
    Promise.all([
      base44.entities.Risk.list("-created_date", 500),
      base44.entities.Policy.list(),
      base44.entities.Meeting.list("-date", 500),
      base44.entities.Action.list(),
      base44.entities.Control.list(),
    ]).then(([r, p, m, a, c]) => {
      if (live) setData({ risks: r, policies: p, meetings: m, actions: a, controls: c });
    }).catch(() => {});
    return () => { live = false; };
  }, [open]);

  const results = useMemo(() => {
    if (!data) return [];
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const match = (s) => (s || "").toLowerCase().includes(query);
    const out = [];
    data.risks.filter((r) => match(r.title) || match(r.risk_ref) || match(r.description)).slice(0, 5)
      .forEach((r) => out.push({ type: "Risk", label: r.title, sub: r.risk_ref, to: "/risk-register" }));
    data.policies.filter((p) => match(p.policy_name)).slice(0, 5)
      .forEach((p) => out.push({ type: "Policy", label: p.policy_name, sub: p.status, to: "/policy-library" }));
    data.meetings.filter((m) => match(m.title)).slice(0, 5)
      .forEach((m) => out.push({ type: "Meeting", label: m.title, sub: `${m.committee} · ${m.date}`, to: `/board-governance/meeting/${m.id}` }));
    data.actions.filter((a) => match(a.description)).slice(0, 5)
      .forEach((a) => out.push({ type: "Action", label: a.description, sub: a.status, to: "/actions" }));
    data.controls.filter((c) => match(c.description) || match(c.control_ref)).slice(0, 5)
      .forEach((c) => out.push({ type: "Control", label: c.description, sub: c.control_ref, to: "/controls" }));
    return out;
  }, [data, q]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search risks, policies, meetings, actions, controls…" className="h-8 flex-1 bg-transparent text-sm focus:outline-none" />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {!q.trim() ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">Type to search across the whole app.</div>
          ) : results.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">No matches.</div>
          ) : (
            results.map((r, i) => (
              <button key={i} onClick={() => { onClose(); navigate(r.to); }} className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-muted">
                <div><div className="font-medium">{r.label}</div><div className="text-xs text-muted-foreground">{r.sub || r.type}</div></div>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{r.type}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}