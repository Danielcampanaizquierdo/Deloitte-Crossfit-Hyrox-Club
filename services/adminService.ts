import { kv } from "../lib/kv.ts";
import { bootstrapInitialAdmin } from "../lib/adminBootstrap.ts";
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from "../lib/password.ts";
import {
  type AdminRepository,
  createAdminRepository,
} from "../repositories/adminRepository.ts";
import {
  type Admin,
  type AdminRole,
  validateAdminIdentity,
} from "../types/Admin.ts";

const DUMMY_PASSWORD_RECORD = {
  hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  salt: "AAAAAAAAAAAAAAAAAAAAAA==",
};

export interface CreateAdminInput {
  email: string;
  name: string;
  password: string;
  role?: AdminRole;
}

export type AdminAuthentication =
  | { status: "authenticated"; admin: Admin }
  | { status: "inactive" }
  | { status: "invalid" };

export interface AdminService {
  getAll(): Promise<Admin[]>;
  getById(id: string): Promise<Admin | null>;
  getByEmail(email: string): Promise<Admin | null>;
  create(data: CreateAdminInput): Promise<Admin>;
  deactivate(id: string): Promise<Admin | null>;
  authenticate(email: string, password: string): Promise<AdminAuthentication>;
}

export function createAdminService(repo: AdminRepository): AdminService {
  return {
    getAll: () => repo.list(),
    getById: (id) => repo.get(id),
    getByEmail: (email) => repo.getByEmail(email),

    async create(data) {
      const email = data.email.trim();
      const name = data.name.trim();
      const identityError = validateAdminIdentity(email, name);
      const passwordError = validatePassword(data.password);
      if (identityError) throw new Error(identityError);
      if (passwordError) throw new Error(passwordError);
      if (
        data.role !== undefined && !["admin", "superadmin"].includes(data.role)
      ) {
        throw new Error("Rol de administrador no válido");
      }

      const record = await hashPassword(data.password);
      return await repo.create({
        email,
        name,
        passwordHash: record.hash,
        passwordSalt: record.salt,
        role: data.role ?? "admin",
      });
    },

    deactivate: (id) => repo.deactivate(id),

    async authenticate(email, password) {
      const admin = await repo.getByEmail(email);
      // Unknown accounts still pay the PBKDF2 cost so this endpoint does not
      // become an administrator-email oracle through response timing.
      const record = admin
        ? { hash: admin.passwordHash, salt: admin.passwordSalt }
        : DUMMY_PASSWORD_RECORD;
      const valid = await verifyPassword(password, record);
      if (!admin || !valid) return { status: "invalid" };
      if (!admin.active) return { status: "inactive" };
      return { status: "authenticated", admin };
    },
  };
}

const defaultRepository = createAdminRepository(await kv);
export const adminService = createAdminService(defaultRepository);

let bootstrapPromise: Promise<Admin | null> | null = null;

/** Lazily provisions the deployment's first account before login. */
export function ensureInitialAdmin(): Promise<Admin | null> {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapInitialAdmin(defaultRepository).catch(
      (error) => {
        // A transient KV failure must not poison every later login attempt.
        bootstrapPromise = null;
        throw error;
      },
    );
  }
  return bootstrapPromise;
}
