// Contract tests for the KV-backed services. Each service is built via its
// createXService(createXRepository(kv)) factory against an isolated
// :memory: KV, so these tests never touch the app-lifetime `kv` singleton.
//
// These tests initially FAIL while services/*.ts still import lib/storage.ts
// (no createXService factories exist yet). They pass once each service is
// switched to wrap a repository per docs/plans/2026-07-21-deno-kv-design.md.

import { assert, assertEquals, assertRejects } from "std/assert/mod.ts";
import { withKv } from "../repositories/test_utils.ts";
import { createEventRepository } from "../repositories/eventRepository.ts";
import { createMemberRepository } from "../repositories/memberRepository.ts";
import { createPrRepository } from "../repositories/prRepository.ts";
import { createResultRepository } from "../repositories/resultRepository.ts";
import { createSignupRepository } from "../repositories/signupRepository.ts";
import { createEventService } from "./eventService.ts";
import { createMemberService } from "./memberService.ts";
import { createPrService } from "./prService.ts";
import { createResultService } from "./resultService.ts";
import { createSignupService } from "./signupService.ts";

function futureIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString();
}

Deno.test("eventService: create populates generated fields; getById null for missing id", async () => {
  await withKv(async (kv) => {
    const service = createEventService(createEventRepository(kv));

    const event = await service.create({
      title: "Saturday Hyrox",
      date: futureIso(),
      location: "Gym",
      description: "Weekly session",
    });

    assert(event.id.length > 0);
    assertEquals(event.attendees, 0);
    assertEquals(event.approved, false);
    assert(event.createdAt instanceof Date);
    assert(event.updatedAt instanceof Date);

    const fetched = await service.getById(event.id);
    assertEquals(fetched?.id, event.id);

    assertEquals(await service.getById("evt-missing"), null);
  });
});

Deno.test("eventService: getUpcoming only returns future events", async () => {
  await withKv(async (kv) => {
    const service = createEventService(createEventRepository(kv));
    const upcoming = await service.create({
      title: "Future Event",
      date: futureIso(),
      location: "Gym",
      description: "In the future",
    });
    await service.create({
      title: "Past Event",
      date: new Date(Date.now() - 86_400_000).toISOString(),
      location: "Gym",
      description: "In the past",
    });

    const result = await service.getUpcoming();
    assertEquals(result.length, 1);
    assertEquals(result[0].id, upcoming.id);
  });
});

Deno.test("eventService: addAttendee increments attendees via get+update", async () => {
  await withKv(async (kv) => {
    const service = createEventService(createEventRepository(kv));
    const event = await service.create({
      title: "Event",
      date: futureIso(),
      location: "Gym",
      description: "Desc",
    });

    const updated = await service.addAttendee(event.id);
    assertEquals(updated?.attendees, 1);

    assertEquals(await service.addAttendee("evt-missing"), null);
  });
});

Deno.test("memberService: create populates generated fields; getById null for missing id; approved filters", async () => {
  await withKv(async (kv) => {
    const service = createMemberService(createMemberRepository(kv));

    const member = await service.create({
      name: "Jane Athlete",
      email: "jane@example.com",
      level: "beginner",
      goal: "hyrox",
      location: "Madrid",
    });

    assert(member.id.length > 0);
    assertEquals(member.approved, false);
    assert(member.joinedAt instanceof Date);

    assertEquals(await service.getById("mbr-missing"), null);
    assertEquals(await service.getPending(), [member]);
    assertEquals(await service.getApproved(), []);

    await service.approve(member.id);
    const approved = await service.getApproved();
    assertEquals(approved.length, 1);
    assertEquals(approved[0].id, member.id);
  });
});

