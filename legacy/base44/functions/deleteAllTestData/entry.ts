import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { TEST_DATA_ENTITIES } from "../../shared/test-data-entities.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden: administrator only" }, { status: 403 });

    const deleted: Record<string, number> = {};
    const errors: { entity: string; error: string }[] = [];
    let total = 0;

    // Dependency order (children before parents) is supplied by TEST_DATA_ENTITIES.
    // deleteMany only matches is_test_data = Yes — real data (No / unset) is never touched.
    for (const entity of TEST_DATA_ENTITIES) {
      try {
        if (entity === "User") {
          // Bulk delete is blocked for user accounts; delete flagged test users one by one.
          const users = await base44.asServiceRole.entities.User.filter({ is_test_data: "Yes" }, "-created_date", 10000);
          let n = 0;
          for (const u of users) {
            try { await base44.asServiceRole.entities.User.delete(u.id); n++; }
            catch (e) { errors.push({ entity: "User", error: (e as Error).message }); }
          }
          if (n > 0) { deleted["User"] = n; total += n; }
        } else {
          const res = await base44.asServiceRole.entities[entity].deleteMany({ is_test_data: "Yes" });
          const n = (res && typeof res.deleted === "number") ? res.deleted : 0;
          if (n > 0) { deleted[entity] = n; total += n; }
        }
      } catch (e) {
        errors.push({ entity, error: (e as Error).message });
      }
    }

    return Response.json({ deleted, total, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});