import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function ColumnPicker({ source, columns, onChange }) {
  if (!source) return null;
  const allKeys = Object.keys(source.fields);
  const toggle = (key) => onChange(columns.includes(key) ? columns.filter((k) => k !== key) : [...columns, key]);
  const move = (idx, dir) => {
    const next = [...columns];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-foreground">Columns to include</div>
      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
        {allKeys.map((key) => {
          const on = columns.includes(key);
          return (
            <button key={key} type="button" onClick={() => toggle(key)}
              className={`rounded-full border px-2 py-0.5 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {source.fields[key].label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 text-xs font-semibold text-foreground">Order</div>
      <ol className="mt-1 space-y-1">
        {columns.map((key, idx) => (
          <li key={key} className="flex items-center gap-2 text-xs">
            <span className="flex-1 truncate">{source.fields[key]?.label || key}</span>
            <button type="button" onClick={() => move(idx, -1)} className="rounded p-0.5 hover:bg-muted" aria-label="Move up"><ChevronUp className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => move(idx, 1)} className="rounded p-0.5 hover:bg-muted" aria-label="Move down"><ChevronDown className="h-3.5 w-3.5" /></button>
          </li>
        ))}
        {columns.length === 0 && <li className="text-xs text-muted-foreground">No columns selected.</li>}
      </ol>
    </div>
  );
}