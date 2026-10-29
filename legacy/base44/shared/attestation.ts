// Shared attestation logic — used by issueAttestationCampaign, reissueRecurring,
// submitAttestation and the public token-based submit.
// Audience + responders are resolved through the Employee entity (master people record),
// so non-login staff can receive attestations by email with no platform account.

export function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function appBaseUrl(req) {
  const origin = req?.headers?.get ? req.headers.get("origin") : null;
  if (origin) return origin.replace(/\/$/, "");
  const referer = req?.headers?.get ? req.headers.get("referer") : null;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (e) {}
  }
  const env = Deno.env.get("APP_PUBLIC_URL");
  if (env) return env.replace(/\/$/, "");
  return "";
}

// Resolve the audience as a list of Employee records. Active employees only —
// leavers are excluded from all future rounds and department audiences.
export async function resolveAudience(base44, campaign) {
  const [employees, users, departments] = await Promise.all([
    base44.entities.Employee.list(),
    base44.entities.User.list(),
    base44.entities.Department.list(),
  ]);
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const empByLinkedUser = Object.fromEntries(
    employees.filter((e) => e.linked_user).map((e) => [e.linked_user, e])
  );
  const targetedDeptIds = new Set((campaign.audience_departments || []).map(String));
  const ids = new Set();

  // 1. explicitly named employees
  for (const eid of campaign.audience || []) ids.add(eid);

  // 2. every active employee assigned to one of the targeted departments
  for (const e of employees) {
    if (e.status === "Active" && e.department && targetedDeptIds.has(String(e.department))) ids.add(e.id);
  }

  // 3. fallback: include the head of each targeted department (head is a User -> their Employee)
  for (const did of campaign.audience_departments || []) {
    const d = deptMap[did];
    if (d?.head) ids.add(d.head);
  }

  // 4. audience by role (Users with the role -> their Employee)
  for (const role of campaign.audience_roles || []) {
    for (const u of users) {
      if (u.role === role && empByLinkedUser[u.id]) ids.add(empByLinkedUser[u.id].id);
    }
  }

  return employees.filter((e) => e.status === "Active" && ids.has(e.id));
}

