import { base44 } from "@/api/base44Client";

const refNum = (ref) => {
  const m = String(ref || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};
const fmt = (n) => `RISK-${String(n).padStart(4, "0")}`;

// Highest RISK-nnnn across the WHOLE register (not just the first page the
// screen happens to have loaded).
async function maxRef() {
  const all = await base44.entities.Risk.list("-created_date", 10000);
  return all.reduce((m, r) => Math.max(m, refNum(r.risk_ref)), 0);
}

// Make sure a just-created risk has a reference nobody else holds. Two people
// saving at the same moment can both pick the same "next" number; whichever
// record was created second detects the clash and moves to a fresh number.
export async function ensureUniqueRiskRef(created) {
  if (!created?.id) return created;
  const id = created.id;
  for (let attempt = 0; attempt < 5; attempt++) {
    const clashes = await base44.entities.Risk.filter({ risk_ref: created.risk_ref });
    const others = clashes.filter((r) => r.id !== id);
    if (others.length === 0) return created;
    // The earliest-created holder keeps the number; later ones move.
    const sorted = [...clashes].sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)) || String(a.id).localeCompare(String(b.id)));
    if (sorted[0].id === id) return created;
    const next = fmt((await maxRef()) + 1 + attempt);
    await base44.entities.Risk.update(id, { risk_ref: next });
    created = { ...created, id, risk_ref: next };
  }
  return created;
}

export async function nextRiskRef() {
  return fmt((await maxRef()) + 1);
}
