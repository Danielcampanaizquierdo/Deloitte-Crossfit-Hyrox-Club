import { assert, assertEquals, assertRejects } from "std/assert/mod.ts";
import { withKv } from "../repositories/test_utils.ts";
import { createWodRepository } from "../repositories/wodRepository.ts";
import { createWodService } from "./wodService.ts";
import type { CreateWodRequest } from "../types/Wod.ts";

function wodData(overrides: Partial<CreateWodRequest> = {}): CreateWodRequest {
  return {
    name: "Fran",
    date: "2026-08-01T10:00:00.000Z",
    format: "for_time",
    description: "21-15-9",
    scoreType: "time",
    ...overrides,
  };
}

Deno.test("getBoard returns approved WODs newest first", async () => {
  await withKv(async (kv) => {
    const service = createWodService(createWodRepository(kv));

    const older = await service.create(
      wodData({ name: "Older", date: "2026-08-01T10:00:00.000Z" }),
    );
    const newer = await service.create(
      wodData({ name: "Newer", date: "2026-09-01T10:00:00.000Z" }),
    );
    await service.approve(older.id);
    await service.approve(newer.id);

    // A pending WOD must not reach the public board.
    await service.create(wodData({ name: "Unpublished" }));

    const board = await service.getBoard();
    assertEquals(board.map((w) => w.name), ["Newer", "Older"]);
  });
});

Deno.test("getBoard ranks a time WOD fastest first and hides pending scores", async () => {
  await withKv(async (kv) => {
    const service = createWodService(createWodRepository(kv));
    const wod = await service.create(wodData());
    await service.approve(wod.id);

    const slow = await service.createScore({
      wodId: wod.id,
      memberName: "Slow",
      memberEmail: "slow@example.com",
      value: 300,
    });
    const fast = await service.createScore({
      wodId: wod.id,
      memberName: "Fast",
      memberEmail: "fast@example.com",
      value: 180,
    });
    assert(slow && fast);
    await service.approveScore(slow!.id);
    await service.approveScore(fast!.id);

    // Left pending: must not appear on the board.
    await service.createScore({
      wodId: wod.id,
      memberName: "Unreviewed",
      memberEmail: "pending@example.com",
      value: 100,
    });

    const [board] = await service.getBoard();
    assertEquals(board.scores.map((s) => s.memberName), ["Fast", "Slow"]);
  });
});

Deno.test("getBoard ranks a reps WOD highest first with Rx above scaled", async () => {
  await withKv(async (kv) => {
    const service = createWodService(createWodRepository(kv));
    const wod = await service.create(
      wodData({ name: "Cindy", format: "amrap", scoreType: "rounds" }),
    );
    await service.approve(wod.id);

    const scaledHigh = await service.createScore({
      wodId: wod.id,
      memberName: "Scaled High",
      memberEmail: "scaled@example.com",
      value: 25,
      scaled: true,
    });
    const rxLow = await service.createScore({
      wodId: wod.id,
      memberName: "Rx Low",
      memberEmail: "rx@example.com",
      value: 18,
    });
    assert(scaledHigh && rxLow);
    await service.approveScore(scaledHigh!.id);
    await service.approveScore(rxLow!.id);

    const [board] = await service.getBoard();
    // Rx outranks scaled even on a lower raw score.
    assertEquals(board.scores.map((s) => s.memberName), [
      "Rx Low",
      "Scaled High",
    ]);
  });
});

Deno.test("a second score from the same athlete is rejected by message", async () => {
  await withKv(async (kv) => {
    const service = createWodService(createWodRepository(kv));
    const wod = await service.create(wodData());
    await service.approve(wod.id);

    await service.createScore({
      wodId: wod.id,
      memberName: "Athlete",
      memberEmail: "athlete@example.com",
      value: 200,
    });

    // The route maps this message to HTTP 409.
    await assertRejects(
      () =>
        service.createScore({
          wodId: wod.id,
          memberName: "Athlete",
          memberEmail: "athlete@example.com",
          value: 190,
        }),
      Error,
      "Already scored this WOD",
    );
  });
});

Deno.test("getBoard caps how many WODs it returns", async () => {
  await withKv(async (kv) => {
    const service = createWodService(createWodRepository(kv));
    for (let i = 0; i < 5; i++) {
      const wod = await service.create(
        wodData({ name: `WOD ${i}`, date: `2026-0${i + 1}-01T10:00:00.000Z` }),
      );
      await service.approve(wod.id);
    }

    assertEquals((await service.getBoard(2)).length, 2);
  });
});
