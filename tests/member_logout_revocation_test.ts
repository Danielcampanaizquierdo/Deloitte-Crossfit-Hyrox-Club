import { assertEquals } from "std/assert/mod.ts";
import { createSessionService } from "../lib/session.ts";
import { withKv } from "../repositories/test_utils.ts";
import { createMemberLogoutHandler } from "../routes/api/auth/logout.ts";

Deno.test("member logout revokes the server-side session", async () => {
  await withKv(async (kv) => {
    const sessions = createSessionService(kv, {
      secret: "test-secret-at-least-32-characters-long!!",
    });
    const setCookie = await sessions.createMemberSession(
      `mbr-${crypto.randomUUID()}`,
    );
    const requestCookie = setCookie.split(";")[0];
    assertEquals(
      (await sessions.verifyMemberSession(requestCookie))?.startsWith("mbr-"),
      true,
    );

    const logout = createMemberLogoutHandler({
      revoke: (cookie) => sessions.revokeMemberSession(cookie),
      clear: () => sessions.clearMemberSession(),
    });
    const response = await logout(
      new Request("https://club.example/api/auth/logout", {
        method: "POST",
        headers: { cookie: requestCookie },
      }),
    );
    assertEquals(response.status, 200);
    assertEquals(await sessions.verifyMemberSession(requestCookie), null);
    assertEquals(
      response.headers.get("set-cookie")?.includes("Max-Age=0"),
      true,
    );
  });
});