export async function issueCampaign(base44, campaignId, req) {
  const campaign = await base44.entities.AttestationCampaign.get(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  const audience = await resolveAudience(base44, campaign);
  if (audience.length === 0) throw new Error("No employees in audience");

  const today = new Date().toISOString().slice(0, 10);
  const updates = { status: "Active" };
  if (!campaign.issue_date) updates.issue_date = today;
  await base44.entities.AttestationCampaign.update(campaignId, updates);

  const base = appBaseUrl(req);

  let policy = null;
  if (campaign.linked_policy) {
    policy = await base44.entities.Policy.get(campaign.linked_policy).catch(() => null);
  }

  const existing = await base44.entities.AttestationResponse.filter({ campaign: campaignId });
  const existingEmployees = new Set(existing.map((r) => r.employee).filter(Boolean));
  const toCreate = [];
  for (const e of audience) {
    if (existingEmployees.has(e.id)) continue;
    const token = generateToken();
    toCreate.push({
      response_ref: "RESP-" + Date.now().toString(36).toUpperCase() + "-" + e.id.slice(-4),
      campaign: campaignId,
      employee: e.id,
      user: e.linked_user || null,
      status: "Pending",
      locked: false,
      token,
      recipient_email: e.email || "",
      magic_link: base ? base + "/attest/" + token : "/attest/" + token,
    });
  }
  if (toCreate.length > 0) {
    await base44.entities.AttestationResponse.bulkCreate(toCreate);
  }

  let notified = 0;
  for (const e of audience) {
    if (!e.email) continue;
    const mine = toCreate.find((r) => r.employee === e.id);
    if (!mine) continue;
    try {
      let body =
        "You have been asked to complete an attestation.\n\n" +
        "Title: " + campaign.title + "\n" +
        "Type: " + campaign.type + "\n" +
        (campaign.due_date ? "Due: " + campaign.due_date + "\n" : "") +
        "\nStatement:\n" + (campaign.statement || "(no statement provided)") + "\n";
      if (policy && policy.policy_document) {
        body +=
          "\nRead the related policy" +
          (policy.policy_name ? " (" + policy.policy_name + ")" : "") +
          ":\n" + policy.policy_document + "\n";
      }
      body +=
        "\nComplete it now (no login required):\n" + mine.magic_link +
        "\n\nThis link is unique to you and expires on the due date. If you cannot click it, copy and paste the full link into your browser.";
      await base44.integrations.Core.SendEmail({
        to: e.email,
        subject: "Attestation required: " + campaign.title,
        body,
      });
      notified += 1;
    } catch (e2) {
      // ignore individual send failures
    }
  }

  return { issued: toCreate.length, notified, audience: audience.length };
}

// Shared submit/finalise: validates, locks, audits, auto-creates a COI entry on
// "Confirm with exceptions" for Conflicts-of-Interest campaigns, and notifies the
// campaign owner (an Employee) on exception/decline.
export async function finalizeResponse(base44, { responseId, responseType, exceptionDetail, signatureName }) {
  const validTypes = ["Confirmed", "Confirmed with Exceptions", "Declined"];
  if (!validTypes.includes(responseType)) throw new Error("Invalid response_type");
  if (!signatureName || !signatureName.trim()) throw new Error("Typed full name required");

  const r = await base44.entities.AttestationResponse.get(responseId);
  if (!r) throw new Error("Response not found");
  if (r.locked) {
    const e = new Error("Response already submitted and is locked");
    e.statusCode = 409;
    throw e;
  }
  if (responseType !== "Confirmed" && (!exceptionDetail || !exceptionDetail.trim())) {
    throw new Error("Exception detail required for this response");
  }

  const status = responseType === "Confirmed" ? "Completed" : "Exception Raised";
  const stamp = new Date().toISOString();
  const campaign = await base44.entities.AttestationCampaign.get(r.campaign).catch(() => null);
  const responder = await base44.entities.Employee.get(r.employee).catch(() => null);
  const responderName = responder?.full_name || responder?.email || r.recipient_email || "";

  const updateBody = {
    status,
    response_type: responseType,
    exception_detail: exceptionDetail || "",
    signature_name: signatureName.trim(),
    signed_datetime: stamp,
    locked: true,
  };

  if (
    responseType === "Confirmed with Exceptions" &&
    exceptionDetail && exceptionDetail.trim() &&
    campaign?.type === "Conflicts of Interest Declaration"
  ) {
    try {
      const coi = await base44.entities.ConflictOfInterest.create({
        person: responderName,
        nature_of_conflict: exceptionDetail.trim(),
        date_identified: stamp.slice(0, 10),
        status: "Under Review",
        raised_by: r.employee,
        source_attestation: responseId,
      });
      updateBody.linked_conflict = coi.id;
    } catch (e) {
      // COI creation must not block the attestation submit
    }
  }

  await base44.entities.AttestationResponse.update(responseId, updateBody);

  try {
    await base44.entities.ChangeLog.create({
      entity: "AttestationResponse",
      record_id: responseId,
      record_ref: r.response_ref || "",
      action: "updated",
      changes: JSON.stringify({
        submitted: responseType,
        status,
        signed: stamp,
        by: r.user || null,
        signature_name: signatureName.trim(),
      }),
      user: r.user || null,
      user_name: responderName,
      timestamp: stamp,
    });

    if (responseType !== "Confirmed" && campaign?.owner) {
      const owner = await base44.entities.Employee.get(campaign.owner).catch(() => null);
      if (owner?.email) {
        await base44.integrations.Core.SendEmail({
          to: owner.email,
          subject:
            "Attestation " +
            (responseType === "Declined" ? "declined" : "with exceptions") +
            ": " + responderName + " — \"" + (campaign.title || "") + "\"",
          body:
            "Responder " + responderName + " submitted \"" + responseType + "\" for \"" + (campaign.title || "") + "\".\n" +
            (exceptionDetail ? "Detail: " + exceptionDetail : "") +
            (updateBody.linked_conflict
              ? "\n\nA Conflicts of Interest register entry has been auto-created and linked (status: Under Review) — review it under Conflicts of Interest."
              : "") +
            "\n\nReview and follow up in the TAB Risk Management app.",
        });
      }
    }
  } catch (e) {
    // audit/email failures must not fail the submit
  }

  return { ok: true, status, locked: true, signed_datetime: stamp };
}