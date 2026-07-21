import { assert, assertEquals, assertNotEquals } from "std/assert/mod.ts";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  validatePassword,
  verifyPassword,
} from "./password.ts";

Deno.test("a hashed password verifies against itself", async () => {
  const record = await hashPassword("correct horse battery");
  assert(await verifyPassword("correct horse battery", record));
});

Deno.test("a wrong password does not verify", async () => {
  const record = await hashPassword("correct horse battery");
  assertEquals(await verifyPassword("wrong horse battery", record), false);
  assertEquals(await verifyPassword("", record), false);
});

Deno.test("the plaintext never appears in the stored record", async () => {
  const password = "supersecretpassword";
  const record = await hashPassword(password);
  assertEquals(record.hash.includes(password), false);
  assertEquals(record.salt.includes(password), false);
});

Deno.test("the same password hashes differently for two members", async () => {
  const a = await hashPassword("identical-password");
  const b = await hashPassword("identical-password");
  // Distinct salts, so a leaked table does not reveal shared passwords.
  assertNotEquals(a.salt, b.salt);
  assertNotEquals(a.hash, b.hash);
  // Both still verify.
  assert(await verifyPassword("identical-password", a));
  assert(await verifyPassword("identical-password", b));
});

Deno.test("members stored before accounts existed cannot log in", async () => {
  // No hash/salt at all: every seeded and legacy member looks like this.
  assertEquals(await verifyPassword("anything", null), false);
  assertEquals(await verifyPassword("anything", undefined), false);
  assertEquals(await verifyPassword("anything", {}), false);
  assertEquals(await verifyPassword("anything", { hash: "x" }), false);
});

Deno.test("a corrupt salt fails closed instead of throwing", async () => {
  const verified = await verifyPassword("anything", {
    hash: "abc",
    salt: "!!!not-base64!!!",
  });
  assertEquals(verified, false);
});

Deno.test("password policy rejects short and oversized passwords", () => {
  assertEquals(validatePassword("a".repeat(MIN_PASSWORD_LENGTH)), null);
  assert(validatePassword("a".repeat(MIN_PASSWORD_LENGTH - 1)) !== null);
  assert(validatePassword("a".repeat(201)) !== null);
});
