import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Phase 2B migration: re-points register owner/assignee/head/chair/attendees/
// apologies/employee/approver fields from User ids to Employee ids (via linked_user).
// Idempotent. Run AFTER migrateEmployeesFromUsers (so every User has an Employee).
// Admin-only.

// entity -> { fields: [single-value keys], arrays: [array keys] }
const FIELD_MAP = {
  Risk: { single: ["owner"] },
  Action: { single: ["owner"] },
  Control: { single: ["owner"] },
  Policy: { single: ["owner"] },
  InsurancePolicy: { single: ["owner"] },
  Meeting: { single: ["chair"], arrays: ["attendees", "apologies"] },
  BoardAction: { single: ["assignee"] },
  ThirdParty: { single: ["contract_owner"] },
  EmergingRisk: { single: ["owner"] },
  KRI: { single: ["owner"] },
  RiskCategory: { single: ["category_owner"] },
  Department: { single: ["head"] },
  GiftHospitalityDeclaration: { single: ["employee", "approver"] },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let me = null;
    try { me = await base44.auth.me(); } catch (e) {}
    if (!me || me.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const employees = await base44.asServiceRole.entities.Employee.list();
    const empByLinked = Object.fromEntries(employees.filter((e) => e.linked_user).map((e) => [e.linked_user, e]));
    // Also key by email for any legacy rows where linked_user wasn't set but email matches a User.
    const empByEmail = Object.fromEntries(employees.filter((e) => e.email).map((e) => [e.email.toLowerCase(), e]));
    const empById = new Set(employees.map((e) => e.id));

    const mapId = (uid) => {
      if (!uid || typeof uid !== "string") return null;
      const e = empByLinked[uid] || empByEmail[String(uid).toLowerCase()];
      return e ? e.id : null;
    };

    const summary = {};
    for (const [entity, { single, arrays }] of Object.entries(FIELD_MAP)) {
      summary[entity] = { scanned: 0, updated: 0 };
      let rows = [];
      try { rows = await base44.asServiceRole.entities[entity].list("-created_date", 1000); } catch (e) { continue; }
      summary[entity].scanned = rows.length;
      for (const r of rows) {
        const patch = {};
        let changed = false;
        for (const k of single) {
          if (r[k] != null && r[k] !== "") {
            if (empById.has(r[k])) continue; // already an Employee id
            const mapped = mapId(r[k]);
            if (mapped) { patch[k] = mapped; changed = true; }
          }
        }
        for (const k of arrays || []) {
          if (Array.isArray(r[k]) && r[k].length) {
            const mapped = r[k].map((x) => {
              if (empById.has(x)) return x; // already an Employee id
              return mapId(x) || x;
            });
            if (mapped.some((x, i) => x !== r[k][i])) { patch[k] = mapped; changed = true; }
          }
        }
        if (changed) {
          try { await base44.asServiceRole.entities[entity].update(r.id, patch); summary[entity].updated += 1; } catch (e) {}
        }
      }
    }

    return Response.json({ summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});