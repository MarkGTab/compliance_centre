import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { History, Search, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

const ENTITIES = ["Risk", "Control", "Action", "Incident", "Meeting", "Policy", "InsurancePolicy", "Decision", "BoardAction", "Appetite", "ConflictOfInterest", "ThirdParty", "EmergingRisk", "KRI", "Department", "RiskCategory"];
const ACTIONS = ["created", "updated", "deleted"];
const actionBadge = {
  created: "bg-emerald-100 text-emerald-800",
  updated: "bg-amber-100 text-amber-800",
  deleted: "bg-red-100 text-red-800",
};

function fmtStamp(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function val(v) {
  if (v == null) return "∅";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function Changes({ payload }) {
  let parsed = null;
  try {
    parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
  } catch {
    parsed = null;
  }
  if (!parsed) return null;
  if (parsed.changes) {
    if (!parsed.changes.length) return <span className="text-muted-foreground">No field changes detected.</span>;
    return (
      <div className="space-y-1">
        {parsed.changes.map((c, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 text-xs">
            <span className="col-span-3 font-mono text-muted-foreground">{c.field}</span>
            <span className="col-span-4 truncate text-red-700 line-through">{val(c.from) || "∅"}</span>
            <span className="col-span-1 text-center text-muted-foreground">→</span>
            <span className="col-span-4 truncate text-emerald-700">{val(c.to) || "∅"}</span>
          </div>
        ))}
      </div>
    );
  }
  if (parsed.snapshot) {
    const entries = Object.entries(parsed.snapshot).filter(([k]) => k !== "changes");
    if (!entries.length) return <span className="text-muted-foreground">Record created.</span>;
    return (
      <div className="grid grid-cols-12 gap-x-2 gap-y-1 text-xs">
        {entries.map(([k, v]) => (
          <React.Fragment key={k}>
            <span className="col-span-4 truncate font-mono text-muted-foreground">{k}</span>
            <span className="col-span-8 truncate">{val(v)}</span>
          </React.Fragment>
        ))}
      </div>
    );
  }
  return null;
}

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ entity: "", action: "", user: "", search: "" });
  const [open, setOpen] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, u] = await Promise.all([
        base44.entities.ChangeLog.list("-timestamp", 500),
        base44.entities.User.list(),
      ]);
      setLogs(l);
      setUsers(u);
    } catch (e) {
      console.error("audit trail load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    const unsub = base44.entities.ChangeLog.subscribe(() => load());
    return unsub;
  }, [load]);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const filtered = logs.filter((l) => {
    if (filters.entity && l.entity !== filters.entity) return false;
    if (filters.action && l.action !== filters.action) return false;
    if (filters.user && l.user !== filters.user) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = [l.record_ref, l.user_name, l.entity].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const sel = "h-8 rounded-md border border-border bg-white px-2 text-sm";

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <History className="h-5 w-5 text-primary" /> Audit Trail
          </h1>
          <p className="text-xs text-muted-foreground">
            Who changed what and when across every record — Risk, Control, Action, Incident, Meeting, Policy, Insurance, Decision and Board Action — evidence for auditors and funders.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-white p-3">
        <select
          className={sel}
          value={filters.entity}
          onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value }))}
        >
          <option value="">All entities</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          className={sel}
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          className={sel}
          value={filters.user}
          onChange={(e) => setFilters((f) => ({ ...f, user: e.target.value }))}
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
          ))}
        </select>
        <div className="relative ml-auto max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.search || ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search ref, user…"
            className="h-8 w-full rounded-md border border-border bg-white pl-7 pr-2 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} of {logs.length} entries</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-8 px-2 py-2" />
                <th className="px-3 py-2 text-left font-semibold">When</th>
                <th className="px-3 py-2 text-left font-semibold">User</th>
                <th className="px-3 py-2 text-left font-semibold">Action</th>
                <th className="px-3 py-2 text-left font-semibold">Entity</th>
                <th className="px-3 py-2 text-left font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <React.Fragment key={l.id}>
                  <tr
                    className="cursor-pointer border-t border-border hover:bg-muted/40"
                    onClick={() => toggle(l.id)}
                  >
                    <td className="px-2 py-2 text-muted-foreground">
                      {open[l.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{fmtStamp(l.timestamp)}</td>
                    <td className="px-3 py-2">{l.user_name || userMap[l.user]?.full_name || userMap[l.user]?.email || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${actionBadge[l.action] || ""}`}>{l.action}</span>
                    </td>
                    <td className="px-3 py-2">{l.entity}</td>
                    <td className="px-3 py-2 font-mono text-xs">{l.record_ref || l.record_id || "—"}</td>
                  </tr>
                  {open[l.id] && (
                    <tr className="bg-muted/20">
                      <td />
                      <td colSpan={5} className="px-3 py-3">
                        <div className="rounded-md border border-border bg-white p-3">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Change detail
                          </div>
                          <Changes payload={l.changes} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    No audit entries match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}