Deno.test("memberService: search filters by query, level, and goal against approved members only", async () => {
  await withKv(async (kv) => {
    const service = createMemberService(createMemberRepository(kv));

    const approvedMatch = await service.create({
      name: "Hyrox Hannah",
      email: "hannah@example.com",
      level: "advanced",
      goal: "hyrox",
      location: "Madrid",
    });
    await service.approve(approvedMatch.id);

    const approvedNoMatch = await service.create({
      name: "Crossfit Carl",
      email: "carl@example.com",
      level: "beginner",
      goal: "crossfit",
      location: "Madrid",
    });
    await service.approve(approvedNoMatch.id);

    // Pending member matching the query must be excluded regardless of
    // filters, since search only returns approved members.
    await service.create({
      name: "Hyrox Pending",
      email: "pending@example.com",
      level: "advanced",
      goal: "hyrox",
      location: "Madrid",
    });

    const results = await service.search("hyrox", "advanced", "hyrox");
    assertEquals(results.length, 1);
    assertEquals(results[0].id, approvedMatch.id);

    const noResults = await service.search("hyrox", "beginner");
    assertEquals(noResults.length, 0);
  });
});

Deno.test("prService: getTop selects the max-weight approved PR for a movement", async () => {
  await withKv(async (kv) => {
    const memberService = createMemberService(createMemberRepository(kv));
    const service = createPrService(createPrRepository(kv), memberService);

    const low = await service.create({
      memberName: "Athlete A",
      memberEmail: "a@example.com",
      movement: "Deadlift",
      weight: 100,
      date: futureIso(),
    });
    await service.approve(low.id);

    const high = await service.create({
      memberName: "Athlete B",
      memberEmail: "b@example.com",
      movement: "Deadlift",
      weight: 150,
      date: futureIso(),
    });
    await service.approve(high.id);

    // Higher weight but never approved: must not affect getTop.
    const unapproved = await service.create({
      memberName: "Athlete C",
      memberEmail: "c@example.com",
      movement: "Deadlift",
      weight: 200,
      date: futureIso(),
    });
    void unapproved;

    const top = await service.getTop("Deadlift");
    assertEquals(top?.id, high.id);
    assertEquals(await service.getTop("Squat"), null);
  });
});

Deno.test("prService: create resolves memberName from memberService when memberId is given", async () => {
  await withKv(async (kv) => {
    const memberService = createMemberService(createMemberRepository(kv));
    const service = createPrService(createPrRepository(kv), memberService);

    const member = await memberService.create({
      name: "Real Name",
      email: "real@example.com",
      level: "beginner",
      goal: "crossfit",
      location: "Madrid",
    });
    await memberService.approve(member.id);

    const pr = await service.create({
      memberId: member.id,
      memberName: "Ignored Name",
      memberEmail: member.email,
      movement: "Squat",
      weight: 120,
      date: futureIso(),
    });

    assertEquals(pr.memberName, "Real Name");
  });
});

Deno.test("resultService: create populates generated fields; getById null for missing id; approved filters", async () => {
  await withKv(async (kv) => {
    const service = createResultService(createResultRepository(kv));

    const result = await service.create({
      name: "Hyrox Madrid",
      date: futureIso(),
      description: "Season opener",
    });

    assert(result.id.length > 0);
    assertEquals(result.approved, false);

    assertEquals(await service.getById("res-missing"), null);
    assertEquals(await service.getPending(), [result]);
    assertEquals(await service.getApproved(), []);

    await service.approve(result.id);
    assertEquals((await service.getApproved()).length, 1);
  });
});

Deno.test("signupService: create throws 'Already signed up' message on duplicate", async () => {
  await withKv(async (kv) => {
    const eventRepo = createEventRepository(kv);
    const service = createSignupService(createSignupRepository(kv));

    const event = await eventRepo.create({
      title: "Event",
      date: futureIso(),
      location: "Gym",
      description: "Desc",
    });
    // Bookings require a published event.
    await eventRepo.update(event.id, { approved: true });

    await service.create({
      eventId: event.id,
      memberName: "Athlete",
      memberEmail: "athlete@example.com",
    });

    await assertRejects(
      () =>
        service.create({
          eventId: event.id,
          memberName: "Athlete",
          memberEmail: "athlete@example.com",
        }),
      Error,
      "Already signed up for this event",
    );
  });
});

