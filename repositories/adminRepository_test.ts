import { assert, assertEquals, assertRejects } from "std/assert/mod.ts";
import { withKv } from "./test_utils.ts";
import {
  createAdminRepository,
  DuplicateAdminEmailError,
} from "./adminRepository.ts";
import type { Admin } from "../types/Admin.ts";

Deno.test("admin repository reserves normalized emails atomically", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await repo.create({
      email: "Admin@Example.COM",
      name: "Admin One",
      passwordHash: "hash-one",
    });

    await assertRejects(
      () =>
        repo.create({
          email: "admin@example.com",
          name: "Admin Two",
          passwordHash: "hash-two",
        }),
      DuplicateAdminEmailError,
    );
  });
});

Deno.test("admin repository getByEmail finds admin regardless of case", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    const created = await repo.create({
      email: "Admin@Example.COM",
      name: "Admin One",
      passwordHash: "hash-one",
    });

    const found = await repo.getByEmail("admin@example.com");
    assert(found);
    assertEquals(found?.id, created.id);
  });
});

Deno.test("admin deactivate transitions active to false", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    const admin = await repo.create({
      email: "admin@example.com",
      name: "Admin One",
      passwordHash: "hash-one",
    });
    assertEquals(admin.active, true);

    const deactivated = await repo.deactivate(admin.id);
    assert(deactivated);
    assertEquals(deactivated?.active, false);

    const reread = await repo.get(admin.id);
    assertEquals(reread?.active, false);
  });
});

Deno.test("admin deactivate returns null for unknown id", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    assertEquals(await repo.deactivate("nope"), null);
  });
});

Deno.test("admin repository list returns all admins", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await repo.create({
      email: "one@example.com",
      name: "Admin One",
      passwordHash: "hash-one",
    });
    await repo.create({
      email: "two@example.com",
      name: "Admin Two",
      passwordHash: "hash-two",
    });

    const all = await repo.list();
    assertEquals(all.length, 2);
    const emails = all.map((a: Admin) => a.email).sort();
    assertEquals(emails, ["one@example.com", "two@example.com"]);
  });
});
