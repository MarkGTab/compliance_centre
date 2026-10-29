import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden — only an administrator can manage permissions" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetId = body.target_user;
    const incoming = Array.isArray(body.permissions) ? body.permissions : [];

    if (!targetId) return Response.json({ error: "target_user required" }, { status: 400 });
    if (targetId === user.id) {
      return Response.json({ error: "You cannot edit your own permissions" }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    const targetList = await svc.entities.User.filter({ id: targetId });
    const targetUser = targetList && targetList[0];
    if (!targetUser) return Response.json({ error: "Target user not found" }, { status: 404 });
    if (targetUser.role === "admin") {
      return Response.json({ error: "Administrator access is role-based and cannot be adjusted here" }, { status: 400 });
    }

    // existing records for the target
    const existing = await svc.entities.Permission.filter({ user: targetId });
    const prevMap = {};
    for (const p of existing) prevMap[p.section] = p;

    // desired: only granted sections get a record (absence = deny by default)
    const desired = {};
    for (const p of incoming) {
      if (!p.section) continue;
      const view = p.can_view === "Yes";
      const edit = view && p.can_edit === "Yes";
      if (view) desired[p.section] = { can_view: "Yes", can_edit: edit ? "Yes" : "No" };
    }

    const toDelete = [];
    const toCreate = [];
    const changes = [];

    for (const p of existing) {
      const d = desired[p.section];
      if (!d) {
        toDelete.push(p);
        changes.push({ section: p.section, from: { view: p.can_view, edit: p.can_edit }, to: null });
      } else if (d.can_view !== p.can_view || d.can_edit !== p.can_edit) {
        toDelete.push(p);
        toCreate.push({ section: p.section, ...d });
        changes.push({ section: p.section, from: { view: p.can_view, edit: p.can_edit }, to: { view: d.can_view, edit: d.can_edit } });
      }
    }
    for (const [sec, d] of Object.entries(desired)) {
      if (!prevMap[sec]) {
        toCreate.push({ section: sec, ...d });
        changes.push({ section: sec, from: null, to: { view: d.can_view, edit: d.can_edit } });
      }
    }

    for (const p of toDelete) await svc.entities.Permission.delete(p.id);
    if (toCreate.length) {
      await svc.entities.Permission.bulkCreate(
        toCreate.map((c) => ({ user: targetId, section: c.section, can_view: c.can_view, can_edit: c.can_edit }))
      );
    }

    // audit trail — who changed whose access, which sections, from -> to, when
    await svc.entities.ChangeLog.create({
      entity: "Permission",
      record_id: targetId,
      record_ref: targetUser.email || targetId,
      action: "updated",
      changes: JSON.stringify({
        by: user.email,
        by_id: user.id,
        target: targetUser.email,
        target_id: targetId,
        changes,
      }),
      user: user.id,
      user_name: user.email,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, created: toCreate.length, deleted: toDelete.length, changes: changes.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});