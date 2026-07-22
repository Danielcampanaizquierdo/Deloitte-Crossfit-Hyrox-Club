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

Deno.test("middleware sets baseline security headers on every response", async () => {
  const response = await middleware(
    new Request("https://club.example/api/events"),
    context(Response.json({ events: [] })) as never,
  );
  assertEquals(
    response.headers.get("strict-transport-security"),
    "max-age=63072000; includeSubDomains; preload",
  );
  assertEquals(response.headers.get("x-content-type-options"), "nosniff");
  assertEquals(response.headers.get("x-frame-options"), "DENY");
  assertEquals(
    response.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
  assertEquals(
    response.headers.get("permissions-policy"),
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  const csp = response.headers.get("content-security-policy") ?? "";
  assertStringIncludes(csp, "frame-ancestors 'none'");
  assertStringIncludes(csp, "object-src 'none'");
  assertStringIncludes(csp, "base-uri 'self'");
  // Permissive enough to keep Fresh hydration + inline styles working.
  assertStringIncludes(csp, "script-src 'self' 'unsafe-inline'");
  assertStringIncludes(csp, "style-src 'self' 'unsafe-inline'");
});

Deno.test("middleware does not override headers a handler already set", async () => {
  const response = await middleware(
    new Request("https://club.example/api/events"),
    context(
      Response.json({ events: [] }, {
        headers: { "X-Frame-Options": "SAMEORIGIN" },
      }),
    ) as never,
  );
  assertEquals(response.headers.get("x-frame-options"), "SAMEORIGIN");
});

Deno.test("middleware sets no-store on anonymous public GETs", async () => {
  for (const path of ["/", "/api/events", "/api/members", "/api/wods"]) {
    const response = await middleware(
      new Request(`https://club.example${path}`),
      context(Response.json({})) as never,
    );
    assertEquals(
      response.headers.get("cache-control"),
      "no-store",
      `expected no-store for ${path}`,
    );
  }
});

Deno.test("middleware leaves non-dynamic GET cache headers untouched", async () => {
  // A static asset path outside / and /api/: no Cache-Control should be added.
  const response = await middleware(
    new Request("https://club.example/styles.css"),
    context(new Response("body{}")) as never,
  );
  assertEquals(response.headers.get("cache-control"), null);
});

Deno.test("middleware does not clobber Fresh's Cache-Control on assets", async () => {
  const response = await middleware(
    new Request("https://club.example/_frsh/js/island.js"),
    context(
      new Response("code", {
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      }),
    ) as never,
  );
  assertEquals(
    response.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
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
