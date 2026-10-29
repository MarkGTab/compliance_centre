import React from "react";
import { useNavigate } from "react-router-dom";
import { ListChecks, ArrowRight } from "lucide-react";
import { buildLink } from "@/lib/deeplink";
import { Button } from "@/components/ui/button";

export default function ActionsSummary({ actions }) {
  const navigate = useNavigate();
  const openHigh = actions.filter((a) => a.priority === "High" && a.status !== "Complete");
  const buckets = { "30-day": 0, "60-day": 0, "90-day": 0 };
  openHigh.forEach((a) => { if (buckets[a.bucket] != null) buckets[a.bucket] += 1; });
  const inProgress = openHigh.filter((a) => a.status === "In Progress").length;

  return (
    <div className="flex h-full flex-col rounded-md border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-semibold">
        <ListChecks className="h-4 w-4 text-primary" /> Open High-Priority Actions
      </div>
      <div className="flex flex-1 flex-col p-4">
        <button
          onClick={() => navigate(buildLink("/actions", { priority: "High", from: "/" }))}
          className="text-left"
          title="Open Actions Tracker filtered to high-priority"
        >
          <div className="text-4xl font-bold text-primary">{openHigh.length}</div>
          <div className="text-xs text-muted-foreground">high-priority actions open · {inProgress} in progress</div>
        </button>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {Object.entries(buckets).map(([k, v]) => (
            <button
              key={k}
              onClick={() => navigate(buildLink("/actions", { bucket: k, priority: "High", from: "/" }))}
              className="rounded border border-border bg-muted/30 py-1.5 hover:bg-muted"
              title={`Open ${k} high-priority actions`}
            >
              <div className="text-lg font-semibold">{v}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => navigate("/actions")} className="mt-4 w-full border-primary/40 text-primary hover:bg-primary/5">
          Open Actions Tracker <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}