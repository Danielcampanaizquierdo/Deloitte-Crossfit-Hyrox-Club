import { assert, assertEquals } from "std/assert/mod.ts";
import { withKv } from "../repositories/test_utils.ts";
import { createAdminRepository } from "../repositories/adminRepository.ts";
import { bootstrapInitialAdmin } from "./adminBootstrap.ts";

const ENV_KEYS = [
  "INITIAL_ADMIN_EMAIL",
  "INITIAL_ADMIN_NAME",
  "INITIAL_ADMIN_PASSWORD",
] as const;

async function withEnv<T>(
  values: Partial<Record<typeof ENV_KEYS[number], string>>,
  fn: () => Promise<T>,
): Promise<T> {
  const originals: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) originals[key] = Deno.env.get(key);
  try {
    for (const key of ENV_KEYS) {
      const value = values[key];
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
    return await fn();
  } finally {
    for (const key of ENV_KEYS) {
      const original = originals[key];
      if (original === undefined) Deno.env.delete(key);
      else Deno.env.set(key, original);
    }
  }
}

Deno.test("bootstrapInitialAdmin creates the admin from env vars when none exists", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await withEnv(
      {
        INITIAL_ADMIN_EMAIL: "boss@example.com",
        INITIAL_ADMIN_NAME: "Boss Admin",
        INITIAL_ADMIN_PASSWORD: "super-secret",
      },
      async () => {
        const admin = await bootstrapInitialAdmin(repo);
        assert(admin);
        assertEquals(admin?.email, "boss@example.com");
        assertEquals(admin?.name, "Boss Admin");
        assertEquals(admin?.active, true);
        assert(admin?.passwordHash);
        assert(admin?.passwordHash !== "super-secret");

        const stored = await repo.getByEmail("boss@example.com");
        assert(stored);
        assertEquals(stored?.id, admin?.id);
      },
    );
  });
});

Deno.test("bootstrapInitialAdmin is idempotent across repeated calls", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await withEnv(
      {
        INITIAL_ADMIN_EMAIL: "boss@example.com",
        INITIAL_ADMIN_NAME: "Boss Admin",
        INITIAL_ADMIN_PASSWORD: "super-secret",
      },
      async () => {
        const first = await bootstrapInitialAdmin(repo);
        const second = await bootstrapInitialAdmin(repo);
        assert(first);
        assert(second);
        assertEquals(second?.id, first?.id);

        const all = await repo.list();
        assertEquals(all.length, 1);
      },
    );
  });
});

Deno.test("bootstrapInitialAdmin never overwrites an existing account", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await withEnv(
      {
        INITIAL_ADMIN_EMAIL: "boss@example.com",
        INITIAL_ADMIN_NAME: "Boss Admin",
        INITIAL_ADMIN_PASSWORD: "super-secret",
      },
      async () => {
        await bootstrapInitialAdmin(repo);
      },
    );

    await withEnv(
      {
        INITIAL_ADMIN_EMAIL: "boss@example.com",
        INITIAL_ADMIN_NAME: "Renamed Admin",
        INITIAL_ADMIN_PASSWORD: "different-secret",
      },
      async () => {
        const result = await bootstrapInitialAdmin(repo);
        assertEquals(result?.name, "Boss Admin");
      },
    );
  });
});

Deno.test("bootstrapInitialAdmin returns null and creates nothing when env vars are missing", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await withEnv({}, async () => {
      const result = await bootstrapInitialAdmin(repo);
      assertEquals(result, null);
    });

    const all = await repo.list();
    assertEquals(all.length, 0);
  });
});
