export interface Member {
  id: string;
  name: string;
  email: string;
  level: "beginner" | "intermediate" | "advanced";
  goal: "crossfit" | "hyrox" | "general";
  location: string;
  bio?: string;
  approved: boolean;
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
  approved?: boolean;
  passwordHash?: string;
  passwordSalt?: string;
}
