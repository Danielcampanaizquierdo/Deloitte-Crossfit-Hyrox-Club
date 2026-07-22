import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "std/assert/mod.ts";
import { memberKey } from "../repositories/keys.ts";
import {
  ADMIN_SESSION_TTL_SECONDS,
  createSessionService,
  MEMBER_SESSION_TTL_SECONDS,
  type SessionService,
} from "./session.ts";

const TEST_SECRET = "test-secret-at-least-32-characters-long!!";
const START = Date.UTC(2026, 0, 1);

function asRequestCookie(setCookie: string): string {
  return setCookie.split(";")[0];
}

async function withService(
  test: (service: SessionService, setNow: (value: number) => void) => unknown,
  secure = false,
): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  let currentTime = START;
  const service = createSessionService(kv, {
    secret: TEST_SECRET,
    secure,
    now: () => currentTime,
  });
  try {
    await test(service, (value) => currentTime = value);
  } finally {
    kv.close();
  }
}

Deno.test("member and admin sessions round-trip their subject ids", async () => {
  await withService(async (sessions) => {
    const member = asRequestCookie(
      await sessions.createMemberSession("mbr-abc-123"),
    );
    const admin = asRequestCookie(
      await sessions.createAdminSession("adm-abc-123"),
    );

    assertEquals(await sessions.verifyMemberSession(member), "mbr-abc-123");
    assertEquals(await sessions.verifyAdminSession(admin), "adm-abc-123");
    assertEquals(await sessions.verifySession(admin), true);
  });
});

Deno.test("tampered and unsigned session cookies are rejected", async () => {
  await withService(async (sessions) => {
    const cookie = asRequestCookie(
      await sessions.createMemberSession("mbr-victim"),
    );
    const separator = cookie.indexOf("=");
    const raw = decodeURIComponent(cookie.slice(separator + 1));
    const final = raw.at(-1)!;
    const tamperedRaw = `${raw.slice(0, -1)}${final === "A" ? "B" : "A"}`;

    assertEquals(
      await sessions.verifyMemberSession(
        `member_session=${encodeURIComponent(tamperedRaw)}`,
      ),
      null,
    );
    assertEquals(
      await sessions.verifyMemberSession("member_session=unsigned"),
      null,
    );
    assertEquals(await sessions.verifyMemberSession(""), null);
  });
});

Deno.test("member and admin sessions are purpose-bound", async () => {
  await withService(async (sessions) => {
    const member = asRequestCookie(
      await sessions.createMemberSession("mbr-no-admin"),
    );
    const admin = asRequestCookie(
      await sessions.createAdminSession("adm-not-member"),
    );

    assertEquals(await sessions.verifyAdminSession(member), null);
    assertEquals(await sessions.verifyMemberSession(admin), null);
    assertEquals(
      await sessions.verifyAdminSession(
        member.replace("member_session=", "admin_session="),
      ),
      null,
    );
    assertEquals(
      await sessions.verifyMemberSession(
        admin.replace("admin_session=", "member_session="),
      ),
      null,
    );
  });
});

Deno.test("sessions expire at their signed expiry", async () => {
  await withService(async (sessions, setNow) => {
    const member = asRequestCookie(
      await sessions.createMemberSession("mbr-expiring"),
    );
    const admin = asRequestCookie(
      await sessions.createAdminSession("adm-expiring"),
    );

    setNow(START + ADMIN_SESSION_TTL_SECONDS * 1000);
    assertEquals(await sessions.verifyAdminSession(admin), null);
    assertEquals(await sessions.verifyMemberSession(member), "mbr-expiring");

    setNow(START + MEMBER_SESSION_TTL_SECONDS * 1000);
    assertEquals(await sessions.verifyMemberSession(member), null);
  });
});

Deno.test("two sessions for one member are independent", async () => {
  await withService(async (sessions) => {
    const firstSetCookie = await sessions.createMemberSession("mbr-same");
    const secondSetCookie = await sessions.createMemberSession("mbr-same");
    const first = asRequestCookie(firstSetCookie);
    const second = asRequestCookie(secondSetCookie);

    assert(firstSetCookie !== secondSetCookie);
    assertEquals(await sessions.verifyMemberSession(first), "mbr-same");
    assertEquals(await sessions.verifyMemberSession(second), "mbr-same");

    await sessions.revokeMemberSession(first);
    assertEquals(await sessions.verifyMemberSession(first), null);
    assertEquals(await sessions.verifyMemberSession(second), "mbr-same");
  });
});

