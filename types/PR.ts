import type { PRMetric } from "../lib/movements.ts";

export interface PR {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  movement: string;
  /** The PR's numeric value in the unit implied by `metric`: kilograms for
   * "weight", whole seconds for "time", repetitions for "reps". Named `weight`
   * because it predates the other metrics and is already persisted in KV under
   * that name for live records. */
  weight: number;
  /** How to read and rank `weight`. Absent on records written before other
   * metrics existed; those are all weight PRs. */
  metric?: PRMetric;
  date: Date;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePRRequest {
  memberId?: string;
  memberName: string;
  memberEmail: string;
  movement: string;
  weight: number;
  metric?: PRMetric;
  date: string;
}

export interface UpdatePRRequest {
  movement?: string;
  weight?: number;
  metric?: PRMetric;
  date?: string;
  approved?: boolean;
}

/** Public leaderboard shape. Internal attribution fields stay server-side. */
export type PublicPR = Omit<PR, "memberId" | "memberEmail"> & {
  /** Stable public identity used to keep homonyms and renamed members apart. */
  athleteId: string;
};

export function toPublicPR(pr: PR): PublicPR {
  const { memberId: _memberId, memberEmail: _memberEmail, ...safe } = pr;
  return { ...safe, athleteId: pr.memberId };
}

export function toPublicPRs(prs: PR[]): PublicPR[] {
  return prs.map(toPublicPR);
}
