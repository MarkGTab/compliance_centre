import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { finalizeResponse } from "../../shared/attestation.ts";

// PUBLIC endpoint — no login. Validates the magic-link token, enforces expiry and
// single-use, then finalises the response (lock + audit + COI auto-create) via the
// shared logic. The token unlocks exactly this one response and nothing else.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { token, response_type, exception_detail, signature_name, confirm } = body;

    if (!confirm) return Response.json({ error: "Confirmation required" }, { status: 400 });
    if (!token || !/^[a-f0-9]{64}$/.test(String(token))) {
      return Response.json({ error: "Invalid link" }, { status: 400 });
    }
    const validTypes = ["Confirmed", "Confirmed with Exceptions"];
    if (!validTypes.includes(response_type)) {
      return Response.json({ error: "Invalid response_type" }, { status: 400 });
    }
    if (!signature_name || !signature_name.trim()) {
      return Response.json({ error: "Please type your full name to sign." }, { status: 400 });
    }

    const matches = await base44.asServiceRole.entities.AttestationResponse.filter({ token: String(token) });
    const r = matches[0];
    if (!r) return Response.json({ error: "Invalid or expired link." }, { status: 404 });
    if (r.locked) {
      return Response.json({ error: "This attestation has already been completed." }, { status: 409 });
    }

    const campaign = await base44.asServiceRole.entities.AttestationCampaign.get(r.campaign).catch(() => null);
    const today = new Date().toISOString().slice(0, 10);
    if (campaign?.due_date && today > campaign.due_date) {
      return Response.json({ error: "This link has expired. Please contact Compliance." }, { status: 410 });
    }

    const result = await finalizeResponse(base44.asServiceRole, {
      responseId: r.id,
      responseType: response_type,
      exceptionDetail: exception_detail,
      signatureName: signature_name,
    });
    return Response.json(result);
  } catch (error) {
    const status = error.statusCode ||
      ((error.message || "").includes("already submitted") ? 409 : 400);
    return Response.json({ error: error.message || "Submit failed" }, { status });
  }
});