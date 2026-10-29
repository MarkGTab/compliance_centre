import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const COVER_TYPES = ["PI", "D&O", "Cyber", "Buildings", "Contents", "Employers' Liability", "Public Liability", "Key Person", "Other"];
const FREQS = ["Annual", "Other"];
const STATUSES = ["Active", "Due for Renewal", "Lapsed", "Archived"];

const blank = {
  policy_name: "", cover_type: "", insurer: "", broker: "", policy_number: "", purpose: "",
  limit_of_indemnity: "", excess: "", premium: "", key_exclusions: "", inception_date: "",
  expiry_date: "", renewal_frequency: "Annual", status: "Active", owner: "", policy_document: "",
  summary: "", linked_risks: [],
};
const fromPolicy = (policy) => ({
  policy_name: policy.policy_name || "", cover_type: policy.cover_type || "", insurer: policy.insurer || "",
  broker: policy.broker || "", policy_number: policy.policy_number || "", purpose: policy.purpose || "",
  limit_of_indemnity: policy.limit_of_indemnity ?? "", excess: policy.excess ?? "", premium: policy.premium ?? "",
  key_exclusions: policy.key_exclusions || "", inception_date: policy.inception_date || "",
  expiry_date: policy.expiry_date || "", renewal_frequency: policy.renewal_frequency || "Annual",
  status: policy.status || "Active", owner: policy.owner || "", policy_document: policy.policy_document || "",
  summary: policy.summary || "", linked_risks: policy.linked_risks || [],
});

