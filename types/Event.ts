export interface Event {
  id: string;
  title: string;
  date: Date;
  location: string;
  description: string;
  attendees: number;
  type?: string;
  /** Maximum bookings. Absent or 0 means unlimited — which is what every
   * event created before capacity existed is. */
  capacity?: number;
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
  capacity?: number;
}

export interface UpdateEventRequest {
  title?: string;
  date?: string;
  location?: string;
  description?: string;
  type?: string;
  capacity?: number;
  attendees?: number;
  approved?: boolean;
}

/** Spots left, or null when the event is uncapped. */
export function spotsLeft(event: Pick<Event, "attendees" | "capacity">): number | null {
  if (!event.capacity || event.capacity <= 0) return null;
  return Math.max(0, event.capacity - event.attendees);
}

export function isFull(event: Pick<Event, "attendees" | "capacity">): boolean {
  return spotsLeft(event) === 0;
}
