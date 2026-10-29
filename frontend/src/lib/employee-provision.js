import { base44 } from "@/api/base44Client";

// Provision (or find) a platform User account for an employee email.
// Returns the User id, or null if it could not be resolved/created.
export async function provisionLogin(email) {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  try {
    const existing = await base44.entities.User.filter({ email: e });
    if (existing && existing.length) return existing[0].id;
  } catch (err) {
    // ignore — try invite below
  }
  try {
    await base44.users.inviteUser(e, "user");
  } catch (err) {
    // may already be invited — fall through to lookup
  }
  try {
    const found = await base44.entities.User.filter({ email: e });
    if (found && found.length) return found[0].id;
  } catch (err) {
    // ignore
  }
  return null;
}