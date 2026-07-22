// Signup repository — persists EventSignup records in Deno KV along with the
// signups_by_event, signups_by_member, and signups_by_event_email secondary
// indexes described in docs/plans/2026-07-21-deno-kv-design.md.
//
// signups_by_event_email doubles as both the email index AND the
// duplicate-reservation check: a create atomically checks that no entry yet
// exists for (eventId, normalizedEmail) before writing the signup and its
// indexes.
//
// Event attendee counts live on the Event's own primary record, so create and
// delete must atomically touch BOTH the signup's own keys and the event's
// primary record in a single kv.atomic() transaction. This repository reads
// and writes the event directly via eventKey() rather than calling
// eventRepository's update(), since that runs its own separate transaction
// and would break atomicity (and could lose concurrent increments/decrements).
//
// Every create/delete is retried on a failed commit, up to MAX_RETRIES times,
// following the same pattern as memberRepository.ts's email uniqueness
// handling: reread the reservation key after a failed commit and throw
// DuplicateSignupError only if it is genuinely taken; otherwise treat the
// failure as an unrelated conflict (e.g. a concurrent event update) and retry.

import type { CreateSignupRequest, EventSignup } from "../types/Signup.ts";
import type { Event } from "../types/Event.ts";
import type { Member } from "../types/Member.ts";
import {
  eventKey,
  memberKey,
  signupEmailKey,
  signupEventKey,
  signupEventMemberKey,
  signupKey,
  signupMemberKey,
} from "./keys.ts";

const MAX_RETRIES = 20;

