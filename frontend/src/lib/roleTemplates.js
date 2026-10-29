import { SECTIONS } from "./sections";

// Each template returns a map of sectionId -> { view, edit }.
// Sections absent from a template get no access (deny by default).
// "My Attestations" is alwaysGranted (handled in the engine) and "Permissions" is admin-only.

const all = () => Object.fromEntries(SECTIONS.map((s) => [s.id, { view: true, edit: true }]));
const v = (ids) => Object.fromEntries(ids.map((id) => [id, { view: true, edit: false }]));
const e = (ids) => Object.fromEntries(ids.map((id) => [id, { view: true, edit: true }]));

export const ROLE_TEMPLATES = {
  "Administrator / CRO": () => all(),

  "Risk Team": () => ({
    ...e(["Dashboard", "My Work", "Risk Register", "Project & Change", "Departments", "Controls", "KRI Dashboard", "Actions Tracker", "Incidents & Loss", "Emerging Risks", "Appetite", "My Board Actions", "Committees"]),
    ...v(["Conflicts of Interest", "Policy Suite", "Policy Report", "Insurance", "Insurance Report", "Third-Party", "Gifts & Hospitality", "Gifts & Hospitality Report", "Meetings", "Board Actions", "Attendance Report", "Attestations", "Attestation Report", "ERC Pack", "Audit Trail", "Employees", "Reports"]),
  }),

  "Compliance / MLRO": () => ({
    ...e(["My Work", "My Board Actions", "Policy Suite", "Insurance", "Third-Party", "Gifts & Hospitality", "Conflicts of Interest", "Incidents & Loss", "Employees"]),
    ...v(["Dashboard", "Risk Register", "Project & Change", "Departments", "Controls", "KRI Dashboard", "Actions Tracker", "Emerging Risks", "Appetite", "Policy Report", "Insurance Report", "Gifts & Hospitality Report", "Meetings", "Committees", "Board Actions", "Attendance Report", "Attestations", "Attestation Report", "ERC Pack", "Audit Trail", "Reports"]),
  }),

  "Department Head": () => ({
    ...e(["My Work", "My Board Actions", "Risk Register", "Project & Change", "Departments", "Controls", "Actions Tracker"]),
    ...v(["Dashboard", "KRI Dashboard", "Incidents & Loss", "Conflicts of Interest", "Emerging Risks", "Appetite", "Policy Suite", "Policy Report", "Insurance", "Insurance Report", "Third-Party", "Gifts & Hospitality", "Gifts & Hospitality Report", "Meetings", "Committees", "Board Actions", "Attendance Report", "Attestations", "Attestation Report", "ERC Pack", "Audit Trail", "Reports"]),
  }),

  "Read-only / Funder / Auditor": () => ({
    ...v(["Dashboard", "Risk Register", "Policy Report", "Insurance Report", "Gifts & Hospitality Report", "Attendance Report", "Reports"]),
  }),
};

// Map an app role to its default template (for the "Initialise all" bulk action).
// admin has no template — access is role-based and cannot be reduced here.
export const roleToTemplate = (role) => ({
  risk_team: "Risk Team",
  department_head: "Department Head",
  read_only: "Read-only / Funder / Auditor",
}[role] || null);