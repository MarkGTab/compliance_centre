import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Field from "@/components/registers/Field";
import { ROLE_LABELS } from "@/lib/access";

const TYPES = [
  "Policy Attestation",
  "Conflicts of Interest Declaration",
  "Gifts & Hospitality Nil Return",
  "Code of Conduct",
  "SMCR Conduct Rules",
  "Fitness & Propriety",
  "Control Owner Sign-off",
  "Risk Owner Sign-off",
  "Training Confirmation",
  "Other",
];
const FREQ = ["One-off", "Monthly", "Quarterly", "Annual"];
const ROLES = Object.keys(ROLE_LABELS);

export default function CampaignForm({ open, initial, lookups, onSave, onClose }) {
  const [data, setData] = useState(initial || {});
  useEffect(() => {
    setData(initial || {});
  }, [initial, open]);
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const fields = [
    { key: "campaign_ref", label: "Campaign Ref", type: "text", placeholder: "auto-generated if blank" },
    { key: "title", label: "Title", required: true },
    { key: "type", label: "Type", type: "select", options: TYPES },
    { key: "statement", label: "Statement (the declaration the responder confirms)", type: "textarea", rows: 4 },
    {
      key: "linked_policy",
      label: "Linked Policy",
      type: "select",
      options: lookups.policies.map((p) => ({ value: p.id, label: p.policy_name })),
    },
    {
      key: "linked_control",
      label: "Linked Control",
      type: "select",
      options: lookups.controls.map((c) => ({ value: c.id, label: c.control_ref || c.description })),
    },
    {
      key: "linked_risk",
      label: "Linked Risk",
      type: "select",
      options: lookups.risks.map((r) => ({ value: r.id, label: r.title })),
    },
    {
      key: "audience",
      label: "Audience (specific employees)",
      type: "multiselect",
      options: lookups.employees.map((e) => ({ value: e.id, label: e.full_name || e.email })),
    },
    {
      key: "audience_departments",
      label: "Audience (departments — all members included)",
      type: "multiselect",
      options: lookups.departments.map((d) => ({ value: d.id, label: d.name })),
    },
    { key: "audience_roles", label: "Audience (roles)", type: "multiselect", options: ROLES },
    { key: "allow_exceptions", label: "Allow Exceptions", type: "select", options: ["Yes", "No"] },
    { key: "frequency", label: "Frequency", type: "select", options: FREQ },
    { key: "issue_date", label: "Issue Date", type: "date" },
    { key: "due_date", label: "Due Date", type: "date" },
    {
      key: "owner",
      label: "Owner (Compliance / CRO)",
      type: "select",
      options: lookups.employees.map((e) => ({ value: e.id, label: e.full_name || e.email })),
    },
    { key: "status", label: "Status", type: "select", options: ["Draft", "Active", "Closed"] },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Campaign" : "New Attestation Campaign"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <Field key={f.key} field={f} value={data[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(data)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}