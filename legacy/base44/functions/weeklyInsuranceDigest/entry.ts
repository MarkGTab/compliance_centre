import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// --- people resolution (inlined so the function deploys standalone) ---
// Owner/assignee fields hold EMPLOYEE ids (some legacy records hold USER ids),
// so resolve against both. Employee records take precedence.
async function loadPeople(base44) {
  const [employees, users] = await Promise.all([
    base44.asServiceRole.entities.Employee.list("-created_date", 5000),
    base44.asServiceRole.entities.User.list("-created_date", 5000),
  ]);
  const map = {};
  for (const e of employees || []) map[e.id] = e;
  for (const u of users || []) if (!map[u.id]) map[u.id] = u;
  const admins = (users || []).filter((u) => u.role === "admin" && u.email);
  return { employees: employees || [], users: users || [], map, admins };
}
async function personMap(base44) { return (await loadPeople(base44)).map; }
function contactable(p) { return p && p.email && p.status !== "Leaver" ? p : null; }
// --- end people resolution ---

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 60);
    const horizonStr = horizon.toISOString().slice(0, 10);
    const [policies, users] = await Promise.all([
      base44.asServiceRole.entities.InsurancePolicy.list(),
      base44.asServiceRole.entities.User.list(),
    ]);
    // Owner/assignee fields hold Employee ids; resolve against Employees AND Users.
    const userMap = await personMap(base44);
    const due = policies
      .filter((p) => p.status !== "Archived" && p.expiry_date && p.expiry_date <= horizonStr)
      .sort((a, b) => (a.expiry_date || "").localeCompare(b.expiry_date || ""));
    if (due.length === 0) return Response.json({ emailed: 0, due: 0 });

    const lines = due.map((p) => {
      const owner = p.owner ? userMap[p.owner] : null;
      const flag = p.expiry_date < todayStr ? "LAPSED" : "due";
      return `- ${p.policy_name} (${p.cover_type}, ${p.insurer || "—"}) — ${flag} ${p.expiry_date} — owner: ${owner?.full_name || owner?.email || "—"}`;
    }).join("\n");

    const admins = users.filter((u) => u.role === "admin" && u.email);
    let emailed = 0;
    for (const a of admins) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: a.email,
        subject: `Weekly insurance renewal digest — ${due.length} polic${due.length > 1 ? "ies" : "y"} due/lapsed`,
        body: `The following insurance policies are due for renewal or lapsed within the next 60 days:\n\n${lines}\n\nPlease review in the TAB Risk Management app.`,
      });
      emailed += 1;
    }
    return Response.json({ emailed, due: due.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});