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
import { Upload, Loader2, ShieldAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";

const FREQS = ["6 months", "Annual", "2 years", "3 years"];
const FREQ_MONTHS = { "6 months": 6, Annual: 12, "2 years": 24, "3 years": 36 };
const STATUSES = ["Current", "Due for Review", "Overdue", "Archived"];
const GOV = ["Yes", "No"];

function addMonths(dateStr, months) {
  if (!dateStr || !months) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function ghFields(p) {
  return {
    governs_gh_register: p?.governs_gh_register || "No",
    gift_approval_threshold: p?.gift_approval_threshold ?? "",
    hospitality_approval_threshold: p?.hospitality_approval_threshold ?? "",
    absolute_prohibition_limit: p?.absolute_prohibition_limit ?? "",
    cumulative_limit: p?.cumulative_limit ?? "",
    limits_effective_date: p?.limits_effective_date || "",
  };
}

function baseFields(p) {
  return {
    policy_name: p?.policy_name || "",
    policy_document: p?.policy_document || "",
    department: p?.department || "",
    owner: p?.owner || "",
    version: p?.version || "",
    approved_by: p?.approved_by || "",
    approval_date: p?.approval_date || "",
    review_frequency: p?.review_frequency || "",
    next_review_date: p?.next_review_date || "",
    status: p?.status || "Current",
    summary: p?.summary || "",
  };
}

export default function PolicyForm({ open, onClose, onSave, departments, users, policy }) {
  const [form, setForm] = useState(() => ({ ...baseFields(policy), ...ghFields(policy) }));
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [ghExtracted, setGhExtracted] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm({ ...baseFields(policy), ...ghFields(policy) });
    setExtracted(false);
    setGhExtracted(false);
  }, [policy, open]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, policy_document: file_url }));
      const res = await base44.integrations.Core.InvokeLLM({
        prompt:
          "Extract the following fields from this policy document and return as JSON. If a field is absent return null. " +
          "review_frequency must be exactly one of: '6 months','Annual','2 years','3 years' (infer 'Annual' if a yearly review cycle is implied). " +
          "approval_date, next_review_date and limits_effective_date as YYYY-MM-DD. " +
          "owner and approved_by as names/roles as written in the document. " +
          "summary: one or two sentence summary of the policy's purpose. " +
          "governs_gh_register: 'Yes' if this is an anti-bribery / gifts & hospitality policy that sets approval thresholds, otherwise 'No'. " +
          "gift_approval_threshold, hospitality_approval_threshold, absolute_prohibition_limit, cumulative_limit: monetary values in GBP as numbers " +
          "(the value at or above which prior approval is required / above which items must never be accepted / the rolling 12-month aggregate cap). Return null for any that are not stated.",
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            policy_name: { type: "string" },
            version: { type: "string" },
            approval_date: { type: "string" },
            owner: { type: "string" },
            approved_by: { type: "string" },
            review_frequency: { type: "string" },
            summary: { type: "string" },
            next_review_date: { type: "string" },
            governs_gh_register: { type: "string" },
            gift_approval_threshold: { type: "number" },
            hospitality_approval_threshold: { type: "number" },
            absolute_prohibition_limit: { type: "number" },
            cumulative_limit: { type: "number" },
            limits_effective_date: { type: "string" },
          },
        },
      });
      const data = res || {};
      const freq = FREQS.includes(data.review_frequency) ? data.review_frequency : "";
      setForm((f) => ({
        ...f,
        policy_name: data.policy_name || f.policy_name,
        version: data.version || f.version,
        approval_date: data.approval_date || f.approval_date,
        approved_by: data.approved_by || f.approved_by,
        review_frequency: freq || f.review_frequency,
        summary: data.summary || f.summary,
        next_review_date: data.next_review_date || (data.approval_date ? addMonths(data.approval_date, FREQ_MONTHS[freq || "Annual"]) : f.next_review_date),
        governs_gh_register: data.governs_gh_register === "Yes" ? "Yes" : (data.governs_gh_register === "No" ? "No" : f.governs_gh_register),
        gift_approval_threshold: typeof data.gift_approval_threshold === "number" ? data.gift_approval_threshold : f.gift_approval_threshold,
        hospitality_approval_threshold: typeof data.hospitality_approval_threshold === "number" ? data.hospitality_approval_threshold : f.hospitality_approval_threshold,
        absolute_prohibition_limit: typeof data.absolute_prohibition_limit === "number" ? data.absolute_prohibition_limit : f.absolute_prohibition_limit,
        cumulative_limit: typeof data.cumulative_limit === "number" ? data.cumulative_limit : f.cumulative_limit,
        limits_effective_date: data.limits_effective_date || f.limits_effective_date,
      }));
      if (data.owner) {
        const match = users.find((u) => (u.full_name || "").toLowerCase().includes(String(data.owner).toLowerCase()));
        if (match) setForm((f) => ({ ...f, owner: match.id }));
      }
      setExtracted(true);
      if (data.governs_gh_register === "Yes" ||
          typeof data.gift_approval_threshold === "number" ||
          typeof data.hospitality_approval_threshold === "number") {
        setGhExtracted(true);
      }
    } catch (err) {
      alert("Extraction failed: " + (err.message || err) + ". You can fill the fields manually.");
    } finally {
      setExtracting(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.policy_name) return;
    let next = form.next_review_date;
    if (!next && form.approval_date && form.review_frequency) {
      next = addMonths(form.approval_date, FREQ_MONTHS[form.review_frequency]);
    }
    // Normalise empty numeric strings to undefined so we don't store 0.
    const clean = { ...form, next_review_date: next };
    for (const k of ["gift_approval_threshold", "hospitality_approval_threshold", "absolute_prohibition_limit", "cumulative_limit"]) {
      if (clean[k] === "" || clean[k] === null) clean[k] = undefined;
    }
    onSave(clean);
  };

  const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  const isGoverning = form.governs_gh_register === "Yes";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{policy ? "Edit Policy" : "New Policy"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="rounded-md border border-dashed border-border p-3">
            <Label className="mb-1 block text-xs font-medium">Policy document (PDF / Word)</Label>
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

          <div>
            <Label className="mb-1 block text-xs font-medium">Policy name *</Label>
            <input className={input} value={form.policy_name} onChange={(e) => set("policy_name", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-xs font-medium">Version</Label><input className={input} value={form.version} onChange={(e) => set("version", e.target.value)} /></div>
            <div><Label className="mb-1 block text-xs font-medium">Status</Label>
              <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-xs font-medium">Department</Label>
              <select className={input} value={form.department} onChange={(e) => set("department", e.target.value)}><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            </div>
            <div><Label className="mb-1 block text-xs font-medium">Owner</Label>
              <select className={input} value={form.owner} onChange={(e) => set("owner", e.target.value)}><option value="">—</option>{users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}</select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-xs font-medium">Approved by</Label><input className={input} value={form.approved_by} onChange={(e) => set("approved_by", e.target.value)} placeholder="e.g. Board / CRO name" /></div>
            <div><Label className="mb-1 block text-xs font-medium">Approval date</Label><input type="date" className={input} value={form.approval_date} onChange={(e) => set("approval_date", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-xs font-medium">Review frequency</Label>
              <select className={input} value={form.review_frequency} onChange={(e) => set("review_frequency", e.target.value)}><option value="">—</option>{FREQS.map((f) => <option key={f}>{f}</option>)}</select>
            </div>
            <div><Label className="mb-1 block text-xs font-medium">Next review date</Label><input type="date" className={input} value={form.next_review_date} onChange={(e) => set("next_review_date", e.target.value)} /></div>
          </div>
          <div><Label className="mb-1 block text-xs font-medium">Summary</Label><textarea className="min-h-[70px] w-full rounded-md border border-input bg-background p-2 text-sm" value={form.summary} onChange={(e) => set("summary", e.target.value)} /></div>

          {/* Gifts & Hospitality governance */}
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold" style={{ color: "#DD5115" }}>
              <ShieldAlert className="h-4 w-4" /> Gifts & Hospitality governance
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-medium">Governs G&H register</Label>
                <select className={input} value={form.governs_gh_register} onChange={(e) => set("governs_gh_register", e.target.value)}>
                  {GOV.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium">Limits effective date</Label>
                <input type="date" className={input} value={form.limits_effective_date} onChange={(e) => set("limits_effective_date", e.target.value)} disabled={!isGoverning} />
              </div>
            </div>
            {isGoverning && (
              <>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block text-xs font-medium">Gift approval threshold (GBP)</Label>
                    <input type="number" step="0.01" className={input} value={form.gift_approval_threshold} onChange={(e) => set("gift_approval_threshold", e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 100" />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-medium">Hospitality approval threshold (GBP)</Label>
                    <input type="number" step="0.01" className={input} value={form.hospitality_approval_threshold} onChange={(e) => set("hospitality_approval_threshold", e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 250" />
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block text-xs font-medium">Absolute prohibition limit (GBP, optional)</Label>
                    <input type="number" step="0.01" className={input} value={form.absolute_prohibition_limit} onChange={(e) => set("absolute_prohibition_limit", e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 500" />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-medium">Cumulative 12-month limit (GBP, optional)</Label>
                    <input type="number" step="0.01" className={input} value={form.cumulative_limit} onChange={(e) => set("cumulative_limit", e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 1000" />
                  </div>
                </div>
                {ghExtracted && (
                  <div className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                    Thresholds were read from the document — review them carefully before saving. Saving with <strong>Governs G&H register = Yes</strong> makes these the active limits for the Gifts & Hospitality register and supersedes any previously flagged policy.
                  </div>
                )}
                {!ghExtracted && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    When this policy is flagged, these limits drive the compliance test across the Gifts & Hospitality register.
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!form.policy_name}>{policy ? "Save Changes" : "Create Policy"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}