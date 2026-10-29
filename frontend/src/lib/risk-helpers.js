export const scoreBand = (score) => {
  if (score == null || score === '') return null;
  const n = Number(score);
  if (Number.isNaN(n)) return null;
  if (n <= 6) return "green";
  if (n <= 12) return "amber";
  return "red";
};

export const bandChip = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-300",
  amber: "bg-amber-100 text-amber-800 border-amber-300",
  red: "bg-red-100 text-red-800 border-red-300",
};

export const bandDot = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export const ragDot = {
  Green: "bg-emerald-500",
  Amber: "bg-amber-500",
  Red: "bg-red-500",
};

export const tierStyles = {
  Strategic: "bg-violet-100 text-violet-800 border-violet-300",
  Operational: "bg-slate-100 text-slate-700 border-slate-300",
  Departmental: "bg-indigo-100 text-indigo-800 border-indigo-300",
  "Project & Change": "bg-teal-100 text-teal-800 border-teal-300",
};

// TAB four-level risk register hierarchy. Categories are a separate
// classification applied across all levels — they are NOT levels.
export const RISK_LEVELS = [
  { value: "Strategic", label: "Level 1 — Strategic", owner: "CRO", review: "Monthly (ERC) · Quarterly (Board)" },
  { value: "Operational", label: "Level 2 — Operational", owner: "CRO + Function Heads", review: "Monthly (ERC)" },
  { value: "Departmental", label: "Level 3 — Departmental", owner: "Head of Function", review: "Monthly (self) · Quarterly (ERC)" },
  { value: "Project & Change", label: "Level 4 — Project & Change", owner: "Project / Programme Lead", review: "Per milestone" },
];

// The level a risk of the given tier escalates UP into via parent_risk.
// Strategic is the top level (no parent); Operational feeds Strategic;
// Departmental and Project & Change both feed Operational.
export const escalationTarget = (tier) => {
  if (tier === "Departmental" || tier === "Project & Change") return "Operational";
  if (tier === "Operational") return "Strategic";
  return null;
};

export const statusStyles = {
  Open: "bg-blue-100 text-blue-800",
  Monitoring: "bg-amber-100 text-amber-800",
  Closed: "bg-slate-100 text-slate-600",
};

export const calcScore = (l, i) => {
  const ln = Number(l), in_ = Number(i);
  if (!ln || !in_) return null;
  return ln * in_;
};

export const formatGbp = (n) =>
  n == null || n === "" ? "—"
    : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(n));

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

// Parse a human-entered number: strips thousands separators and currency,
// and honours k / m / bn suffixes ("£5M" -> 5,000,000; "£800,000" -> 800,000;
// "40% (single region)" -> 40). "12 months" stays 12 (suffix must stand alone).
export const parseKriNumber = (s) => {
  if (s == null || s === "") return null;
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  const str = String(s).replace(/,/g, "").trim();
  const m = str.match(/(-?\d+(?:\.\d+)?)\s*(bn|b|m|k)?(?![a-z])/i);
  if (!m) return null;
  let v = parseFloat(m[1]);
  const suf = (m[2] || "").toLowerCase();
  if (suf === "k") v *= 1e3;
  else if (suf === "m") v *= 1e6;
  else if (suf === "b" || suf === "bn") v *= 1e9;
  return v;
};

// Which way is bad? Explicit `direction` wins; otherwise infer from a leading
// < or > on the red threshold text ("<100%" = lower is worse); default higher.
export const kriDirection = (k) => {
  if (k?.direction === "Lower is worse" || k?.direction === "Higher is worse") return k.direction;
  const t = String(k?.red_threshold ?? "").trim();
  if (/^(<|≤|below|under|less)/i.test(t)) return "Lower is worse";
  return "Higher is worse";
};

