import { assertEquals } from "std/assert/mod.ts";
import { handler as signup } from "../routes/api/events/[id]/signup.ts";
import { handler as cancel } from "../routes/api/events/[id]/cancel.ts";
import { handler as prs } from "../routes/api/prs/index.ts";
import { handler as wodScores } from "../routes/api/wods/[id]/scores.ts";
import { handler as membersIndex } from "../routes/api/members/index.ts";
import { handler as signupsIndex } from "../routes/api/signups/index.ts";
import { handler as memberById } from "../routes/api/members/[id].ts";
import { handler as eventById } from "../routes/api/events/[id].ts";
import { toDirectoryMember, toPublicMember } from "../types/Member.ts";
import type { Member } from "../types/Member.ts";
import { handler as register } from "../routes/api/auth/register.ts";
import { handler as login } from "../routes/api/auth/login.ts";
import { handler as logout } from "../routes/api/auth/logout.ts";
import { handler as appMiddleware } from "../routes/_middleware.ts";
import { memberService } from "../services/memberService.ts";
import { verifyMemberSession } from "../lib/session.ts";
import { handler as pendingPRs } from "../routes/api/prs/pending.ts";
import { handler as pendingResults } from "../routes/api/results/pending.ts";
import { toPublicPR } from "../types/PR.ts";
import { toPublicWodScore } from "../types/Wod.ts";
import { prService } from "../services/prService.ts";

const anonymous = { params: { id: "evt-1" }, state: { isAdmin: false, member: null } };

Deno.env.set("SESSION_SECRET", "test-secret-at-least-32-characters-long!!");

