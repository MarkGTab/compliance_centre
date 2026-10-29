import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().slice(0, 10);
    const policies = await base44.asServiceRole.entities.Policy.list();
    const updates = [];
    for (const p of policies) {
      if (p.status === "Archived") continue;
      let st = p.status;
      if (p.next_review_date && p.next_review_date < today) {
        st = "Overdue";
      } else if (p.next_review_date) {
        const days = Math.round(
          (new Date(p.next_review_date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000
        );
        st = days <= 60 ? "Due for Review" : "Current";
      }
      if (st !== p.status) updates.push({ id: p.id, status: st });
    }
    if (updates.length) await base44.asServiceRole.entities.Policy.bulkUpdate(updates);
    return Response.json({ updated: updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});