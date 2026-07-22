import { assertEquals } from "std/assert/mod.ts";
import {
  isTrustedMutation,
  rejectUntrustedApiMutation,
} from "./requestSecurity.ts";

Deno.test("safe requests do not require an Origin header", () => {
  const req = new Request("https://club.example/api/events");
  assertEquals(isTrustedMutation(req), true);
  assertEquals(rejectUntrustedApiMutation(req), null);
});

Deno.test("same-origin browser mutations are accepted", () => {
  const req = new Request("https://club.example/api/prs", {
    method: "POST",
    headers: {
      origin: "https://club.example",
      "sec-fetch-site": "same-origin",
    },
  });
  assertEquals(isTrustedMutation(req), true);
});

Deno.test("cross-origin and opaque browser mutations are rejected", async () => {
  for (
    const headers of [
      { origin: "https://evil.example" },
      { origin: "null" },
      { "sec-fetch-site": "cross-site" },
    ] as Array<Record<string, string>>
  ) {
    const req = new Request("https://club.example/api/events/1/cancel", {
      method: "POST",
      headers,
    });
    const response = rejectUntrustedApiMutation(req);
    assertEquals(response?.status, 403);
    assertEquals((await response?.json()).error.length > 0, true);
  }
});

Deno.test("non-browser API clients without browser metadata remain supported", () => {
  const req = new Request("https://club.example/api/events/1/cancel", {
    method: "POST",
  });
  assertEquals(isTrustedMutation(req), true);
});

Deno.test("the protection only applies to API routes", () => {
  const req = new Request("https://club.example/form", {
    method: "POST",
    headers: { origin: "https://evil.example" },
  });
  assertEquals(rejectUntrustedApiMutation(req), null);
});
