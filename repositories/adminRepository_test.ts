import { assert, assertEquals, assertRejects } from "std/assert/mod.ts";
import { toPublicAdmin } from "../types/Admin.ts";
import {
  createAdminRepository,
  DuplicateAdminEmailError,
} from "./adminRepository.ts";
import { withKv } from "./test_utils.ts";

const credentials = {
  passwordHash: "hash",
  passwordSalt: "salt",
};

Deno.test("admin repository reserves normalized emails atomically", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await repo.create({
      email: " Admin@Example.COM ",
      name: "Admin One",
      ...credentials,
      role: "superadmin",
    });

    await assertRejects(
      () =>
        repo.create({
          email: "admin@example.com",
          name: "Admin Two",
          ...credentials,
        }),
      DuplicateAdminEmailError,
    );
  });
});

Deno.test("only one concurrent initial administrator can be reserved", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    const [first, second] = await Promise.all([
      repo.createInitial({
        email: "initial-one@example.com",
        name: "Initial One",
        ...credentials,
        role: "superadmin",
      }),
      repo.createInitial({
        email: "initial-two@example.com",
        name: "Initial Two",
        ...credentials,
        role: "superadmin",
      }),
    ]);

    assertEquals([first, second].filter(Boolean).length, 1);
    assertEquals((await repo.list()).length, 1);
  });
});

Deno.test("admin repository stores the complete account and resolves email case-insensitively", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    const created = await repo.create({
      email: "Boss@Example.com",
      name: "Boss",
      ...credentials,
      role: "superadmin",
    });

    const found = await repo.getByEmail(" boss@example.COM ");
    assert(found);
    assertEquals(found.id, created.id);
    assertEquals(found.role, "superadmin");
    assertEquals(found.active, true);
    assert(found.createdAt instanceof Date);
    assert(found.updatedAt instanceof Date);
  });
});

Deno.test("admin repository lists and deactivates accounts", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    const first = await repo.create({
      email: "one@example.com",
      name: "One",
      ...credentials,
    });
    await repo.create({
      email: "two@example.com",
      name: "Two",
      ...credentials,
    });

    assertEquals((await repo.list()).length, 2);
    const deactivated = await repo.deactivate(first.id);
    assertEquals(deactivated?.active, false);
    assertEquals((await repo.get(first.id))?.active, false);
    assertEquals(await repo.deactivate("adm-missing"), null);
  });
});

Deno.test("public admin projection strips both password fields", async () => {
  await withKv(async (kv) => {
    const admin = await createAdminRepository(kv).create({
      email: "safe@example.com",
      name: "Safe",
      ...credentials,
    });
    const publicAdmin = toPublicAdmin(admin);
    assertEquals("passwordHash" in publicAdmin, false);
    assertEquals("passwordSalt" in publicAdmin, false);
    assertEquals(publicAdmin.email, admin.email);
  });
});
