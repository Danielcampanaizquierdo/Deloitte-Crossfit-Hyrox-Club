import { MiddlewareHandlerContext } from "$fresh/server.ts";
import {
  clearMemberSession,
  clearSession,
  revokeAllAdminSessions,
  revokeAllMemberSessions,
  verifyAdminSession,
  verifyMemberSession,
} from "../lib/session.ts";
import { rejectUntrustedApiMutation } from "../lib/requestSecurity.ts";
import { adminService } from "../services/adminService.ts";
import { memberService } from "../services/memberService.ts";
import { State } from "../types/State.ts";

function hasCookie(header: string, name: string): boolean {
  return header.split(";").some((part) => part.trim().startsWith(`${name}=`));
}

function appendVary(headers: Headers, value: string): void {
  const values = (headers.get("Vary") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!values.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
    values.push(value);
  }
  headers.set("Vary", values.join(", "));
}

function responseSetsCookie(response: Response, name: string): boolean {
  return (response.headers.get("Set-Cookie") ?? "")
    .toLowerCase()
    .includes(`${name.toLowerCase()}=`);
}

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext<State>,
) {
  const rejected = rejectUntrustedApiMutation(req);
  if (rejected) return rejected;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const hadAdminCookie = hasCookie(cookieHeader, "admin_session");
  const hadMemberCookie = hasCookie(cookieHeader, "member_session");

  const [adminId, memberId] = await Promise.all([
    verifyAdminSession(cookieHeader),
    verifyMemberSession(cookieHeader),
  ]);

  const [resolvedAdmin, resolvedMember] = await Promise.all([
    adminId ? adminService.getById(adminId) : null,
    memberId ? memberService.getById(memberId) : null,
  ]);

  let admin = resolvedAdmin;
  if (admin && !admin.active) {
    await revokeAllAdminSessions(admin.id);
    admin = null;
  } else if (adminId && !admin) {
    await revokeAllAdminSessions(adminId);
  }
  ctx.state.admin = admin;
  ctx.state.isAdmin = admin !== null;

  // The session only carries an id; the member is loaded fresh on every
  // request so an approval revoked (or an account deleted) takes effect
  // immediately rather than lingering until the cookie expires.
  let member = resolvedMember;
  if (member && (!member.approved || member.active === false)) {
    await revokeAllMemberSessions(member.id);
    member = null;
  } else if (memberId && !member) {
    await revokeAllMemberSessions(memberId);
  }
  ctx.state.member = member;

  const response = await ctx.next();

  // Any representation may differ when a session cookie is present. This is
  // essential for the home page and endpoints such as event attendees, whose
  // public and admin projections contain different fields.
  if (req.method === "GET" || req.method === "HEAD") {
    appendVary(response.headers, "Cookie");
  }
  if (
    req.method !== "GET" && req.method !== "HEAD" ||
    hadAdminCookie || hadMemberCookie || admin || member
  ) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  // Invalid, expired, revoked, or newly disabled sessions should not leave a
  // stale cookie that every subsequent request keeps replaying.
  if (
    hadAdminCookie && !admin &&
    !responseSetsCookie(response, "admin_session")
  ) {
    response.headers.append("Set-Cookie", clearSession());
  }
  if (
    hadMemberCookie && !member &&
    !responseSetsCookie(response, "member_session")
  ) {
    response.headers.append("Set-Cookie", clearMemberSession());
  }

  return response;
}
