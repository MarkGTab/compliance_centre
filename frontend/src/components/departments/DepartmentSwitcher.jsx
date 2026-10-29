import React from "react";
import { Lock } from "lucide-react";

export default function DepartmentSwitcher({ departments, selectedId, onSelect, locked }) {
  if (locked) {
    const d = departments[0];
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Your department:</span>
        <span className="font-semibold">{d?.name || "—"}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {departments.map((d) => (
        <button
          key={d.id}
          onClick={() => onSelect(d.id)}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedId === d.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-white hover:bg-muted/50"
          }`}
        >
          {d.name}
        </button>
      ))}
    </div>
  );
}