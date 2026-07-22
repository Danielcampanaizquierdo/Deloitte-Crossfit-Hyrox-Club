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

// Content-Security-Policy tuned for Fresh: the framework injects an inline
// hydration/state <script> and the app relies on inline style="..." attributes,
// so script-src/style-src must allow 'unsafe-inline'. The hardening value is in
// frame-ancestors/object-src/base-uri, which do not interfere with hydration.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

// These are safe on every response, including static assets, and never conflict
// with what Fresh route handlers set.
const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

// Enforced (not Report-Only): verified with a headless browser that the home
// page hydrates and islands stay interactive (a login modal opens on click)
// with zero securitypolicyviolation events under this policy.
const CSP_HEADER_NAME = "Content-Security-Policy";

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

  // Baseline security headers on every response (safe on static assets too).
  // Only set when absent so a route handler can always override intentionally.
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(name)) {
      response.headers.set(name, value);
    }
  }
  if (!response.headers.has(CSP_HEADER_NAME)) {
    response.headers.set(CSP_HEADER_NAME, CONTENT_SECURITY_POLICY);
  }

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

  // Anonymous/public GETs (home page and read APIs) carry auth-varying
  // projections and rely on Vary: Cookie alone. Add an explicit no-store so a
  // shared cache can never serve one identity's projection to another. Scoped
  // to dynamic routes only: static assets and /_frsh/ bundles already carry a
  // Cache-Control from Fresh, so the has()-guard leaves them cacheable.
  if (req.method === "GET" || req.method === "HEAD") {
    const pathname = new URL(req.url).pathname;
    if (
      !response.headers.has("Cache-Control") &&
      (pathname === "/" || pathname.startsWith("/api/"))
    ) {
      response.headers.set("Cache-Control", "no-store");
    }
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
