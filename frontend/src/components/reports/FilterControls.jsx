import React from "react";

const cardCls = "rounded-md border border-border bg-white p-3";

export default function FilterControls({ source, lookups, filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });
  const toggleMulti = (key, val) => {
    const arr = Array.isArray(filters[key]) ? filters[key] : [];
    set(key, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };
  const lookupOptions = (f) => (lookups && lookups[f.lookup]) || [];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {source.filters.map((f) => {
        const val = filters[f.key];
        return (
          <div key={f.key} className={cardCls}>
            <div className="mb-2 text-xs font-semibold text-foreground">{f.label}</div>

            {(f.type === "enum-multi") && (
              <div className="flex flex-wrap gap-1.5">
                {f.options.map((opt) => {
                  const on = Array.isArray(val) && val.includes(opt);
                  return (
                    <button key={opt} type="button" onClick={() => toggleMulti(f.key, opt)}
                      className={`rounded-full border px-2 py-0.5 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {(f.type === "ref-multi") && (
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {lookupOptions(f).map((opt) => {
                  const on = Array.isArray(val) && val.includes(opt.id);
                  return (
                    <button key={opt.id} type="button" onClick={() => toggleMulti(f.key, opt.id)}
                      className={`rounded-full border px-2 py-0.5 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {opt[f.labelField] || opt.name || opt.email || opt.id}
                    </button>
                  );
                })}
                {lookupOptions(f).length === 0 && <span className="text-xs text-muted-foreground">None available.</span>}
              </div>
            )}

            {(f.type === "ref-single") && (
              <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm" value={val || ""} onChange={(e) => set(f.key, e.target.value || null)}>
                <option value="">Any</option>
                {lookupOptions(f).map((opt) => <option key={opt.id} value={opt.id}>{opt[f.labelField] || opt.name || opt.email || opt.id}</option>)}
              </select>
            )}

            {(f.type === "number-range") && (
              <div className="flex items-center gap-2">
                <input type="number" placeholder="min" value={val?.min ?? ""} onChange={(e) => set(f.key, { ...(val || {}), min: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm" />
                <span className="text-xs text-muted-foreground">to</span>
                <input type="number" placeholder="max" value={val?.max ?? ""} onChange={(e) => set(f.key, { ...(val || {}), max: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm" />
              </div>
            )}

            {(f.type === "date-range") && (
              <div className="flex items-center gap-2">
                <input type="date" value={val?.from ?? ""} onChange={(e) => set(f.key, { ...(val || {}), from: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm" />
                <span className="text-xs text-muted-foreground">→</span>
                <input type="date" value={val?.to ?? ""} onChange={(e) => set(f.key, { ...(val || {}), to: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm" />
              </div>
            )}

            {(f.type === "text-contains") && (
              <input type="text" placeholder="contains…" value={val || ""} onChange={(e) => set(f.key, e.target.value || null)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm" />
            )}
          </div>
        );
      })}
    </div>
  );
}