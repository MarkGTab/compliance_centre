import React, { useState } from "react";
import { createConflictForRecusal } from "@/lib/recusal";

const inputCls = "h-8 rounded-md border border-input bg-background px-2 text-sm";

// Choose an existing Conflicts of Interest entry, or create & link a new one.
export default function ConflictPicker({ value, onChange, conflicts = [], employeeId, employeeName, reason, onCreated }) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={inputCls} value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">No linked conflict</option>
        {conflicts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.person || "—"} — {(c.nature_of_conflict || "").slice(0, 60)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={creating}
        className="text-[11px] text-primary underline disabled:opacity-50"
        onClick={async () => {
          setCreating(true);
          try {
            const id = await createConflictForRecusal({ employeeId, employeeName, reason });
            onChange(id);
            if (onCreated) await onCreated();
          } catch (e) {
            alert("Failed to create conflict: " + (e.message || e));
          } finally {
            setCreating(false);
          }
        }}
      >
        {creating ? "Creating…" : "Create & link new"}
      </button>
    </div>
  );
}