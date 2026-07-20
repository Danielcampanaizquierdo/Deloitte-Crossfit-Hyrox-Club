// Type definitions for results
export interface CompetitionResult {
  id: string;
  title: string;
  date: Date;
  description: string;
  image?: string;
  results: {
    position: number;
    memberName: string;
    score?: string;
    time?: string;
  }[];
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateResultRequest {
  title: string;
  date: string;
  description: string;
  results: {
    position: number;
    memberName: string;
    score?: string;
    time?: string;
  }[];
}

export interface UpdateResultRequest extends Partial<CreateResultRequest> {}
