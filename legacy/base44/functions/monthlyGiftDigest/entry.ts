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

// Monthly digest to Compliance/MLRO (admins): new declarations, breaches and cumulative flags.
Deno.serve(async (_req) => {
  try {
    const base44 = createClientFromRequest(_req);
    const decls = await base44.asServiceRole.entities.GiftHospitalityDeclaration.list("-created_date", 500);
    const users = await base44.asServiceRole.entities.User.list();
    // Owner/assignee fields hold Employee ids; resolve against Employees AND Users.
    const userMap = await personMap(base44);
    const admins = users.filter((u) => u.role === "admin" && u.email);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const newThisMonth = decls.filter((d) => (d.created_date || "") >= monthStart);
    const breaches = decls.filter((d) => d.compliance_status === "BREACH");
    const reviews = decls.filter((d) => d.compliance_status === "Requires Review");
    const cumulative = decls.filter((d) => d.cumulative_flag);

    const gbp = (v) => (typeof v === "number" ? `£${v.toFixed(2)}` : "—");
    const lines = newThisMonth.map((d) => {
      const emp = d.employee ? userMap[d.employee] : null;
      return `- ${d.declaration_ref || ""} · ${d.date || "—"} · ${d.direction || "—"} · ${emp?.full_name || emp?.email || "—"} · ${d.counterparty || "—"} · ${gbp(d.estimated_value)} · ${d.compliance_status || "—"}`;
    }).join("\n");

    const body =
      `Gifts & Hospitality monthly digest — TAB\n\n` +
      `New declarations this month: ${newThisMonth.length}\n` +
      `Total declarations on register: ${decls.length}\n` +
      `Open breaches: ${breaches.length}\n` +
      `Items requiring review: ${reviews.length}\n` +
      `Cumulative flags: ${cumulative.length}\n\n` +
      `New this month:\n${lines || "(none)"}\n\n` +
      `Please review in the TAB Risk Management app.`;

    const subject = `Monthly Gifts & Hospitality digest — ${newThisMonth.length} new, ${breaches.length} breaches`;
    let sent = 0;
    for (const a of admins) {
      await base44.asServiceRole.integrations.Core.SendEmail({ to: a.email, subject, body });
      sent += 1;
    }
    return Response.json({ sent, new_this_month: newThisMonth.length, breaches: breaches.length, cumulative: cumulative.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});