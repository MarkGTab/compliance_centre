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

// Notifies the nominated approver when a declaration requires prior approval that hasn't been obtained.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const declarationId = body.declaration_id;
    if (!declarationId) return Response.json({ error: "declaration_id required" }, { status: 400 });

    const decl = await base44.asServiceRole.entities.GiftHospitalityDeclaration.get(declarationId);
    if (!decl) return Response.json({ error: "declaration not found" }, { status: 404 });
    if (decl.prior_approval_required !== "Yes" || decl.prior_approval_obtained === "Yes") {
      return Response.json({ skipped: true, reason: "approval not required or already obtained" });
    }

    const users = await base44.asServiceRole.entities.User.list();
    // Owner/assignee fields hold Employee ids; resolve against Employees AND Users.
    const userMap = await personMap(base44);
    const employee = decl.employee ? userMap[decl.employee] : null;
    const approver = decl.approver ? userMap[decl.approver] : null;
    const admins = users.filter((u) => u.role === "admin" && u.email);

    const gbp = (v) => (typeof v === "number" ? `£${v.toFixed(2)}` : v || "—");
    const summary =
      `Declaration: ${decl.declaration_ref || ""}\n` +
      `Date: ${decl.date || "—"}\n` +
      `Employee: ${employee?.full_name || employee?.email || "—"}\n` +
      `Counterparty: ${decl.counterparty || "—"} (${decl.counterparty_relationship || "—"})\n` +
      `Description: ${decl.description || "—"}\n` +
      `Estimated value: ${gbp(decl.estimated_value)}\n`;

    const subject = `Gifts & Hospitality — prior approval required — ${decl.declaration_ref || ""}`;
    const body_text =
      "A gifts & hospitality declaration exceeds TAB's prior-approval threshold and requires your approval:\n\n" +
      summary +
      "\nPlease review and record your decision in the TAB Risk Management app.";

    const recipients = new Set();
    if (approver?.email) recipients.add(approver.email);
    else for (const a of admins) recipients.add(a.email); // fallback to compliance if no approver set

    let sent = 0;
    for (const email of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject, body: body_text });
      sent += 1;
    }
    return Response.json({ sent, recipients: Array.from(recipients) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});