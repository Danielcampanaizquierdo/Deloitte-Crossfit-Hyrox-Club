export interface PR {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  movement: string;
  weight: number;
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
  date: string;
}

export interface UpdatePRRequest {
  movement?: string;
  weight?: number;
  date?: string;
  approved?: boolean;
}
