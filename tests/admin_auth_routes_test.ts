import { assertEquals, assertStringIncludes } from "std/assert/mod.ts";
import { createSessionService } from "../lib/session.ts";
import { createAdminRepository } from "../repositories/adminRepository.ts";
import { withKv } from "../repositories/test_utils.ts";
import {
  checkAdminLoginRateLimit,
  createAdminLoginHandler,
} from "../routes/api/admin/login.ts";
import { createAdminLogoutHandler } from "../routes/api/admin/logout.ts";
import { createAdminService } from "../services/adminService.ts";

const TEST_SECRET = "admin-route-test-secret-with-at-least-32-bytes";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.test("admin login validates credentials and issues a session bound to the admin id", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    const service = createAdminService(repo);
    const sessions = createSessionService(kv, {
      secret: TEST_SECRET,
      secure: false,
    });
    const admin = await service.create({
      email: "Boss@Example.com",
      name: "Boss",
      password: "a-strong-admin-password",
      role: "superadmin",
    });
    const login = createAdminLoginHandler({
      service,
      createSession: sessions.createAdminSession,
    });

    const response = await login(jsonRequest({
      email: " boss@example.COM ",
      password: "a-strong-admin-password",
    }));

    assertEquals(response.status, 200);
    assertEquals(response.headers.get("cache-control"), "no-store");
    const setCookie = response.headers.get("set-cookie") ?? "";
    const requestCookie = setCookie.split(";")[0];
    assertEquals(await sessions.verifyAdminSession(requestCookie), admin.id);

    const body = await response.json();
    assertEquals(body.admin.id, admin.id);
    assertEquals(body.admin.role, "superadmin");
    assertEquals("passwordHash" in body.admin, false);
    assertEquals("passwordSalt" in body.admin, false);
  });
});

Deno.test("admin login rejects invalid credentials and inactive accounts", async () => {
  await withKv(async (kv) => {
    const repo = createAdminRepository(kv);
    const service = createAdminService(repo);
    const admin = await service.create({
      email: "admin@example.com",
      name: "Admin",
      password: "another-strong-password",
    });
    const login = createAdminLoginHandler({
      service,
      createSession: async () => "should-not-be-issued",
    });

    const wrongPassword = await login(jsonRequest({
      email: admin.email,
      password: "wrong-password",
    }));
    assertEquals(wrongPassword.status, 401);
    assertEquals(wrongPassword.headers.get("cache-control"), "no-store");

    const unknownEmail = await login(jsonRequest({
      email: "unknown@example.com",
      password: "wrong-password",
    }));
    assertEquals(unknownEmail.status, 401);

    await service.deactivate(admin.id);
    const inactive = await login(jsonRequest({
      email: admin.email,
      password: "another-strong-password",
    }));
    assertEquals(inactive.status, 403);
    assertStringIncludes(
      (await inactive.json()).error.toLowerCase(),
      "desactivada",
    );
  });
});

Deno.test("admin login rate-limits each client and email pair", async () => {
  await withKv(async (kv) => {
    const login = createAdminLoginHandler({
      service: {
        authenticate: async () => ({ status: "invalid" }),
      },
      rateLimit: (req, email) => checkAdminLoginRateLimit(kv, req, email),
    });

    for (let attempt = 0; attempt < 6; attempt++) {
      const response = await login(
        new Request(
          "http://localhost/api/admin/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-real-ip": "203.0.113.10",
            },
            body: JSON.stringify({
              email: "limited@example.com",
              password: "wrong-password",
            }),
          },
        ),
        "203.0.113.10",
      );
      assertEquals(response.status, 401);
    }

    const limited = await login(
      new Request(
        "http://localhost/api/admin/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-real-ip": "203.0.113.10",
          },
          body: JSON.stringify({
            email: "limited@example.com",
            password: "wrong-password",
          }),
        },
      ),
      "203.0.113.10",
    );
    assertEquals(limited.status, 429);
    assertEquals(limited.headers.get("cache-control"), "no-store");
    assertEquals(Number(limited.headers.get("retry-after")) > 0, true);
  });
});

Deno.test("admin login rejects malformed input without caching it", async () => {
  await withKv(async (kv) => {
    const service = createAdminService(createAdminRepository(kv));
    const login = createAdminLoginHandler({ service });
    const malformed = await login(
      new Request(
        "http://localhost/api/admin/login",
        { method: "POST", body: "{" },
      ),
    );
    assertEquals(malformed.status, 400);
    assertEquals(malformed.headers.get("cache-control"), "no-store");

    const missing = await login(jsonRequest({ email: "admin@example.com" }));
    assertEquals(missing.status, 400);
    assertEquals(missing.headers.get("cache-control"), "no-store");
  });
});

Deno.test("admin logout revokes the server session and clears the cookie", async () => {
  await withKv(async (kv) => {
    const sessions = createSessionService(kv, {
      secret: TEST_SECRET,
      secure: false,
    });
    const setCookie = await sessions.createAdminSession("adm-logout");
    const requestCookie = setCookie.split(";")[0];
    const logout = createAdminLogoutHandler({
      revoke: sessions.revokeAdminSession,
      clear: sessions.clearSession,
    });

    const response = await logout(
      new Request(
        "http://localhost/api/admin/logout",
        { method: "POST", headers: { cookie: requestCookie } },
      ),
    );

    assertEquals(response.status, 200);
    assertEquals(response.headers.get("cache-control"), "no-store");
    assertStringIncludes(response.headers.get("set-cookie") ?? "", "Max-Age=0");
    assertEquals(await sessions.verifyAdminSession(requestCookie), null);
  });
});
