import { assertEquals, assertStringIncludes } from "std/assert/mod.ts";
import { handler as middleware } from "../routes/_middleware.ts";

Deno.env.set("SESSION_SECRET", "test-secret-at-least-32-characters-long!!");

function context(response = new Response("ok")): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    state: {},
    next: () => response,
  };
  return ctx;
}

Deno.test("middleware rejects cross-site API mutations before routing", async () => {
  const response = await middleware(
    new Request("https://club.example/api/events/evt-1/cancel", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      },
    }),
    context() as never,
  );
  assertEquals(response.status, 403);
});

Deno.test("middleware marks cookie-varying GET responses", async () => {
  const response = await middleware(
    new Request("https://club.example/api/events"),
    context(Response.json({ events: [] })) as never,
  );
  assertStringIncludes(response.headers.get("vary") ?? "", "Cookie");
});

Deno.test("middleware makes mutations non-cacheable", async () => {
  const response = await middleware(
    new Request("https://club.example/api/auth/logout", { method: "POST" }),
    context(Response.json({ success: true })) as never,
  );
  assertEquals(response.headers.get("cache-control"), "private, no-store");
});

Deno.test("middleware clears an invalid session cookie", async () => {
  const response = await middleware(
    new Request("https://club.example/api/auth/me", {
      headers: { cookie: "member_session=invalid.signature" },
    }),
    context(Response.json({ member: null })) as never,
  );
  const setCookie = response.headers.get("set-cookie") ?? "";
  assertStringIncludes(setCookie, "member_session=;");
  assertStringIncludes(setCookie, "Max-Age=0");
  assertEquals(response.headers.get("cache-control"), "private, no-store");
});

Deno.test("middleware does not overwrite a replacement session cookie", async () => {
  const replacement = "member_session=new-token; HttpOnly; Path=/";
  const response = await middleware(
    new Request("https://club.example/api/auth/login", {
      method: "POST",
      headers: { cookie: "member_session=invalid.signature" },
    }),
    context(
      Response.json({ ok: true }, {
        headers: { "Set-Cookie": replacement },
      }),
    ) as never,
  );
  const setCookie = response.headers.get("set-cookie") ?? "";
  assertStringIncludes(setCookie, "member_session=new-token");
  assertEquals(setCookie.includes("member_session=;"), false);
});
