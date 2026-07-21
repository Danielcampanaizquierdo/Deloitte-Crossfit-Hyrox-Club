const ADMIN_COOKIE_NAME = "admin_session";
const MEMBER_COOKIE_NAME = "member_session";

export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
export const MEMBER_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

type SessionKind = "admin" | "member";

interface SessionClaims {
  v: 1;
  kind: SessionKind;
  /** Member id. Admin sessions intentionally have no subject. */
  sub?: string;
  iat: number;
  exp: number;
  sid: string;
}

function secret(): string {
  const value = Deno.env.get("SESSION_SECRET");
  if (!value) throw new Error("SESSION_SECRET env var not set");
  if (new TextEncoder().encode(value).byteLength < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes");
  }
  return value;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function randomId(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(24)));
}

async function hmacKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** The purpose is part of the signed bytes. A valid member token therefore
 * cannot become an admin token merely by moving it to the admin cookie. */
async function sign(kind: SessionKind, payload: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(`${kind}.${payload}`),
  );
  return toBase64(new Uint8Array(signature));
}

function readCookie(cookieHeader: string, name: string): string | null {
  const pair = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  if (!pair) return null;

  try {
    return decodeURIComponent(pair.slice(name.length + 1));
  } catch {
    return null;
  }
}

async function verifySigned(
  raw: string,
  expectedKind: SessionKind,
): Promise<string | null> {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;

  const payload = raw.slice(0, dot);
  const encodedSignature = raw.slice(dot + 1);

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromBase64(encodedSignature),
      new TextEncoder().encode(`${expectedKind}.${payload}`),
    );
    return valid ? payload : null;
  } catch {
    return null;
  }
}

function cookieAttributes(maxAgeSeconds: number): string {
  const secure = Deno.env.get("DENO_DEPLOYMENT_ID") ||
      Deno.env.get("COOKIE_SECURE") === "true"
    ? "; Secure"
    : "";
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

function expiredCookie(name: string): string {
  return `${name}=; ${cookieAttributes(0)}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

async function createSignedSession(
  kind: SessionKind,
  ttlSeconds: number,
  subject: string | undefined,
  nowMs: number,
): Promise<string> {
  const issuedAt = Math.floor(nowMs / 1000);
  const claims: SessionClaims = {
    v: 1,
    kind,
    sub: subject,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
    sid: randomId(),
  };
  const payload = toBase64(new TextEncoder().encode(JSON.stringify(claims)));
  return `${payload}.${await sign(kind, payload)}`;
}

async function readClaims(
  cookieHeader: string,
  cookieName: string,
  expectedKind: SessionKind,
  nowMs: number,
): Promise<SessionClaims | null> {
  const raw = readCookie(cookieHeader, cookieName);
  if (!raw) return null;

  const payload = await verifySigned(raw, expectedKind);
  if (!payload) return null;

  try {
    const claims = JSON.parse(
      new TextDecoder().decode(fromBase64(payload)),
    ) as Partial<SessionClaims>;
    const now = Math.floor(nowMs / 1000);

    if (
      claims.v !== 1 || claims.kind !== expectedKind ||
      !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) ||
      typeof claims.sid !== "string" || claims.sid.length < 16 ||
      claims.iat! > now + 60 || claims.exp! <= now || claims.exp! <= claims.iat!
    ) {
      return null;
    }

    if (
      expectedKind === "member" &&
      (typeof claims.sub !== "string" || !claims.sub)
    ) {
      return null;
    }
    if (expectedKind === "admin" && claims.sub !== undefined) return null;

    return claims as SessionClaims;
  } catch {
    return null;
  }
}

// Admin sessions are short lived and purpose-bound.
export async function createSession(nowMs = Date.now()): Promise<string> {
  const raw = await createSignedSession(
    "admin",
    ADMIN_SESSION_TTL_SECONDS,
    undefined,
    nowMs,
  );
  return `${ADMIN_COOKIE_NAME}=${encodeURIComponent(raw)}; ${
    cookieAttributes(ADMIN_SESSION_TTL_SECONDS)
  }`;
}

export async function verifySession(
  cookieHeader: string,
  nowMs = Date.now(),
): Promise<boolean> {
  return (await readClaims(
    cookieHeader,
    ADMIN_COOKIE_NAME,
    "admin",
    nowMs,
  )) !== null;
}

export function clearSession(): string {
  return expiredCookie(ADMIN_COOKIE_NAME);
}

// Member sessions carry only the stable member id. Middleware loads the
// account fresh so approval changes and account deletion apply immediately.
export async function createMemberSession(
  memberId: string,
  nowMs = Date.now(),
): Promise<string> {
  if (!memberId) throw new Error("memberId is required");
  const raw = await createSignedSession(
    "member",
    MEMBER_SESSION_TTL_SECONDS,
    memberId,
    nowMs,
  );
  return `${MEMBER_COOKIE_NAME}=${encodeURIComponent(raw)}; ${
    cookieAttributes(MEMBER_SESSION_TTL_SECONDS)
  }`;
}

export async function verifyMemberSession(
  cookieHeader: string,
  nowMs = Date.now(),
): Promise<string | null> {
  const claims = await readClaims(
    cookieHeader,
    MEMBER_COOKIE_NAME,
    "member",
    nowMs,
  );
  return claims?.sub ?? null;
}

export function clearMemberSession(): string {
  return expiredCookie(MEMBER_COOKIE_NAME);
}
