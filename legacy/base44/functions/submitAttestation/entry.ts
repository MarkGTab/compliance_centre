import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { finalizeResponse } from "../../shared/attestation.ts";

// Authenticated submit — for logged-in admin/risk/compliance users completing their
// own attestations from "My Attestations". Delegates lock/audit/COI to the shared
// finalizeResponse (same path the public magic-link submit uses).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { response_id, response_type, exception_detail, signature_name, confirm } = body;
    if (!response_id) return Response.json({ error: "response_id required" }, { status: 400 });
    if (!confirm) return Response.json({ error: "Confirmation required" }, { status: 400 });

    const r = await base44.entities.AttestationResponse.get(response_id);
    if (!r) return Response.json({ error: "Response not found" }, { status: 404 });
    if (r.user !== user.id) return Response.json({ error: "Not your attestation" }, { status: 403 });

    const result = await finalizeResponse(base44, {
      responseId: response_id,
      responseType: response_type,
      exceptionDetail: exception_detail,
      signatureName: signature_name,
    });
    return Response.json(result);
  } catch (error) {
    const status = error.statusCode ||
      ((error.message || "").includes("already submitted") ? 409 : 400);
    return Response.json({ error: error.message }, { status });
  }
});