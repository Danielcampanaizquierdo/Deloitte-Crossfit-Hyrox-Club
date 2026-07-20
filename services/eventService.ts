import { Event, CreateEventRequest, UpdateEventRequest } from "../types/Event.ts";

// In-memory database (will be replaced with real DB later)
let events: Event[] = [
  {
    id: "evt-001",
    title: "Entreno DEKA",
    description: "Formato DEKA para preparar competición, compartir ritmos y representar al club juntos.",
    date: new Date("2026-07-12T10:00:00"),
    location: "GreenHorse Box, San Sebastián de los Reyes",
    attendees: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "evt-002",
    title: "HYROX Team Session",
    description: "Team workout focused on sleds, wall balls and running transitions.",
    date: new Date("2026-07-19T09:30:00"),
    location: "Madrid",
    attendees: 12,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const eventService = {
  // Get all events
  async getAll(): Promise<Event[]> {
    return events;
  },

  // Get event by ID
  async getById(id: string): Promise<Event | null> {
    return events.find((e) => e.id === id) || null;
  },

  // Get upcoming events
  async getUpcoming(): Promise<Event[]> {
    const now = new Date();
    return events
      .filter((e) => e.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  },

  // Create event
  async create(data: CreateEventRequest): Promise<Event> {
    const event: Event = {
      id: `evt-${Date.now()}`,
      ...data,
      date: new Date(data.date),
      attendees: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    events.push(event);
    return event;
  },

  // Update event
  async update(id: string, data: UpdateEventRequest): Promise<Event | null> {
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const updated: Event = {
      ...events[index],
      ...data,
      date: data.date ? new Date(data.date) : events[index].date,
      updatedAt: new Date(),
    };
    events[index] = updated;
    return updated;
  },

  // Delete event
  async delete(id: string): Promise<boolean> {
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return false;
    events.splice(index, 1);
    return true;
  },

  // Increment attendees
  async addAttendee(id: string): Promise<Event | null> {
    const event = await this.getById(id);
    if (!event) return null;
    event.attendees++;
    event.updatedAt = new Date();
    return event;
  },
};
