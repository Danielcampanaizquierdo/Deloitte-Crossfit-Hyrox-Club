export interface CompetitionResult {
  id: string;
  name: string;
  date: Date;
  description: string;
  photoUrl?: string;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateResultRequest {
  name: string;
  date: string;
  description: string;
  photoUrl?: string;
}

export interface UpdateResultRequest {
  name?: string;
  date?: string;
  description?: string;
  photoUrl?: string;
  approved?: boolean;
}
