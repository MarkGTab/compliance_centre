import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/lib/permissions";

export const ROLE_LABELS = {
  admin: "Admin / CRO",
  risk_team: "Risk Team",
  department_head: "Department Head",
  read_only: "Read-only (Board / ERC / Funder)",
};

export const roleLabel = (r) => ROLE_LABELS[r] || "Read-only";

const RISK_TEAM_ENTITIES = ["Risk", "Control", "Action", "KRI", "AttestationCampaign"];
const DEPT_SCOPED_ENTITIES = ["Risk", "Control", "Action"];
const ATTESTATION_ENTITIES = ["AttestationCampaign"];

// Maps an entity to the section that governs it. Section permission is enforced
// on top of the existing role / department-scoping logic below.
const ENTITY_SECTION = {
  Risk: "Risk Register",
  Control: "Controls",
  Action: "Actions Tracker",
  KRI: "KRI Dashboard",
  Incident: "Incidents & Loss",
  ConflictOfInterest: "Conflicts of Interest",
  EmergingRisk: "Emerging Risks",
  Department: "Departments",
  Appetite: "Appetite",
  Policy: "Policy Suite",
  InsurancePolicy: "Insurance",
  ThirdParty: "Third-Party",
  GiftHospitalityDeclaration: "Gifts & Hospitality",
  Meeting: "Meetings",
  Decision: "Meetings",
  Attendance: "Meetings",
  DecisionRecusal: "Meetings",
  Committee: "Committees",
  StandingMember: "Committees",
  BoardAction: "Board Actions",
  AttestationCampaign: "Attestations",
};

export function canEditRaw(role, entity, recordDeptId, myDeptId) {
  if (role === "admin") return true;
  if (role === "read_only") return false;
  if (role === "risk_team") return RISK_TEAM_ENTITIES.includes(entity);
  if (role === "department_head") {
    if (!DEPT_SCOPED_ENTITIES.includes(entity)) return false;
    return !!recordDeptId && !!myDeptId && recordDeptId === myDeptId;
  }
  return false;
}

export function canCreateRaw(role, entity) {
  if (role === "admin") return true;
  if (role === "read_only") return false;
  if (role === "risk_team") return RISK_TEAM_ENTITIES.includes(entity);
  if (role === "department_head") return DEPT_SCOPED_ENTITIES.includes(entity);
  return false;
}

export function canDeleteRaw(role, entity) {
  if (role === "admin") return true;
  if (role === "risk_team") return RISK_TEAM_ENTITIES.includes(entity);
  return false;
}

export function useAccess() {
  const { user } = useAuth();
  const { canEdit: canEditSection } = usePermissions();
  const [myDeptId, setMyDeptId] = useState(null);
  useEffect(() => {
    if (!user || user.role !== "department_head") {
      setMyDeptId(null);
      return;
    }
    let live = true;
    Promise.all([
      base44.entities.Department.list(),
      base44.entities.Employee.list(),
    ])
      .then(([ds, emps]) => {
        if (!live) return;
        const myEmpId = (emps.find((e) => e.linked_user === user.id) || {}).id || null;
        setMyDeptId((ds.find((d) => d.head === myEmpId) || {}).id || null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [user]);
  const role = user?.role || "read_only";
  return {
    user,
    role,
    roleLabel: roleLabel(role),
    myDeptId,
    canCreate: (entity) => {
      const sec = ENTITY_SECTION[entity];
      if (sec && !canEditSection(sec)) return false;
      return canCreateRaw(role, entity);
    },
    canEdit: (entity, recordDeptId) => {
      const sec = ENTITY_SECTION[entity];
      if (sec && !canEditSection(sec)) return false;
      return canEditRaw(role, entity, recordDeptId, myDeptId);
    },
    canDelete: (entity) => {
      const sec = ENTITY_SECTION[entity];
      if (sec && !canEditSection(sec)) return false;
      return canDeleteRaw(role, entity);
    },
  };
}