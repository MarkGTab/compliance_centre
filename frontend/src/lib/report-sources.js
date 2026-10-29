// Central registry of report data sources. Each source declares the entity it
// draws from, the permission section that gates it, its field schema, the
// filterable fields, default columns + sort, and how to load records + lookups.
//
// Sources are added incrementally — only Risks is enabled for now. The other
// twelve confirmed sources are added later by appending entries here; the rest
// of the builder (filters / columns / preview / export) is fully generic.

export const REPORT_SOURCES = {
  Risks: {
    label: "Risks",
    section: "Risk Register",
    entity: "Risk",
    fields: {
      risk_ref: { label: "Risk Ref", kind: "text" },
      title: { label: "Title", kind: "text" },
      description: { label: "Description", kind: "text" },
      tier: { label: "Tier", kind: "enum" },
      category: { label: "Category", kind: "ref", lookup: "categories", labelField: "name" },
      department: { label: "Department", kind: "ref", lookup: "departments", labelField: "name" },
      owner: { label: "Owner", kind: "ref", lookup: "people", labelField: "full_name" },
      parent_risk: { label: "Parent Risk", kind: "ref", lookup: "risks", labelField: "title" },
      initiative: { label: "Initiative", kind: "text" },
      inherent_score: { label: "Inherent Score", kind: "number" },
      residual_score: { label: "Residual Score", kind: "number" },
      appetite_status: { label: "Appetite Status", kind: "enum" },
      target_score: { label: "Target Score", kind: "number" },
      target_date: { label: "Target Date", kind: "date" },
      trend: { label: "Trend", kind: "enum" },
      status: { label: "Status", kind: "enum" },
      last_reviewed: { label: "Last Reviewed", kind: "date" },
      next_review: { label: "Next Review", kind: "date" },
      created_date: { label: "Created Date", kind: "date" },
    },
    filters: [
      { key: "tier", label: "Tier", type: "enum-multi", options: ["Strategic", "Operational", "Departmental", "Project & Change"] },
      { key: "category", label: "Category", type: "ref-multi", lookup: "categories", labelField: "name" },
      { key: "department", label: "Department", type: "ref-multi", lookup: "departments", labelField: "name" },
      { key: "owner", label: "Owner", type: "ref-single", lookup: "people", labelField: "full_name" },
      { key: "appetite_status", label: "Appetite Status", type: "enum-multi", options: ["Green", "Amber", "Red"] },
      { key: "status", label: "Status", type: "enum-multi", options: ["Open", "Monitoring", "Closed"] },
      { key: "residual_score", label: "Residual Score", type: "number-range" },
      { key: "next_review", label: "Next Review", type: "date-range" },
    ],
    defaultColumns: ["risk_ref", "title", "department", "category", "owner", "residual_score", "appetite_status", "status"],
    defaultSort: { field: "residual_score", direction: "desc" },
    fetch: (sdk) => sdk.entities.Risk.list("-created_date", 2000),
    loadLookups: async (sdk) => {
      const [categories, departments, employees, users] = await Promise.all([
        sdk.entities.RiskCategory.list(),
        sdk.entities.Department.list(),
        sdk.entities.Employee.list(),
        sdk.entities.User.list(),
      ]);
      const seen = new Set();
      const people = [];
      for (const p of [...employees, ...users]) {
        if (p && p.id && !seen.has(p.id)) {
          seen.add(p.id);
          people.push(p);
        }
      }
      return { categories, departments, employees, users, people };
    },
  },
};

export const SOURCE_KEYS = Object.keys(REPORT_SOURCES);