// Gifts & Hospitality anti-bribery policy engine.
// Approval thresholds are driven by the single governing policy held in the
// Policy Suite (the Policy record flagged governs_gh_register = "Yes"), NOT a
// hardcoded value. Upload/update that one policy and every screen + automation
// picks up the new limits. Historical declarations keep a snapshot of the
// threshold + governing policy that applied at submission, so later policy
// changes never retrospectively re-flag them.

export const COMPLIANCE = {
  WITHIN: "Within Policy",
  REVIEW: "Requires Review",
  BREACH: "BREACH",
};

export const GIFT_TYPES = ["Gift", "Hospitality"];
export const DIRECTIONS = ["Received", "Given"];
export const RELATIONSHIPS = [
  "Client/Borrower",
  "Broker/Introducer",
  "Supplier/Vendor",
  "Professional Adviser",
  "Other",
];
export const APPROVAL_OBTAINED = ["Yes", "No", "N/A"];
export const DECLARATION_STATUSES = ["Submitted", "Under Review", "Recorded", "Declined"];

export const complianceStyles = {
  "Within Policy": "bg-emerald-100 text-emerald-800",
  "Requires Review": "bg-amber-100 text-amber-800",
  BREACH: "bg-red-100 text-red-800",
};

// Fields that must be present (post-extraction) for the policy test to be conclusive.
const REQUIRED_FIELDS = [
  "estimated_value",
  "type",
  "direction",
  "counterparty",
  "description",
  "date",
];

// Resolve the single active governing anti-bribery policy from a list of Policy
// records. Returns the Policy flagged governs_gh_register = "Yes"; if several are
// flagged (legacy / pre-supersede data), the one with the latest limits_effective
// date wins, then latest created_date. Returns null if none is configured.
export function getGoverningPolicy(policies) {
  if (!Array.isArray(policies)) return null;
  const flagged = policies.filter((p) => p && p.governs_gh_register === "Yes");
  if (flagged.length === 0) return null;
  flagged.sort((a, b) => {
    const da = a.limits_effective_date || "";
    const db = b.limits_effective_date || "";
    if (da === db) return (b.created_date || "").localeCompare(a.created_date || "");
    return db.localeCompare(da);
  });
  return flagged[0];
}

// The approval threshold that applies to a declaration of this type, or null if
// not configured (no governing policy, or that policy has no threshold for the type).
export function getThresholdForType(policy, type) {
  if (!policy) return null;
  const raw = type === "Hospitality"
    ? policy.hospitality_approval_threshold
    : policy.gift_approval_threshold;
  if (raw === null || raw === undefined || raw === "") return null;
  const v = Number(raw);
  return isFinite(v) ? v : null;
}

export function approvalRequiredFor(value, threshold) {
  if (threshold === null || threshold === undefined || isNaN(threshold)) return "No";
  return typeof value === "number" && value >= threshold ? "Yes" : "No";
}

// Absolute prohibition limit from the governing policy, or null if not set.
export function getAbsoluteLimit(policy) {
  if (!policy) return null;
  const raw = policy.absolute_prohibition_limit;
  if (raw === null || raw === undefined || raw === "") return null;
  const v = Number(raw);
  return isFinite(v) ? v : null;
}

// Applies TAB's anti-bribery policy test to a declaration form against the
// governing policy's thresholds. Returns one of COMPLIANCE values.
// No governing policy / missing threshold for the type => REVIEW (cannot test).
export function computeCompliance(form, policy) {
  const missing = REQUIRED_FIELDS.some((k) => {
    const v = form[k];
    return v === undefined || v === null || v === "";
  });
  if (missing) return COMPLIANCE.REVIEW;

  const value = typeof form.estimated_value === "number"
    ? form.estimated_value
    : parseFloat(form.estimated_value);
  if (isNaN(value)) return COMPLIANCE.REVIEW;

  const threshold = getThresholdForType(policy, form.type);
  if (threshold === null) return COMPLIANCE.REVIEW; // limits not configured

  // Absolute prohibition — breach regardless of approval.
  const abs = getAbsoluteLimit(policy);
  if (abs !== null && value >= abs) return COMPLIANCE.BREACH;

  const req = form.prior_approval_required;
  const obt = form.prior_approval_obtained;
  if (req === "No") return COMPLIANCE.WITHIN;
  if (req === "Yes" && obt === "Yes") return COMPLIANCE.WITHIN;
  if (req === "Yes" && (obt === "No" || !obt || obt === "N/A")) return COMPLIANCE.BREACH;
  return COMPLIANCE.REVIEW;
}

// Derive the read-only policy-test values from a form against the governing policy.
export function derivePolicyTest(form, policy) {
  const raw = form.estimated_value;
  const value = typeof raw === "number" ? raw : parseFloat(raw);
  const hasValue = !isNaN(value);
  const threshold = getThresholdForType(policy, form.type);
  const thresholdConfigured = threshold !== null;
  const req = hasValue && thresholdConfigured ? approvalRequiredFor(value, threshold) : "No";
  const obtained = req === "No" ? "N/A" : form.prior_approval_obtained;
  const compliance = computeCompliance(
    {
      ...form,
      estimated_value: hasValue ? value : "",
      prior_approval_required: req,
      prior_approval_obtained: obtained,
    },
    policy
  );
  const abs = getAbsoluteLimit(policy);
  return {
    value: hasValue ? value : null,
    threshold,
    thresholdConfigured,
    prior_approval_required: req,
    prior_approval_obtained: obtained,
    compliance_status: compliance,
    absoluteLimit: abs,
    isAbsoluteBreach: hasValue && abs !== null && value >= abs,
  };
}

// Build the audit-integrity snapshot to persist on a declaration at submission,
// fixing its compliance result against the rules in force at the time.
export function policySnapshot(governingPolicy, type) {
  if (!governingPolicy) {
    return {
      applicable_threshold: null,
      governing_policy: null,
      governing_policy_name: "",
      governing_policy_version: "",
    };
  }
  return {
    applicable_threshold: getThresholdForType(governingPolicy, type),
    governing_policy: governingPolicy.id,
    governing_policy_name: governingPolicy.policy_name || "",
    governing_policy_version: governingPolicy.version || "",
  };
}