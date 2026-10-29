import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { issueCampaign } from "../../shared/attestation.ts";

const todayStr = () => new Date().toISOString().slice(0, 10);

const addInterval = (iso, freq) => {
  const d = new Date(iso);
  if (freq === "Monthly") d.setMonth(d.getMonth() + 1);
  else if (freq === "Quarterly") d.setMonth(d.getMonth() + 3);
  else if (freq === "Annual") d.setFullYear(d.getFullYear() + 1);
  else return null;
  return d.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = todayStr();
    const campaigns = await base44.asServiceRole.entities.AttestationCampaign.list();

    const reissued = [];
    for (const c of campaigns) {
      if (c.status !== "Active") continue;
      if (!c.frequency || c.frequency === "One-off") continue;
      if (!c.issue_date) continue;
      const nextIssue = addInterval(c.issue_date, c.frequency);
      if (!nextIssue || today < nextIssue) continue;
      // avoid duplicate reissue for the same next date
      const dup = campaigns.find((x) => x.title === c.title && x.issue_date === nextIssue);
      if (dup) continue;

      const nextDue = c.due_date ? addInterval(c.due_date, c.frequency) : null;
      const clone = {
        campaign_ref: "CAMP-" + Date.now().toString(36).toUpperCase(),
        title: c.title,
        type: c.type,
        statement: c.statement,
        linked_policy: c.linked_policy,
        linked_control: c.linked_control,
        linked_risk: c.linked_risk,
        audience: c.audience,
        audience_departments: c.audience_departments,
        audience_roles: c.audience_roles,
        allow_exceptions: c.allow_exceptions,
        frequency: c.frequency,
        issue_date: nextIssue,
        due_date: nextDue,
        owner: c.owner,
        status: "Draft",
      };
      const created = await base44.asServiceRole.entities.AttestationCampaign.create(clone);
      // close the previous round
      await base44.asServiceRole.entities.AttestationCampaign.update(c.id, { status: "Closed" });
      // issue the new round (creates pending responses + notifies)
      try {
        await issueCampaign(base44.asServiceRole, created.id, req);
      } catch (e) {
        // issuing failed — the clone still exists as Draft for manual issue
      }
      reissued.push({ id: created.id, title: c.title, issue_date: nextIssue });
    }

    return Response.json({ reissued: reissued.length, items: reissued, today });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});