import { bootstrapInitialAdmin } from "./adminBootstrap.ts";
import { createAdminRepository } from "../repositories/adminRepository.ts";

export function openKv(path?: string): Promise<Deno.Kv> {
  return Deno.openKv(path);
}

// Opens the database and then attempts to bootstrap the initial admin.
// A bootstrap failure (e.g. DuplicateAdminEmailError from a race between two
// processes/isolates bootstrapping the same email concurrently, or the
// exhausted-retries error from adminRepository.create) is logged but must
// never reject the returned promise: every service in this app does
// `await kv` to get its repository, so a rejected `kv` would permanently
// break the whole app for the life of this module instance. The promise
// always resolves to the opened `Deno.Kv` instance, regardless of whether
// bootstrap succeeded, failed, or threw.
export async function openAndBootstrap(path?: string): Promise<Deno.Kv> {
  const db = await openKv(path);
  try {
    await bootstrapInitialAdmin(createAdminRepository(db));
  } catch (err) {
    console.error("Admin bootstrap failed:", err);
  }
  return db;
}

export const kv = openAndBootstrap();
