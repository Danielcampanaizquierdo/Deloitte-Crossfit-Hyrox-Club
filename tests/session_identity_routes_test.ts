import { assertEquals } from "std/assert/mod.ts";
import type { Member } from "../types/Member.ts";
import type { EventSignup } from "../types/Signup.ts";
import type { PR } from "../types/PR.ts";
import { handler as approveMember } from "../routes/api/members/[id]/approve.ts";
import { handler as adminApproveMember } from "../routes/api/admin/members/[id]/approve.ts";
import { handler as memberById } from "../routes/api/members/[id].ts";
import { handler as signupById } from "../routes/api/signups/[id].ts";
import { handler as prById } from "../routes/api/prs/[id].ts";
import { handler as eventSignup } from "../routes/api/events/[id]/signup.ts";
import { memberService } from "../services/memberService.ts";
import { signupService } from "../services/signupService.ts";
import { prService } from "../services/prService.ts";
import { eventService } from "../services/eventService.ts";

function member(overrides: Partial<Member> = {}): Member {
  const now = new Date();
  return {
    id: "mbr-owner",
    name: "Session Owner",
    email: "owner@example.com",
    level: "intermediate",
    goal: "crossfit",
    location: "Madrid",
    approved: true,
    active: true,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.test("member approval routes never expose stored password material", async () => {
  const original = memberService.approve;
  memberService.approve = async () =>
    member({ passwordHash: "SECRET-HASH", passwordSalt: "SECRET-SALT" });
  try {
    const context = {
      params: { id: "mbr-owner" },
      state: { isAdmin: true, member: null },
    };
    const direct = await approveMember.POST!(
      new Request("http://localhost/api/members/mbr-owner/approve", {
        method: "POST",
      }),
      context as never,
    );
    const nested = await adminApproveMember.POST!(
      new Request("http://localhost/api/admin/members/mbr-owner/approve", {
        method: "POST",
      }),
      context as never,
    );

    const directBody = await direct.json();
    const nestedBody = await nested.json();
    assertEquals(direct.status, 200);
    assertEquals(nested.status, 200);
    assertEquals("passwordHash" in directBody, false);
    assertEquals("passwordSalt" in directBody, false);
    assertEquals("passwordHash" in nestedBody.member, false);
    assertEquals("passwordSalt" in nestedBody.member, false);
  } finally {
    memberService.approve = original;
  }
});

Deno.test("signup ownership uses memberId; legacy records are admin-only", async () => {
  const originalGet = signupService.getById;
  const originalDelete = signupService.delete;
  const now = new Date();
  const owned: EventSignup = {
    id: "signup-owned",
    eventId: "evt-1",
    memberId: "mbr-owner",
    memberName: "Owner",
    memberEmail: "owner@example.com",
    signedUpAt: now,
  };
  const legacy: EventSignup = {
    ...owned,
    id: "signup-legacy",
    memberId: undefined,
  };
  signupService.getById = async (id) => id === legacy.id ? legacy : owned;
  signupService.delete = async () => true;
  try {
    const ownerState = { isAdmin: false, member: member() };
    const strangerState = {
      isAdmin: false,
      member: member({ id: "mbr-stranger", email: "stranger@example.com" }),
    };
    const adminState = { isAdmin: true, member: null };

    assertEquals(
      (await signupById.GET!(new Request("http://localhost"), {
        params: { id: owned.id },
        state: ownerState,
      } as never)).status,
      200,
    );
    assertEquals(
      (await signupById.DELETE!(
        new Request("http://localhost", { method: "DELETE" }),
        {
          params: { id: owned.id },
          state: strangerState,
        } as never,
      )).status,
      403,
    );
    // Matching the legacy email still grants no member ownership.
    assertEquals(
      (await signupById.GET!(new Request("http://localhost"), {
        params: { id: legacy.id },
        state: ownerState,
      } as never)).status,
      403,
    );
    assertEquals(
      (await signupById.DELETE!(
        new Request("http://localhost", { method: "DELETE" }),
        {
          params: { id: legacy.id },
          state: adminState,
        } as never,
      )).status,
      200,
    );
  } finally {
    signupService.getById = originalGet;
    signupService.delete = originalDelete;
  }
});

Deno.test("PR deletion uses memberId; legacy records are admin-only", async () => {
  const originalGet = prService.getById;
  const originalDelete = prService.delete;
  const now = new Date();
  const owned: PR = {
    id: "pr-owned",
    memberId: "mbr-owner",
    memberName: "Owner",
    memberEmail: "owner@example.com",
    movement: "Deadlift",
    weight: 180,
    date: now,
    approved: true,
    createdAt: now,
    updatedAt: now,
  };
  const legacy: PR = { ...owned, id: "pr-legacy", memberId: "" };
  prService.getById = async (id) => id === legacy.id ? legacy : owned;
  prService.delete = async () => true;
  try {
    const ownerState = { isAdmin: false, member: member() };
    const strangerState = {
      isAdmin: false,
      member: member({ id: "mbr-stranger", email: "stranger@example.com" }),
    };
    const adminState = { isAdmin: true, member: null };
    const remove = (id: string, state: unknown) =>
      prById.DELETE!(new Request("http://localhost", { method: "DELETE" }), {
        params: { id },
        state,
      } as never);

    assertEquals((await remove(owned.id, ownerState)).status, 200);
    assertEquals((await remove(owned.id, strangerState)).status, 403);
    assertEquals((await remove(legacy.id, ownerState)).status, 403);
    assertEquals((await remove(legacy.id, adminState)).status, 200);
  } finally {
    prService.getById = originalGet;
    prService.delete = originalDelete;
  }
});

Deno.test("event signup never returns 201 with a null record", async () => {
  const originalEvent = eventService.getById;
  const originalCreate = signupService.create;
  eventService.getById = async () => ({
    id: "evt-race",
    title: "Deleted concurrently",
    date: new Date(Date.now() + 60_000),
    location: "Gym",
    description: "Race fixture",
    approved: true,
    attendees: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  signupService.create = async () => null;
  try {
    const response = await eventSignup.POST!(jsonRequest({}), {
      params: { id: "evt-race" },
      state: { isAdmin: false, member: member() },
    } as never);
    assertEquals(response.status, 404);
  } finally {
    eventService.getById = originalEvent;
    signupService.create = originalCreate;
  }
});

Deno.test("profile updates reject empty, mistyped, oversized, and privileged fields", async () => {
  const context = {
    params: { id: "mbr-owner" },
    state: { isAdmin: false, member: member() },
  };
  const invalidBodies = [
    {},
    { name: 42 },
    { name: "   " },
    { name: "x".repeat(101) },
    { location: "" },
    { level: "elite" },
    { goal: "competition" },
    { bio: "x".repeat(501) },
    { approved: true },
    { passwordHash: "replacement" },
  ];
  for (const body of invalidBodies) {
    const response = await memberById.PUT!(jsonRequest(body), context as never);
    assertEquals(response.status, 400, JSON.stringify(body));
  }
});