// KRI RAG against numeric triggers. Uses the numeric fields (amber_trigger,
// red_trigger, current_value_num) when set, else parses the legacy text fields.
// A value AT or BEYOND a trigger takes that colour. No value -> no RAG
// (it is never guessed from trend).
export const kriRag = (k) => {
  if (!k) return null;
  const cur = k.current_value_num ?? parseKriNumber(k.current_value);
  const red = k.red_trigger ?? parseKriNumber(k.red_threshold);
  const amber = k.amber_trigger ?? parseKriNumber(k.amber_threshold);
  const green = parseKriNumber(k.green_threshold); // green boundary, used only if no amber trigger
  if (cur == null || (red == null && amber == null && green == null)) return null;
  const lowerWorse = kriDirection(k) === "Lower is worse";
  const atOrBeyond = (limit) => (lowerWorse ? cur <= limit : cur >= limit);
  const strictlyBeyond = (limit) => (lowerWorse ? cur < limit : cur > limit);
  if (red != null && atOrBeyond(red)) return "Red";
  if (amber != null) return atOrBeyond(amber) ? "Amber" : "Green";
  if (green != null && strictlyBeyond(green)) return "Amber";
  return "Green";
};

// A KRI is stale when its next update date has passed.
export const isKriStale = (k) => {
  if (!k?.next_update_due) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(k.next_update_due) < today;
};

// Default appetite limits (max residual score on the 5x5 grid) by appetite
// level. Each Appetite record can override with max_residual_score /
// tolerance_score.
export const APPETITE_DEFAULT_LIMITS = { Zero: 3, Averse: 6, Cautious: 9, Moderate: 12, Open: 16 };
export const APPETITE_TOLERANCE_GAP = 4;

// Resolve a category's appetite limit + tolerance from the Appetite register.
// Several statements for one category -> the strictest (lowest) limit applies.
export const appetiteFor = (appetites, categoryId) => {
  if (!categoryId || !Array.isArray(appetites)) return null;
  let best = null;
  for (const a of appetites) {
    if (a.category !== categoryId) continue;
    const limit = Number(a.max_residual_score) || APPETITE_DEFAULT_LIMITS[a.appetite_level];
    if (!limit) continue;
    const tolerance = Math.min(25, Math.max(limit, Number(a.tolerance_score) || limit + APPETITE_TOLERANCE_GAP));
    if (!best || limit < best.limit) best = { limit, tolerance, level: a.appetite_level, statement: a.qualitative_statement, id: a.id };
  }
  return best;
};

// Appetite RAG for a risk.
// With a category appetite (preferred): Green = residual within the appetite
// limit; Amber = outside appetite but within tolerance; Red = beyond tolerance.
// The owner's target score no longer moves the RAG when an appetite exists.
// Without one, falls back to target-based / absolute bands.
export const computeAppetite = (residualScore, targetScore, appetite) => {
  const r = Number(residualScore);
  if (residualScore == null || Number.isNaN(r)) return null;
  if (appetite && appetite.limit) {
    if (r <= appetite.limit) return "Green";
    if (r <= appetite.tolerance) return "Amber";
    return "Red";
  }
  const t = Number(targetScore);
  if (targetScore == null || Number.isNaN(t)) {
    if (r <= 6) return "Green";
    if (r <= 12) return "Amber";
    return "Red";
  }
  if (r <= t) return "Green";
  if (r <= t + 6) return "Amber";
  return "Red";
};

// A risk's review is overdue when its next_review date has passed and it isn't closed.
export const isReviewOverdue = (r) => {
  if (!r || !r.next_review || r.status === "Closed") return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(r.next_review) < today;
};

// Build a map of riskId -> residual_score at last review, from ChangeLog history.
// Iterates newest-first; takes the most recent "previous" residual_score (the `from`
// of the latest update that changed it, else the create snapshot).
export const buildPrevScoreMap = (changeLogs) => {
  const map = {};
  for (const cl of changeLogs || []) {
    if (cl.entity !== "Risk") continue;
    const rid = cl.record_id;
    if (!rid || map[rid] !== undefined) continue;
    let payload = {};
    try { payload = JSON.parse(cl.changes || "{}"); } catch { payload = {}; }
    if (cl.action === "updated" && Array.isArray(payload.changes)) {
      const ch = payload.changes.find((c) => c.field === "residual_score");
      if (ch && ch.from != null && ch.from !== "") { map[rid] = Number(ch.from); continue; }
    }
    if (cl.action === "created" && payload.snapshot?.residual_score != null) {
      map[rid] = Number(payload.snapshot.residual_score);
    }
  }
  return map;
};