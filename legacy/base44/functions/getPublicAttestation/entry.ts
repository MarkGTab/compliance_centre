import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// PUBLIC endpoint — no login. Validates a magic-link token and returns ONLY the
// single attestation it unlocks (statement, linked policy doc, options, due date,
// recipient email). Exposes no other records or navigation.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    if (!token || !/^[a-f0-9]{64}$/.test(String(token))) {
      return Response.json({ state: "invalid" }, { status: 404 });
    }
    const matches = await base44.asServiceRole.entities.AttestationResponse.filter({ token: String(token) });
    const r = matches[0];
    if (!r) return Response.json({ state: "invalid" }, { status: 404 });

    const campaign = await base44.asServiceRole.entities.AttestationCampaign.get(r.campaign).catch(() => null);
    if (!campaign) return Response.json({ state: "invalid" }, { status: 404 });

    // Already completed — token is dead.
    if (r.locked) {
      return Response.json({
        state: "completed",
        title: campaign.title,
        signed_datetime: r.signed_datetime,
        signature_name: r.signature_name,
        response_type: r.response_type,
      });
    }

    // Expired at the campaign due date.
    const today = new Date().toISOString().slice(0, 10);
    if (campaign.due_date && today > campaign.due_date) {
      const owner = await base44.asServiceRole.entities.Employee.get(campaign.owner).catch(() => null);
      return Response.json({
        state: "expired",
        title: campaign.title,
        due_date: campaign.due_date,
        contact_email: owner?.email || "",
      });
    }

    let policy = null;
    if (campaign.linked_policy) {
      const p = await base44.asServiceRole.entities.Policy.get(campaign.linked_policy).catch(() => null);
      if (p) {
        policy = {
          policy_name: p.policy_name || "",
          policy_document: p.policy_document || "",
          version: p.version || "",
        };
      }
    }

    return Response.json({
      state: "open",
      title: campaign.title,
      type: campaign.type || "",
      statement: campaign.statement || "",
      allow_exceptions: campaign.allow_exceptions === "Yes",
      due_date: campaign.due_date || "",
      recipient_email: r.recipient_email || "",
      policy,
    });
  } catch (error) {
    return Response.json({ state: "invalid" }, { status: 500 });
  }
});