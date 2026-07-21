// Verifies the fix for the "bootstrap failure permanently rejects the
// shared kv promise" finding: openAndBootstrap must resolve to a usable
// Deno.Kv even when bootstrapInitialAdmin throws.

import { assert, assertEquals } from "std/assert/mod.ts";
import { openAndBootstrap } from "./kv.ts";
import { adminEmailKey } from "../repositories/keys.ts";

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

Deno.test("openAndBootstrap resolves with a usable db even when bootstrapInitialAdmin throws", async () => {
  // ":memory:" databases are isolated per connection, so seeding one and
  // then having openAndBootstrap open a separate ":memory:" connection
  // would not see the seeded data. Use a real temp file instead, so we can
  // seed it *before* calling openAndBootstrap and have both connections see
  // the same state.
  //
  // The seed creates an inconsistent state that reliably makes
  // bootstrapInitialAdmin's repo.create() throw DuplicateAdminEmailError:
  // an admins_by_email index entry with no matching admin record behind it
  // (getByEmail then returns null, so bootstrap proceeds to create(), whose
  // atomic "reserve the email index" check fails because the index entry
  // already exists, which create() reports as a duplicate).
  const path = await Deno.makeTempFile({ suffix: ".sqlite3" });
  try {
    const email = "conflict@example.com";
    const seed = await Deno.openKv(path);
    await seed.set(adminEmailKey(email), "adm-orphaned");
    seed.close();

    await withEnv(
      {
        INITIAL_ADMIN_EMAIL: email,
        INITIAL_ADMIN_NAME: "Conflict Admin",
        INITIAL_ADMIN_PASSWORD: "super-secret",
      },
      async () => {
        const originalConsoleError = console.error;
        const loggedErrors: unknown[][] = [];
        console.error = (...args: unknown[]) => {
          loggedErrors.push(args);
        };
        try {
          const db = await openAndBootstrap(path);
          try {
            assert(
              loggedErrors.length > 0,
              "expected the bootstrap failure to be logged",
            );
            assertEquals(loggedErrors[0][0], "Admin bootstrap failed:");

            // The returned db must still be a usable Deno.Kv instance.
            await db.set(["test", "still-usable"], true);
            assertEquals(
              (await db.get<boolean>(["test", "still-usable"])).value,
              true,
            );
          } finally {
            db.close();
          }
        } finally {
          console.error = originalConsoleError;
        }
      },
    );
  } finally {
    await Deno.remove(path);
  }
});
