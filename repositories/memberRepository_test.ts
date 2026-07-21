import { assert, assertEquals, assertRejects } from "std/assert/mod.ts";
import { withKv } from "./test_utils.ts";
import {
  createMemberRepository,
  DuplicateMemberEmailError,
} from "./memberRepository.ts";

Deno.test("member repository reserves normalized emails atomically", async () => {
  await withKv(async (kv) => {
    const repo = createMemberRepository(kv);
    await repo.create({
      name: "Athlete One",
      email: "Athlete@Example.com",
      level: "beginner",
      goal: "crossfit",
      location: "City",
    });

    await assertRejects(
      () =>
        repo.create({
          name: "Athlete Two",
          email: "athlete@example.com",
          level: "intermediate",
          goal: "hyrox",
          location: "City",
        }),
      DuplicateMemberEmailError,
    );
  });
});

Deno.test("member approval moves the member between approval indexes", async () => {
  await withKv(async (kv) => {
    const repo = createMemberRepository(kv);
    const member = await repo.create({
      name: "Pending Member",
      email: "pending@example.com",
      level: "beginner",
      goal: "general",
      location: "City",
    });

    let pending = await repo.listPending();
    assertEquals(pending.length, 1);
    assertEquals(pending[0].id, member.id);

    const approved = await repo.approve(member.id);
    assert(approved);
    assertEquals(approved?.approved, true);

    pending = await repo.listPending();
    assertEquals(pending, []);

    const approvedList = await repo.listApproved();
    assertEquals(approvedList.length, 1);
    assertEquals(approvedList[0].id, member.id);
  });
});
