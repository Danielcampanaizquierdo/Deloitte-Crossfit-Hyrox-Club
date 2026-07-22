import { assert, assertEquals, assertRejects } from "std/assert/mod.ts";
import { createAdminRepository } from "../repositories/adminRepository.ts";
import { withKv } from "../repositories/test_utils.ts";
import { verifyPassword } from "./password.ts";
import { bootstrapInitialAdmin } from "./adminBootstrap.ts";

const ENV_KEYS = [
  "INITIAL_ADMIN_EMAIL",
  "INITIAL_ADMIN_NAME",
  "INITIAL_ADMIN_PASSWORD",
] as const;

async function withAdminEnv<T>(
  values: Partial<Record<(typeof ENV_KEYS)[number], string>>,
  fn: () => Promise<T>,
): Promise<T> {
  const originals = new Map(ENV_KEYS.map((key) => [key, Deno.env.get(key)]));
  try {
    for (const key of ENV_KEYS) {
      const value = values[key];
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
    return await fn();
  } finally {
    for (const key of ENV_KEYS) {
      const value = originals.get(key);
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

const initialEnv = {
  INITIAL_ADMIN_EMAIL: "boss@example.com",
  INITIAL_ADMIN_NAME: "Boss Admin",
  INITIAL_ADMIN_PASSWORD: "a-strong-bootstrap-password",
};

Deno.test("initial admin bootstrap creates a PBKDF2 superadmin", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await withAdminEnv(initialEnv, async () => {
      const admin = await bootstrapInitialAdmin(repo);
      assert(admin);
      assertEquals(admin.role, "superadmin");
      assertEquals(admin.active, true);
      assert(admin.passwordHash !== initialEnv.INITIAL_ADMIN_PASSWORD);
      assert(admin.passwordSalt);
      assert(
        await verifyPassword(initialEnv.INITIAL_ADMIN_PASSWORD, {
          hash: admin.passwordHash,
          salt: admin.passwordSalt,
        }),
      );
    });
  });
});

Deno.test("initial admin bootstrap is idempotent and never overwrites", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await withAdminEnv(initialEnv, async () => {
      const first = await bootstrapInitialAdmin(repo);
      assert(first);
      const originalHash = first.passwordHash;

      Deno.env.set("INITIAL_ADMIN_NAME", "Replacement");
      Deno.env.set("INITIAL_ADMIN_PASSWORD", "a-different-password");
      const second = await bootstrapInitialAdmin(repo);

      assertEquals(second?.id, first.id);
      assertEquals(second?.name, "Boss Admin");
      assertEquals(second?.passwordHash, originalHash);
      assertEquals((await repo.list()).length, 1);
    });
  });
});

Deno.test("changing bootstrap email never provisions a second superadmin", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await withAdminEnv(initialEnv, async () => {
      const first = await bootstrapInitialAdmin(repo);
      assert(first);

      Deno.env.set("INITIAL_ADMIN_EMAIL", "second@example.com");
      Deno.env.set("INITIAL_ADMIN_NAME", "Second Admin");
      assertEquals(await bootstrapInitialAdmin(repo), null);
      assertEquals((await repo.list()).map((admin) => admin.id), [first.id]);
    });
  });
});

Deno.test("initial admin bootstrap is a no-op when configuration is incomplete", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await withAdminEnv({}, async () => {
      assertEquals(await bootstrapInitialAdmin(repo), null);
      assertEquals(await repo.list(), []);
    });
  });
});

Deno.test("initial admin bootstrap rejects malformed or weak configuration", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    await withAdminEnv(
      {
        INITIAL_ADMIN_EMAIL: "not-an-email",
        INITIAL_ADMIN_NAME: "Boss",
        INITIAL_ADMIN_PASSWORD: "short",
      },
      async () => {
        await assertRejects(() => bootstrapInitialAdmin(repo), Error, "email");
        assertEquals(await repo.list(), []);
      },
    );

    await withAdminEnv(
      { ...initialEnv, INITIAL_ADMIN_PASSWORD: "short" },
      async () => {
        await assertRejects(
          () => bootstrapInitialAdmin(repo),
          Error,
          "al menos",
        );
        assertEquals(await repo.list(), []);
      },
    );
  });
});
