import { EventSignup, CreateSignupRequest } from "../types/Signup.ts";
import {
  createSignupRepository,
  DuplicateSignupError,
  SignupRepository,
} from "../repositories/signupRepository.ts";
import { kv } from "../lib/kv.ts";

// Pure factory: takes a SignupRepository so tests can build this service
// against an isolated :memory: KV (see services/services_kv_test.ts).
export function createSignupService(repo: SignupRepository) {
  return {
    async getAll(): Promise<EventSignup[]> {
      return repo.list();
    },

    async getByEventId(eventId: string): Promise<EventSignup[]> {
      return repo.listByEvent(eventId);
    },

    async getByMemberId(memberId: string): Promise<EventSignup[]> {
      return repo.listByMember(memberId);
    },

    async getById(id: string): Promise<EventSignup | null> {
      return repo.get(id);
    },

    async isSignedUp(eventId: string, memberEmail: string): Promise<boolean> {
      // Exact (case-sensitive) match, matching today's behavior — no
      // normalization.
      const signups = await repo.listByEvent(eventId);
      return signups.some((s) => s.memberEmail === memberEmail);
    },

    async create(data: CreateSignupRequest): Promise<EventSignup | null> {
      try {
        // Returns null when the referenced event does not exist, consistent
        // with routes checking eventService.getById() themselves before
        // calling this.
        return await repo.create(data);
      } catch (err) {
        if (err instanceof DuplicateSignupError) {
          // Preserve the existing message-based contract that
          // routes/api/events/[id]/signup.ts relies on via
          // err.message.includes("Already signed up") to return HTTP 409.
          throw new Error("Already signed up for this event");
        }
        throw err;
      }
    },

    async delete(id: string): Promise<boolean> {
      return repo.delete(id);
    },

    async countByEvent(eventId: string): Promise<number> {
      return (await repo.listByEvent(eventId)).length;
    },
  };
}

// Production singleton: binds to the app-lifetime KV connection once at
// module load. Deno/Fresh support top-level await in ES modules.
export const signupService = createSignupService(createSignupRepository(await kv));
