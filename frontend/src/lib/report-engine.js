// Pure report-building helpers shared by the Report Builder page: resolving
// reference fields to display labels, applying AND-combined filters (each
// multi-select being OR within its field), sorting, and a plain-English
// summary of the active filters for export headers.

import { formatDate } from "@/lib/risk-helpers";

export function lookupLabel(lookups, field, id) {
  const list = (lookups && lookups[field.lookup]) || [];
  const rec = list.find((x) => x.id === id);
  if (!rec) return "";
  return rec[field.labelField] || rec.name || rec.email || rec.id || "";
}

export function displayValue(source, record, key, lookups) {
  if (!record) return "";
  const f = source.fields[key];
  const raw = record[key];
  if (raw == null || raw === "") return "";
  if (!f) return raw;
  if (f.kind === "ref") return lookupLabel(lookups, f, raw) || "—";
  if (f.kind === "date") return formatDate(raw);
  return raw;
}

export function matchesFilters(source, record, filters) {
  for (const fdef of source.filters) {
    const v = filters ? filters[fdef.key] : undefined;
    if (v == null) continue;
    const rv = record[fdef.key];
    if (fdef.type === "enum-multi" || fdef.type === "ref-multi") {
      if (Array.isArray(v) && v.length && !v.includes(rv)) return false;
    } else if (fdef.type === "ref-single") {
      if (v && rv !== v) return false;
    } else if (fdef.type === "number-range") {
      const { min, max } = v || {};
      const hasMin = min != null && min !== "";
      const hasMax = max != null && max !== "";
      if (hasMin || hasMax) {
        const n = Number(rv);
        if (Number.isNaN(n)) return false;
        if (hasMin && n < Number(min)) return false;
        if (hasMax && n > Number(max)) return false;
      }
    } else if (fdef.type === "date-range") {
      const { from, to } = v || {};
      if (from || to) {
        if (!rv) return false;
        const d = new Date(rv);
        if (from && d < new Date(from)) return false;
        if (to && d > new Date(to + "T23:59:59")) return false;
      }
    } else if (fdef.type === "text-contains") {
      if (v && !String(rv ?? "").toLowerCase().includes(String(v).toLowerCase())) return false;
    }
  }
  return true;
}

export function sortOptions(source) {
  return Object.entries(source.fields)
    .filter(([, f]) => ["text", "number", "date", "enum"].includes(f.kind))
    .map(([key, f]) => ({ key, label: f.label }));
}

export function sortRecords(source, records, sortField, direction, lookups) {
  if (!sortField) return records;
  const f = source.fields[sortField];
  const dir = direction === "desc" ? -1 : 1;
  const valueOf = (r) => {
    const raw = r[sortField];
    if (f && f.kind === "ref") return lookupLabel(lookups, f, raw) || "";
    return raw;
  };
  return [...records].sort((a, b) => {
    const av = valueOf(a);
    const bv = valueOf(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (f && f.kind === "number") return (Number(av) - Number(bv)) * dir;
    if (f && f.kind === "date") return (new Date(av) - new Date(bv)) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

export function filtersSummary(source, filters, lookups) {
  const parts = [];
  const nameOf = (lookup, labelField, id) => {
    const rec = ((lookups && lookups[lookup]) || []).find((x) => x.id === id);
    return rec ? rec[labelField] || rec.name || rec.email || id : id;
  };
  for (const fdef of source.filters) {
    const v = filters ? filters[fdef.key] : undefined;
    if (v == null) continue;
    if (fdef.type === "enum-multi") {
      if (Array.isArray(v) && v.length) parts.push(`${fdef.label}: ${v.join(" OR ")}`);
    } else if (fdef.type === "ref-multi") {
      if (Array.isArray(v) && v.length) {
        const labels = v.map((id) => nameOf(fdef.lookup, fdef.labelField, id));
        parts.push(`${fdef.label}: ${labels.join(" OR ")}`);
      }
    } else if (fdef.type === "ref-single") {
      if (v) parts.push(`${fdef.label}: ${nameOf(fdef.lookup, fdef.labelField, v)}`);
    } else if (fdef.type === "number-range") {
      const { min, max } = v || {};
      if ((min != null && min !== "") || (max != null && max !== "")) {
        parts.push(`${fdef.label}: ${min ?? ""}–${max ?? ""}`);
      }
    } else if (fdef.type === "date-range") {
      const { from, to } = v || {};
      if (from || to) parts.push(`${fdef.label}: ${from || "…"} → ${to || "…"}`);
    } else if (fdef.type === "text-contains") {
      if (v) parts.push(`${fdef.label}: contains "${v}"`);
    }
  }
  return parts.length ? parts.join("   ·   ") : "All records (no filters applied)";
}