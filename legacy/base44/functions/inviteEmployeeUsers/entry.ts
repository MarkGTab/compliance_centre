import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Invites a platform User for every Employee that has no linked_user, then links
// the account back (linked_user + requires_login = Yes). This makes the built-in
// SendEmail integration (registered users only) able to deliver attestation magic
// links and other notifications to every employee. Idempotent. Admin-only.
//
// Role assigned: "user" (read-only default). Adjust per organisational policy later
// from the Permissions screen.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let me = null;
    try { me = await base44.auth.me(); } catch (e) {}
    if (!me || me.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const employees = await base44.asServiceRole.entities.Employee.list();
    const users = await base44.asServiceRole.entities.User.list();
    const userByEmail = Object.fromEntries(users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]));

    let invited = 0;
    let linked = 0;
    let skipped = 0;
    const errors = [];

    for (const e of employees) {
      if (e.linked_user) { skipped += 1; continue; }
      if (!e.email) { errors.push({ employee: e.id, error: "no email" }); continue; }
      // If a User already exists for this email, just link it.
      const existing = userByEmail[e.email.toLowerCase()];
      if (existing) {
        try {
          await base44.asServiceRole.entities.Employee.update(e.id, { linked_user: existing.id, requires_login: "Yes" });
          linked += 1;
        } catch (err) { errors.push({ employee: e.id, error: err.message }); }
        continue;
      }
      // Otherwise invite a new User.
      try {
        await base44.asServiceRole.users.inviteUser(e.email, "user");
        invited += 1;
        // The invited User may not be listable immediately; refresh and link.
        const fresh = await base44.asServiceRole.entities.User.list();
        const u = fresh.find((x) => (x.email || "").toLowerCase() === e.email.toLowerCase());
        if (u) {
          await base44.asServiceRole.entities.Employee.update(e.id, { linked_user: u.id, requires_login: "Yes" });
          userByEmail[u.email.toLowerCase()] = u;
        }
      } catch (err) {
        errors.push({ employee: e.id, email: e.email, error: err.message });
      }
    }

    return Response.json({ invited, linked, skipped, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});