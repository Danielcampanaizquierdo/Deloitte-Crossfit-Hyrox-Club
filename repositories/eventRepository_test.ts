import { assert, assertEquals } from "std/assert/mod.ts";
import { withKv } from "./test_utils.ts";
import { createEventRepository } from "./eventRepository.ts";

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
