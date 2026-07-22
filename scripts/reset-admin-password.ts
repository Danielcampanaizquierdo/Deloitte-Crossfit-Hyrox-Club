/**
 * Reset the password of an existing admin account.
 *
 * Usage (local):
 *   deno run -A --unstable-kv scripts/reset-admin-password.ts
 *
 * Usage (production via Deno Deploy link):
 *   DENO_KV_ACCESS_TOKEN=<token> deno run -A --unstable-kv \
 *     scripts/reset-admin-password.ts <kv-url>
 *
 * Environment variables:
 *   RESET_ADMIN_EMAIL     - email of the admin to reset (required)
 *   RESET_ADMIN_PASSWORD  - new password (required, min 8 chars)
 */

import { hashPassword, validatePassword } from "../lib/password.ts";
import { normalizeEmail } from "../repositories/keys.ts";

const email = Deno.env.get("RESET_ADMIN_EMAIL");
const newPassword = Deno.env.get("RESET_ADMIN_PASSWORD");
const kvUrl = Deno.args[0];

if (!email || !newPassword) {
  console.error(
    "Set RESET_ADMIN_EMAIL and RESET_ADMIN_PASSWORD before running.",
  );
  Deno.exit(1);
}

const passwordError = validatePassword(newPassword);
if (passwordError) {
  console.error(`Invalid password: ${passwordError}`);
  Deno.exit(1);
}

const kv = await Deno.openKv(kvUrl);

const normalizedEmail = normalizeEmail(email);
const indexEntry = await kv.get<string>(["admins_by_email", normalizedEmail]);
if (!indexEntry.value) {
  console.error(`No admin found with email: ${email}`);
  kv.close();
  Deno.exit(1);
}

const adminId = indexEntry.value;
const adminEntry = await kv.get<Record<string, unknown>>(["admins", adminId]);
if (!adminEntry.value) {
  console.error(`Admin record missing for id: ${adminId}`);
  kv.close();
  Deno.exit(1);
}

const { hash, salt } = await hashPassword(newPassword);
const updated = { ...adminEntry.value, passwordHash: hash, passwordSalt: salt, updatedAt: new Date() };

const res = await kv.atomic()
  .check(adminEntry)
  .set(["admins", adminId], updated)
  .commit();

kv.close();

if (res.ok) {
  console.log(`✓ Password reset for admin: ${email}`);
} else {
  console.error("Commit failed (concurrent write). Try again.");
  Deno.exit(1);
}
