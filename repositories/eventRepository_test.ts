import { assert, assertEquals } from "std/assert/mod.ts";
import { withKv } from "./test_utils.ts";
import { createEventRepository } from "./eventRepository.ts";
import { createSignupRepository } from "./signupRepository.ts";
import { createMemberRepository } from "./memberRepository.ts";

Deno.test("event repository lists approved and upcoming events by indexes", async () => {
  await withKv(async (kv) => {
    const repo = createEventRepository(kv);
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();

    const validEvent = await repo.create({
      title: "Valid Event",
      date: future,
      location: "Gym",
      description: "A future, approved event",
    });
    await repo.update(validEvent.id, { approved: true });

    // Past + still-pending event: excluded from listApproved (not approved)
    // and from listUpcoming (not in the future).
    await repo.create({
      title: "Invalid Event",
      date: past,
      location: "Gym",
      description: "A past, pending event",
    });

    const approved = await repo.listApproved();
    assertEquals(approved.length, 1);
    assertEquals(approved[0].id, validEvent.id);

    const upcoming = await repo.listUpcoming();
    assertEquals(upcoming.length, 1);
    assertEquals(upcoming[0].id, validEvent.id);
  });
});

Deno.test("event repository removes all event indexes on delete", async () => {
  await withKv(async (kv) => {
    const repo = createEventRepository(kv);
    const future = new Date(Date.now() + 86_400_000).toISOString();

    const event = await repo.create({
      title: "Temp Event",
      date: future,
      location: "Gym",
      description: "Deleted after approval",
    });
    await repo.update(event.id, { approved: true });

    const deleted = await repo.delete(event.id);
    assert(deleted);

    assertEquals(await repo.get(event.id), null);
    assertEquals(await repo.listApproved(), []);
    assertEquals(await repo.listUpcoming(), []);
  });
});

Deno.test("deleting an event also removes its reservations", async () => {
  await withKv(async (kv) => {
    const events = createEventRepository(kv);
    const signups = createSignupRepository(kv);
    const members = createMemberRepository(kv);
    const event = await events.create({
      title: "Cancelled session",
      date: new Date(Date.now() + 86_400_000).toISOString(),
      location: "Gym",
      description: "Will be deleted",
    });
    await events.update(event.id, { approved: true });
    const member = await members.create({
      name: "Athlete",
      email: "cascade@example.com",
      level: "beginner",
      goal: "general",
      location: "Madrid",
    });
    await members.approve(member.id);
    const signup = await signups.create({
      eventId: event.id,
      memberId: member.id,
      memberName: "Athlete",
      memberEmail: "cascade@example.com",
    });
    assert(signup);

    assertEquals(await events.delete(event.id), true);
    assertEquals(await signups.get(signup!.id), null);
    assertEquals((await signups.listByEvent(event.id)).length, 0);
    assertEquals((await signups.listByMember(member.id)).length, 0);
  });
});
