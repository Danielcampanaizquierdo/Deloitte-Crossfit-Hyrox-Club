import { Event, CreateEventRequest, UpdateEventRequest } from "../types/Event.ts";
import {
  createEventRepository,
  EventRepository,
} from "../repositories/eventRepository.ts";
import { kv } from "../lib/kv.ts";

// Pure factory: takes an EventRepository so tests can build this service
// against an isolated :memory: KV (see services/services_kv_test.ts).
export function createEventService(repo: EventRepository) {
  return {
    async getAll(): Promise<Event[]> {
      return repo.list();
    },

    async getById(id: string): Promise<Event | null> {
      return repo.get(id);
    },

    async getUpcoming(): Promise<Event[]> {
      return repo.listUpcoming();
    },

    async create(data: CreateEventRequest): Promise<Event> {
      return repo.create(data);
    },

    async update(id: string, data: UpdateEventRequest): Promise<Event | null> {
      return repo.update(id, data);
    },

    async delete(id: string): Promise<boolean> {
      return repo.delete(id);
    },

    // No route calls this after Task 6 (the repository now increments
    // attendees atomically inside the signup transaction), but the method is
    // kept per the storage-swap-only scope of this task. Matches its current
    // non-atomic get-then-update shape.
    async addAttendee(id: string): Promise<Event | null> {
      const event = await repo.get(id);
      if (!event) return null;
      return repo.update(id, { attendees: event.attendees + 1 });
    },
  };
}

// Production singleton: binds to the app-lifetime KV connection once at
// module load. Deno/Fresh support top-level await in ES modules.
export const eventService = createEventService(createEventRepository(await kv));
