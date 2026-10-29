import React from "react";

export default function UserMultiSelect({ users, value = [], onChange }) {
  const toggle = (uid) => {
    if (value.includes(uid)) onChange(value.filter((x) => x !== uid));
    else onChange([...value, uid]);
  };
  return (
    <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2">
      {users.length === 0 && <div className="text-xs text-muted-foreground">No users available.</div>}
      {users.map((u) => (
        <label key={u.id} className="flex items-center gap-2 py-0.5 text-sm">
          <input type="checkbox" checked={value.includes(u.id)} onChange={() => toggle(u.id)} />
          <span>{u.full_name || u.email}</span>
        </label>
      ))}
    </div>
  );
}