function retryBackoff(attempt: number): Promise<void> {
  // Event attendance is one contended record. A short capped backoff lets a
  // burst of legitimate bookings serialize instead of failing after three
  // immediate collisions while places are still free.
  const delayMs = Math.min(2 ** attempt, 20);
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export class DuplicateSignupError extends Error {
  constructor(eventId: string, email: string) {
    super(
      `A signup for event "${eventId}" with email "${email}" already exists`,
    );
    this.name = "DuplicateSignupError";
  }
}

export class EventFullError extends Error {
  constructor(eventId: string) {
    super(`Event "${eventId}" has no spots left`);
    this.name = "EventFullError";
  }
}

export class EventNotPublishedError extends Error {
  constructor(eventId: string) {
    super(`Event "${eventId}" is not published`);
    this.name = "EventNotPublishedError";
  }
}

export class EventAlreadyStartedError extends Error {
  constructor(eventId: string) {
    super(`Event "${eventId}" has already started`);
    this.name = "EventAlreadyStartedError";
  }
}

export class MemberNotEligibleError extends Error {
  constructor(memberId: string) {
    super(`Member "${memberId}" is not active and approved`);
    this.name = "MemberNotEligibleError";
  }
}

function generateId(): string {
  return `signup-${crypto.randomUUID()}`;
}

export interface SignupRepository {
  get(id: string): Promise<EventSignup | null>;
  list(): Promise<EventSignup[]>;
  listByEvent(eventId: string): Promise<EventSignup[]>;
  listByMember(memberId: string): Promise<EventSignup[]>;
  /** Resolves the reservation key straight to its signup, so an athlete can
   * find (and cancel) their own booking with just an email. */
  getByEventEmail(eventId: string, email: string): Promise<EventSignup | null>;
  getByEventMember(
    eventId: string,
    memberId: string,
  ): Promise<EventSignup | null>;
  // Returns null when the referenced event does not exist.
  create(data: CreateSignupRequest): Promise<EventSignup | null>;
  delete(id: string): Promise<boolean>;
}

export function createSignupRepository(kv: Deno.Kv): SignupRepository {
  async function get(id: string): Promise<EventSignup | null> {
    const entry = await kv.get<EventSignup>(signupKey(id));
    return entry.value;
  }

  // Added in Task 6 (not part of Task 5's original design) so that
  // signupService.getAll() — used by routes/api/signups/index.ts — has a
  // repository method to call, following the same style as list() in
  // eventRepository.ts/memberRepository.ts.
  async function list(): Promise<EventSignup[]> {
    const signups: EventSignup[] = [];
    for await (const entry of kv.list<EventSignup>({ prefix: ["signups"] })) {
      if (entry.value) signups.push(entry.value);
    }
    return signups;
  }

  async function listByEvent(eventId: string): Promise<EventSignup[]> {
    const signups: EventSignup[] = [];
    for await (
      const entry of kv.list<string>({
        prefix: ["signups_by_event", eventId],
      })
    ) {
      const record = await kv.get<EventSignup>(signupKey(entry.value));
      if (record.value) signups.push(record.value);
    }
    return signups;
  }

  async function listByMember(memberId: string): Promise<EventSignup[]> {
    const signups: EventSignup[] = [];
    for await (
      const entry of kv.list<string>({
        prefix: ["signups_by_member", memberId],
      })
    ) {
      const record = await kv.get<EventSignup>(signupKey(entry.value));
      if (record.value) signups.push(record.value);
    }
    return signups;
  }

  async function getByEventEmail(
    eventId: string,
    email: string,
  ): Promise<EventSignup | null> {
    const index = await kv.get<string>(signupEmailKey(eventId, email));
    if (index.value === null) return null;
    const record = await kv.get<EventSignup>(signupKey(index.value));
    return record.value;
  }

  async function getByEventMember(
    eventId: string,
    memberId: string,
  ): Promise<EventSignup | null> {
    const index = await kv.get<string>(signupEventMemberKey(eventId, memberId));
    if (index.value === null) return null;
    const record = await kv.get<EventSignup>(signupKey(index.value));
    return record.value;
  }

  async function create(
    data: CreateSignupRequest,
  ): Promise<EventSignup | null> {
    const id = generateId();
    const eventMemberKey = data.memberId
      ? signupEventMemberKey(data.eventId, data.memberId)
      : null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const memberEntry = data.memberId
        ? await kv.get<Member>(memberKey(data.memberId))
        : null;
      if (
        memberEntry &&
        (memberEntry.value === null || !memberEntry.value.approved ||
          memberEntry.value.active === false || memberEntry.value.deletedAt)
      ) {
        throw new MemberNotEligibleError(data.memberId!);
      }

      // When a stable member id exists, all persisted attribution comes from
      // the checked member record, never from caller-supplied display fields.
      const memberName = memberEntry?.value?.name ?? data.memberName;
      const memberEmail = memberEntry?.value?.email ?? data.memberEmail;
      const signup: EventSignup = {
        id,
        eventId: data.eventId,
        memberId: data.memberId,
        memberName,
        memberEmail,
        comments: data.comments,
        signedUpAt: new Date(),
      };
      const emailKey = signupEmailKey(data.eventId, memberEmail);

      const eventEntry = await kv.get<Event>(eventKey(data.eventId));
      if (eventEntry.value === null) return null;
      const event = eventEntry.value;

      if (!event.approved) {
        throw new EventNotPublishedError(data.eventId);
      }
      if (new Date(event.date).getTime() <= Date.now()) {
        throw new EventAlreadyStartedError(data.eventId);
      }

      // Capacity is checked against the same event entry the transaction
      // below check()s, so two bookings racing for the last spot cannot both
      // commit: the loser's commit fails, rereads a now-full event, and
      // throws here on the retry.
      if (
        event.capacity && event.capacity > 0 &&
        event.attendees >= event.capacity
      ) {
        throw new EventFullError(data.eventId);
      }

      const primary = await kv.get<EventSignup>(signupKey(id));

      const atomic = kv.atomic()
        .check(eventEntry)
        .check(primary)
        .check({ key: emailKey, versionstamp: null })
        .set(signupKey(id), signup)
        .set(signupEventKey(data.eventId, id), id)
        .set(emailKey, id)
        .set(eventKey(data.eventId), {
          ...event,
          attendees: event.attendees + 1,
          updatedAt: new Date(),
        });

      if (memberEntry) atomic.check(memberEntry);

      if (data.memberId) {
        atomic
          .check({ key: eventMemberKey!, versionstamp: null })
          .set(signupMemberKey(data.memberId, id), id)
          .set(eventMemberKey!, id);
      }

      const res = await atomic.commit();
      if (res.ok) return signup;

      if (eventMemberKey) {
        const memberIndex = await kv.get(eventMemberKey);
        if (memberIndex.value !== null) {
          throw new DuplicateSignupError(data.eventId, data.memberEmail);
        }
      }
      const emailIndex = await kv.get(emailKey);
      if (emailIndex.value !== null) {
        throw new DuplicateSignupError(data.eventId, data.memberEmail);
      }
      // Otherwise an unrelated conflict (e.g. a concurrent event update or
      // another signup for the same event with a different email); retry.
      await retryBackoff(attempt);
    }
    throw new Error(
      `Failed to create signup for event ${data.eventId} after ${MAX_RETRIES} attempts`,
    );
  }

  async function deleteSignup(id: string): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<EventSignup>(signupKey(id));
      if (primary.value === null) return false;
      const signup = primary.value;

      const eventEntry = await kv.get<Event>(eventKey(signup.eventId));

      const atomic = kv.atomic()
        .check(primary)
        .delete(signupKey(id))
        .delete(signupEventKey(signup.eventId, id))
        .delete(signupEmailKey(signup.eventId, signup.memberEmail));

      if (signup.memberId) {
        atomic
          .delete(signupMemberKey(signup.memberId, id))
          .delete(signupEventMemberKey(signup.eventId, signup.memberId));
      }

      // If the event has since been deleted independently, still clean up
      // the signup's own keys without trying to update a record that no
      // longer exists.
      if (eventEntry.value !== null) {
        atomic
          .check(eventEntry)
          .set(eventKey(signup.eventId), {
            ...eventEntry.value,
            attendees: Math.max(0, eventEntry.value.attendees - 1),
            updatedAt: new Date(),
          });
      }

      const res = await atomic.commit();
      if (res.ok) return true;
      // Reread and retry: either the signup or the event changed
      // concurrently.
      await retryBackoff(attempt);
    }
    throw new Error(
      `Failed to delete signup ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  return {
    get,
    list,
    listByEvent,
    listByMember,
    getByEventEmail,
    getByEventMember,
    create,
    delete: deleteSignup,
  };
}
