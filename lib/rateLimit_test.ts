import { assertEquals } from "std/assert/mod.ts";
import { withKv } from "../repositories/test_utils.ts";
import { clientAddress, consumeRateLimit } from "./rateLimit.ts";

Deno.test("rate limiter permits only the configured number per window", async () => {
  await withKv(async (kv) => {
    const options = {
      scope: "login",
      identifier: "203.0.113.4:user@example.com",
      limit: 2,
      windowMs: 60_000,
      nowMs: 120_000,
    };
    assertEquals((await consumeRateLimit(kv, options)).allowed, true);
    assertEquals((await consumeRateLimit(kv, options)).allowed, true);
    const denied = await consumeRateLimit(kv, options);
    assertEquals(denied.allowed, false);
    assertEquals(denied.retryAfterSeconds, 60);
  });
});

Deno.test("rate limit counters are isolated by identity and window", async () => {
  await withKv(async (kv) => {
    const base = {
      scope: "login",
      limit: 1,
      windowMs: 60_000,
      nowMs: 120_000,
    };
    assertEquals(
      (await consumeRateLimit(kv, { ...base, identifier: "one" })).allowed,
      true,
    );
    assertEquals(
      (await consumeRateLimit(kv, { ...base, identifier: "two" })).allowed,
      true,
    );
    assertEquals(
      (await consumeRateLimit(kv, {
        ...base,
        identifier: "one",
        nowMs: 180_000,
      })).allowed,
      true,
    );
  });
});

Deno.test("clientAddress ignores spoofed proxy headers by default", () => {
  const req = new Request("https://club.example", {
    headers: {
      "cf-connecting-ip": "203.0.113.10",
      "x-real-ip": "203.0.113.11",
      "x-forwarded-for": "203.0.113.12, 10.0.0.1",
    },
  });
  assertEquals(clientAddress(req, "198.51.100.20"), "198.51.100.20");
  assertEquals(
    clientAddress(req, "10.0.0.1", "cf-connecting-ip"),
    "203.0.113.10",
  );
  assertEquals(
    clientAddress(req, "10.0.0.1", "x-forwarded-for"),
    "203.0.113.12",
  );
  assertEquals(clientAddress(new Request("https://club.example")), "unknown");
});

Deno.test("clientAddress rejects malformed values from a configured proxy", () => {
  const req = new Request("https://club.example", {
    headers: { "cf-connecting-ip": "attacker-controlled-bucket" },
  });
  assertEquals(
    clientAddress(req, "10.0.0.1", "cf-connecting-ip"),
    "10.0.0.1",
  );
});
