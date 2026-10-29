import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Download, Pencil } from "lucide-react";
import { complianceStyles } from "@/lib/gift-policy";

const REL_LABEL = "Counterparty relationship";

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}

function gbp(v) {
  if (v === null || v === undefined || v === "") return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(v));
}

export default function GiftDetail({ open, onClose, gift, users, conflicts, onEdit, canEdit }) {
  if (!gift) return null;
  const employee = users.find((u) => u.id === gift.employee);
  const approver = users.find((u) => u.id === gift.approver);
  const conflict = conflicts.find((c) => c.id === gift.linked_conflict);
  const compliance = gift.compliance_status || "Requires Review";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>Declaration {gift.declaration_ref || ""}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${complianceStyles[compliance] || ""}`}>
              {compliance || "Requires Review"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Policy test result — prominent */}
        <div className="rounded-md border-2 p-3" style={{ borderColor: compliance === "BREACH" ? "#ef4444" : compliance === "Requires Review" ? "#f59e0b" : "#10b981" }}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#DD5115" }}>
            <ShieldAlert className="h-4 w-4" /> Anti-bribery policy test result
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div><div className="text-muted-foreground">Type</div><div className="font-medium">{gift.type || "—"}</div></div>
            <div><div className="text-muted-foreground">Value</div><div className="font-medium">{gbp(gift.estimated_value)}</div></div>
            <div><div className="text-muted-foreground">Applicable threshold</div><div className="font-medium">{gift.applicable_threshold != null ? `£${gift.applicable_threshold}` : "—"}</div></div>
            <div><div className="text-muted-foreground">Approval required</div><div className="font-medium">{gift.prior_approval_required || "—"}</div></div>
            <div><div className="text-muted-foreground">Approval obtained</div><div className="font-medium">{gift.prior_approval_obtained || "—"}</div></div>
            <div><div className="text-muted-foreground">Governing policy</div><div className="font-medium">{gift.governing_policy_name ? `${gift.governing_policy_name}${gift.governing_policy_version ? ` v${gift.governing_policy_version}` : ""}` : "—"}</div></div>
          </div>
          {gift.cumulative_flag && (
            <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
              Cumulative flag: rolling 12-month total with this counterparty is {gbp(gift.cumulative_value)} — exceeds the cumulative limit set by the governing policy.
            </div>
          )}
        </div>

        {gift.submission_document && (
          <div className="flex items-center gap-2 rounded-md border border-border p-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            <a href={gift.submission_document} target="_blank" rel="noreferrer" className="text-sm text-primary underline">View submitted declaration form</a>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Direction" value={gift.direction} />
          <Field label="Date" value={gift.date} />
          <Field label="Employee" value={employee ? (employee.full_name || employee.email) : "—"} />
          <Field label="Counterparty" value={gift.counterparty} />
          <Field label={REL_LABEL} value={gift.counterparty_relationship} />
          <Field label="Approver" value={approver ? (approver.full_name || approver.email) : "—"} />
          <Field label="Approval date" value={gift.approval_date} />
          <Field label="Status" value={gift.status} />
          <Field label="Linked conflict" value={conflict ? (conflict.person || "—") : ""} />
        </div>
        <Field label="Description" value={gift.description} />
        <Field label="Purpose" value={gift.purpose} />
        <Field label="Mitigation notes" value={gift.mitigation_notes} />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canEdit && (
            <Button onClick={onEdit}><Pencil className="mr-1 h-4 w-4" /> Edit</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}