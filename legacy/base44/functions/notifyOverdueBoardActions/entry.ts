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
    const today = new Date().toISOString().slice(0, 10);
    const [actions, meetings, users] = await Promise.all([
      base44.asServiceRole.entities.BoardAction.list(),
      base44.asServiceRole.entities.Meeting.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    const overdue = actions.filter(
      (a) => a.due_date && a.due_date < today && a.status !== "Complete" && a.status !== "Overdue"
    );

    let flagged = 0;
    if (overdue.length > 0) {
      await base44.asServiceRole.entities.BoardAction.bulkUpdate(
        overdue.map((a) => ({ id: a.id, status: "Overdue" }))
      );
      flagged = overdue.length;
    }

    const meetingMap = Object.fromEntries(meetings.map((m) => [m.id, m]));
    // Owner/assignee fields hold Employee ids; resolve against Employees AND Users.
    const userMap = await personMap(base44);
    const line = (a) => {
      const m = a.meeting ? meetingMap[a.meeting] : null;
      return `- "${a.description}"` + (m ? ` (${m.committee}, ${m.date})` : "") + ` — due ${a.due_date}`;
    };

    let emailed = 0;

    // Email each assignee their overdue actions (grouped)
    const byAssignee = {};
    for (const a of overdue) { if (a.assignee) (byAssignee[a.assignee] ||= []).push(a); }
    for (const [aid, items] of Object.entries(byAssignee)) {
      const u = userMap[aid];
      if (!u?.email) continue;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: u.email,
        subject: `Overdue board actions assigned to you — ${items.length} item${items.length > 1 ? "s" : ""}`,
        body: "The following board actions assigned to you are now overdue:\n\n" +
          items.map(line).join("\n") +
          "\n\nPlease update them in the TAB Risk Management app.",
      });
      emailed += 1;
    }

    // Email each chair the overdue actions arising from meetings they chair (grouped)
    const byChair = {};
    for (const a of overdue) {
      const m = a.meeting ? meetingMap[a.meeting] : null;
      const c = m?.chair;
      if (c) (byChair[c] ||= []).push(a);
    }
    for (const [cid, items] of Object.entries(byChair)) {
      const u = userMap[cid];
      if (!u?.email) continue;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: u.email,
        subject: `Overdue board actions in your meetings — ${items.length} item${items.length > 1 ? "s" : ""}`,
        body: "The following board actions from meetings you chair are overdue:\n\n" +
          items.map(line).join("\n") +
          "\n\nPlease follow up in the TAB Risk Management app.",
      });
      emailed += 1;
    }

    return Response.json({ flagged, emailed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});