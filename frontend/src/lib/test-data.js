import { base44 } from "@/api/base44Client";

// Friendly labels for the Test Data panel, keyed by SDK entity name.
// Keep in sync with base44/shared/test-data-entities.ts.
export const TEST_DATA_LABELS = {
  ChangeLog: "Audit Log",
  DecisionRecusal: "Decision Recusals",
  Attendance: "Meeting Attendance",
  StandingMember: "Committee Members",
  BoardAction: "Board Actions",
  Action: "Actions",
  GiftHospitalityDeclaration: "Gifts & Hospitality",
  AttestationResponse: "Attestation Responses",
  ConflictOfInterest: "Conflicts of Interest",
  Control: "Controls",
  InsurancePolicy: "Insurance Policies",
  AttestationCampaign: "Attestation Campaigns",
  Incident: "Incidents",
  EmergingRisk: "Emerging Risks",
  KRI: "Key Risk Indicators",
  Decision: "Decisions",
  Meeting: "Meetings",
  Risk: "Risks",
  Policy: "Policies",
  ThirdParty: "Third Parties",
  Appetite: "Appetite Statements",
  RiskCategory: "Risk Categories",
  Department: "Departments",
  Committee: "Committees",
  Permission: "Permissions",
  Employee: "Employees",
  ReportDefinition: "Report Definitions",
  User: "User Accounts",
};

export async function getTestDataCounts() {
  const res = await base44.functions.invoke("getTestDataCounts", {});
  return res.data; // { counts: {Entity: n}, total }
}

export async function deleteAllTestData() {
  const res = await base44.functions.invoke("deleteAllTestData", {});
  return res.data; // { deleted: {Entity: n}, total, errors: [] }
}