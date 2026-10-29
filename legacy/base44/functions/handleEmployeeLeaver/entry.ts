import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Everything in the framework that can be owned by a person. Owner fields store
// Employee ids; some legacy records may still hold the person's User id, so we
// match on both.
const OWNED = [
  { entity: "Risk", field: "owner", label: (r) => `risk ${r.risk_ref || ""} "${r.title || ""}"`, link: true },
  { entity: "Control", field: "owner", label: (r) => `control ${r.control_ref || ""} "${(r.description || "").slice(0, 60)}"` },
  { entity: "Action", field: "owner", label: (r) => `action "${(r.description || "").slice(0, 80)}"`, linkField: "linked_risk" },
  { entity: "KRI", field: "owner", label: (r) => `KRI "${r.indicator || ""}"`, linkField: "linked_risk" },
  { entity: "Policy", field: "owner", label: (r) => `policy "${r.policy_name || ""}"` },
  { entity: "InsurancePolicy", field: "owner", label: (r) => `insurance policy "${r.policy_name || ""}"` },
  { entity: "ThirdParty", field: "contract_owner", label: (r) => `third-party contract "${r.provider || ""}"` },
  { entity: "RiskCategory", field: "category_owner", label: (r) => `risk category "${r.name || ""}"` },
  { entity: "EmergingRisk", field: "owner", label: (r) => `emerging risk "${r.theme || ""}"` },
  { entity: "BoardAction", field: "assignee", label: (r) => `board action "${(r.description || "").slice(0, 80)}"`, linkField: "linked_risk" },
  { entity: "Department", field: "head", label: (r) => `department head role for "${r.name || ""}"` },
  { entity: "AttestationCampaign", field: "owner", label: (r) => `attestation campaign "${r.title || ""}"`, skip: (r) => r.status === "Closed" },
];

const OPEN = (entity, r) => {
  if (entity === "Risk") return r.status !== "Closed";
  if (entity === "Action") return r.status !== "Complete";
  if (entity === "BoardAction") return r.status !== "Complete";
  if (entity === "Policy" || entity === "InsurancePolicy") return r.status !== "Archived";
  if (entity === "EmergingRisk") return r.watch_status !== "Closed";
  return true;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only admins / risk team may trigger leaver reassignment.
    let me = null;
    try { me = await base44.auth.me(); } catch (e) { /* unauthenticated */ }
    if (!me || !["admin", "risk_team"].includes(me.role)) {
      return Response.json({ error: "Not authorised" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { employee_id } = body;
    if (!employee_id) return Response.json({ error: "employee_id required" }, { status: 400 });

    const employee = await base44.asServiceRole.entities.Employee.get(employee_id);
    if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });

    const ids = new Set([employee.id, employee.linked_user].filter(Boolean));
    const former = employee.full_name || employee.email || "Former owner";
    const due = addDays(todayStr(), 14);

    // Route the reassignment task to the leaver's line manager when they are active.
    let assignTo = null;
    if (employee.line_manager) {
      try {
        const lm = await base44.asServiceRole.entities.Employee.get(employee.line_manager);
        if (lm && lm.status !== "Leaver") assignTo = lm.id;
      } catch (e) { /* ignore */ }
    }

    // Skip anything already flagged for this leaver so a re-run doesn't duplicate.
    const existing = await base44.asServiceRole.entities.Action.list("-created_date", 5000);
    const already = new Set(existing.map((a) => a.description));

    const created = [];
    const byEntity = {};
    for (const spec of OWNED) {
      let rows = [];
      try { rows = await base44.asServiceRole.entities[spec.entity].list("-created_date", 5000); } catch (e) { continue; }
      for (const r of rows) {
        if (!ids.has(r[spec.field])) continue;
        if (!OPEN(spec.entity, r)) continue;
        if (spec.skip && spec.skip(r)) continue;
        const description = `Reassign ${spec.label(r)} — former owner ${former} is now a leaver.`;
        if (already.has(description)) continue;
        try {
          const a = await base44.asServiceRole.entities.Action.create({
            description,
            linked_risk: spec.link ? r.id : (spec.linkField ? r[spec.linkField] || null : null),
            owner: assignTo,
            due_date: due,
            bucket: "30-day",
            priority: "High",
            status: "Open",
          });
          created.push(a.id);
          byEntity[spec.entity] = (byEntity[spec.entity] || 0) + 1;
        } catch (e) { /* ignore individual failure */ }
      }
    }

    try {
      await base44.asServiceRole.entities.ChangeLog.create({
        entity: "Employee",
        record_id: employee.id,
        record_ref: employee.full_name || "",
        action: "updated",
        changes: JSON.stringify({ leaver_flagged: created.length, by_entity: byEntity, assigned_to: assignTo }),
        user: me.id,
        user_name: me.full_name || me.email || "",
        timestamp: new Date().toISOString(),
      });
    } catch (e) { /* ignore */ }

    return Response.json({ flagged: created.length, by_entity: byEntity, assigned_to: assignTo, employee_id: employee.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
