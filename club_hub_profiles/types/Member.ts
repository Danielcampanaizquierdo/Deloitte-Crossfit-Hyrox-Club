export interface Member {
  id: string;
  name: string;
  email: string;
  level: "beginner" | "intermediate" | "advanced";
  goal: "crossfit" | "hyrox" | "general";
  location: string;
  bio?: string;
  /** Optional profile photo as a compressed data URI stored inline in KV.
   * The browser shrinks it under KV's 64 KiB value limit before upload. */
  avatar?: string;
  approved: boolean;
  /** New records are active. Undefined is treated as active for records
   * written before account deactivation existed. */
  active?: boolean;
  /** Tombstone timestamp. Deleted members keep their stable id and email so
   * historical records cannot be claimed by a new account. */
  deletedAt?: Date;
  /** PBKDF2 hash and its salt (see lib/password.ts). Absent on members created
   * before accounts existed; those cannot log in until given a password. */
  passwordHash?: string;
  passwordSalt?: string;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** A member as it may be sent to a client: everything except the credentials.
 * Email is kept because members see each other's contact details in the club
 * directory. */
export type PublicMember = Omit<Member, "passwordHash" | "passwordSalt">;

/** Public club-directory shape. Contact email is available to the account
 * owner via /api/auth/me and to admins, not to anonymous directory scrapers. */
export type DirectoryMember = Omit<PublicMember, "email">;

/** Strips credentials before a member crosses the network.
 *
 * Every route that returns member records must go through this — returning a
 * Member directly would ship its password hash and salt to the browser. */
export function toPublicMember(member: Member): PublicMember {
  const { passwordHash: _h, passwordSalt: _s, ...safe } = member;
  return safe;
}

export function toPublicMembers(members: Member[]): PublicMember[] {
  return members.map(toPublicMember);
}

export function toDirectoryMember(member: Member): DirectoryMember {
  const { email: _email, ...safe } = toPublicMember(member);
  return safe;
}

export function toDirectoryMembers(members: Member[]): DirectoryMember[] {
  return members.map(toDirectoryMember);
}

export interface CreateMemberRequest {
  name: string;
  email: string;
  level: "beginner" | "intermediate" | "advanced";
  goal: "crossfit" | "hyrox" | "general";
  location: string;
  bio?: string;
  passwordHash?: string;
  passwordSalt?: string;
}

export interface UpdateMemberRequest {
  name?: string;
  email?: string;
  level?: "beginner" | "intermediate" | "advanced";
  goal?: "crossfit" | "hyrox" | "general";
  location?: string;
  bio?: string;
  avatar?: string;
  approved?: boolean;
  passwordHash?: string;
  passwordSalt?: string;
}
