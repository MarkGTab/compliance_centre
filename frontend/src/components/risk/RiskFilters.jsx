import React from "react";


const TIERS = ["Strategic", "Operational", "Departmental", "Project & Change"];

export default function RiskFilters({ filters, setFilters, categories, departments, users }) {
  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v || undefined }));

  const selectCls =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {TIERS.map((t) => {
          const active = filters.tier === t;
          return (
            <button
              key={t}
              onClick={() => update("tier", active ? null : t)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              active ?
              "border-primary bg-primary text-primary-foreground" :
              "border-border bg-background text-foreground hover:bg-muted"}`
              }>
              
              {t}
            </button>);

        })}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <FilterSelect
          value={filters.category || ""}
          onChange={(v) => update("category", v)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="All Categories" />
        
        <FilterSelect
          value={filters.department || ""}
          onChange={(v) => update("department", v)}
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          placeholder="All Departments" />
        
        <FilterSelect
          value={filters.owner || ""}
          onChange={(v) => update("owner", v)}
          options={users.map((u) => ({ value: u.id, label: u.full_name || u.email }))}
          placeholder="All Owners" />
        
        <FilterSelect
          value={filters.appetite || ""}
          onChange={(v) => update("appetite", v)}
          options={[
          { value: "Green", label: "Green" },
          { value: "Amber", label: "Amber" },
          { value: "Red", label: "Red" }]
          }
          placeholder="Appetite (RAG)" />
        
        <FilterSelect
          value={filters.status || ""}
          onChange={(v) => update("status", v)}
          options={[
          { value: "Open", label: "Open" },
          { value: "Monitoring", label: "Monitoring" },
          { value: "Closed", label: "Closed" }]
          }
          placeholder="All Statuses" />
        
      </div>
    </div>);

}

function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <div className="relative mx-3">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-input bg-background px-2 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
        
        <option value="">{placeholder}</option>
        {options.map((o) =>
        <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )}
      </select>
    </div>);

}