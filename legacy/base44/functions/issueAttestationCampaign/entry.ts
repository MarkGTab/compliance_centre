import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { issueCampaign } from "../../shared/attestation.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "risk_team") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    if (!body.campaign_id) {
      return Response.json({ error: "campaign_id required" }, { status: 400 });
    }
    const result = await issueCampaign(base44.asServiceRole, body.campaign_id, req);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});