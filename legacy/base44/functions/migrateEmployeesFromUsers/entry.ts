import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// One-off migration: back-fills Employee records from existing platform Users,
// then re-points attestation audience/owner and COI raised_by from User ids to
// Employee ids (via linked_user). Idempotent — safe to run repeatedly.
// Admin-only.

const ROLE_TITLE = {
  admin: "Administrator",
  risk_team: "Risk Team",
  department_head: "Department Head",
  read_only: "Read-only",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let me = null;
    try { me = await base44.auth.me(); } catch (e) {}
    if (!me || me.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const [users, employees, campaigns, responses, conflicts] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Employee.list(),
      base44.asServiceRole.entities.AttestationCampaign.list(),
      base44.asServiceRole.entities.AttestationResponse.list(),
      base44.asServiceRole.entities.ConflictOfInterest.list(),
    ]);

    const empByLinked = Object.fromEntries(employees.filter((e) => e.linked_user).map((e) => [e.linked_user, e]));
    const empByEmail = Object.fromEntries(employees.filter((e) => e.email).map((e) => [e.email.toLowerCase(), e]));

    let employeesCreated = 0;

    for (const u of users) {
      let emp = empByLinked[u.id] || (u.email && empByEmail[u.email.toLowerCase()]);
      if (emp) continue;
      try {
        emp = await base44.asServiceRole.entities.Employee.create({
          full_name: u.full_name || u.email || "Unknown",
          email: u.email || "",
          department: u.department || null,
          job_title: ROLE_TITLE[u.role] || null,
          requires_login: "Yes",
          status: "Active",
          linked_user: u.id,
        });
        empByLinked[u.id] = emp;
        if (u.email) empByEmail[u.email.toLowerCase()] = emp;
        employeesCreated += 1;
      } catch (e) {
        // ignore individual failure
      }
    }

    let campaignsUpdated = 0;
    for (const c of campaigns) {
      const patch = {};
      if (c.owner) {
        const e = empByLinked[c.owner];
        if (e) patch.owner = e.id;
      }
      if (Array.isArray(c.audience) && c.audience.length) {
        const mapped = c.audience.map((uid) => empByLinked[uid]?.id).filter((x) => x);
        if (mapped.length) patch.audience = mapped;
      }
      if (Object.keys(patch).length) {
        try {
          await base44.asServiceRole.entities.AttestationCampaign.update(c.id, patch);
          campaignsUpdated += 1;
        } catch (e) {}
      }
    }

    let responsesUpdated = 0;
    for (const r of responses) {
      if (r.employee) continue;
      if (!r.user) continue;
      const e = empByLinked[r.user];
      if (e) {
        try {
          await base44.asServiceRole.entities.AttestationResponse.update(r.id, { employee: e.id });
          responsesUpdated += 1;
        } catch (e2) {}
      }
    }

    let conflictsUpdated = 0;
    for (const coi of conflicts) {
      if (!coi.raised_by) continue;
      const e = empByLinked[coi.raised_by];
      if (e) {
        try {
          await base44.asServiceRole.entities.ConflictOfInterest.update(coi.id, { raised_by: e.id });
          conflictsUpdated += 1;
        } catch (e2) {}
      }
    }

    return Response.json({
      employeesCreated,
      campaignsUpdated,
      responsesUpdated,
      conflictsUpdated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});