export default function InsuranceForm({ open, onClose, onSave, users, risks, policy }) {
  const [form, setForm] = useState(() => (policy ? fromPolicy(policy) : { ...blank }));
  // Reseed the form whenever the dialog is opened or the target policy changes
  useEffect(() => {
    if (open) setForm(policy ? fromPolicy(policy) : { ...blank });
  }, [open, policy]);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, policy_document: file_url }));
      const res = await base44.integrations.Core.InvokeLLM({
        prompt:
          "Extract the following fields from this insurance schedule/certificate and return as JSON. If a field is absent return null. cover_type must be exactly one of: 'PI','D&O','Cyber','Buildings','Contents','Employers' Liability','Public Liability','Key Person','Other' (PI = Professional Indemnity, D&O = Directors & Officers). inception_date and expiry_date as YYYY-MM-DD. limit_of_indemnity, excess and premium as numbers in GBP. key_exclusions: concise list of the main exclusions. purpose: one sentence on what this cover protects against. summary: one or two sentence summary.",
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            policy_name: { type: "string" }, cover_type: { type: "string" }, insurer: { type: "string" },
            broker: { type: "string" }, policy_number: { type: "string" },
            limit_of_indemnity: { type: "number" }, excess: { type: "number" }, premium: { type: "number" },
            key_exclusions: { type: "string" }, inception_date: { type: "string" }, expiry_date: { type: "string" },
            purpose: { type: "string" }, summary: { type: "string" },
          },
        },
      });
      const data = res || {};
      const cover = COVER_TYPES.includes(data.cover_type) ? data.cover_type : "";
      setForm((f) => ({
        ...f,
        policy_name: data.policy_name || f.policy_name,
        cover_type: cover || f.cover_type,
        insurer: data.insurer || f.insurer,
        broker: data.broker || f.broker,
        policy_number: data.policy_number || f.policy_number,
        limit_of_indemnity: data.limit_of_indemnity ?? f.limit_of_indemnity,
        excess: data.excess ?? f.excess,
        premium: data.premium ?? f.premium,
        key_exclusions: data.key_exclusions || f.key_exclusions,
        inception_date: data.inception_date || f.inception_date,
        expiry_date: data.expiry_date || f.expiry_date,
        purpose: data.purpose || f.purpose,
        summary: data.summary || f.summary,
      }));
      if (data.insurer) {
        const match = users.find((u) => (u.full_name || "").toLowerCase().includes(String(data.insurer).toLowerCase()));
        if (match) setForm((f) => ({ ...f, owner: match.id }));
      }
      setExtracted(true);
    } catch (err) {
      alert("Extraction failed: " + (err.message || err) + ". You can fill the fields manually.");
    } finally {
      setExtracting(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.policy_name) return;
    onSave({
      ...form,
      limit_of_indemnity: form.limit_of_indemnity === "" ? null : Number(form.limit_of_indemnity),
      excess: form.excess === "" ? null : Number(form.excess),
      premium: form.premium === "" ? null : Number(form.premium),
    });
  };

  const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  const toggleRisk = (rid) => setForm((f) => ({
    ...f,
    linked_risks: f.linked_risks.includes(rid) ? f.linked_risks.filter((x) => x !== rid) : [...f.linked_risks, rid],
  }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{policy ? "Edit Insurance Policy" : "New Insurance Policy"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="rounded-md border border-dashed border-border p-3">
            <Label className="mb-1 block text-xs font-medium">Schedule / certificate (PDF / Word)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {policy ? "Replace document" : "Upload & extract"}
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={onFile} />
              </label>
              {form.policy_document && <a href={form.policy_document} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View uploaded</a>}
              {extracted && <span className="text-xs text-emerald-700">Fields auto-filled — please review before saving.</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-xs font-medium">Policy name *</Label><input className={input} value={form.policy_name} onChange={(e) => set("policy_name", e.target.value)} placeholder="e.g. Professional Indemnity" required /></div>
            <div><Label className="mb-1 block text-xs font-medium">Cover type</Label>
              <select className={input} value={form.cover_type} onChange={(e) => set("cover_type", e.target.value)}><option value="">—</option>{COVER_TYPES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-xs font-medium">Insurer</Label><input className={input} value={form.insurer} onChange={(e) => set("insurer", e.target.value)} /></div>
            <div><Label className="mb-1 block text-xs font-medium">Broker</Label><input className={input} value={form.broker} onChange={(e) => set("broker", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-xs font-medium">Policy number</Label><input className={input} value={form.policy_number} onChange={(e) => set("policy_number", e.target.value)} /></div>
            <div><Label className="mb-1 block text-xs font-medium">Owner</Label>
              <select className={input} value={form.owner} onChange={(e) => set("owner", e.target.value)}><option value="">—</option>{users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}</select>
            </div>
          </div>
          <div><Label className="mb-1 block text-xs font-medium">Purpose</Label><input className={input} value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="What this cover protects against" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="mb-1 block text-xs font-medium">Limit of indemnity (£)</Label><input type="number" className={input} value={form.limit_of_indemnity} onChange={(e) => set("limit_of_indemnity", e.target.value)} /></div>
            <div><Label className="mb-1 block text-xs font-medium">Excess (£)</Label><input type="number" className={input} value={form.excess} onChange={(e) => set("excess", e.target.value)} /></div>
            <div><Label className="mb-1 block text-xs font-medium">Premium (£)</Label><input type="number" className={input} value={form.premium} onChange={(e) => set("premium", e.target.value)} /></div>
          </div>
          <div><Label className="mb-1 block text-xs font-medium">Key exclusions</Label><textarea className="min-h-[60px] w-full rounded-md border border-input bg-background p-2 text-sm" value={form.key_exclusions} onChange={(e) => set("key_exclusions", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-xs font-medium">Inception date</Label><input type="date" className={input} value={form.inception_date} onChange={(e) => set("inception_date", e.target.value)} /></div>
            <div><Label className="mb-1 block text-xs font-medium">Expiry date</Label><input type="date" className={input} value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-xs font-medium">Renewal frequency</Label>
              <select className={input} value={form.renewal_frequency} onChange={(e) => set("renewal_frequency", e.target.value)}>{FREQS.map((f) => <option key={f}>{f}</option>)}</select>
            </div>
            <div><Label className="mb-1 block text-xs font-medium">Status</Label>
              <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
          <div><Label className="mb-1 block text-xs font-medium">Summary</Label><textarea className="min-h-[50px] w-full rounded-md border border-input bg-background p-2 text-sm" value={form.summary} onChange={(e) => set("summary", e.target.value)} /></div>

          {risks?.length > 0 && (
            <div>
              <Label className="mb-1 block text-xs font-medium">Linked risks (insurance-mitigated)</Label>
              <div className="max-h-32 overflow-y-auto rounded-md border border-border p-2">
                {risks.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 py-0.5 text-sm">
                    <input type="checkbox" checked={form.linked_risks.includes(r.id)} onChange={() => toggleRisk(r.id)} />
                    <span>{r.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!form.policy_name}>{policy ? "Save Changes" : "Create Policy"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}