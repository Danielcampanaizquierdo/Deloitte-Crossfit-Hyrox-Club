import type { Admin, AdminRole } from "../types/Admin.ts";
import {
  adminEmailKey,
  adminKey,
  initialAdminMarkerKey,
  normalizeEmail,
} from "./keys.ts";

const MAX_RETRIES = 3;

export class DuplicateAdminEmailError extends Error {
  constructor(email: string) {
    super(`Admin with email "${email}" already exists`);
    this.name = "DuplicateAdminEmailError";
  }
}

export interface CreateAdminRequest {
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role?: AdminRole;
}

export interface AdminRepository {
  get(id: string): Promise<Admin | null>;
  getByEmail(email: string): Promise<Admin | null>;
  list(): Promise<Admin[]>;
  create(data: CreateAdminRequest): Promise<Admin>;
  createInitial(data: CreateAdminRequest): Promise<Admin | null>;
  deactivate(id: string): Promise<Admin | null>;
}

function generateId(): string {
  return `adm-${crypto.randomUUID()}`;
}

export function createAdminRepository(kv: Deno.Kv): AdminRepository {
  async function get(id: string): Promise<Admin | null> {
    return (await kv.get<Admin>(adminKey(id))).value;
  }

  async function getByEmail(email: string): Promise<Admin | null> {
    const index = await kv.get<string>(adminEmailKey(email));
    if (index.value === null) return null;
    return (await kv.get<Admin>(adminKey(index.value))).value;
  }

  async function list(): Promise<Admin[]> {
    const admins: Admin[] = [];
    for await (const entry of kv.list<Admin>({ prefix: ["admins"] })) {
      if (entry.value) admins.push(entry.value);
    }
    return admins;
  }

  async function createRecord(
    data: CreateAdminRequest,
    reserveInitial: boolean,
  ): Promise<Admin | null> {
    const id = generateId();
    const normalizedEmail = normalizeEmail(data.email);
    const now = new Date();
    const admin: Admin = {
      id,
      email: data.email.trim(),
      name: data.name.trim(),
      passwordHash: data.passwordHash,
      passwordSalt: data.passwordSalt,
      role: data.role ?? "admin",
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Admin>(adminKey(id));
      const atomic = kv.atomic()
        .check(primary)
        .check({ key: adminEmailKey(normalizedEmail), versionstamp: null });
      if (reserveInitial) {
        atomic.check({ key: initialAdminMarkerKey(), versionstamp: null });
      }
      atomic
        .set(adminKey(id), admin)
        .set(adminEmailKey(normalizedEmail), id);
      if (reserveInitial) atomic.set(initialAdminMarkerKey(), id);
      const result = await atomic.commit();
      if (result.ok) return admin;

      if ((await kv.get(adminEmailKey(normalizedEmail))).value !== null) {
        throw new DuplicateAdminEmailError(data.email);
      }
      if (
        reserveInitial &&
        (await kv.get(initialAdminMarkerKey())).value !== null
      ) return null;
    }

    throw new Error(
      `Failed to create admin ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  async function create(data: CreateAdminRequest): Promise<Admin> {
    const created = await createRecord(data, false);
    if (!created) throw new Error("Unexpected initial-admin reservation");
    return created;
  }

  function createInitial(data: CreateAdminRequest): Promise<Admin | null> {
    return createRecord(data, true);
  }

  async function deactivate(id: string): Promise<Admin | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Admin>(adminKey(id));
      if (primary.value === null) return null;

      const updated: Admin = {
        ...primary.value,
        active: false,
        updatedAt: new Date(),
      };
      const result = await kv.atomic()
        .check(primary)
        .set(adminKey(id), updated)
        .commit();
      if (result.ok) return updated;
    }

    throw new Error(
      `Failed to deactivate admin ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  return { get, getByEmail, list, create, createInitial, deactivate };
}
