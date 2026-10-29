// Shared print/PDF document layout — the visual house style every TAB report
// uses. Renders the orange header band (title + logo + tabhq.com), a title
// block (title, subtitle, Generated / As at), an optional plain-English
// "Filters applied" block, the report body, and a fixed footer on every
// printed page: "TAB · Private & Confidential" | Page X of Y | generated date.
// Calibri throughout; A4 with sensible margins; portrait or landscape per
// report (auto landscape when a table is wide).

import React from "react";
import { Button } from "@/components/ui/button";
import { Building2, Printer } from "lucide-react";
import { TAB, isRagColumn, ragColor } from "@/lib/doc-style";

const printCss = (orientation) => `
@media print {
  @page { size: A4 ${orientation}; margin: 14mm 12mm 18mm 12mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 6px 12mm; font: 10px Calibri, sans-serif; color:#666; border-top:1px solid #e5e5e5; background:#fff; }
  .doc-footer .df-pg::after { content: "Page " counter(page) " of " counter(pages); }
  .doc-main { padding: 0 !important; max-width: none !important; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
}
`;

export default function DocPrintLayout({
  title,
  subtitle,
  asAt,
  generated,
  filtersSummary,
  orientation = "portrait",
  showToolbar = true,
  toolbar,
  maxW = "1300px",
  children,
}) {
  const gen = generated || new Date().toLocaleString("en-GB");
  return (
    <div className="doc-report min-h-screen bg-muted/30 print:bg-white" style={{ fontFamily: TAB.font }}>
      <style>{printCss(orientation)}</style>

      {showToolbar && (
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-6 py-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded text-white" style={{ background: TAB.orange }}>
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">TAB</div>
              <div className="text-[11px] text-muted-foreground">{title}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {toolbar}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print / Export
            </Button>
          </div>
        </header>
      )}

      <main className="doc-main mx-auto px-6 py-5" style={{ maxWidth: maxW }}>
        {/* Header band — print only */}
        <div className="doc-band hidden items-center justify-between rounded-md print:flex" style={{ background: TAB.orange, color: "#fff", padding: "10px 16px" }}>
          <div style={{ font: `bold 16px ${TAB.font}`, color: "#fff" }}>{title}</div>
          <div className="flex items-center gap-2">
            <span style={{ color: "#fff", font: `12px ${TAB.font}` }}>{TAB.site}</span>
            <span style={{ background: "#fff", borderRadius: 4, padding: "2px 6px", lineHeight: 0 }}>
              <img src={TAB.logoUrl} alt="TAB" style={{ height: 26, display: "block" }} />
            </span>
          </div>
        </div>

        {/* Title block */}
        <div className="doc-tb mt-3">
          <h1 className="text-lg font-bold" style={{ color: TAB.orange }}>{title}</h1>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
            <span><b className="text-foreground/70">Generated:</b> {gen}</span>
            {asAt && <span><b className="text-foreground/70">As at:</b> {asAt}</span>}
          </div>
        </div>

        {/* Filters applied (report-builder outputs) */}
        {filtersSummary && (
          <div className="doc-filters mt-3 rounded-md border border-border bg-muted/30 p-2 text-xs">
            <span className="font-semibold text-foreground">Filters applied:</span>{" "}
            <span className="text-muted-foreground">{filtersSummary}</span>
          </div>
        )}

        {children}
      </main>

      {/* Footer — print only, fixed on every page */}
      <div className="doc-footer hidden items-center justify-between print:flex" style={{ font: `10px ${TAB.font}`, color: "#666" }}>
        <span>TAB · Private &amp; Confidential</span>
        <span className="df-pg" />
        <span>{gen}</span>
      </div>
    </div>
  );
}

// Generic house-styled table for the Report Builder print view (and any report
// that wants a plain columns/rows table). Orange header, clean gridlines, RAG
// cells colour-coded green/amber/red.
export function DocTable({ columns, rows }) {
  const ragCols = React.useMemo(() => columns.map((c) => isRagColumn(c.key, rows)), [columns, rows]);
  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-border bg-white">
      <table className="w-full border-collapse text-xs">
        <thead style={{ background: TAB.orange }} className="text-white">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="border border-white/20 px-2 py-2 text-left">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 ? "bg-muted/20" : ""}>
              {columns.map((c, ci) => {
                const val = r[c.key] ?? "—";
                const rag = ragCols[ci] ? ragColor(val) : null;
                return (
                  <td key={c.key} className={`border border-border px-2 py-1.5 ${rag ? rag.screen : ""}`}>{val}</td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-2 py-8 text-center text-muted-foreground">No records match the current filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}