import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { TEST_DATA_ENTITIES } from "../../shared/test-data-entities.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Batch the per-entity counts to avoid firing ~28 parallel calls in a single
    // tick, which trips the platform per-second API rate limit.
    const results: [string, number][] = [];
    const CHUNK = 6;
    for (let i = 0; i < TEST_DATA_ENTITIES.length; i += CHUNK) {
      const batch = TEST_DATA_ENTITIES.slice(i, i + CHUNK);
      const batchResults = await Promise.all(
        batch.map(async (entity) => {
          try {
            const recs = await base44.asServiceRole.entities[entity].filter({ is_test_data: "Yes" }, "-created_date", 10000);
            return [entity, Array.isArray(recs) ? recs.length : 0] as [string, number];
          } catch (_e) {
            return [entity, 0] as [string, number];
          }
        })
      );
      results.push(...batchResults);
    }
    const counts: Record<string, number> = Object.fromEntries(results);
    const total = results.reduce((s, [, n]) => s + n, 0);
    return Response.json({ counts, total });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});