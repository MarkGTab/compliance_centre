import React from "react";

export default function DataTable({ columns, rows, onRowClick, emptyLabel, extra }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 text-left font-semibold text-foreground ${c.className || ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onRowClick?.(r)}
              className={`border-t border-border ${onRowClick ? "cursor-pointer hover:bg-muted/40" : ""}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.cellClassName || ""}`}>
                  {c.render ? c.render(r, extra) : r[c.key] ?? c.fallback ?? "—"}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                {emptyLabel || "No records."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}