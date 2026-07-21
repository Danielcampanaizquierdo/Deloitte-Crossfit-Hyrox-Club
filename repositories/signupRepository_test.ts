import { assert, assertEquals, assertRejects } from "std/assert/mod.ts";
import { withKv } from "./test_utils.ts";
import { createEventRepository } from "./eventRepository.ts";
import {
  createSignupRepository,
  DuplicateSignupError,
  EventFullError,
} from "./signupRepository.ts";

async function listKeys(
  kv: Deno.Kv,
  prefix: Deno.KvKey,
): Promise<Deno.KvEntry<unknown>[]> {
  const entries: Deno.KvEntry<unknown>[] = [];
  for await (const entry of kv.list({ prefix })) {
    entries.push(entry);
  }
  return entries;
}

function futureIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString();
}

Deno.test("only one simultaneous signup per event and email commits", async () => {
  await withKv(async (kv) => {
    const events = createEventRepository(kv);
    const signups = createSignupRepository(kv);

    const event = await events.create({
      title: "Saturday Hyrox",
      date: futureIso(),
      location: "Gym",
      description: "Weekly session",
    });
    // Bookings require a published event; these tests exercise capacity
    // and duplicate rules, not moderation.
    await events.update(event.id, { approved: true });

    const attempt = () =>
      signups.create({
        eventId: event.id,
        memberName: "Athlete",
        memberEmail: "athlete@example.com",
      });

    const results = await Promise.allSettled([attempt(), attempt()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assertEquals(fulfilled.length, 1);
    assertEquals(rejected.length, 1);
    assert(
      (rejected[0] as PromiseRejectedResult).reason instanceof
        DuplicateSignupError,
    );

    const finalEvent = await events.get(event.id);
    assert(finalEvent);
    // Exactly one increment must have landed: not 2 (double-counted despite
    // the race), not 0 (lost update from the losing transaction).
    assertEquals(finalEvent?.attendees, 1);
  });
});

Deno.test("cancelling a signup deletes indexes and decrements attendees", async () => {
  await withKv(async (kv) => {
    const events = createEventRepository(kv);
    const signups = createSignupRepository(kv);

    const event = await events.create({
      title: "Sunday Crossfit",
      date: futureIso(),
      location: "Gym",
      description: "Weekly session",
    });
    // Bookings require a published event; these tests exercise capacity
    // and duplicate rules, not moderation.
    await events.update(event.id, { approved: true });

    const signup = await signups.create({
      eventId: event.id,
      memberId: "mbr-cancel-test",
      memberName: "Athlete",
      memberEmail: "cancel-me@example.com",
    });
    assert(signup);

    const afterCreate = await events.get(event.id);
    assertEquals(afterCreate?.attendees, 1);

    const deleted = await signups.delete(signup!.id);
    assert(deleted);

    assertEquals(await signups.get(signup!.id), null);

    assertEquals(
      (await listKeys(kv, ["signups_by_event", event.id])).length,
      0,
    );
    assertEquals(
      (await listKeys(kv, ["signups_by_event_email", event.id])).length,
      0,
    );
    assertEquals(
      (await listKeys(kv, ["signups_by_member", "mbr-cancel-test"])).length,
      0,
    );

    const finalEvent = await events.get(event.id);
    assertEquals(finalEvent?.attendees, 0);
  });
});

Deno.test("booking is refused once an event reaches its capacity", async () => {
  await withKv(async (kv) => {
    const events = createEventRepository(kv);
    const signups = createSignupRepository(kv);

    const event = await events.create({
      title: "Small Group",
      date: futureIso(),
      location: "Gym",
      description: "Two spots only",
      capacity: 2,
    });
    // Bookings require a published event; these tests exercise capacity
    // and duplicate rules, not moderation.
    await events.update(event.id, { approved: true });

    await signups.create({
      eventId: event.id,
      memberName: "One",
      memberEmail: "one@example.com",
    });
    await signups.create({
      eventId: event.id,
      memberName: "Two",
      memberEmail: "two@example.com",
    });

    await assertRejects(
      () =>
        signups.create({
          eventId: event.id,
          memberName: "Three",
          memberEmail: "three@example.com",
        }),
      EventFullError,
    );

    const finalEvent = await events.get(event.id);
    assertEquals(finalEvent?.attendees, 2);
  });
});

Deno.test("two athletes racing for the last spot cannot both book it", async () => {
  await withKv(async (kv) => {
    const events = createEventRepository(kv);
    const signups = createSignupRepository(kv);

    const event = await events.create({
      title: "One Spot Left",
      date: futureIso(),
      location: "Gym",
      description: "Single spot",
      capacity: 1,
    });
    // Bookings require a published event; these tests exercise capacity
    // and duplicate rules, not moderation.
    await events.update(event.id, { approved: true });

    const results = await Promise.allSettled([
      signups.create({
        eventId: event.id,
        memberName: "One",
        memberEmail: "one@example.com",
      }),
      signups.create({
        eventId: event.id,
        memberName: "Two",
        memberEmail: "two@example.com",
      }),
    ]);

    assertEquals(results.filter((r) => r.status === "fulfilled").length, 1);
    assertEquals(results.filter((r) => r.status === "rejected").length, 1);

    const finalEvent = await events.get(event.id);
    // The overbooked case would show 2 here.
    assertEquals(finalEvent?.attendees, 1);
  });
});

Deno.test("an uncapped event keeps accepting bookings", async () => {
  await withKv(async (kv) => {
    const events = createEventRepository(kv);
    const signups = createSignupRepository(kv);

    // No capacity: the shape of every event created before capacity existed.
    const event = await events.create({
      title: "Open Session",
      date: futureIso(),
      location: "Gym",
      description: "Everyone welcome",
    });
    // Bookings require a published event; these tests exercise capacity
    // and duplicate rules, not moderation.
    await events.update(event.id, { approved: true });

    for (const n of [1, 2, 3, 4, 5]) {
      const signup = await signups.create({
        eventId: event.id,
        memberName: `Athlete ${n}`,
        memberEmail: `athlete${n}@example.com`,
      });
      assert(signup);
    }

    const finalEvent = await events.get(event.id);
    assertEquals(finalEvent?.attendees, 5);
  });
});

Deno.test("cancelling frees a spot on a full event", async () => {
  await withKv(async (kv) => {
    const events = createEventRepository(kv);
    const signups = createSignupRepository(kv);

    const event = await events.create({
      title: "Full Session",
      date: futureIso(),
      location: "Gym",
      description: "One spot",
      capacity: 1,
    });
    // Bookings require a published event; these tests exercise capacity
    // and duplicate rules, not moderation.
    await events.update(event.id, { approved: true });

    const first = await signups.create({
      eventId: event.id,
      memberName: "One",
      memberEmail: "one@example.com",
    });
    assert(first);

    await assertRejects(
      () =>
        signups.create({
          eventId: event.id,
          memberName: "Two",
          memberEmail: "two@example.com",
        }),
      EventFullError,
    );

    await signups.delete(first!.id);

    const second = await signups.create({
      eventId: event.id,
      memberName: "Two",
      memberEmail: "two@example.com",
    });
    assert(second);
  });
});

Deno.test("an athlete finds their own booking by event and email", async () => {
  await withKv(async (kv) => {
    const events = createEventRepository(kv);
    const signups = createSignupRepository(kv);

    const event = await events.create({
      title: "Lookup Session",
      date: futureIso(),
      location: "Gym",
      description: "Weekly session",
    });
    // Bookings require a published event; these tests exercise capacity
    // and duplicate rules, not moderation.
    await events.update(event.id, { approved: true });

    const signup = await signups.create({
      eventId: event.id,
      memberName: "Athlete",
      memberEmail: "Athlete@Example.com",
    });
    assert(signup);

    // Lookup normalizes casing, the same way the reservation key does.
    const found = await signups.getByEventEmail(event.id, "athlete@example.com");
    assertEquals(found?.id, signup!.id);

    assertEquals(
      await signups.getByEventEmail(event.id, "nobody@example.com"),
      null,
    );
  });
});
