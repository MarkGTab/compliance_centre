import React from "react";

export default function ReportPreview({ source, columns, rows, display }) {
  return (
    <div className="rounded-md border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-foreground">Live preview</span>
        <span className="text-xs text-muted-foreground">
          {rows.length} matching {rows.length === 1 ? "record" : "records"}
        </span>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-muted/60">
            <tr>
              {columns.map((key) => (
                <th key={key} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{source?.fields[key]?.label || key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((r, i) => (
              <tr key={i} className="border-t border-border align-top">
                {columns.map((key) => (
                  <td key={key} className="px-2 py-1.5 max-w-[260px] truncate">{display(r, key) || "—"}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="px-2 py-6 text-center text-muted-foreground">No records match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 100 && (
        <div className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          Showing first 100 of {rows.length} rows. Export includes all {rows.length}.
        </div>
      )}
    </div>
  );
}