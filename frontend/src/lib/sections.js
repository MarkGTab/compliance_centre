// Master list of every controllable section in the app.
// Add a new section here once and it flows through nav, guards, templates and the entity enum.

export const SECTIONS = [
  { id: "Dashboard", group: "Overview", path: "/" },
  { id: "My Work", group: "Overview", path: "/my-work" },

  { id: "Risk Register", group: "Registers", path: "/risk-register" },
  { id: "Project & Change", group: "Registers", path: "/project-change" },
  { id: "Departments", group: "Registers", path: "/departments" },
  { id: "Controls", group: "Registers", path: "/controls" },
  { id: "KRI Dashboard", group: "Registers", path: "/kri-dashboard" },
  { id: "Actions Tracker", group: "Registers", path: "/actions" },
  { id: "Incidents & Loss", group: "Registers", path: "/incidents" },
  { id: "Conflicts of Interest", group: "Registers", path: "/conflicts" },
  { id: "Gifts & Hospitality", group: "Registers", path: "/gifts-hospitality" },
  { id: "Emerging Risks", group: "Registers", path: "/emerging-risks" },

  { id: "Appetite", group: "Governance", path: "/appetite" },
  { id: "Policy Suite", group: "Governance", path: "/policy-library" },
  { id: "Policy Report", group: "Governance", path: "/policy-report" },
  { id: "Insurance", group: "Governance", path: "/insurance-library" },
  { id: "Insurance Report", group: "Governance", path: "/insurance-report" },
  { id: "Third-Party", group: "Governance", path: "/third-parties" },

  { id: "Meetings", group: "Board", path: "/board-governance" },
  { id: "Committees", group: "Board", path: "/committees" },
  { id: "Board Actions", group: "Board", path: "/board-actions" },
  { id: "My Board Actions", group: "Board", path: "/my-board-actions" },
  { id: "Attendance Report", group: "Board", path: "/attendance-report" },

  { id: "ERC Pack", group: "Oversight", path: "/erc-pack" },
  { id: "Attestations", group: "Oversight", path: "/attestations" },
  { id: "Attestation Report", group: "Oversight", path: "/attestation-report" },
  { id: "My Attestations", group: "Oversight", path: "/my-attestations", alwaysGranted: true },
  { id: "Audit Trail", group: "Oversight", path: "/audit-trail" },
  { id: "Employees", group: "Oversight", path: "/employees" },
  { id: "Reports", group: "Oversight", path: "/reports" },
  { id: "Permissions", group: "Oversight", path: "/permissions", adminOnly: true },
  { id: "Administration", group: "Oversight", path: "/administration", adminOnly: true },
];

export const sectionById = (id) => SECTIONS.find((s) => s.id === id);

export const sectionByPath = (path) => {
  if (!path) return null;
  if (path === "/") return sectionById("Dashboard");
  let best = null;
  for (const s of SECTIONS) {
    if (s.path === "/") continue;
    if (path === s.path || path.startsWith(s.path + "/")) {
      if (!best || s.path.length > best.path.length) best = s;
    }
  }
  return best;
};