import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";

// Unified person resolution. Employees are the master people record, but legacy
// User ids may still appear on some fields (last_modified_by, ChangeLog.user,
// AttestationResponse.user). buildPersonMap keys a single map by BOTH Employee.id
// and User.id so any stored id resolves to a record. Values are the full records
// (Employee or User), so callers can read .full_name / .email / .linked_user etc.
export function buildPersonMap(employees = [], users = []) {
  const map = {};
  for (const e of employees) map[e.id] = e;
  for (const u of users) if (!map[u.id]) map[u.id] = u;
  return map;
}

// Resolve a display name from the first id that matches.
export function personName(map, ...ids) {
  for (const id of ids) {
    if (id && map[id]) return map[id].full_name || map[id].email || "";
  }
  return "";
}

// Loads employees + users + the current user once. Returns the unified personMap,
// the employee list (for pickers), and the current user's Employee id (for "My"
// filters, since owner/assignee fields now store Employee ids, not User ids).
export function usePeople() {
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.all([
      base44.entities.Employee.list(),
      base44.entities.User.list(),
      base44.auth.me().catch(() => null),
    ]).then(([e, u, m]) => {
      if (!live) return;
      setEmployees(e);
      setUsers(u);
      setMe(m);
    });
    return () => {
      live = false;
    };
  }, []);
  const personMap = useMemo(() => buildPersonMap(employees, users), [employees, users]);
  const myEmpId = (employees.find((e) => e.linked_user === (me && me.id)) || {}).id || null;
  return { employees, users, personMap, me, myEmpId };
}