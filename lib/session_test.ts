import { assert, assertEquals } from "std/assert/mod.ts";
import {
  ADMIN_SESSION_TTL_SECONDS,
  clearMemberSession,
  createMemberSession,
  createSession,
  MEMBER_SESSION_TTL_SECONDS,
  verifyMemberSession,
  verifySession,
} from "./session.ts";

Deno.env.set("SESSION_SECRET", "test-secret-at-least-32-characters-long!!");

/** Turns a Set-Cookie header into the Cookie header a browser would send. */
function asRequestCookie(setCookie: string): string {
  return setCookie.split(";")[0];
}

Deno.test("a member session round-trips the member id", async () => {
  const cookie = await createMemberSession("mbr-abc-123");
  assertEquals(
    await verifyMemberSession(asRequestCookie(cookie)),
    "mbr-abc-123",
  );
});

Deno.test("a tampered member id is rejected", async () => {
  const cookie = asRequestCookie(await createMemberSession("mbr-victim"));

  // Forge a payload naming a different member, keeping the original signature.
  const value = decodeURIComponent(cookie.split("=").slice(1).join("="));
  const sig = value.slice(value.lastIndexOf(".") + 1);
  const forgedPayload = btoa(JSON.stringify({ id: "mbr-attacker", n: "x" }));
  const forged = `member_session=${
    encodeURIComponent(`${forgedPayload}.${sig}`)
  }`;

  assertEquals(await verifyMemberSession(forged), null);
});

Deno.test("an unsigned member cookie is rejected", async () => {
  const payload = btoa(JSON.stringify({ id: "mbr-attacker", n: "x" }));
  assertEquals(
    await verifyMemberSession(`member_session=${payload}`),
    null,
  );
  assertEquals(await verifyMemberSession(""), null);
  assertEquals(await verifyMemberSession("member_session=garbage.sig"), null);
});

Deno.test("two sessions for the same member differ", async () => {
  const a = await createMemberSession("mbr-same");
  const b = await createMemberSession("mbr-same");
  assert(a !== b);
  // Both still resolve to the same member.
  assertEquals(await verifyMemberSession(asRequestCookie(a)), "mbr-same");
  assertEquals(await verifyMemberSession(asRequestCookie(b)), "mbr-same");
});

Deno.test("admin and member sessions do not satisfy each other", async () => {
  const memberCookie = asRequestCookie(await createMemberSession("mbr-1"));
  // A member session must never grant admin.
  assertEquals(await verifySession(memberCookie), false);

  const adminCookie = asRequestCookie(await createSession());
  // An admin session is not a member identity.
  assertEquals(await verifyMemberSession(adminCookie), null);
});

Deno.test("renaming a member cookie cannot turn it into an admin session", async () => {
  const memberCookie = asRequestCookie(
    await createMemberSession("mbr-no-admin"),
  );
  const renamed = memberCookie.replace("member_session=", "admin_session=");
  assertEquals(await verifySession(renamed), false);

  const adminCookie = asRequestCookie(await createSession());
  const renamedAdmin = adminCookie.replace("admin_session=", "member_session=");
  assertEquals(await verifyMemberSession(renamedAdmin), null);
});

Deno.test("sessions are rejected after their signed expiry", async () => {
  const issuedAt = Date.UTC(2026, 0, 1);
  const memberCookie = asRequestCookie(
    await createMemberSession("mbr-expired", issuedAt),
  );
  assertEquals(
    await verifyMemberSession(
      memberCookie,
      issuedAt + MEMBER_SESSION_TTL_SECONDS * 1000 - 1,
    ),
    "mbr-expired",
  );
  assertEquals(
    await verifyMemberSession(
      memberCookie,
      issuedAt + MEMBER_SESSION_TTL_SECONDS * 1000,
    ),
    null,
  );

  const adminCookie = asRequestCookie(await createSession(issuedAt));
  assertEquals(
    await verifySession(
      adminCookie,
      issuedAt + ADMIN_SESSION_TTL_SECONDS * 1000,
    ),
    false,
  );
});

Deno.test("clearing a member session expires the cookie", () => {
  const cleared = clearMemberSession();
  assert(cleared.startsWith("member_session=;"));
  assert(cleared.includes("Max-Age=0"));
  assert(cleared.includes("Expires=Thu, 01 Jan 1970"));
});

Deno.test("member cookies are HttpOnly and same-site", async () => {
  const cookie = await createMemberSession("mbr-1");
  assert(cookie.includes("HttpOnly"));
  assert(cookie.includes("SameSite=Lax"));
});
