import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Rolling 12-month "drip bribery" check. The cumulative limit is read from the
// single governing anti-bribery policy (Policy flagged governs_gh_register = "Yes"):
//   - use cumulative_limit if the policy sets one;
//   - else fall back to the larger of the gift / hospitality approval thresholds;
//   - else skip flagging (limits not configured).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const [decls, policies] = await Promise.all([
      base44.asServiceRole.entities.GiftHospitalityDeclaration.list(),
      base44.asServiceRole.entities.Policy.list(),
    ]);

    const flagged = policies.filter((p) => p && p.governs_gh_register === "Yes");
    flagged.sort((a, b) => (b.limits_effective_date || "").localeCompare(a.limits_effective_date || ""));
    const gov = flagged[0] || null;

    let limit = null;
    if (gov) {
      if (gov.cumulative_limit != null && gov.cumulative_limit !== "") {
        const v = Number(gov.cumulative_limit);
        if (isFinite(v)) limit = v;
      }
      if (limit === null) {
        const g = Number(gov.gift_approval_threshold);
        const h = Number(gov.hospitality_approval_threshold);
        const vals = [g, h].filter((v) => isFinite(v));
        if (vals.length) limit = Math.max(...vals);
      }
    }
    if (limit === null) {
      return Response.json({
        pairs_checked: 0,
        pairs_flagged: 0,
        records_updated: 0,
        skipped: "no governing anti-bribery policy / cumulative limit configured",
      });
    }

    const now = new Date();
    const since = new Date(now); since.setFullYear(since.getFullYear() - 1);
    const sinceStr = since.toISOString().slice(0, 10);

    // group by employee + counterparty
    const groups = {};
    for (const d of decls) {
      if (!d.employee || !d.counterparty) continue;
      if (d.date && d.date < sinceStr) continue;
      const key = `${d.employee}||${d.counterparty}`;
      if (!groups[key]) groups[key] = { employee: d.employee, counterparty: d.counterparty, ids: [], total: 0 };
      groups[key].ids.push(d.id);
      if (typeof d.estimated_value === "number") groups[key].total += d.estimated_value;
    }

    const flaggedPairs = Object.values(groups).filter((g) => g.total > limit);
    let updated = 0;
    for (const g of flaggedPairs) {
      for (const id of g.ids) {
        const d = decls.find((x) => x.id === id);
        if (d && (d.cumulative_flag !== true || d.cumulative_value !== g.total)) {
          const patch = { cumulative_flag: true, cumulative_value: g.total };
          if (d.compliance_status === "Within Policy") patch.compliance_status = "Requires Review";
          await base44.asServiceRole.entities.GiftHospitalityDeclaration.update(id, patch);
          updated += 1;
        }
      }
    }

    // Clear flags for pairs no longer over threshold (e.g. records aged out).
    const flaggedIds = new Set(flaggedPairs.flatMap((g) => g.ids));
    for (const d of decls) {
      if (d.cumulative_flag && !flaggedIds.has(d.id)) {
        await base44.asServiceRole.entities.GiftHospitalityDeclaration.update(d.id, {
          cumulative_flag: false,
          cumulative_value: null,
        });
        updated += 1;
      }
    }

    return Response.json({
      pairs_checked: Object.keys(groups).length,
      pairs_flagged: flaggedPairs.length,
      records_updated: updated,
      limit,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});