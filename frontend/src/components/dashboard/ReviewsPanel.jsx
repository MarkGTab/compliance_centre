import React from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { buildLink } from "@/lib/deeplink";
import { formatDate } from "@/lib/risk-helpers";

const daysBetween = (a, b) => Math.round((a - b) / 86400000);

export default function ReviewsPanel({ risks }) {
  const navigate = useNavigate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const horizon = new Date(today); horizon.setDate(horizon.getDate() + 30);

  const withReview = risks.filter((r) => r.next_review && r.status !== "Closed");
  const overdue = withReview
    .filter((r) => new Date(r.next_review) < today)
    .sort((a, b) => new Date(a.next_review) - new Date(b.next_review));
  const upcoming = withReview
    .filter((r) => { const d = new Date(r.next_review); return d >= today && d <= horizon; })
    .sort((a, b) => new Date(a.next_review) - new Date(b.next_review));

  const Row = ({ r, overdue: od }) => (
    <li>
      <button
        onClick={() => navigate(buildLink("/risk-register", { q: r.risk_ref || r.title, from: "/" }))}
        className="flex w-full items-center justify-between gap-2 rounded border border-border px-3 py-1.5 text-left text-sm hover:bg-muted/40"
      >
        <span className="truncate">
          <span className="font-mono text-xs text-muted-foreground">{r.risk_ref || ""} </span>
          <span className="font-medium">{r.title}</span>
        </span>
        <span className={`whitespace-nowrap text-xs font-semibold ${od ? "text-red-700" : "text-amber-700"}`}>
          {formatDate(r.next_review)}
          <span className="ml-1 text-muted-foreground">({od ? `${Math.abs(daysBetween(new Date(r.next_review), today))}d over` : `in ${daysBetween(new Date(r.next_review), today)}d`})</span>
        </span>
      </button>
    </li>
  );

  return (
    <div className="flex h-full flex-col rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-4 w-4 text-primary" /> Overdue &amp; Upcoming Reviews
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{overdue.length + upcoming.length}</span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-600">Overdue ({overdue.length})</div>
        {overdue.length === 0 ? <p className="mb-3 text-xs text-muted-foreground">None overdue.</p> :
          <ul className="mb-3 space-y-1.5">{overdue.map((r) => <Row key={r.id} r={r} overdue />)}</ul>}
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600">Due within 30 days ({upcoming.length})</div>
        {upcoming.length === 0 ? <p className="text-xs text-muted-foreground">None due soon.</p> :
          <ul className="space-y-1.5">{upcoming.map((r) => <Row key={r.id} r={r} />)}</ul>}
      </div>
    </div>
  );
}