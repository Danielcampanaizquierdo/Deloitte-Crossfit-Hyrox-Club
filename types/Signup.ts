export interface EventSignup {
  id: string;
  eventId: string;
  memberId?: string;
  memberName: string;
  memberEmail: string;
  comments?: string;
  signedUpAt: Date;
}

export interface CreateSignupRequest {
  eventId: string;
  memberId?: string;
  memberName: string;
  memberEmail: string;
  comments?: string;
}
