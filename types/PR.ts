// Type definitions for PRs (Personal Records)
export type Movement = 
  | "clean_and_jerk"
  | "snatch"
  | "deadlift"
  | "squat"
  | "bench_press"
  | "back_squat"
  | "front_squat";

export interface PR {
  id: string;
  memberId: string;
  memberName: string;
  movement: Movement;
  weight: number; // in kg
  date: Date;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePRRequest {
  memberId: string;
  movement: Movement;
  weight: number;
  date: string;
}

export interface UpdatePRRequest extends Partial<CreatePRRequest> {}
