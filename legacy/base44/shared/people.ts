// Shared people resolution for backend functions.
//
// Owner / assignee / approver fields across the app store EMPLOYEE ids (Employee is
// the master people record). Some legacy records and audit fields still hold USER
// ids. This helper builds one map keyed by BOTH so any stored id resolves to a
// record with .full_name and .email. Employee records take precedence.

const LIMIT = 5000;

export async function loadPeople(base44: any) {
  const [employees, users] = await Promise.all([
    base44.asServiceRole.entities.Employee.list("-created_date", LIMIT),
    base44.asServiceRole.entities.User.list("-created_date", LIMIT),
  ]);
  const map: Record<string, any> = {};
  for (const e of employees || []) map[e.id] = e;
  for (const u of users || []) if (!map[u.id]) map[u.id] = u;
  const admins = (users || []).filter((u: any) => u.role === "admin" && u.email);
  return { employees: employees || [], users: users || [], map, admins };
}

// Map keyed by Employee.id and User.id. Drop-in replacement for the old
// `Object.fromEntries(users.map((u) => [u.id, u]))` user-only map.
export async function personMap(base44: any) {
  return (await loadPeople(base44)).map;
}

// Active (non-leaver) person with an email, or null.
export function contactable(p: any) {
  if (!p || !p.email) return null;
  if (p.status === "Leaver") return null;
  return p;
}
