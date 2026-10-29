import React from "react";
import { Filter } from "lucide-react";

export default function FilterBar({ filters, values, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-white p-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Filter className="h-3.5 w-3.5" /> Filters
      </span>
      {filters.map((f) => (
        <label key={f.key} className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">{f.label}</span>
          <select
            value={values[f.key] || ""}
            onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
            className="rounded-md border border-border bg-white px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {f.options.map((o) => {
              const v = typeof o === "string" ? o : o.value;
              const l = typeof o === "string" ? o : o.label;
              return (
                <option key={v} value={v}>
                  {l}
                </option>
              );
            })}
          </select>
        </label>
      ))}
    </div>
  );
}