import { type Admin, validateAdminIdentity } from "../types/Admin.ts";
import {
  type AdminRepository,
  DuplicateAdminEmailError,
} from "../repositories/adminRepository.ts";
import { hashPassword, validatePassword } from "./password.ts";

/**
 * Creates the first administrator from deployment secrets. Repeated calls are
 * safe and an existing account is always returned unchanged.
 */
export async function bootstrapInitialAdmin(
  repo: AdminRepository,
): Promise<Admin | null> {
  const configuredEmail = Deno.env.get("INITIAL_ADMIN_EMAIL");
  const configuredName = Deno.env.get("INITIAL_ADMIN_NAME");
  const password = Deno.env.get("INITIAL_ADMIN_PASSWORD");

  if (
    configuredEmail === undefined || configuredName === undefined ||
    password === undefined
  ) return null;

  const email = configuredEmail.trim();
  const name = configuredName.trim();
  const identityError = validateAdminIdentity(email, name);
  if (identityError) throw new Error(identityError);
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  const existing = await repo.getByEmail(email);
  if (existing) return existing;

  // Environment secrets are provisioning inputs, not an ongoing admin-create
  // API. Once any administrator exists, changing INITIAL_ADMIN_EMAIL must not
  // silently mint another superadmin on the next deployment.
  if ((await repo.list()).length > 0) return null;

  const passwordRecord = await hashPassword(password);
  try {
    return await repo.createInitial({
      email,
      name,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt,
      role: "superadmin",
    });
  } catch (error) {
    // Two app instances can bootstrap the same fresh KV concurrently. The
    // normalized-email reservation picks one winner; the other returns it.
    if (error instanceof DuplicateAdminEmailError) {
      return await repo.getByEmail(email);
    }
    throw error;
  }
}
