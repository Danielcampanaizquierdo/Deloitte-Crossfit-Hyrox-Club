export interface Event {
  id: string;
  title: string;
  date: Date;
  location: string;
  description: string;
  attendees: number;
  type?: string;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventRequest {
  title: string;
  date: string;
  location: string;
  description: string;
  type?: string;
}

export interface UpdateEventRequest {
  title?: string;
  date?: string;
  location?: string;
  description?: string;
  type?: string;
  attendees?: number;
  approved?: boolean;
}
