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
    const [policies, users] = await Promise.all([
      base44.asServiceRole.entities.InsurancePolicy.list(),
      base44.asServiceRole.entities.User.list(),
    ]);
    // Owner/assignee fields hold Employee ids; resolve against Employees AND Users.
    const userMap = await personMap(base44);
    const targetDays = [60, 30, 7, 0];
    let reminded = 0;
    for (const p of policies) {
      if (!p.expiry_date || p.status === "Archived" || p.status === "Lapsed") continue;
      const days = Math.round(
        (new Date(p.expiry_date + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000
      );
      if (!targetDays.includes(days)) continue;
      const owner = p.owner ? userMap[p.owner] : null;
      if (!owner?.email) continue;
      const when = days === 0 ? "today" : `in ${days} day${days > 1 ? "s" : ""}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: owner.email,
        subject: `Insurance renewal due ${when}: ${p.policy_name} (${p.cover_type})`,
        body: `The insurance policy "${p.policy_name}" (${p.cover_type}, insurer: ${p.insurer || "—"}, policy no. ${p.policy_number || "—"}) expires ${when}, on ${p.expiry_date}.\n\nPlease arrange renewal in the TAB Risk Management app.`,
      });
      reminded += 1;
    }
    return Response.json({ reminded });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});