// Bootstraps the initial administrator account from environment variables so
// a fresh deployment/dev environment always has at least one admin able to
// log in, without ever storing a plaintext password (even temporarily) or
// overwriting an existing account.
//
// Reads INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, and INITIAL_ADMIN_PASSWORD.
// If any are unset, this is a no-op (returns null) — a KV test environment
// or early dev setup may not have these configured. If an admin with the
// normalized email already exists, that admin is returned unchanged: the
// bootstrap never overwrites an existing account and is safe to run on
// every app start.

import type { Admin } from "../types/Admin.ts";
import type { AdminRepository } from "../repositories/adminRepository.ts";
import { normalizeEmail } from "../repositories/keys.ts";

// TEMPORARY: unsalted SHA-256 placeholder until Task 2 adds lib/passwords.ts
// with real PBKDF2 hashing + salt. Task 2 must replace this function and is
// expected to re-hash or reset the bootstrapped admin's password using the
// real module.
async function temporaryHashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function bootstrapInitialAdmin(
  repo: AdminRepository,
): Promise<Admin | null> {
  const email = Deno.env.get("INITIAL_ADMIN_EMAIL");
  const name = Deno.env.get("INITIAL_ADMIN_NAME");
  const password = Deno.env.get("INITIAL_ADMIN_PASSWORD");

  if (!email || !name || !password) return null;

  const existing = await repo.getByEmail(normalizeEmail(email));
  if (existing) return existing;

  const passwordHash = await temporaryHashPassword(password);
  return repo.create({ email, name, passwordHash });
}
