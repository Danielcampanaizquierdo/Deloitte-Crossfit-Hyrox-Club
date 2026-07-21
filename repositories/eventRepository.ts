// Event repository — persists Event records in Deno KV along with the
// events_by_approval and events_by_date secondary indexes described in
// docs/plans/2026-07-21-deno-kv-design.md.
//
// Every create/update/delete is a single kv.atomic() transaction that checks
// the primary record's versionstamp and writes/deletes the primary entry and
// all affected index entries together. On a false `ok` commit result, the
// operation rereads current state and retries, up to MAX_RETRIES times.

import type {
  CreateEventRequest,
  Event,
  UpdateEventRequest,
} from "../types/Event.ts";
import type { EventSignup } from "../types/Signup.ts";
import {
  eventApprovalKey,
  eventDateKey,
  eventKey,
  signupEmailKey,
  signupEventKey,
  signupEventMemberKey,
  signupKey,
  signupMemberKey,
} from "./keys.ts";

const MAX_RETRIES = 3;

function generateId(): string {
  return `evt-${crypto.randomUUID()}`;
}

async function resolveIds(
  kv: Deno.Kv,
  entries: AsyncIterable<Deno.KvEntry<string>>,
): Promise<Event[]> {
  const events: Event[] = [];
  for await (const entry of entries) {
    const record = await kv.get<Event>(eventKey(entry.value));
    // Defensively skip index entries whose primary record is gone (e.g. a
    // delete that hadn't yet cleaned up this index, or a stale read).
    if (record.value) events.push(record.value);
  }
  return events;
}

export interface EventRepository {
  get(id: string): Promise<Event | null>;
  list(): Promise<Event[]>;
  listApproved(): Promise<Event[]>;
  listUpcoming(): Promise<Event[]>;
  create(data: CreateEventRequest): Promise<Event>;
  update(id: string, data: UpdateEventRequest): Promise<Event | null>;
  delete(id: string): Promise<boolean>;
}

export function createEventRepository(kv: Deno.Kv): EventRepository {
  /** Removes reservations after the event record is gone. With no event left,
   * new reservations cannot commit, so this sweep cannot race a new orphan
   * into existence. Calling delete again also repairs a previously interrupted
   * sweep. */
  async function cleanupSignups(eventId: string): Promise<void> {
    const indexed: { id: string; indexKey: Deno.KvKey }[] = [];
    for await (
      const entry of kv.list<string>({
        prefix: ["signups_by_event", eventId],
      })
    ) {
      indexed.push({ id: entry.value, indexKey: entry.key });
    }

    for (const { id, indexKey } of indexed) {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const primary = await kv.get<EventSignup>(signupKey(id));
        if (!primary.value) {
          await kv.delete(indexKey);
          break;
        }

        const signup = primary.value;
        const atomic = kv.atomic()
          .check(primary)
          .delete(signupKey(id))
          .delete(signupEventKey(eventId, id))
          .delete(signupEmailKey(eventId, signup.memberEmail));
        if (signup.memberId) {
          atomic
            .delete(signupMemberKey(signup.memberId, id))
            .delete(signupEventMemberKey(eventId, signup.memberId));
        }
        if ((await atomic.commit()).ok) break;
      }
    }
  }

  async function get(id: string): Promise<Event | null> {
    const entry = await kv.get<Event>(eventKey(id));
    return entry.value;
  }

  async function list(): Promise<Event[]> {
    const events: Event[] = [];
    for await (const entry of kv.list<Event>({ prefix: ["events"] })) {
      if (entry.value) events.push(entry.value);
    }
    return events;
  }

  function listApproved(): Promise<Event[]> {
    return resolveIds(
      kv,
      kv.list<string>({ prefix: ["events_by_approval", true] }),
    );
  }

  async function listUpcoming(): Promise<Event[]> {
    const now = Date.now();
    const events: Event[] = [];
    for await (
      const entry of kv.list<string>({ prefix: ["events_by_date"] })
    ) {
      const timestamp = entry.key[1] as number;
      if (timestamp <= now) continue;
      const record = await kv.get<Event>(eventKey(entry.value));
      if (record.value) events.push(record.value);
    }
    return events;
  }

  async function create(data: CreateEventRequest): Promise<Event> {
    const id = generateId();
    const now = new Date();
    const event: Event = {
      id,
      title: data.title,
      date: new Date(data.date),
      location: data.location,
      description: data.description,
      attendees: 0,
      type: data.type,
      capacity: data.capacity,
      approved: false,
      createdAt: now,
      updatedAt: now,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Event>(eventKey(id));
      const res = await kv.atomic()
        .check(primary)
        .set(eventKey(id), event)
        .set(eventApprovalKey(event.approved, id), id)
        .set(eventDateKey(event.date.getTime(), id), id)
        .commit();
      if (res.ok) return event;
    }
    throw new Error(
      `Failed to create event ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  async function update(
    id: string,
    data: UpdateEventRequest,
  ): Promise<Event | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Event>(eventKey(id));
      if (primary.value === null) return null;
      const current = primary.value;

      const updated: Event = {
        ...current,
        ...data,
        date: data.date ? new Date(data.date) : current.date,
        updatedAt: new Date(),
      };

      const atomic = kv.atomic()
        .check(primary)
        .set(eventKey(id), updated);

      if (updated.approved !== current.approved) {
        atomic
          .delete(eventApprovalKey(current.approved, id))
          .set(eventApprovalKey(updated.approved, id), id);
      }

      if (updated.date.getTime() !== current.date.getTime()) {
        atomic
          .delete(eventDateKey(current.date.getTime(), id))
          .set(eventDateKey(updated.date.getTime(), id), id);
      }

      const res = await atomic.commit();
      if (res.ok) return updated;
    }
    throw new Error(
      `Failed to update event ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  async function deleteEvent(id: string): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Event>(eventKey(id));
      if (primary.value === null) {
        await cleanupSignups(id);
        return false;
      }
      const current = primary.value;

      const res = await kv.atomic()
        .check(primary)
        .delete(eventKey(id))
        .delete(eventApprovalKey(current.approved, id))
        .delete(eventDateKey(current.date.getTime(), id))
        .commit();
      if (res.ok) {
        await cleanupSignups(id);
        return true;
      }
    }
    throw new Error(
      `Failed to delete event ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  return {
    get,
    list,
    listApproved,
    listUpcoming,
    create,
    update,
    delete: deleteEvent,
  };
}