Deno.test("individual admin revocation prevents replay", async () => {
  await withService(async (sessions) => {
    const cookie = asRequestCookie(
      await sessions.createAdminSession("adm-revoked"),
    );
    assertEquals(await sessions.verifyAdminSession(cookie), "adm-revoked");

    await sessions.revokeAdminSession(cookie);
    assertEquals(await sessions.verifyAdminSession(cookie), null);
    assertEquals(await sessions.verifySession(cookie), false);
  });
});

Deno.test("global revocation only removes sessions for that subject and kind", async () => {
  await withService(async (sessions) => {
    const memberA1 = asRequestCookie(
      await sessions.createMemberSession("mbr-a"),
    );
    const memberA2 = asRequestCookie(
      await sessions.createMemberSession("mbr-a"),
    );
    const memberB = asRequestCookie(
      await sessions.createMemberSession("mbr-b"),
    );
    const adminA1 = asRequestCookie(
      await sessions.createAdminSession("adm-a"),
    );
    const adminA2 = asRequestCookie(
      await sessions.createAdminSession("adm-a"),
    );

    await sessions.revokeAllMemberSessions("mbr-a");
    assertEquals(await sessions.verifyMemberSession(memberA1), null);
    assertEquals(await sessions.verifyMemberSession(memberA2), null);
    assertEquals(await sessions.verifyMemberSession(memberB), "mbr-b");
    assertEquals(await sessions.verifyAdminSession(adminA1), "adm-a");
    const memberAAfterRevocation = asRequestCookie(
      await sessions.createMemberSession("mbr-a"),
    );
    assertEquals(
      await sessions.verifyMemberSession(memberAAfterRevocation),
      "mbr-a",
    );

    await sessions.revokeAllAdminSessions("adm-a");
    assertEquals(await sessions.verifyAdminSession(adminA1), null);
    assertEquals(await sessions.verifyAdminSession(adminA2), null);
    assertEquals(await sessions.verifyMemberSession(memberB), "mbr-b");
  });
});

Deno.test("global revocation invalidates sessions even when their index is missing", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const sessions = createSessionService(kv, {
      secret: TEST_SECRET,
      secure: false,
    });
    const cookie = asRequestCookie(
      await sessions.createMemberSession("mbr-orphan"),
    );
    for await (
      const entry of kv.list({
        prefix: ["sessions_by_subject", "member", "mbr-orphan"],
      })
    ) {
      await kv.delete(entry.key);
    }

    await sessions.revokeAllMemberSessions("mbr-orphan");
    assertEquals(await sessions.verifyMemberSession(cookie), null);
  } finally {
    kv.close();
  }
});

Deno.test("session issuance fails when verified credentials changed", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const sessions = createSessionService(kv, {
      secret: TEST_SECRET,
      secure: false,
    });
    await kv.set(memberKey("mbr-race"), { passwordHash: "new-hash" });

    await assertRejects(
      () => sessions.createMemberSession("mbr-race", "old-hash"),
      Error,
      "credentials changed",
    );
    const cookie = asRequestCookie(
      await sessions.createMemberSession("mbr-race", "new-hash"),
    );
    assertEquals(await sessions.verifyMemberSession(cookie), "mbr-race");
  } finally {
    kv.close();
  }
});

Deno.test("both session cookies use the required secure attributes", async () => {
  await withService(async (sessions) => {
    const member = await sessions.createMemberSession("mbr-cookie");
    const admin = await sessions.createAdminSession("adm-cookie");

    for (const cookie of [member, admin]) {
      assertStringIncludes(cookie, "HttpOnly");
      assertStringIncludes(cookie, "SameSite=Lax");
      assertStringIncludes(cookie, "Path=/");
      assertStringIncludes(cookie, "Secure");
    }
    assertStringIncludes(member, `Max-Age=${MEMBER_SESSION_TTL_SECONDS}`);
    assertStringIncludes(admin, `Max-Age=${ADMIN_SESSION_TTL_SECONDS}`);

    for (
      const cleared of [
        sessions.clearMemberSession(),
        sessions.clearSession(),
      ]
    ) {
      assertStringIncludes(cleared, "Max-Age=0");
      assertStringIncludes(cleared, "Expires=Thu, 01 Jan 1970");
      assertStringIncludes(cleared, "HttpOnly");
      assertStringIncludes(cleared, "SameSite=Lax");
      assertStringIncludes(cleared, "Path=/");
      assertStringIncludes(cleared, "Secure");
    }
  }, true);
});
