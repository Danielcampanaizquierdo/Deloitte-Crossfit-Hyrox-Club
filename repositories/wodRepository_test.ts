import { assert, assertEquals, assertRejects } from "std/assert/mod.ts";
import { withKv } from "./test_utils.ts";
import {
  createWodRepository,
  DuplicateWodScoreError,
} from "./wodRepository.ts";
import type { CreateWodRequest } from "../types/Wod.ts";

function wodData(overrides: Partial<CreateWodRequest> = {}): CreateWodRequest {
  return {
    name: "Fran",
    date: new Date("2026-08-01T10:00:00Z").toISOString(),
    format: "for_time",
    description: "21-15-9 Thrusters / Pull-ups",
    scoreType: "time",
    ...overrides,
  };
}

Deno.test("WOD approval moves the WOD between approval indexes", async () => {
  await withKv(async (kv) => {
    const repo = createWodRepository(kv);
    const wod = await repo.create(wodData());

    assertEquals((await repo.listPending()).map((w) => w.id), [wod.id]);
    assertEquals(await repo.listApproved(), []);

    const approved = await repo.approve(wod.id);
    assertEquals(approved?.approved, true);

    assertEquals(await repo.listPending(), []);
    assertEquals((await repo.listApproved()).map((w) => w.id), [wod.id]);
  });
});

Deno.test("only one score per athlete and WOD commits", async () => {
  await withKv(async (kv) => {
    const repo = createWodRepository(kv);
    const wod = await repo.create(wodData());

    const first = await repo.createScore({
      wodId: wod.id,
      memberName: "Athlete One",
      memberEmail: "one@example.com",
      value: 201,
    });
    assert(first);

    await assertRejects(
      () =>
        repo.createScore({
          wodId: wod.id,
          memberName: "Athlete One",
          memberEmail: "one@example.com",
          value: 190,
        }),
      DuplicateWodScoreError,
    );

    assertEquals((await repo.listScoresByWod(wod.id)).length, 1);
  });
});

Deno.test("the duplicate score check normalizes email casing", async () => {
  await withKv(async (kv) => {
    const repo = createWodRepository(kv);
    const wod = await repo.create(wodData());

    await repo.createScore({
      wodId: wod.id,
      memberName: "Athlete One",
      memberEmail: "One@Example.com",
      value: 201,
    });

    await assertRejects(
      () =>
        repo.createScore({
          wodId: wod.id,
          memberName: "Athlete One",
          memberEmail: "one@example.com",
          value: 190,
        }),
      DuplicateWodScoreError,
    );
  });
});

Deno.test("stable member id prevents a second score after an email change", async () => {
  await withKv(async (kv) => {
    const repo = createWodRepository(kv);
    const wod = await repo.create(wodData());

    const first = await repo.createScore({
      wodId: wod.id,
      memberId: "mbr-stable-score",
      memberName: "Athlete",
      memberEmail: "old-score@example.com",
      value: 201,
    });
    assertEquals(first?.memberId, "mbr-stable-score");

    await assertRejects(
      () =>
        repo.createScore({
          wodId: wod.id,
          memberId: "mbr-stable-score",
          memberName: "Athlete",
          memberEmail: "new-score@example.com",
          value: 190,
        }),
      DuplicateWodScoreError,
    );
  });
});

Deno.test("scoring a WOD that does not exist returns null", async () => {
  await withKv(async (kv) => {
    const repo = createWodRepository(kv);
    const score = await repo.createScore({
      wodId: "wod-missing",
      memberName: "Athlete One",
      memberEmail: "one@example.com",
      value: 201,
    });
    assertEquals(score, null);
  });
});

Deno.test("scores start pending and approval moves them between indexes", async () => {
  await withKv(async (kv) => {
    const repo = createWodRepository(kv);
    const wod = await repo.create(wodData());
    const score = await repo.createScore({
      wodId: wod.id,
      memberName: "Athlete One",
      memberEmail: "one@example.com",
      value: 201,
    });
    assert(score);
    assertEquals(score.approved, false);

    assertEquals((await repo.listPendingScores()).map((s) => s.id), [score.id]);

    const approved = await repo.approveScore(score.id);
    assertEquals(approved?.approved, true);
    assertEquals(await repo.listPendingScores(), []);
  });
});

Deno.test("deleting a score frees the athlete to submit again", async () => {
  await withKv(async (kv) => {
    const repo = createWodRepository(kv);
    const wod = await repo.create(wodData());
    const score = await repo.createScore({
      wodId: wod.id,
      memberName: "Athlete One",
      memberEmail: "one@example.com",
      value: 201,
    });
    assert(score);

    assert(await repo.deleteScore(score.id));
    assertEquals(await repo.getScore(score.id), null);
    assertEquals(await repo.listScoresByWod(wod.id), []);

    // The reservation key is gone, so a corrected score can be submitted.
    const resubmitted = await repo.createScore({
      wodId: wod.id,
      memberName: "Athlete One",
      memberEmail: "one@example.com",
      value: 195,
    });
    assert(resubmitted);
  });
});

Deno.test("deleting a WOD also removes the scores logged against it", async () => {
  await withKv(async (kv) => {
    const repo = createWodRepository(kv);
    const wod = await repo.create(wodData());
    const score = await repo.createScore({
      wodId: wod.id,
      memberName: "Athlete One",
      memberEmail: "one@example.com",
      value: 201,
    });
    assert(score);
    await repo.approveScore(score.id);

    assert(await repo.delete(wod.id));

    assertEquals(await repo.get(wod.id), null);
    assertEquals(await repo.listScoresByWod(wod.id), []);
    // The orphaned score must not linger in the primary keyspace either.
    assertEquals(await repo.listScores(), []);
  });
});

Deno.test("rescheduling a WOD keeps a single date index entry", async () => {
  await withKv(async (kv) => {
    const repo = createWodRepository(kv);
    const wod = await repo.create(wodData());

    const moved = await repo.update(wod.id, {
      date: new Date("2026-09-15T10:00:00Z").toISOString(),
    });
    assert(moved);

    const dateEntries: string[] = [];
    for await (
      const entry of kv.list<string>({ prefix: ["wods_by_date"] })
    ) {
      dateEntries.push(entry.value);
    }
    assertEquals(dateEntries, [wod.id]);
  });
});
