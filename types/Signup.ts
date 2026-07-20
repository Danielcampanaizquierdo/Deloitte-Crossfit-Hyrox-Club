// Type definitions for signups
export interface EventSignup {
  id: string;
  eventId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  notes?: string;
  signedUpAt: Date;
}

export interface CreateSignupRequest {
  eventId: string;
  memberName: string;
  memberEmail: string;
  notes?: string;
}
