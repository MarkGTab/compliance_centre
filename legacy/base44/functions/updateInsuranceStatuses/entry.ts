import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().slice(0, 10);
    const policies = await base44.asServiceRole.entities.InsurancePolicy.list();
    const updates = [];
    for (const p of policies) {
      if (p.status === "Archived") continue;
      let st = p.status;
      if (p.expiry_date && p.expiry_date < today) {
        st = "Lapsed";
      } else if (p.expiry_date) {
        const days = Math.round(
          (new Date(p.expiry_date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000
        );
        st = days <= 60 ? "Due for Renewal" : "Active";
      }
      if (st !== p.status) updates.push({ id: p.id, status: st });
    }
    if (updates.length) await base44.asServiceRole.entities.InsurancePolicy.bulkUpdate(updates);
    return Response.json({ updated: updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});