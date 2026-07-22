import { assert, assertEquals, assertRejects } from "std/assert/mod.ts";
import { withKv } from "./test_utils.ts";
import { createPrRepository, MemberNotEligibleError } from "./prRepository.ts";
import { createMemberRepository } from "./memberRepository.ts";
import type { PR } from "../types/PR.ts";

Deno.test("PR approval changes visibility between pending and approved indexes", async () => {
  await withKv(async (kv) => {
    const repo = createPrRepository(kv);
    const pr = await repo.create({
      memberName: "Athlete One",
      memberEmail: "athlete@example.com",
      movement: "Deadlift",
      weight: 100,
      date: new Date().toISOString(),
    });

    let pending = await repo.listPending();
    assertEquals(pending.length, 1);
    assertEquals(pending[0].id, pr.id);

    let approved = await repo.listApproved();
    assertEquals(approved, []);

    const approvedPr = await repo.approve(pr.id);
    assert(approvedPr);
    assertEquals(approvedPr?.approved, true);

    pending = await repo.listPending();
    assertEquals(pending, []);

    approved = await repo.listApproved();
    assertEquals(approved.length, 1);
    assertEquals(approved[0].id, pr.id);
  });
});

Deno.test("listByMovement returns only approved PRs for its movement", async () => {
  await withKv(async (kv) => {
    const repo = createPrRepository(kv);

    const approvedDeadlift = await repo.create({
      memberName: "Athlete One",
      memberEmail: "one@example.com",
      movement: "Deadlift",
      weight: 120,
      date: new Date().toISOString(),
    });
    await repo.approve(approvedDeadlift.id);

    // Pending PR for the same movement: must be excluded.
    await repo.create({
      memberName: "Athlete Two",
      memberEmail: "two@example.com",
      movement: "Deadlift",
      weight: 140,
      date: new Date().toISOString(),
    });

    // Approved PR for a different movement: must be excluded.
    const approvedSquat = await repo.create({
      memberName: "Athlete Three",
      memberEmail: "three@example.com",
      movement: "Squat",
      weight: 150,
      date: new Date().toISOString(),
    });
    await repo.approve(approvedSquat.id);

    const deadliftPrs = await repo.listByMovement("Deadlift");
    assertEquals(deadliftPrs.length, 1);
    assertEquals(deadliftPrs[0].id, approvedDeadlift.id);
    assert(deadliftPrs.every((p: PR) => p.approved));
  });
});

Deno.test("listByMemberId uses the member index", async () => {
  await withKv(async (kv) => {
    const repo = createPrRepository(kv);
    const members = createMemberRepository(kv);
    const memberOne = await members.create({
      name: "Athlete One",
      email: "one@example.com",
      level: "beginner",
      goal: "crossfit",
      location: "Madrid",
    });
    const memberTwo = await members.create({
      name: "Athlete Two",
      email: "two@example.com",
      level: "beginner",
      goal: "crossfit",
      location: "Madrid",
    });
    await members.approve(memberOne.id);
    await members.approve(memberTwo.id);

    const memberOnePr = await repo.create({
      memberId: memberOne.id,
      memberName: "Athlete One",
      memberEmail: "one@example.com",
      movement: "Deadlift",
      weight: 100,
      date: new Date().toISOString(),
    });
    await repo.create({
      memberId: memberTwo.id,
      memberName: "Athlete Two",
      memberEmail: "two@example.com",
      movement: "Squat",
      weight: 110,
      date: new Date().toISOString(),
    });

    const memberOnePrs = await repo.listByMemberId(memberOne.id);
    assertEquals(memberOnePrs.length, 1);
    assertEquals(memberOnePrs[0].id, memberOnePr.id);
  });
});

Deno.test("deleting a PR removes it from primary, approval, movement, and member indexes", async () => {
  await withKv(async (kv) => {
    const repo = createPrRepository(kv);
    const members = createMemberRepository(kv);
    const member = await members.create({
      name: "Athlete One",
      email: "one@example.com",
      level: "beginner",
      goal: "crossfit",
      location: "Madrid",
    });
    await members.approve(member.id);
    const pr = await repo.create({
      memberId: member.id,
      memberName: "Athlete One",
      memberEmail: "one@example.com",
      movement: "Deadlift",
      weight: 100,
      date: new Date().toISOString(),
    });
    await repo.approve(pr.id);

    const deleted = await repo.delete(pr.id);
    assert(deleted);

    assertEquals(await repo.get(pr.id), null);
    assertEquals(await repo.listApproved(), []);
    assertEquals(await repo.listByMovement("Deadlift"), []);
    assertEquals(await repo.listByMemberId(member.id), []);
  });
});

Deno.test("stable-id PR creation requires approval and ignores supplied attribution", async () => {
  await withKv(async (kv) => {
    const repo = createPrRepository(kv);
    const members = createMemberRepository(kv);
    const member = await members.create({
      name: "Stored Athlete",
      email: "stored-pr@example.com",
      level: "advanced",
      goal: "crossfit",
      location: "Madrid",
    });
    const request = {
      memberId: member.id,
      memberName: "Impostor",
      memberEmail: "impostor@example.com",
      movement: "Deadlift",
      weight: 180,
      date: new Date().toISOString(),
    };

    await assertRejects(() => repo.create(request), MemberNotEligibleError);
    await members.approve(member.id);
    const pr = await repo.create(request);
    assertEquals(pr.memberName, "Stored Athlete");
    assertEquals(pr.memberEmail, "stored-pr@example.com");
  });
});
