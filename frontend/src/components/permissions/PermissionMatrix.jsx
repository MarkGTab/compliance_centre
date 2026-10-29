import React from "react";
import { SECTIONS } from "@/lib/sections";
import { Checkbox } from "@/components/ui/checkbox";

const GROUPS = ["Overview", "Registers", "Governance", "Board", "Oversight"];

export default function PermissionMatrix({ matrix, onChange }) {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const secs = SECTIONS.filter((s) => s.group === g);
        if (!secs.length) return null;
        return (
          <div key={g}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</div>
            <div className="overflow-hidden rounded-md border border-border">
              {secs.map((s) => {
                const v = !!matrix[s.id]?.view;
                const ed = !!matrix[s.id]?.edit;
                const locked = s.adminOnly || s.alwaysGranted;
                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-[1fr_64px_64px] items-center gap-2 border-b border-border bg-white px-3 py-2 text-sm last:border-0"
                  >
                    <span>
                      {s.id}
                      {s.adminOnly && <span className="ml-2 text-xs text-muted-foreground">(admin only)</span>}
                      {s.alwaysGranted && <span className="ml-2 text-xs text-muted-foreground">(everyone)</span>}
                    </span>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={s.alwaysGranted ? true : v}
                        disabled={locked}
                        onCheckedChange={(c) => onChange(s.id, { view: !!c, edit: !!c ? ed : false })}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={s.alwaysGranted ? true : ed}
                        disabled={locked || !v}
                        onCheckedChange={(c) => onChange(s.id, { view: v || !!c, edit: !!c })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}