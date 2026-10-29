import { base44 } from "@/api/base44Client";

// `users` here is the Employee list — the master people record — so every owner
// picker across the register pages offers employees and stores an Employee id.
// `userMap` is unified (keyed by BOTH Employee.id and User.id) so display
// resolution works for owner/assignee fields (Employee ids) AND for last_modified_by
// / ChangeLog.user (User ids) without per-page changes.
export async function loadLookups(opts = {}) {
  const [users, employees, risks, categories, departments] = await Promise.all([
    base44.entities.User.list("-created_date", 5000),
    base44.entities.Employee.list("-created_date", 5000),
    opts.risks ? base44.entities.Risk.list("-created_date", 5000) : Promise.resolve([]),
    opts.categories ? base44.entities.RiskCategory.list() : Promise.resolve([]),
    opts.departments ? base44.entities.Department.list() : Promise.resolve([]),
  ]);
  const userMap = {};
  for (const e of employees) userMap[e.id] = e;
  for (const u of users) if (!userMap[u.id]) userMap[u.id] = u;
  return {
    // Pickers offer ACTIVE employees only, so leavers can't be given new ownership.
    // Display lookups (userMap) still resolve leavers on historical records.
    users: employees
      .filter((e) => e.status !== "Leaver")
      .sort((a, b) => (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "")),
    employees,
    userMap,
    risks,
    riskMap: Object.fromEntries(risks.map((r) => [r.id, r])),
    categories,
    categoryMap: Object.fromEntries(categories.map((c) => [c.id, c])),
    departments,
    deptMap: Object.fromEntries(departments.map((d) => [d.id, d])),
  };
}