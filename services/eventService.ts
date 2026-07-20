import { Event, CreateEventRequest, UpdateEventRequest } from "../types/Event.ts";
import { storage } from "../lib/storage.ts";

const STORAGE_FILE = "events.json";

export const eventService = {
  async getAll(): Promise<Event[]> {
    return await storage.read(STORAGE_FILE);
  },

  async getById(id: string): Promise<Event | null> {
    const events = await this.getAll();
    return events.find((e) => e.id === id) || null;
  },

  async getUpcoming(): Promise<Event[]> {
    const now = new Date();
    const events = await this.getAll();
    return events
      .filter((e) => new Date(e.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  async create(data: CreateEventRequest): Promise<Event> {
    const events = await this.getAll();
    const event: Event = {
      id: `evt-${Date.now()}`,
      ...data,
      date: new Date(data.date),
      attendees: 0,
      approved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    events.push(event);
    await storage.write(STORAGE_FILE, events);
    return event;
  },

  async update(id: string, data: UpdateEventRequest): Promise<Event | null> {
    const events = await this.getAll();
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return null;
    const updated: Event = {
      ...events[index],
      ...data,
      date: data.date ? new Date(data.date) : events[index].date,
      updatedAt: new Date(),
    };
    events[index] = updated;
    await storage.write(STORAGE_FILE, events);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const events = await this.getAll();
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return false;
    events.splice(index, 1);
    await storage.write(STORAGE_FILE, events);
    return true;
  },

  async addAttendee(id: string): Promise<Event | null> {
    const event = await this.getById(id);
    if (!event) return null;
    event.attendees++;
    event.updatedAt = new Date();
    return await this.update(id, event);
  },
};
