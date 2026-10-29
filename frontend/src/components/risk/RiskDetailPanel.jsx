import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronRight, ArrowDown, Shield, Gauge, ListChecks, AlertTriangle, Pencil, Copy, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import RagDot from "./RagDot";
import ScoreChip from "./ScoreChip";
import HeatGrid from "./HeatGrid";
import { tierStyles, statusStyles, formatDate, formatGbp, isReviewOverdue } from "@/lib/risk-helpers";

export default function RiskDetailPanel({
  open,
  onClose,
  risk,
  parentChain,
  children,
  controls,
  kris,
  actions,
  incidents,
  onNavigate,
  onEdit,
  onOpenLinked,
  onClone,
  onDelete,
  canEdit,
  canDelete,
  modifierName,
  categoryName,
  departmentName,
  ownerName,
}) {
  if (!risk) return null;

  const Field = ({ label, children: c }) => (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{c || "—"}</div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span className="font-mono text-sm text-muted-foreground">{risk.risk_ref || "RISK"}</span>
            <span className="truncate">{risk.title}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {risk.last_modified_date
              ? `Last modified by ${modifierName || "—"} on ${formatDate(risk.last_modified_date)}`
              : "Not yet modified"}
          </span>
          <div className="flex items-center gap-1.5">
            {onClone && (
              <button
                onClick={() => onClone(risk)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
              >
                <Copy className="h-3.5 w-3.5" /> Clone
              </button>
            )}
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(risk)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Risk
              </button>
            )}
            {canDelete && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this risk?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{risk.title}" ({risk.risk_ref || "RISK"}). This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(risk)}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Breadcrumb — walk UP the cascade */}
        <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
          <span className="font-semibold text-muted-foreground">Escalation path:</span>
          {parentChain.length === 0 && (
            <span className="rounded bg-muted px-2 py-0.5">Top-level risk</span>
          )}
          {parentChain.map((p, idx) => (
            <React.Fragment key={p.id}>
              {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <button
                onClick={() => onNavigate(p.id)}
                className={`rounded px-2 py-0.5 ${idx === parentChain.length - 1 ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
              >
                {p.tier}: {p.title}
              </button>
            </React.Fragment>
          ))}
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium">
            {risk.title}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`rounded border px-2 py-0.5 text-xs font-medium ${tierStyles[risk.tier] || ""}`}>
            {risk.tier}
          </span>
          <span className={`rounded px-2 py-0.5 text-xs ${statusStyles[risk.status] || ""}`}>
            {risk.status}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-0.5 text-xs">
            <RagDot value={risk.appetite_status} /> Appetite
          </span>
          {risk.trend && (
            <span className="rounded border border-border px-2 py-0.5 text-xs">Trend: {risk.trend}</span>
          )}
        </div>

        <div className="mt-4 grid gap-3">
          <Field label="Description">{risk.description}</Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Cause">{risk.cause}</Field>
            <Field label="Event">{risk.event}</Field>
            <Field label="Consequence">{risk.consequence}</Field>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Category">{categoryName}</Field>
            <Field label="Department">{departmentName}</Field>
            <Field label="Owner">{ownerName}</Field>
            <Field label="Parent Risk">{parentChain.length ? parentChain[parentChain.length - 1].title : "—"}</Field>
            {risk.tier === "Project & Change" && <Field label="Initiative">{risk.initiative}</Field>}
            {risk.tier === "Project & Change" && <Field label="Project Status">{risk.project_status}</Field>}
          </div>
        </div>

        {/* Scores + heat map */}
        <div className="mt-5 rounded-md border border-border p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Gauge className="h-4 w-4 text-primary" /> Risk Scoring &amp; Heat Map
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <HeatGrid
              inherent={{ likelihood: risk.inherent_likelihood, impact: risk.inherent_impact }}
              residual={{ likelihood: risk.residual_likelihood, impact: risk.residual_impact }}
            />
            <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
              <ScoreBlock label="Inherent" l={risk.inherent_likelihood} i={risk.inherent_impact} s={risk.inherent_score} />
              <ScoreBlock label="Residual" l={risk.residual_likelihood} i={risk.residual_impact} s={risk.residual_score} />
              <Field label="Target Score">{risk.target_score}</Field>
              <Field label="Target Date">{formatDate(risk.target_date)}</Field>
              <Field label="Last Reviewed">{formatDate(risk.last_reviewed)}</Field>
              <Field label="Next Review">
                {risk.next_review ? (
                  <span className="inline-flex items-center gap-1.5">
                    {formatDate(risk.next_review)}
                    {isReviewOverdue(risk) && <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold text-red-700">OVERDUE</span>}
                  </span>
                ) : "—"}
              </Field>
            </div>
          </div>
        </div>

        {/* Children — walk DOWN */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
            <ArrowDown className="h-4 w-4 text-primary" /> Child Risks ({children.length})
          </div>
          {children.length === 0 ? (
            <p className="text-xs text-muted-foreground">No child risks — this risk has no roll-up children.</p>
          ) : (
            <div className="space-y-1">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onNavigate(c.id)}
                  className="flex w-full items-center justify-between rounded border border-border px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                >
                  <span className="truncate">
                    <span className="font-mono text-xs text-muted-foreground">{c.risk_ref || ""} </span>
                    {c.title}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-xs ${tierStyles[c.tier] || ""}`}>{c.tier}</span>
                    <ScoreChip score={c.residual_score} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <LinkedSection icon={Shield} title="Linked Controls" items={controls} onOpen={(it) => onOpenLinked && onOpenLinked("Control", it)} render={(c) => (
          <div className="flex justify-between">
            <span className="truncate">
              <span className="font-mono text-xs text-muted-foreground">{c.control_ref || ""} </span>
              {c.description}
            </span>
            <span className="flex gap-1">
              <Badge>{c.type}</Badge>
              <Badge>Design: {c.design_effectiveness}</Badge>
              <Badge>Ops: {c.operating_effectiveness}</Badge>
            </span>
          </div>
        )} />

        <LinkedSection icon={Gauge} title="Linked KRIs" items={kris} onOpen={(it) => onOpenLinked && onOpenLinked("KRI", it)} render={(k) => (
          <div className="flex justify-between">
            <span className="truncate">{k.indicator}</span>
            <span className="flex gap-2 text-xs">
              <span>Current: <b>{k.current_value}</b></span>
              <span className="text-muted-foreground">R/A/G: {k.red_threshold} / {k.amber_threshold} / {k.green_threshold}</span>
            </span>
          </div>
        )} />

        <LinkedSection icon={ListChecks} title="Linked Actions" items={actions} onOpen={(it) => onOpenLinked && onOpenLinked("Action", it)} render={(a) => (
          <div className="flex justify-between">
            <span className="truncate">{a.description}</span>
            <span className="flex gap-1">
              <Badge>{a.bucket}</Badge>
              <Badge>{a.priority}</Badge>
              <Badge>{a.status}</Badge>
              <span className="text-xs text-muted-foreground">Due {formatDate(a.due_date)}</span>
            </span>
          </div>
        )} />

        <LinkedSection icon={AlertTriangle} title="Linked Incidents" items={incidents} onOpen={(it) => onOpenLinked && onOpenLinked("Incident", it)} render={(i) => (
          <div className="flex justify-between">
            <span className="truncate">
              <span className="font-mono text-xs text-muted-foreground">{i.incident_ref || ""} </span>
              {i.description}
            </span>
            <span className="flex gap-2 text-xs">
              <span>{formatDate(i.date)}</span>
              <span className="font-semibold">{formatGbp(i.financial_impact)}</span>
            </span>
          </div>
        )} />

        <div className="h-8" />
      </SheetContent>
    </Sheet>
  );
}

function ScoreBlock({ label, l, i, s }) {
  return (
    <div className="rounded border border-border p-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xs">L{l ?? "—"} × I{i ?? "—"}</span>
        <ScoreChip score={s} />
      </div>
    </div>
  );
}

function Badge({ children }) {
  return <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{children}</span>;
}

function LinkedSection({ icon: Icon, title, items, render, onOpen }) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title} ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">None linked.</p>
      ) : (
        <div className="space-y-1">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onOpen && onOpen(it)}
              className="block w-full rounded border border-border px-3 py-1.5 text-left text-sm hover:bg-muted/50"
            >
              {render(it)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}