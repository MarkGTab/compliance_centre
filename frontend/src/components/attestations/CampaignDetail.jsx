import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const statusBadge = {
  Pending: "bg-slate-100 text-slate-700",
  Completed: "bg-emerald-100 text-emerald-800",
  "Exception Raised": "bg-amber-100 text-amber-800",
  Overdue: "bg-red-100 text-red-800",
};

export default function CampaignDetail({ open, campaign, responses, personMap, onRaise, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{campaign?.title} — per-user responses</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs">
              <tr>
                <th className="px-2 py-1 text-left">User</th>
                <th className="px-2 py-1 text-left">Status</th>
                <th className="px-2 py-1 text-left">Response</th>
                <th className="px-2 py-1 text-left">Signed</th>
                <th className="px-2 py-1 text-left">Exception</th>
                <th className="px-2 py-1 text-left">Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => {
                const p = personMap[r.employee] || personMap[r.user];
                const needsFollowup =
                  r.response_type && r.response_type !== "Confirmed" && !r.linked_action && !r.linked_conflict;
                return (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-2 py-1">{p?.full_name || p?.email || "—"}</td>
                    <td className="px-2 py-1">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${statusBadge[r.status] || ""}`}>{r.status}</span>
                    </td>
                    <td className="px-2 py-1">{r.response_type || "—"}</td>
                    <td className="px-2 py-1 text-xs">
                      {r.signed_datetime ? new Date(r.signed_datetime).toLocaleString() : "—"}
                    </td>
                    <td className="px-2 py-1 text-xs max-w-[200px]">{r.exception_detail || "—"}</td>
                    <td className="px-2 py-1">
                      {needsFollowup ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => onRaise(r, "action")}>Raise Action</Button>
                          <Button size="sm" variant="outline" onClick={() => onRaise(r, "conflict")}>Raise COI</Button>
                        </div>
                      ) : r.linked_action || r.linked_conflict ? (
                        <span className="text-xs text-muted-foreground">linked</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {responses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">
                    No responses yet. Issue the campaign to create them.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}