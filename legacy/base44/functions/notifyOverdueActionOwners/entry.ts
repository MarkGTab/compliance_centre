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

// Daily: email the OWNER of each overdue action (Employee id), copying the owner
// of the linked risk when different. Actions with no reachable owner (unassigned,
// leaver, no email) are escalated to admins (CRO / Risk) so nothing falls through.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date().toISOString().slice(0, 10);
    const actions = await base44.asServiceRole.entities.Action.list("-created_date", 5000);
    const overdue = actions.filter(
      (a) => a.due_date && a.due_date < today && a.status !== "Complete"
    );
    if (overdue.length === 0) {
      return Response.json({ notified: 0, total_overdue: 0 });
    }

    const [risks, people] = await Promise.all([
      base44.asServiceRole.entities.Risk.list("-created_date", 5000),
      loadPeople(base44),
    ]);
    const riskMap = Object.fromEntries(risks.map((r) => [r.id, r]));
    const { map, admins } = people;

    const inbox: Record<string, { email: string; items: any[] }> = {};
    const add = (email: string, item: any) => {
      if (!email) return;
      (inbox[email] ||= { email, items: [] }).items.push(item);
    };

    const unowned: any[] = [];
    for (const a of overdue) {
      const risk = a.linked_risk ? riskMap[a.linked_risk] : null;
      const item = { action: a, risk };
      const owner = contactable(map[a.owner]);
      const riskOwner = risk ? contactable(map[risk.owner]) : null;
      if (owner) add(owner.email, { ...item, role: "owner" });
      if (riskOwner && riskOwner.email !== owner?.email) add(riskOwner.email, { ...item, role: "risk owner" });
      if (!owner && !riskOwner) unowned.push(item);
    }
    for (const it of unowned) for (const ad of admins) add(ad.email, { ...it, role: "unassigned" });

    let notified = 0;
    for (const { email, items } of Object.values(inbox)) {
      const lines = items
        .map(
          (it) =>
            `- "${it.action.description}"` +
            (it.risk ? ` (Risk: ${it.risk.risk_ref ? it.risk.risk_ref + " " : ""}${it.risk.title})` : "") +
            ` — due ${it.action.due_date}` +
            (it.role === "risk owner" ? " [action on a risk you own]" : "") +
            (it.role === "unassigned" ? " [NO ACTIVE OWNER — please reassign]" : "")
        )
        .join("\n");
      const body =
        "The following risk actions are overdue:\n\n" +
        lines +
        "\n\nPlease update or re-plan them in the TAB Risk Management app.";
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `Overdue risk actions — ${items.length} item${items.length > 1 ? "s" : ""}`,
        body,
      });
      notified += 1;
    }

    return Response.json({ notified, total_overdue: overdue.length, unowned: unowned.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
