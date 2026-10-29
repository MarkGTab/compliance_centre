import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { calcScore, computeAppetite, appetiteFor } from "@/lib/risk-helpers";

const TIERS = ["Strategic", "Operational", "Departmental", "Project & Change"];
const RAG = ["Green", "Amber", "Red"];
const TRENDS = ["Improving", "Stable", "Worsening"];
const STATUSES = ["Open", "Monitoring", "Closed"];
const SCALE = [1, 2, 3, 4, 5];

export default function RiskForm({ open, onClose, onSave, categories, departments, users, parentOptions, defaultTier, risk, defaultDepartment, lockDepartment, appetites = [], controls = [] }) {
  const [error, setError] = useState("");
  const [aiRanking, setAiRanking] = useState(false);
  const [aiRankError, setAiRankError] = useState("");
  const [form, setForm] = useState(() => risk ? {
    title: risk.title || "", description: risk.description || "", cause: risk.cause || "", event: risk.event || "", consequence: risk.consequence || "",
    tier: risk.tier || defaultTier || "Departmental",
    category: risk.category || "", department: risk.department || defaultDepartment || "", owner: risk.owner || "",
    parent_risk: risk.parent_risk || "",
    inherent_likelihood: risk.inherent_likelihood ?? "", inherent_impact: risk.inherent_impact ?? "",
    residual_likelihood: risk.residual_likelihood ?? "", residual_impact: risk.residual_impact ?? "",
    appetite_status: risk.appetite_status || "", target_score: risk.target_score ?? "", target_date: risk.target_date || "",
    trend: risk.trend || "", status: risk.status || "Open",
    last_reviewed: risk.last_reviewed || "", next_review: risk.next_review || "",
    initiative: risk.initiative || "", project_status: risk.project_status || "Active",
    linked_controls: (controls || []).filter((c) => (c.linked_risks || []).includes(risk.id)).map((c) => c.id),
  } : {
    title: "", description: "", cause: "", event: "", consequence: "",
    tier: defaultTier || "Departmental",
    category: "", department: defaultDepartment || "", owner: "",
    parent_risk: "",
    inherent_likelihood: "", inherent_impact: "",
    residual_likelihood: "", residual_impact: "",
    appetite_status: "", target_score: "", target_date: "",
    trend: "", status: "Open",
    last_reviewed: "", next_review: "",
    initiative: "", project_status: "Active",
    linked_controls: [],
  });

  // Escalation link: a risk may escalate to any higher tier
  // (Project & Change -> Departmental/Operational/Strategic,
  //  Departmental -> Operational/Strategic, Operational -> Strategic, Strategic -> none).
  const TIER_RANK = { "Project & Change": 0, Departmental: 1, Operational: 2, Strategic: 3 };
  const curRank = TIER_RANK[form.tier] ?? -1;
  const parentCandidates = parentOptions.filter((r) => (TIER_RANK[r.tier] ?? -1) > curRank && r.id !== risk?.id);
  const parentRequired = false;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canAiRank = (form.title || "").trim().length > 0 && (form.description || "").trim().length > 0;

  const aiRankRisk = async () => {
    setAiRankError("");
    setAiRanking(true);
    try {
      const categoryNames = (categories || []).map((c) => c.name).filter(Boolean);
      const departmentNames = (departments || []).map((d) => d.name).filter(Boolean);
      const ownerOptions = (users || []).filter((u) => u.status !== "Leaver" || u.id === form.owner);
      const ownerNames = ownerOptions
        .map((u) => u.full_name || u.email)
        .filter(Boolean);
      const prompt = `You are a senior enterprise risk analyst. Analyse the risk below and suggest ratings and supporting fields for a risk register entry.

Risk title: ${form.title}
Risk description: ${form.description}
${form.tier ? `Tier: ${form.tier}` : ""}
Today's date: ${new Date().toISOString().slice(0, 10)}.

Available risk categories: ${categoryNames.length ? categoryNames.join(", ") : "none — leave category_name blank"}.
Available departments: ${departmentNames.length ? departmentNames.join(", ") : "none — leave department_name blank"}.
Available owners (employees): ${ownerNames.length ? ownerNames.join(", ") : "none — leave owner_name blank"}.
Available controls (control_ref — description): ${controls.length ? controls.map((c) => `${c.control_ref || "(no ref)"} — ${(c.description || "").slice(0, 80)}`).join(" | ") : "none — leave linked_control_refs empty"}.

Produce:
- cause: a concise root-cause statement (1-2 sentences).
- event: a concise description of the risk event (1-2 sentences).
- consequence: a concise description of the potential consequences (1-2 sentences).
- inherent_likelihood and inherent_impact: 1-5 scale (1 = very low, 5 = very high), reflecting gross risk before controls.
- residual_likelihood and residual_impact: 1-5 scale, reflecting net risk after typical mitigating controls for this kind of risk.
- trend: one of Improving, Stable, Worsening.
- category_name: the best-matching category name from the list above, or empty string if none fit.
- department_name: the best-matching department name from the list above that should own this risk, or empty string if none fit.
- owner_name: the best-matching owner name from the employees list above who should own this risk, or empty string if none fit. Choose the person whose role best fits the risk; prefer named individuals over generic roles.
- target_score: the target residual score (1-25) the organisation aims to reach after further mitigation. It must be less than or equal to the residual score, reflecting the further reduction sought. Choose a realistic target given the risk type.
- last_reviewed: today's date in ISO format (YYYY-MM-DD).
- next_review: a sensible next review date in ISO format (YYYY-MM-DD). Use 1 month out for high-severity risks (residual score >= 15), 2 months for medium (8-14), 3 months for low (<= 7).
- linked_control_refs: an array of control_ref strings from the available controls list above that mitigate this risk. Choose only controls whose description genuinely relates to the risk. Return an empty array if none fit.

Return only the JSON object.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            cause: { type: "string" },
            event: { type: "string" },
            consequence: { type: "string" },
            inherent_likelihood: { type: "integer", minimum: 1, maximum: 5 },
            inherent_impact: { type: "integer", minimum: 1, maximum: 5 },
            residual_likelihood: { type: "integer", minimum: 1, maximum: 5 },
            residual_impact: { type: "integer", minimum: 1, maximum: 5 },
            trend: { type: "string", enum: ["Improving", "Stable", "Worsening"] },
            category_name: { type: "string" },
            department_name: { type: "string" },
            owner_name: { type: "string" },
            target_score: { type: "integer", minimum: 1, maximum: 25 },
            last_reviewed: { type: "string" },
            next_review: { type: "string" },
            linked_control_refs: { type: "array", items: { type: "string" } },
          },
          required: ["cause", "event", "consequence", "inherent_likelihood", "inherent_impact", "residual_likelihood", "residual_impact", "trend", "category_name", "department_name", "owner_name", "target_score", "last_reviewed", "next_review", "linked_control_refs"],
        },
      });
      const clamp = (n) => Math.max(1, Math.min(5, Number(n) || 1));
      const normDate = (s) => {
        const d = String(s || "").slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
      };
      const normTarget = (n, resScore) => {
        const t = Math.max(1, Math.min(25, Math.round(Number(n) || 0)));
        if (!t) return "";
        return resScore && t > resScore ? resScore : t;
      };
      const norm = (s) => String(s || "").toLowerCase().trim();
      const matchName = (list, name, nameKey) => {
        const n = norm(name);
        if (!n) return undefined;
        const items = (list || []).map((x) => ({ x, v: norm(x[nameKey]) })).filter((i) => i.v);
        return (
          items.find((i) => i.v === n)?.x ||
          items.find((i) => i.v.includes(n) || n.includes(i.v))?.x
        );
      };
      const matchedCategory = matchName(categories, res.category_name, "name");
      const matchedDepartment = matchName(departments, res.department_name, "name");
      const matchedOwner = ownerOptions
        .map((u) => ({ u, v: norm(u.full_name || u.email) }))
        .filter((i) => i.v)
        .sort((a, b) => a.v.length - b.v.length)
        .find((i) => {
          const n = norm(res.owner_name);
          return i.v === n || i.v.includes(n) || n.includes(i.v);
        })?.u;
      const matchControls = (list, refs) => {
        const arr = Array.isArray(refs) ? refs.map(norm).filter(Boolean) : [];
        if (!arr.length) return [];
        return (list || [])
          .filter((c) => c.control_ref)
          .filter((c) => {
            const r = norm(c.control_ref);
            return arr.some((x) => x === r || x.includes(r) || r.includes(x));
          })
          .map((c) => c.id);
      };
      const mergeControls = (existing, suggested) =>
        Array.from(new Set([...(existing || []), ...(suggested || [])]));
      setForm((f) => ({
        ...f,
        cause: res.cause || f.cause,
        event: res.event || f.event,
        consequence: res.consequence || f.consequence,
        inherent_likelihood: clamp(res.inherent_likelihood),
        inherent_impact: clamp(res.inherent_impact),
        residual_likelihood: clamp(res.residual_likelihood),
        residual_impact: clamp(res.residual_impact),
        trend: res.trend || f.trend,
        category: matchedCategory ? matchedCategory.id : f.category,
        department: matchedDepartment && !lockDepartment ? matchedDepartment.id : f.department,
        owner: matchedOwner ? matchedOwner.id : f.owner,
        target_score: normTarget(res.target_score, calcScore(clamp(res.residual_likelihood), clamp(res.residual_impact))),
        last_reviewed: normDate(res.last_reviewed) || f.last_reviewed,
        next_review: normDate(res.next_review) || f.next_review,
        linked_controls: mergeControls(f.linked_controls, matchControls(controls, res.linked_control_refs)),
      }));
    } catch (e) {
      setAiRankError("AI ranking failed: " + (e.message || e));
    } finally {
      setAiRanking(false);
    }
  };

  const inhScore = calcScore(form.inherent_likelihood, form.inherent_impact);
  const resScore = calcScore(form.residual_likelihood, form.residual_impact);
  const appetite = appetiteFor(appetites, form.category);

  // Owners: active employees only, plus the current owner if they have since left
  // (so an existing record still shows who owned it until it is reassigned).
  const ownerOptions = users.filter((u) => u.status !== "Leaver" || u.id === form.owner);

  const submit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    const target = form.target_score === "" ? null : Number(form.target_score);
    if (inhScore != null && resScore != null && resScore > inhScore) {
      setError(`Residual score (${resScore}) cannot be higher than inherent score (${inhScore}). Controls reduce risk; re-check the scoring.`);
      return;
    }
    if (target != null && (target < 1 || target > 25)) {
      setError("Target score must be between 1 and 25.");
      return;
    }
    if (target != null && appetite && target > appetite.limit) {
      setError(`Target score (${target}) is outside the ${appetite.level || ""} appetite for this category (max ${appetite.limit}). Set a target within appetite, or ask the Board to change the appetite.`);
      return;
    }
    setError("");
    onSave({
      ...form,
      inherent_score: inhScore,
      residual_score: resScore,
      target_score: target,
      appetite_status: computeAppetite(resScore, target, appetite),
      linked_controls: form.linked_controls || [],
    });
  };

  const input = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  const label = "text-xs font-semibold text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{risk ? "Edit Risk" : "New Risk"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className={label}>Title *</Label>
            <Input className={input} value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </div>
          <div>
            <Label className={label}>Description</Label>
            <textarea className={`${input} h-16 py-1`} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={aiRankRisk}
              disabled={!canAiRank || aiRanking}
              className="border-primary/40 text-primary hover:bg-primary/5"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              {aiRanking ? "Ranking…" : "AI Rank Risk"}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {canAiRank
                ? "Fills cause, event, consequence, likelihood, impact, trend, category, department, owner, target score, review dates and linked controls from the title and description. Adjust any field afterwards."
                : "Enter a title and description to enable AI ranking."}
            </span>
          </div>
          {aiRankError && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">{aiRankError}</div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><Label className={label}>Cause</Label><textarea className={`${input} h-14 py-1`} value={form.cause} onChange={(e) => set("cause", e.target.value)} /></div>
            <div><Label className={label}>Event</Label><textarea className={`${input} h-14 py-1`} value={form.event} onChange={(e) => set("event", e.target.value)} /></div>
            <div><Label className={label}>Consequence</Label><textarea className={`${input} h-14 py-1`} value={form.consequence} onChange={(e) => set("consequence", e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <Label className={label}>Tier</Label>
              <select className={input} value={form.tier} onChange={(e) => set("tier", e.target.value)}>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className={label}>Category</Label>
              <select className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className={label}>Department</Label>
              <select className={input} value={form.department} onChange={(e) => set("department", e.target.value)} disabled={!!lockDepartment}>
                <option value="">—</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <Label className={label}>Owner</Label>
              <select className={input} value={form.owner} onChange={(e) => set("owner", e.target.value)}>
                <option value="">—</option>
                {ownerOptions.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}{u.status === "Leaver" ? " (leaver — reassign)" : ""}</option>)}
              </select>
            </div>
            {form.tier !== "Strategic" && (
              <div className="col-span-2 sm:col-span-1">
                <Label className={label}>Escalates to (higher tier)</Label>
                <select className={input} value={form.parent_risk} onChange={(e) => set("parent_risk", e.target.value)}>
                  <option value="">— None —</option>
                  {parentCandidates.map((r) => <option key={r.id} value={r.id}>{r.risk_ref ? `${r.risk_ref} — ` : ""}{r.title} ({r.tier})</option>)}
                </select>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Optional: link to a parent risk in any higher tier (Departmental, Operational or Strategic).
                </p>
              </div>
            )}
            {form.tier === "Project & Change" && (
              <div className="col-span-2 sm:col-span-1">
                <Label className={label}>Initiative / Programme</Label>
                <Input className={input} value={form.initiative || ""} onChange={(e) => set("initiative", e.target.value)} placeholder="e.g. Core platform migration" />
              </div>
            )}
            {form.tier === "Project & Change" && (
              <div>
                <Label className={label}>Project Status</Label>
                <select className={input} value={form.project_status || "Active"} onChange={(e) => set("project_status", e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <Label className={label}>Linked Controls</Label>
            <div className="max-h-32 overflow-y-auto rounded-md border border-input p-2">
              {controls.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No controls available.</p>
              ) : (
                <div className="space-y-1">
                  {controls.map((c) => (
                    <label key={c.id} className="flex items-start gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={(form.linked_controls || []).includes(c.id)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            linked_controls: e.target.checked
                              ? [...(f.linked_controls || []), c.id]
                              : (f.linked_controls || []).filter((id) => id !== c.id),
                          }))
                        }
                      />
                      <span>
                        <span className="font-medium">{c.control_ref || "(no ref)"}</span>
                        {c.description ? <span className="text-muted-foreground"> — {c.description.slice(0, 100)}</span> : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Controls that mitigate this risk. AI ranking suggests relevant ones; tick/untick to adjust.</p>
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inherent</div>
            <div className="grid grid-cols-3 gap-3">
              <ScaleSelect label="Likelihood" value={form.inherent_likelihood} onChange={(v) => set("inherent_likelihood", v)} />
              <ScaleSelect label="Impact" value={form.inherent_impact} onChange={(v) => set("inherent_impact", v)} />
              <div>
                <Label className={label}>Score</Label>
                <div className="flex h-8 items-center font-mono text-sm">{inhScore ?? "—"}</div>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Residual</div>
            <div className="grid grid-cols-3 gap-3">
              <ScaleSelect label="Likelihood" value={form.residual_likelihood} onChange={(v) => set("residual_likelihood", v)} />
              <ScaleSelect label="Impact" value={form.residual_impact} onChange={(v) => set("residual_impact", v)} />
              <div>
                <Label className={label}>Score</Label>
                <div className="flex h-8 items-center font-mono text-sm">{resScore ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <Label className={label}>Appetite (auto)</Label>
              <div className="flex h-8 items-center">
                <AppetiteBadge residual={resScore} target={form.target_score} appetite={appetite} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {appetite
                  ? `${appetite.level || "Category"} appetite: ≤${appetite.limit} in appetite, ≤${appetite.tolerance} tolerance`
                  : "No category appetite set — using target score"}
              </p>
            </div>
            <div>
              <Label className={label}>Target Score</Label>
              <Input type="number" className={input} value={form.target_score} onChange={(e) => set("target_score", e.target.value)} />
            </div>
            <div>
              <Label className={label}>Target Date</Label>
              <Input type="date" className={input} value={form.target_date} onChange={(e) => set("target_date", e.target.value)} />
            </div>
            <div>
              <Label className={label}>Trend</Label>
              <select className={input} value={form.trend} onChange={(e) => set("trend", e.target.value)}>
                <option value="">—</option>
                {TRENDS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className={label}>Status</Label>
              <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className={label}>Last Reviewed</Label>
              <Input type="date" className={input} value={form.last_reviewed} onChange={(e) => set("last_reviewed", e.target.value)} />
            </div>
            <div>
              <Label className={label}>Next Review</Label>
              <Input type="date" className={input} value={form.next_review} onChange={(e) => set("next_review", e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{risk ? "Save Changes" : "Create Risk"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScaleSelect({ label, value, onChange }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-muted-foreground">{label} (1–5)</Label>
      <select
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        value={value}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
      >
        <option value="">—</option>
        {SCALE.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}

function AppetiteBadge({ residual, target, appetite }) {
  const v = computeAppetite(residual, target === "" ? null : Number(target), appetite);
  const cls = v === "Green"
    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
    : v === "Amber"
    ? "bg-amber-100 text-amber-800 border-amber-300"
    : v === "Red"
    ? "bg-red-100 text-red-800 border-red-300"
    : "bg-muted text-muted-foreground";
  return <span className={`rounded border px-2 py-1 text-xs font-medium ${cls}`}>{v || "—"}</span>;
}