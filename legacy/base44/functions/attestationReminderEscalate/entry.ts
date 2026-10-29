import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = todayStr();
    const [campaigns, responses, employees, users, departments] = await Promise.all([
      base44.asServiceRole.entities.AttestationCampaign.list(),
      base44.asServiceRole.entities.AttestationResponse.list(),
      base44.asServiceRole.entities.Employee.list(),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Department.list(),
    ]);
    const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const activeCampaigns = campaigns.filter((c) => c.status === "Active" && c.due_date);

    const respByCampaign = {};
    for (const r of responses) {
      if (!respByCampaign[r.campaign]) respByCampaign[r.campaign] = [];
      respByCampaign[r.campaign].push(r);
    }

    let reminders = 0;
    let escalated = 0;

    for (const c of activeCampaigns) {
      const daysLeft = daysBetween(today, c.due_date);
      const sendReminder = daysLeft === 7 || daysLeft === 1 || daysLeft === 0;
      const overdue = daysLeft < 0;
      const respList = respByCampaign[c.id] || [];

      for (const r of respList) {
        if (r.status === "Completed") continue;
        const emp = empMap[r.employee];
        if (!emp?.email) continue;

        if (sendReminder) {
          const when = daysLeft === 0 ? "due today" : "due in " + daysLeft + " day(s)";
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: emp.email,
              subject: "Reminder: Attestation \"" + c.title + "\" — " + when,
              body:
                "This is a reminder that your attestation \"" + c.title + "\" is " + when +
                " (" + c.due_date + ").\n\n" +
                (r.magic_link
                  ? "Complete it now (no login required):\n" + r.magic_link
                  : "Please complete it under \"My Attestations\" in the TAB Risk Management app."),
            });
            reminders += 1;
          } catch (e) {
            // ignore
          }
        }

        if (overdue) {
          if (r.status !== "Overdue") {
            try {
              await base44.asServiceRole.entities.AttestationResponse.update(r.id, { status: "Overdue" });
            } catch (e) {
              // ignore
            }
          }
          const recipients = new Set();
          // escalate to the campaign owner (Employee) and the responder's line manager
          // (the head of the responder's own department — a User)
          const owner = empMap[c.owner];
          if (owner?.email) recipients.add(owner.email);
          const uDept = departments.find((dd) => dd.id === emp.department);
          if (uDept?.head && empMap[uDept.head]?.email) recipients.add(empMap[uDept.head].email);
          for (const email of recipients) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: "Overdue attestation: " + (emp.full_name || emp.email) + " — \"" + c.title + "\"",
                body:
                  "The attestation \"" + c.title + "\" assigned to " + (emp.full_name || emp.email) +
                  " is now overdue (was due " + c.due_date + ").\n\nPlease follow up.",
              });
              escalated += 1;
            } catch (e) {
              // ignore
            }
          }
        }
      }
    }

    return Response.json({ reminders, escalated, today });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});