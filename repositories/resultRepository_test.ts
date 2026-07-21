import { assert, assertEquals } from "std/assert/mod.ts";
import { withKv } from "./test_utils.ts";
import { createResultRepository } from "./resultRepository.ts";

Deno.test("result approval changes visibility between pending and approved indexes", async () => {
  await withKv(async (kv) => {
    const repo = createResultRepository(kv);
    const result = await repo.create({
      name: "Hyrox Local Meet",
      date: new Date().toISOString(),
      description: "Season opener",
    });

    let pending = await repo.listPending();
    assertEquals(pending.length, 1);
    assertEquals(pending[0].id, result.id);

    let approved = await repo.listApproved();
    assertEquals(approved, []);

    const approvedResult = await repo.approve(result.id);
    assert(approvedResult);
    assertEquals(approvedResult?.approved, true);

    pending = await repo.listPending();
    assertEquals(pending, []);

    approved = await repo.listApproved();
    assertEquals(approved.length, 1);
    assertEquals(approved[0].id, result.id);
  });
});

Deno.test("deleting a result removes it from both the primary key and approval index", async () => {
  await withKv(async (kv) => {
    const repo = createResultRepository(kv);
    const result = await repo.create({
      name: "Hyrox Local Meet",
      date: new Date().toISOString(),
      description: "Season opener",
    });
    await repo.approve(result.id);

    const deleted = await repo.delete(result.id);
    assert(deleted);

    assertEquals(await repo.get(result.id), null);
    assertEquals(await repo.listApproved(), []);
    assertEquals(await repo.listPending(), []);
  });
});
