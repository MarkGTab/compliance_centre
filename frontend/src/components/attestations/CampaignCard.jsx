import React from "react";
import { Button } from "@/components/ui/button";

const statusBadge = {
  Draft: "bg-muted text-muted-foreground",
  Active: "bg-emerald-100 text-emerald-800",
  Closed: "bg-slate-200 text-slate-700",
};

export default function CampaignCard({ campaign, stats, onOpen, onIssue, onCloseCampaign, canManage }) {
  const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const rag =
    campaign.status === "Active"
      ? stats.completed === stats.total && stats.total > 0
        ? "green"
        : stats.overdue > 0
        ? "red"
        : "amber"
      : "grey";
  const ragColor = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    grey: "bg-slate-300",
  }[rag];

  return (
    <div
      onClick={onOpen}
      className="cursor-pointer rounded-lg border border-border bg-card p-4 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${ragColor}`} />
            <h3 className="truncate font-semibold">{campaign.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {campaign.type} · Ref {campaign.campaign_ref || "—"}
          </p>
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${statusBadge[campaign.status] || ""}`}>
          {campaign.status}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: pct + "%" }} />
        </div>
        <span className="text-xs font-medium">{stats.completed}/{stats.total} · {pct}%</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Due: {campaign.due_date || "—"}</span>
        <span className="text-red-600">Overdue: {stats.overdue}</span>
        <span className="text-amber-700">Exceptions: {stats.exceptions}</span>
        <span>Frequency: {campaign.frequency}</span>
      </div>

      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Button variant="outline" size="sm" onClick={onOpen}>View responses</Button>
        {canManage && campaign.status === "Draft" && (
          <Button size="sm" onClick={onIssue} disabled={false}>Issue & notify</Button>
        )}
        {canManage && campaign.status === "Active" && (
          <Button variant="outline" size="sm" onClick={onCloseCampaign}>Close</Button>
        )}
      </div>
    </div>
  );
}