Deno.test("signupService: isSignedUp is an exact (case-sensitive) match", async () => {
  await withKv(async (kv) => {
    const eventRepo = createEventRepository(kv);
    const service = createSignupService(createSignupRepository(kv));

    const event = await eventRepo.create({
      title: "Event",
      date: futureIso(),
      location: "Gym",
      description: "Desc",
    });
    // Bookings require a published event.
    await eventRepo.update(event.id, { approved: true });

    await service.create({
      eventId: event.id,
      memberName: "Athlete",
      memberEmail: "athlete@example.com",
    });

    assertEquals(
      await service.isSignedUp(event.id, "athlete@example.com"),
      true,
    );
    // Different case is a different string: exact match, no normalization.
    assertEquals(
      await service.isSignedUp(event.id, "Athlete@example.com"),
      false,
    );
    assertEquals(
      await service.isSignedUp(event.id, "someone-else@example.com"),
      false,
    );
  });
});

Deno.test("signupService: getAll lists all signups (repository list() extension)", async () => {
  await withKv(async (kv) => {
    const eventRepo = createEventRepository(kv);
    const service = createSignupService(createSignupRepository(kv));

    const event = await eventRepo.create({
      title: "Event",
      date: futureIso(),
      location: "Gym",
      description: "Desc",
    });
    // Bookings require a published event.
    await eventRepo.update(event.id, { approved: true });

    await service.create({
      eventId: event.id,
      memberName: "Athlete One",
      memberEmail: "one@example.com",
    });
    await service.create({
      eventId: event.id,
      memberName: "Athlete Two",
      memberEmail: "two@example.com",
    });

    const all = await service.getAll();
    assertEquals(all.length, 2);
  });
});

Deno.test("signupService: a successful signup changes the event's attendees by exactly 1", async () => {
  await withKv(async (kv) => {
    const eventRepo = createEventRepository(kv);
    const service = createSignupService(createSignupRepository(kv));

    const event = await eventRepo.create({
      title: "Event",
      date: futureIso(),
      location: "Gym",
      description: "Desc",
    });
    // Bookings require a published event.
    await eventRepo.update(event.id, { approved: true });
    assertEquals(event.attendees, 0);

    await service.create({
      eventId: event.id,
      memberName: "Athlete",
      memberEmail: "athlete@example.com",
    });

    const after = await eventRepo.get(event.id);
    // Exactly one increment: this is the regression test for the
    // double-increment bug that Task 6 removes from the routes (services no
    // longer call eventService.addAttendee alongside signupService.create,
    // since the repository already increments atomically inside the signup
    // transaction).
    assertEquals(after?.attendees, 1);
  });
});

Deno.test("signupService: countByEvent counts signups for the event", async () => {
  await withKv(async (kv) => {
    const eventRepo = createEventRepository(kv);
    const service = createSignupService(createSignupRepository(kv));

    const event = await eventRepo.create({
      title: "Event",
      date: futureIso(),
      location: "Gym",
      description: "Desc",
    });
    // Bookings require a published event.
    await eventRepo.update(event.id, { approved: true });

    assertEquals(await service.countByEvent(event.id), 0);

    await service.create({
      eventId: event.id,
      memberName: "Athlete",
      memberEmail: "athlete@example.com",
    });

    assertEquals(await service.countByEvent(event.id), 1);
  });
});

Deno.test("signupService: member cancellation never claims a legacy email-only booking", async () => {
  await withKv(async (kv) => {
    const eventRepo = createEventRepository(kv);
    const signupRepo = createSignupRepository(kv);
    const service = createSignupService(signupRepo);
    const event = await eventRepo.create({
      title: "Legacy booking",
      date: futureIso(),
      location: "Gym",
      description: "No stable owner id",
    });
    await eventRepo.update(event.id, { approved: true });
    const legacy = await signupRepo.create({
      eventId: event.id,
      memberName: "Legacy Athlete",
      memberEmail: "legacy@example.com",
    });
    assert(legacy);

    assertEquals(
      await service.cancelForMember(
        event.id,
        "mbr-current",
        "legacy@example.com",
      ),
      false,
    );
    assert(await signupRepo.get(legacy.id));
  });
});
