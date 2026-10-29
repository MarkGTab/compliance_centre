import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, ShieldAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  GIFT_TYPES,
  DIRECTIONS,
  RELATIONSHIPS,
  APPROVAL_OBTAINED,
  DECLARATION_STATUSES,
  complianceStyles,
  derivePolicyTest,
  policySnapshot,
} from "@/lib/gift-policy";

const EMPTY = {
  declaration_ref: "",
  submission_document: "",
  type: "Gift",
  direction: "Received",
  employee: "",
  counterparty: "",
  counterparty_relationship: "",
  description: "",
  purpose: "",
  estimated_value: "",
  date: "",
  prior_approval_required: "No",
  prior_approval_obtained: "N/A",
  approver: "",
  approval_date: "",
  compliance_status: "",
  mitigation_notes: "",
  linked_conflict: "",
  status: "Submitted",
};

export default function GiftForm({ open, onClose, onSave, users, conflicts, gift, governingPolicy }) {
  const [form, setForm] = useState(EMPTY);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setForm(gift ? { ...EMPTY, ...gift } : EMPTY);
    setExtracted(false);
  }, [gift, open]);

  const policy = useMemo(() => derivePolicyTest(form, governingPolicy), [form, governingPolicy]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, submission_document: file_url }));
      const res = await base44.integrations.Core.InvokeLLM({
        prompt:
          "Extract fields from this TAB Gifts & Hospitality declaration form and return as JSON. " +
          "direction: 'Received' or 'Given'. counterparty_relationship: exactly one of 'Client/Borrower','Broker/Introducer','Supplier/Vendor','Professional Adviser','Other'. " +
          "estimated_value: numeric value in GBP. date: YYYY-MM-DD. prior_approval_obtained: 'Yes' or 'No' (whether prior approval was obtained, per the form; null if not stated). " +
          "employee: full name of the TAB employee. counterparty: the external person/organisation. description: what the gift/hospitality was. purpose: the occasion/rationale. " +
          "If a field is absent return null.",
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            direction: { type: "string" },
            employee: { type: "string" },
            counterparty: { type: "string" },
            counterparty_relationship: { type: "string" },
            description: { type: "string" },
            purpose: { type: "string" },
            estimated_value: { type: "number" },
            date: { type: "string" },
            prior_approval_obtained: { type: "string" },
          },
        },
      });
      const d = res || {};
      setForm((f) => {
        const updated = {
          ...f,
          direction: DIRECTIONS.includes(d.direction) ? d.direction : f.direction,
          counterparty: d.counterparty || f.counterparty,
          counterparty_relationship: RELATIONSHIPS.includes(d.counterparty_relationship)
            ? d.counterparty_relationship
            : f.counterparty_relationship,
          description: d.description || f.description,
          purpose: d.purpose || f.purpose,
          estimated_value: typeof d.estimated_value === "number" ? d.estimated_value : f.estimated_value,
          date: d.date || f.date,
          prior_approval_obtained: ["Yes", "No"].includes(d.prior_approval_obtained)
            ? d.prior_approval_obtained
            : f.prior_approval_obtained,
        };
        if (d.employee) {
          const match = users.find((u) =>
            (u.full_name || "").toLowerCase().includes(String(d.employee).toLowerCase())
          );
          if (match) updated.employee = match.id;
        }
        return updated;
      });
      setExtracted(true);
    } catch (err) {
      alert("Extraction failed: " + (err.message || err) + ". You can fill the fields manually.");
    } finally {
      setExtracting(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      estimated_value: policy.value ?? "",
      prior_approval_required: policy.prior_approval_required,
      prior_approval_obtained: policy.prior_approval_obtained,
      compliance_status: policy.compliance_status,
      ...policySnapshot(governingPolicy, form.type),
    });
  };

  const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  const approvalDisabled = policy.prior_approval_required === "No";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{gift ? "Edit Declaration" : "New Gifts & Hospitality Declaration"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="rounded-md border border-dashed border-border p-3">
            <Label className="mb-1 block text-xs font-medium">Declaration form (PDF / Word)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {gift ? "Replace document" : "Upload & extract"}
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={onFile} />
              </label>
              {form.submission_document && (
                <a href={form.submission_document} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View uploaded</a>
              )}
              {extracted && <span className="text-xs text-emerald-700">Fields auto-filled — please review before saving.</span>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium">Type</Label>
              <select className={input} value={form.type} onChange={(e) => set("type", e.target.value)}>
                {GIFT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium">Direction</Label>
              <select className={input} value={form.direction} onChange={(e) => set("direction", e.target.value)}>
                {DIRECTIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium">Date</Label>
              <input type="date" className={input} value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium">Employee (TAB person)</Label>
            <select className={input} value={form.employee} onChange={(e) => set("employee", e.target.value)}>
              <option value="">—</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium">Counterparty</Label>
              <input className={input} value={form.counterparty} onChange={(e) => set("counterparty", e.target.value)} placeholder="External person / organisation" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium">Counterparty relationship</Label>
              <select className={input} value={form.counterparty_relationship} onChange={(e) => set("counterparty_relationship", e.target.value)}>
                <option value="">—</option>
                {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium">Description</Label>
            <input className={input} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What the gift / hospitality was" />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium">Purpose</Label>
            <input className={input} value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="Occasion / rationale" />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium">Estimated value (GBP)</Label>
            <input type="number" step="0.01" className={input} value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value === "" ? "" : Number(e.target.value))} />
          </div>

          {/* Policy test */}
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold" style={{ color: "#DD5115" }}>
              <ShieldAlert className="h-4 w-4" /> Anti-bribery policy test
            </div>
            {!governingPolicy && (
              <div className="mb-2 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">
                No governing anti-bribery policy set — limits not configured. Compliance cannot be tested; the declaration will be recorded as “Requires Review”.
              </div>
            )}
            {governingPolicy && policy.absoluteLimit !== null && (
              <div className="mb-2 text-[11px] text-muted-foreground">
                Absolute prohibition limit: £{policy.absoluteLimit} — items at or above this value are always a BREACH regardless of approval.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">{form.type} approval threshold</div>
                <div className="font-medium">
                  {policy.thresholdConfigured ? `£${policy.threshold}` : <span className="text-red-600">Not configured</span>}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Prior approval required</div>
                <div className="font-medium">{policy.prior_approval_required}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Prior approval obtained</div>
                <select className={input} disabled={approvalDisabled} value={policy.prior_approval_obtained} onChange={(e) => set("prior_approval_obtained", e.target.value)}>
                  {APPROVAL_OBTAINED.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <div className="text-muted-foreground">Compliance status</div>
                <span className={`mt-0.5 inline-block rounded px-2 py-0.5 text-xs font-semibold ${complianceStyles[policy.compliance_status] || ""}`}>
                  {policy.compliance_status || "Requires Review"}
                </span>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-medium">Approver</Label>
                <select className={input} value={form.approver} onChange={(e) => set("approver", e.target.value)} disabled={approvalDisabled}>
                  <option value="">—</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium">Approval date</Label>
                <input type="date" className={input} value={form.approval_date} onChange={(e) => set("approval_date", e.target.value)} disabled={approvalDisabled} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium">Status</Label>
              <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {DECLARATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium">Linked conflict (optional)</Label>
              <select className={input} value={form.linked_conflict} onChange={(e) => set("linked_conflict", e.target.value)}>
                <option value="">—</option>
                {conflicts.map((c) => <option key={c.id} value={c.id}>{c.person || "—"}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium">Mitigation notes</Label>
            <textarea className="min-h-[60px] w-full rounded-md border border-input bg-background p-2 text-sm" value={form.mitigation_notes} onChange={(e) => set("mitigation_notes", e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{gift ? "Save Changes" : "Record Declaration"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}