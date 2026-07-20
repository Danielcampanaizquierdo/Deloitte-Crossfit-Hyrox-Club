// Type definitions for events
export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  attendees: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  date: string;
  location: string;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {}
