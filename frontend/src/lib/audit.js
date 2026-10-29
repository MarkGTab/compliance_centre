import { base44 } from "@/api/base44Client";

const nowISO = () => new Date().toISOString();

const SKIP = new Set([
  "id",
  "created_date",
  "updated_date",
  "created_by_id",
  "last_modified_by",
  "last_modified_date",
]);

function diff(prev, next) {
  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  const out = [];
  for (const k of keys) {
    if (SKIP.has(k)) continue;
    const a = JSON.stringify(prev?.[k] ?? null);
    const b = JSON.stringify(next?.[k] ?? null);
    if (a !== b) out.push({ field: k, from: prev?.[k] ?? null, to: next?.[k] ?? null });
  }
  return out;
}

function refOf(entity, rec, data) {
  const r = { ...(data || {}), ...(rec || {}) };
  if (entity === "Risk") return r.risk_ref || r.title || "";
  if (entity === "Incident") return r.incident_ref || "";
  if (entity === "Control") return r.control_ref || r.description || "";
  if (entity === "Action") return r.description || "";
  if (entity === "Meeting") return r.title || "";
  if (entity === "Policy" || entity === "InsurancePolicy") return r.policy_name || "";
  if (entity === "Decision") return r.decision_text || "";
  if (entity === "BoardAction") return r.description || "";
  if (entity === "Appetite") return r.qualitative_statement || r.metric || "";
  if (entity === "ConflictOfInterest") return r.person || "";
  if (entity === "ThirdParty") return r.provider || "";
  if (entity === "EmergingRisk") return r.theme || "";
  if (entity === "KRI") return r.indicator || "";
  if (entity === "Department") return r.name || "";
  if (entity === "RiskCategory") return r.name || "";
  if (entity === "GiftHospitalityDeclaration") return r.declaration_ref || r.counterparty || "";
  if (entity === "AttestationCampaign") return r.campaign_ref || r.title || "";
  if (entity === "AttestationResponse") return r.response_ref || "";
  if (entity === "Attendance") return "Attendance record";
  if (entity === "Committee") return r.name || "";
  if (entity === "StandingMember") return "Standing member";
  if (entity === "DecisionRecusal") return "Decision recusal";
  return r.title || r.name || r.policy_name || "";
}

function scrub(d) {
  if (!d) return {};
  const { last_modified_by, last_modified_date, ...rest } = d;
  return rest;
}

async function writeLog(entity, record_id, record_ref, action, payload, user) {
  try {
    await base44.entities.ChangeLog.create({
      entity,
      record_id: record_id || null,
      record_ref: record_ref || "",
      action,
      changes: payload ? JSON.stringify(payload) : "",
      user: user?.id || null,
      user_name: user?.full_name || user?.email || "",
      timestamp: nowISO(),
    });
  } catch (e) {
    console.error("ChangeLog write failed", e);
  }
}

export async function auditCreate(entityName, data, user) {
  const stamped = { ...data, last_modified_by: user?.id, last_modified_date: nowISO() };
  const rec = await base44.entities[entityName].create(stamped);
  await writeLog(entityName, rec?.id, refOf(entityName, rec, stamped), "created", { snapshot: scrub(stamped) }, user);
  return rec;
}

export async function auditUpdate(entityName, id, data, prev, user) {
  const stamped = { ...data, last_modified_by: user?.id, last_modified_date: nowISO() };
  const rec = await base44.entities[entityName].update(id, stamped);
  const before = { ...(prev || {}) };
  const after = { ...before, ...stamped };
  const changes = diff(before, after);
  await writeLog(entityName, id, refOf(entityName, prev, stamped), "updated", { changes }, user);
  return rec;
}

export async function auditDelete(entityName, id, prev, user) {
  await base44.entities[entityName].delete(id);
  await writeLog(entityName, id, refOf(entityName, prev, {}), "deleted", { snapshot: scrub(prev || {}) }, user);
}