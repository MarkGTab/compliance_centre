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
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 3);
    const todayStr = today.toISOString().slice(0, 10);
    const horizonStr = horizon.toISOString().slice(0, 10);

    const [actions, meetings, users] = await Promise.all([
      base44.asServiceRole.entities.BoardAction.list(),
      base44.asServiceRole.entities.Meeting.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    const due = actions.filter(
      (a) => a.due_date && a.due_date >= todayStr && a.due_date <= horizonStr && a.status !== "Complete"
    );
    if (due.length === 0) return Response.json({ reminded: 0 });

    const meetingMap = Object.fromEntries(meetings.map((m) => [m.id, m]));
    // Owner/assignee fields hold Employee ids; resolve against Employees AND Users.
    const userMap = await personMap(base44);

    const byAssignee = {};
    for (const a of due) { if (a.assignee) (byAssignee[a.assignee] ||= []).push(a); }

    let reminded = 0;
    for (const [aid, items] of Object.entries(byAssignee)) {
      const u = userMap[aid];
      if (!u?.email) continue;
      const lines = items.map((a) => {
        const m = a.meeting ? meetingMap[a.meeting] : null;
        return `- "${a.description}"` + (m ? ` (${m.committee}, ${m.date})` : "") + ` — due ${a.due_date}`;
      }).join("\n");
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: u.email,
        subject: `Board action reminder — ${items.length} due in 3 days`,
        body: "The following board actions are due in the next 3 days:\n\n" + lines +
          "\n\nPlease update them in the TAB Risk Management app.",
      });
      reminded += 1;
    }

    return Response.json({ reminded });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});