import { bootstrapInitialAdmin } from "./adminBootstrap.ts";
import { createAdminRepository } from "../repositories/adminRepository.ts";

export function openKv(path?: string): Promise<Deno.Kv> {
  return Deno.openKv(path);
}

export const kv = openKv().then(async (db) => {
  await bootstrapInitialAdmin(createAdminRepository(db));
  return db;
});
