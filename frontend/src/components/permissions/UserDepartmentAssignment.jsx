import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CheckCircle2, AlertCircle } from "lucide-react";

export default function UserDepartmentAssignment() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [status, setStatus] = useState({});

  const load = async () => {
    const [u, d] = await Promise.all([
      base44.entities.User.list().catch(() => []),
      base44.entities.Department.list().catch(() => []),
    ]);
    setUsers(u);
    setDepartments(d);
  };
  useEffect(() => {
    load();
  }, []);

  const unassigned = useMemo(() => users.filter((u) => !u.department), [users]);

  const assign = async (u, deptId) => {
    const value = deptId || null;
    setStatus((s) => ({ ...s, [u.id]: "saving" }));
    try {
      if (u.id === user.id) {
        await base44.auth.updateMe({ department: value });
      } else {
        await base44.entities.User.update(u.id, { department: value });
      }
      setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, department: value } : x)));
      setStatus((s) => ({ ...s, [u.id]: "saved" }));
      setTimeout(
        () => setStatus((s) => (s[u.id] === "saved" ? { ...s, [u.id]: null } : s)),
        1500
      );
    } catch (e) {
      setStatus((s) => ({ ...s, [u.id]: "error" }));
    }
  };

  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Building2 className="h-4 w-4" /> Department assignment
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Each user's department drives who is included when an attestation campaign targets a
        department — assign every user so no one is missed.
      </p>

      {unassigned.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {unassigned.length} user(s) have no department and will be excluded from
            department-targeted attestation campaigns until assigned:{" "}
            {unassigned.map((u) => u.full_name || u.email).join(", ")}.
          </span>
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs">
            <tr>
              <th className="px-2 py-1 text-left">User</th>
              <th className="px-2 py-1 text-left">Role</th>
              <th className="px-2 py-1 text-left">Department</th>
              <th className="px-2 py-1 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const st = status[u.id];
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-2 py-1">
                    {u.full_name || u.email}
                    {u.id === user.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                  </td>
                  <td className="px-2 py-1 text-xs">{u.role}</td>
                  <td className="px-2 py-1">
                    <Select value={u.department || ""} onValueChange={(v) => assign(u, v)}>
                      <SelectTrigger className="h-8 w-full min-w-[180px]">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1 text-xs">
                    {st === "saving" && <span className="text-muted-foreground">Saving…</span>}
                    {st === "saved" && (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />Saved
                      </span>
                    )}
                    {st === "error" && <span className="text-red-700">Failed</span>}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-3 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}