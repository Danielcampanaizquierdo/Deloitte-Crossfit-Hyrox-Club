export interface Member {
  id: string;
  name: string;
  email: string;
  level: "beginner" | "intermediate" | "advanced";
  goal: "crossfit" | "hyrox" | "general";
  location: string;
  bio?: string;
  approved: boolean;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMemberRequest {
  name: string;
  email: string;
  level: "beginner" | "intermediate" | "advanced";
  goal: "crossfit" | "hyrox" | "general";
  location: string;
  bio?: string;
}

export interface UpdateMemberRequest {
  name?: string;
  email?: string;
  level?: "beginner" | "intermediate" | "advanced";
  goal?: "crossfit" | "hyrox" | "general";
  location?: string;
  bio?: string;
  approved?: boolean;
}
