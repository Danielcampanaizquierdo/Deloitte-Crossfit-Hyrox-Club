export type AdminRole = "admin" | "superadmin";

export interface Admin {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role: AdminRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Administrator data that may cross the network boundary. */
export type PublicAdmin = Omit<Admin, "passwordHash" | "passwordSalt">;

export function toPublicAdmin(admin: Admin): PublicAdmin {
  const { passwordHash: _hash, passwordSalt: _salt, ...safe } = admin;
  return safe;
}

export function toPublicAdmins(admins: Admin[]): PublicAdmin[] {
  return admins.map(toPublicAdmin);
}

/** Shared validation for administrator records created by APIs or bootstrap. */
export function validateAdminIdentity(
  email: string,
  name: string,
): string | null {
  if (
    !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return "El email del administrador no es válido";
  }
  if (!name || name.length > 120) {
    return "El nombre del administrador no es válido";
  }
  return null;
}
