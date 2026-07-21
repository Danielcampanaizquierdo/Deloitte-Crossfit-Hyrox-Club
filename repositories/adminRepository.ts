// Admin repository — persists Admin records in Deno KV along with the
// admins_by_email secondary index described in
// docs/plans/2026-07-21-admin-control-panel-design.md.
//
// Admins are never deleted, only deactivated. Every create/deactivate is a
// single kv.atomic() transaction that checks the primary record's
// versionstamp and writes the primary entry (and, for create, the email
// index) together. On a false `ok` commit result, the operation rereads
// current state and retries, up to MAX_RETRIES times.
//
// Admin creation additionally reserves the normalized email atomically: the
// transaction checks that admins_by_email has no existing entry
// (versionstamp: null) before writing the admin and its index. If that check
// fails because the email is already taken, DuplicateAdminEmailError is
// thrown.

import type { Admin } from "../types/Admin.ts";
import { adminEmailKey, adminKey, normalizeEmail } from "./keys.ts";

const MAX_RETRIES = 3;

export class DuplicateAdminEmailError extends Error {
  constructor(email: string) {
    super(`Admin with email "${email}" already exists`);
    this.name = "DuplicateAdminEmailError";
  }
}

function generateId(): string {
  return `adm-${crypto.randomUUID()}`;
}

export interface CreateAdminRequest {
  email: string;
  name: string;
  passwordHash: string;
}

export interface AdminRepository {
  get(id: string): Promise<Admin | null>;
  getByEmail(email: string): Promise<Admin | null>;
  list(): Promise<Admin[]>;
  create(data: CreateAdminRequest): Promise<Admin>;
  deactivate(id: string): Promise<Admin | null>;
}

export function createAdminRepository(kv: Deno.Kv): AdminRepository {
  async function get(id: string): Promise<Admin | null> {
    const entry = await kv.get<Admin>(adminKey(id));
    return entry.value;
  }

  async function getByEmail(email: string): Promise<Admin | null> {
    const index = await kv.get<string>(adminEmailKey(email));
    if (index.value === null) return null;
    const record = await kv.get<Admin>(adminKey(index.value));
    return record.value;
  }

  async function list(): Promise<Admin[]> {
    const admins: Admin[] = [];
    for await (const entry of kv.list<Admin>({ prefix: ["admins"] })) {
      if (entry.value) admins.push(entry.value);
    }
    return admins;
  }

  async function create(data: CreateAdminRequest): Promise<Admin> {
    const id = generateId();
    const normalizedEmail = normalizeEmail(data.email);
    const now = new Date();
    const admin: Admin = {
      id,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Admin>(adminKey(id));
      const res = await kv.atomic()
        .check(primary)
        .check({ key: adminEmailKey(normalizedEmail), versionstamp: null })
        .set(adminKey(id), admin)
        .set(adminEmailKey(normalizedEmail), id)
        .commit();
      if (res.ok) return admin;

      const emailIndex = await kv.get(adminEmailKey(normalizedEmail));
      if (emailIndex.value !== null) {
        throw new DuplicateAdminEmailError(data.email);
      }
      // Otherwise an unrelated conflict (e.g. concurrent write); retry.
    }
    throw new Error(
      `Failed to create admin ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  async function deactivate(id: string): Promise<Admin | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Admin>(adminKey(id));
      if (primary.value === null) return null;
      const current = primary.value;

      const updated: Admin = {
        ...current,
        active: false,
        updatedAt: new Date(),
      };

      const res = await kv.atomic()
        .check(primary)
        .set(adminKey(id), updated)
        .commit();
      if (res.ok) return updated;
      // Otherwise the primary record changed concurrently; reread and retry.
    }
    throw new Error(
      `Failed to deactivate admin ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  return {
    get,
    getByEmail,
    list,
    create,
    deactivate,
  };
}