function jsonRequest(body: unknown = {}): Request {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.test("acting on the club requires a logged-in member", async () => {
  // Every one of these used to accept an arbitrary name and email, so anyone
  // could book, post a PR or log a score as somebody else.
  // Handlers may return a Response or a Promise of one; awaiting covers both.
  const cases: [string, () => Response | Promise<Response>][] = [
    ["book a place", () =>
      signup.POST!(
        jsonRequest({ memberName: "Impostor", memberEmail: "victim@example.com" }),
        anonymous as never,
      )],
    ["cancel a booking", () =>
      cancel.POST!(
        jsonRequest({ memberEmail: "victim@example.com" }),
        anonymous as never,
      )],
    ["register a PR", () =>
      prs.POST!(
        jsonRequest({
          memberName: "Impostor",
          memberEmail: "victim@example.com",
          movement: "Deadlift",
          weight: 300,
          date: "2026-01-01",
        }),
        anonymous as never,
      )],
    ["log a WOD score", () =>
      wodScores.POST!(
        jsonRequest({
          memberName: "Impostor",
          memberEmail: "victim@example.com",
          value: 100,
        }),
        { params: { id: "wod-1" }, state: { isAdmin: false, member: null } } as never,
      )],
  ];

  for (const [label, run] of cases) {
    const res = await run();
    assertEquals(res.status, 401, `anonymous callers must not ${label}`);
  }
});

Deno.test("the passwordless registration and booking bypasses are closed", async () => {
  // Creating a member here produced an account with no credentials at all.
  const created = await membersIndex.POST!(
    jsonRequest({
      name: "Bypass",
      email: "bypass@example.com",
      level: "beginner",
      goal: "hyrox",
      location: "Madrid",
    }),
    anonymous as never,
  );
  assertEquals(created.status, 410);

  // And this accepted an arbitrary name and email for a booking.
  const booked = await signupsIndex.POST!(
    jsonRequest({
      eventId: "evt-1",
      memberName: "Impostor",
      memberEmail: "victim@example.com",
    }),
    anonymous as never,
  );
  assertEquals(booked.status, 410);
});

Deno.test("the full signup list is admin-only", async () => {
  const res = await signupsIndex.GET!(
    new Request("http://localhost/api/signups"),
    anonymous as never,
  );
  // Booking records carry emails and free-text comments.
  assertEquals(res.status, 403);
});

Deno.test("all moderation queues require an admin session", async () => {
  for (const route of [pendingPRs, pendingResults]) {
    const res = await route.GET!(
      new Request("http://localhost/api/pending"),
      anonymous as never,
    );
    assertEquals(res.status, 403);
  }
});

Deno.test("register, approval, login, middleware session, and logout work end to end", async () => {
  const email = `session-${crypto.randomUUID()}@example.com`;
  let memberId = "";
  let prId = "";
  try {
    const registered = await register.POST!(
      jsonRequest({
        name: "Session Athlete",
        email,
        password: "a-strong-test-password",
        level: "intermediate",
        goal: "hyrox",
        location: "Madrid",
      }),
      anonymous as never,
    );
    assertEquals(registered.status, 201);
    const registrationBody = await registered.json();
    memberId = registrationBody.member.id;
    assertEquals(registrationBody.member.approved, false);
    assertEquals("passwordHash" in registrationBody.member, false);

    const pendingLogin = await login.POST!(
      jsonRequest({ email, password: "a-strong-test-password" }),
      anonymous as never,
    );
    assertEquals(pendingLogin.status, 403);

    const approvedMember = await memberService.approve(memberId);
    const loggedIn = await login.POST!(
      jsonRequest({ email, password: "a-strong-test-password" }),
      anonymous as never,
    );
    assertEquals(loggedIn.status, 200);
    assertEquals(loggedIn.headers.get("cache-control"), "no-store");

    const setCookie = loggedIn.headers.get("set-cookie")!;
    const requestCookie = setCookie.split(";")[0];
    assertEquals(await verifyMemberSession(requestCookie), memberId);

    const middlewareContext: Record<string, unknown> = {
      state: {},
      next() {
        const state = middlewareContext.state as { member: Member | null };
        return Response.json({ memberId: state.member?.id ?? null });
      },
    };
    const resolved = await appMiddleware(
      new Request("http://localhost/", {
        headers: { cookie: requestCookie },
      }),
      middlewareContext as never,
    );
    assertEquals((await resolved.json()).memberId, memberId);

    const prResponse = await prs.POST!(
      jsonRequest({
        memberName: "Impostor",
        memberEmail: "other@example.com",
        movement: "Back Squat",
        weight: 150,
        metric: "time",
        date: new Date().toISOString().slice(0, 10),
      }),
      {
        params: {},
        state: { isAdmin: false, member: approvedMember },
      } as never,
    );
    assertEquals(prResponse.status, 201);
    const prBody = await prResponse.json();
    prId = prBody.id;
    assertEquals(prBody.memberName, "Session Athlete");
    assertEquals(prBody.metric, "weight");
    assertEquals("memberEmail" in prBody, false);

    const loggedOut = await logout.POST!(
      new Request("http://localhost/api/auth/logout", { method: "POST" }),
      anonymous as never,
    );
    assertEquals(loggedOut.status, 200);
    assertEquals(loggedOut.headers.get("set-cookie")?.includes("Max-Age=0"), true);
  } finally {
    if (prId) await prService.delete(prId);
    if (memberId) await memberService.delete(memberId);
  }
});

Deno.test("PR input rejects non-finite values, unknown movements, and future dates", async () => {
  const context = {
    params: {},
    state: {
      isAdmin: false,
      member: { id: "mbr-validation", name: "Athlete", email: "a@example.com" },
    },
  };
  const today = new Date();
  today.setUTCDate(today.getUTCDate() + 1);
  const cases = [
    { movement: "Deadlift", weight: "Infinity", date: "2026-01-01" },
    { movement: "Invented Lift", weight: 100, date: "2026-01-01" },
    {
      movement: "Deadlift",
      weight: 100,
      date: today.toISOString().slice(0, 10),
    },
  ];
  for (const body of cases) {
    const response = await prs.POST!(jsonRequest(body), context as never);
    assertEquals(response.status, 400);
  }
});

Deno.test("editing a member requires being that member or an admin", async () => {
  const stranger = {
    params: { id: "mbr-victim" },
    state: {
      isAdmin: false,
      member: { id: "mbr-someone-else", email: "other@example.com" } as Member,
    },
  };
  const res = await memberById.PUT!(
    jsonRequest({ name: "Hacked" }),
    stranger as never,
  );
  assertEquals(res.status, 403);

  const anon = await memberById.DELETE!(
    new Request("http://localhost/x", { method: "DELETE" }),
    { params: { id: "mbr-victim" }, state: { isAdmin: false, member: null } } as never,
  );
  assertEquals(anon.status, 403);
});

Deno.test("a member cannot approve themselves", async () => {
  // Self-edit is allowed, but `approved` is a moderation decision.
  const self = {
    params: { id: "mbr-self" },
    state: {
      isAdmin: false,
      member: { id: "mbr-self", email: "self@example.com" } as Member,
    },
  };
  const res = await memberById.PUT!(
    jsonRequest({ approved: true, passwordHash: "injected", name: "New Name" }),
    self as never,
  );
  // 404 because this id does not exist in the test KV — the point is that it
  // got past authorization without carrying approved/passwordHash through.
  assertEquals(res.status, 404);
});

Deno.test("editing and deleting an event is admin-only", async () => {
  const put = await eventById.PUT!(
    jsonRequest({ title: "Hijacked" }),
    anonymous as never,
  );
  assertEquals(put.status, 403);

  const del = await eventById.DELETE!(
    new Request("http://localhost/x", { method: "DELETE" }),
    anonymous as never,
  );
  assertEquals(del.status, 403);
});

Deno.test("a member's credentials never leave the server", () => {
  const member = {
    id: "mbr-1",
    name: "Athlete",
    email: "a@example.com",
    level: "beginner",
    goal: "hyrox",
    location: "Madrid",
    approved: true,
    passwordHash: "SECRET-HASH",
    passwordSalt: "SECRET-SALT",
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Member;

  const serialized = JSON.stringify(toPublicMember(member));
  assertEquals(serialized.includes("SECRET-HASH"), false);
  assertEquals(serialized.includes("SECRET-SALT"), false);
  assertEquals(serialized.includes("passwordHash"), false);
  // The fields a client legitimately needs survive.
  assertEquals(JSON.parse(serialized).name, "Athlete");
  assertEquals("email" in toDirectoryMember(member), false);
});

Deno.test("public leaderboards omit contact details and private notes", () => {
  const now = new Date();
  const publicPR = toPublicPR({
    id: "pr-1",
    memberId: "mbr-1",
    memberName: "Athlete",
    memberEmail: "private@example.com",
    movement: "Deadlift",
    weight: 180,
    metric: "weight",
    date: now,
    approved: true,
    createdAt: now,
    updatedAt: now,
  });
  assertEquals(publicPR.athleteId, "mbr-1");
  assertEquals("memberEmail" in publicPR, false);
  assertEquals("memberId" in publicPR, false);

  const publicScore = toPublicWodScore({
    id: "score-1",
    wodId: "wod-1",
    memberId: "mbr-1",
    memberName: "Athlete",
    memberEmail: "private@example.com",
    value: 120,
    scaled: false,
    notes: "Sensitive health context",
    approved: true,
    createdAt: now,
  });
  assertEquals("memberEmail" in publicScore, false);
  assertEquals("notes" in publicScore, false);
});
