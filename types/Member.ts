// Type definitions for members
export type MemberLevel = "beginner" | "intermediate" | "advanced";
export type MemberGoal = "crossfit" | "hyrox" | "general";

export interface Member {
  id: string;
  name: string;
  email: string;
  level: MemberLevel;
  goal: MemberGoal;
  location: string;
  avatar?: string;
  bio?: string;
  joinedAt: Date;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMemberRequest {
  name: string;
  email: string;
  level: MemberLevel;
  goal: MemberGoal;
  location: string;
  bio?: string;
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> {}
