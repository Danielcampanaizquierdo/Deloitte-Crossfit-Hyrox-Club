import { assert, assertEquals } from "std/assert/mod.ts";
import { withKv } from "./test_utils.ts";
import { createEventRepository } from "./eventRepository.ts";
import {
  createSignupRepository,
  DuplicateSignupError,
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
