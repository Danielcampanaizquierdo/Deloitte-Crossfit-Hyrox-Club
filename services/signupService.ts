import { CreateSignupRequest, EventSignup } from "../types/Signup.ts";
import {
  createSignupRepository,
  DuplicateSignupError,
  EventAlreadyStartedError,
  EventFullError,
  EventNotPublishedError,
  MemberNotEligibleError,
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

    async getByEventEmail(
      eventId: string,
      memberEmail: string,
    ): Promise<EventSignup | null> {
      return repo.getByEventEmail(eventId, memberEmail);
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
        if (err instanceof EventFullError) {
          // Same message-based contract, for the 409 the signup route returns
          // when the last spot went to somebody else.
          throw new Error("Event is full");
        }
        if (err instanceof EventNotPublishedError) {
          throw new Error("Event is not open for booking");
        }
        if (err instanceof EventAlreadyStartedError) {
          throw new Error("Event has already started");
        }
        if (err instanceof MemberNotEligibleError) {
          throw new Error("Member is not eligible");
        }
        throw err;
      }
    },

    /** Cancels the session holder's booking by stable member id. Legacy
     * records without memberId are deliberately admin-only. */
    async cancelForMember(
      eventId: string,
      memberId: string,
      _legacyEmail?: string,
    ): Promise<boolean> {
      const signup = await repo.getByEventMember(eventId, memberId);
      if (!signup) return false;
      return repo.delete(signup.id);
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
export const signupService = createSignupService(
  createSignupRepository(await kv),
);
