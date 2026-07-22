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

Deno.test("member update rejects an email change onto an email already taken by another member", async () => {
  await withKv(async (kv) => {
    const repo = createMemberRepository(kv);
    const first = await repo.create({
      name: "First Member",
      email: "first@example.com",
      level: "beginner",
      goal: "crossfit",
      location: "City",
    });
    const second = await repo.create({
      name: "Second Member",
      email: "second@example.com",
      level: "intermediate",
      goal: "hyrox",
      location: "City",
    });

    await assertRejects(
      () => repo.update(first.id, { email: second.email }),
      DuplicateMemberEmailError,
    );

    // First member's original email index and record must be unchanged.
    const stillFirst = await repo.getByEmail("first@example.com");
    assert(stillFirst);
    assertEquals(stillFirst?.id, first.id);
    assertEquals(stillFirst?.email, first.email);

    const stillSecond = await repo.getByEmail("second@example.com");
    assert(stillSecond);
    assertEquals(stillSecond?.id, second.id);
  });
});

Deno.test("member update successfully changes email to a free address", async () => {
  await withKv(async (kv) => {
    const repo = createMemberRepository(kv);
    const member = await repo.create({
      name: "Changing Member",
      email: "old@example.com",
      level: "beginner",
      goal: "crossfit",
      location: "City",
    });

    const updated = await repo.update(member.id, {
      email: "new@example.com",
    });
    assert(updated);
    assertEquals(updated?.email, "new@example.com");

    assertEquals(await repo.getByEmail("old@example.com"), null);
    const byNewEmail = await repo.getByEmail("new@example.com");
    assert(byNewEmail);
    assertEquals(byNewEmail?.id, member.id);
    assertEquals(byNewEmail?.email, "new@example.com");
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

Deno.test("member deletion leaves a credential-free tombstone and reserves the identity", async () => {
  await withKv(async (kv) => {
    const repo = createMemberRepository(kv);
    const member = await repo.create({
      name: "Departing Member",
      email: "departing@example.com",
      level: "advanced",
      goal: "hyrox",
      location: "Madrid",
      passwordHash: "secret-hash",
      passwordSalt: "secret-salt",
    });
    await repo.approve(member.id);

    assert(await repo.delete(member.id));
    const tombstone = await repo.get(member.id);
    assert(tombstone);
    assertEquals(tombstone.id, member.id);
    assertEquals(tombstone.email, member.email);
    assertEquals(tombstone.approved, false);
    assertEquals(tombstone.active, false);
    assert(tombstone.deletedAt instanceof Date);
    assertEquals("passwordHash" in tombstone, false);
    assertEquals("passwordSalt" in tombstone, false);
    assertEquals(await repo.list(), []);
    assertEquals(await repo.listApproved(), []);
    assertEquals(await repo.listPending(), []);
    assertEquals(await repo.approve(member.id), null);

    await assertRejects(
      () =>
        repo.create({
          name: "Identity Hijacker",
          email: "departing@example.com",
          level: "beginner",
          goal: "general",
          location: "Barcelona",
        }),
      DuplicateMemberEmailError,
    );
  });
});
