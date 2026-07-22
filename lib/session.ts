import { adminKey, memberKey } from "../repositories/keys.ts";

const ADMIN_COOKIE_NAME = "admin_session";
const MEMBER_COOKIE_NAME = "member_session";

export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
export const MEMBER_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

type SessionKind = "admin" | "member";

interface SessionClaims {
  v: 2;
  kind: SessionKind;
  sub: string;
  iat: number;
  exp: number;
  sid: string;
  generation: number;
}

interface StoredSession {
  sid: string;
  kind: SessionKind;
  subject: string;
  exp: number;
  generation: number;
}

interface StoredSessionIndex {
  sid: string;
  generation: number;
}

export interface SessionServiceOptions {
  /** Primarily useful for deterministic expiry tests. */
  now?: () => number;
  /** Defaults to SESSION_SECRET. Supplying it keeps isolated tests env-free. */
  secret?: string;
  /** Defaults to the deployment/cookie environment configuration. */
  secure?: boolean;
}

export interface SessionService {
  createMemberSession(
    memberId: string,
    expectedPasswordHash?: string,
  ): Promise<string>;
  verifyMemberSession(cookieHeader: string): Promise<string | null>;
  revokeMemberSession(cookieHeader: string): Promise<void>;
  revokeAllMemberSessions(memberId: string): Promise<void>;
  clearMemberSession(): string;
  createAdminSession(
    adminId: string,
    expectedPasswordHash?: string,
  ): Promise<string>;
  verifyAdminSession(cookieHeader: string): Promise<string | null>;
  revokeAdminSession(cookieHeader: string): Promise<void>;
  revokeAllAdminSessions(adminId: string): Promise<void>;
  clearSession(): string;
  verifySession(cookieHeader: string): Promise<boolean>;
}

export class SessionCredentialsChangedError extends Error {
  constructor(kind: SessionKind, subject: string) {
    super(`${kind} credentials changed while the session was being issued`);
    this.name = "SessionCredentialsChangedError";
    this.cause = subject;
  }
}

function sessionKey(kind: SessionKind, sid: string): Deno.KvKey {
  return ["sessions", kind, sid];
}

function subjectSessionKey(
  kind: SessionKind,
  subject: string,
  sid: string,
): Deno.KvKey {
  return ["sessions_by_subject", kind, subject, sid];
}

function subjectSessionPrefix(
  kind: SessionKind,
  subject: string,
): Deno.KvKey {
  return ["sessions_by_subject", kind, subject];
}

function subjectGenerationKey(
  kind: SessionKind,
  subject: string,
): Deno.KvKey {
  return ["session_generations", kind, subject];
}

function credentialKey(kind: SessionKind, subject: string): Deno.KvKey {
  return kind === "member" ? memberKey(subject) : adminKey(subject);
}

function configuredSecret(explicitSecret?: string): string {
  const value = explicitSecret ?? Deno.env.get("SESSION_SECRET");
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

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(
  kind: SessionKind,
  payload: string,
  secret: string,
): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
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
  secret: string,
): Promise<string | null> {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;

  const payload = raw.slice(0, dot);
  const encodedSignature = raw.slice(dot + 1);

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromBase64(encodedSignature),
      new TextEncoder().encode(`${expectedKind}.${payload}`),
    );
    return valid ? payload : null;
  } catch {
    return null;
  }
}

function isSecureConfigured(): boolean {
  return Boolean(
    Deno.env.get("DENO_DEPLOYMENT_ID") ||
      Deno.env.get("COOKIE_SECURE") === "true",
  );
}

function cookieAttributes(maxAgeSeconds: number, secure: boolean): string {
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${
    secure ? "; Secure" : ""
  }`;
}

function expiredCookie(name: string, secure: boolean): string {
  return `${name}=; ${
    cookieAttributes(0, secure)
  }; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function isValidClaimsShape(
  claims: Partial<SessionClaims>,
  expectedKind: SessionKind,
): claims is SessionClaims {
  return claims.v === 2 && claims.kind === expectedKind &&
    typeof claims.sub === "string" && claims.sub.length > 0 &&
    Number.isInteger(claims.iat) && Number.isInteger(claims.exp) &&
    typeof claims.sid === "string" && claims.sid.length >= 16 &&
    Number.isSafeInteger(claims.generation) && claims.generation! >= 0 &&
    claims.exp! > claims.iat!;
}

function matchesRecord(
  record: StoredSession,
  claims: SessionClaims,
): boolean {
  return record.sid === claims.sid && record.kind === claims.kind &&
    record.subject === claims.sub && record.exp === claims.exp &&
    record.generation === claims.generation;
}

/**
 * Creates a session service backed by the supplied KV database. Production
 * exports below use lib/kv.ts; tests can inject an in-memory Deno.Kv.
 */
export function createSessionService(
  kv: Deno.Kv,
  options: SessionServiceOptions = {},
): SessionService {
  const now = options.now ?? Date.now;
  const secure = () => options.secure ?? isSecureConfigured();
  const secret = () => configuredSecret(options.secret);

  async function readClaims(
    cookieHeader: string,
    cookieName: string,
    expectedKind: SessionKind,
    requireUnexpired: boolean,
  ): Promise<SessionClaims | null> {
    const raw = readCookie(cookieHeader, cookieName);
    if (!raw) return null;

    const payload = await verifySigned(raw, expectedKind, secret());
    if (!payload) return null;

    try {
      const claims = JSON.parse(
        new TextDecoder().decode(fromBase64(payload)),
      ) as Partial<SessionClaims>;
      if (!isValidClaimsShape(claims, expectedKind)) return null;

      if (requireUnexpired) {
        const currentSeconds = Math.floor(now() / 1000);
        if (claims.iat > currentSeconds + 60 || claims.exp <= currentSeconds) {
          return null;
        }
      }
      return claims;
    } catch {
      return null;
    }
  }

  async function create(
    kind: SessionKind,
    subject: string,
    ttlSeconds: number,
    cookieName: string,
    expectedPasswordHash?: string,
  ): Promise<string> {
    if (!subject) throw new Error(`${kind}Id is required`);

    const issuedAt = Math.floor(now() / 1000);
    const expiresAt = issuedAt + ttlSeconds;
    // Validate configuration before writing anything to KV.
    const signingSecret = secret();

    // The subject generation makes global revocation a single atomic state
    // change. The optional credential guard also prevents a login that already
    // verified an old password from issuing a cookie after a password change.
    for (let attempt = 0; attempt < 3; attempt++) {
      const generationEntry = await kv.get<number>(
        subjectGenerationKey(kind, subject),
      );
      const generation = generationEntry.value ?? 0;
      const credentialEntry = expectedPasswordHash
        ? await kv.get<{ passwordHash?: string }>(credentialKey(kind, subject))
        : null;
      if (
        credentialEntry &&
        credentialEntry.value?.passwordHash !== expectedPasswordHash
      ) {
        throw new SessionCredentialsChangedError(kind, subject);
      }

      const claims: SessionClaims = {
        v: 2,
        kind,
        sub: subject,
        iat: issuedAt,
        exp: expiresAt,
        sid: randomId(),
        generation,
      };
      const stored: StoredSession = {
        sid: claims.sid,
        kind,
        subject,
        exp: expiresAt,
        generation,
      };
      const primaryKey = sessionKey(kind, claims.sid);
      const indexKey = subjectSessionKey(kind, subject, claims.sid);
      const atomic = kv.atomic()
        .check({ key: primaryKey, versionstamp: null })
        .check({ key: indexKey, versionstamp: null })
        .check(generationEntry);
      if (credentialEntry) atomic.check(credentialEntry);
      const result = await atomic
        .set(primaryKey, stored, { expireIn: ttlSeconds * 1000 })
        .set(
          indexKey,
          { sid: claims.sid, generation } satisfies StoredSessionIndex,
          { expireIn: ttlSeconds * 1000 },
        )
        .commit();

      if (result.ok) {
        const payload = toBase64(
          new TextEncoder().encode(JSON.stringify(claims)),
        );
        const raw = `${payload}.${await sign(kind, payload, signingSecret)}`;
        return `${cookieName}=${encodeURIComponent(raw)}; ${
          cookieAttributes(ttlSeconds, secure())
        }`;
      }
    }
    throw new Error(`Failed to create ${kind} session after 3 attempts`);
  }

  async function verify(
    cookieHeader: string,
    cookieName: string,
    expectedKind: SessionKind,
  ): Promise<string | null> {
    const claims = await readClaims(
      cookieHeader,
      cookieName,
      expectedKind,
      true,
    );
    if (!claims) return null;

    const [entry, generationEntry] = await kv.getMany<[
      StoredSession,
      number,
    ]>([
      sessionKey(expectedKind, claims.sid),
      subjectGenerationKey(expectedKind, claims.sub),
    ]);
    const currentGeneration = generationEntry.value ?? 0;
    return entry.value && currentGeneration === claims.generation &&
        matchesRecord(entry.value, claims)
      ? claims.sub
      : null;
  }

  async function revoke(
    cookieHeader: string,
    cookieName: string,
    expectedKind: SessionKind,
  ): Promise<void> {
    // An expired but authentically signed cookie may still be cleaned up if KV
    // has not reached its TTL boundary yet.
    const claims = await readClaims(
      cookieHeader,
      cookieName,
      expectedKind,
      false,
    );
    if (!claims) return;

    const primaryKey = sessionKey(expectedKind, claims.sid);
    const indexKey = subjectSessionKey(expectedKind, claims.sub, claims.sid);
    const entry = await kv.get<StoredSession>(primaryKey);

    if (entry.value && matchesRecord(entry.value, claims)) {
      await kv.atomic()
        .delete(primaryKey)
        .delete(indexKey)
        .commit();
      return;
    }

    // The primary may already have expired; remove a possible stale index.
    await kv.delete(indexKey);
  }

  async function revokeAll(
    kind: SessionKind,
    subject: string,
  ): Promise<void> {
    if (!subject) throw new Error(`${kind}Id is required`);

    // Bump the generation first. This invalidates the complete current set in
    // one linearizable commit, even if the subsequent storage cleanup is
    // interrupted or races with creation.
    let revokedGeneration = 0;
    for (let attempt = 0; attempt < 5; attempt++) {
      const generationEntry = await kv.get<number>(
        subjectGenerationKey(kind, subject),
      );
      const nextGeneration = (generationEntry.value ?? 0) + 1;
      const result = await kv.atomic()
        .check(generationEntry)
        .set(subjectGenerationKey(kind, subject), nextGeneration)
        .commit();
      if (result.ok) {
        revokedGeneration = nextGeneration;
        break;
      }
      if (attempt === 4) {
        throw new Error(`Failed to revoke all ${kind} sessions`);
      }
    }

    const entries: Deno.KvEntry<string | StoredSessionIndex>[] = [];
    for await (
      const entry of kv.list<string | StoredSessionIndex>({
        prefix: subjectSessionPrefix(kind, subject),
      })
    ) {
      entries.push(entry);
    }

    for (const entry of entries) {
      const sid = typeof entry.value === "string"
        ? entry.value
        : entry.value.sid;
      // A session created after the generation bump is valid and must not be
      // caught by the best-effort cleanup sweep.
      if (
        typeof entry.value !== "string" &&
        entry.value.generation >= revokedGeneration
      ) continue;
      if (typeof sid !== "string") {
        await kv.delete(entry.key);
        continue;
      }
      await kv.atomic()
        .delete(sessionKey(kind, sid))
        .delete(entry.key)
        .commit();
    }
  }

  const service: SessionService = {
    createMemberSession(memberId, expectedPasswordHash) {
      return create(
        "member",
        memberId,
        MEMBER_SESSION_TTL_SECONDS,
        MEMBER_COOKIE_NAME,
        expectedPasswordHash,
      );
    },
    verifyMemberSession(cookieHeader) {
      return verify(cookieHeader, MEMBER_COOKIE_NAME, "member");
    },
    revokeMemberSession(cookieHeader) {
      return revoke(cookieHeader, MEMBER_COOKIE_NAME, "member");
    },
    revokeAllMemberSessions(memberId) {
      return revokeAll("member", memberId);
    },
    clearMemberSession() {
      return expiredCookie(MEMBER_COOKIE_NAME, secure());
    },
    createAdminSession(adminId, expectedPasswordHash) {
      return create(
        "admin",
        adminId,
        ADMIN_SESSION_TTL_SECONDS,
        ADMIN_COOKIE_NAME,
        expectedPasswordHash,
      );
    },
    verifyAdminSession(cookieHeader) {
      return verify(cookieHeader, ADMIN_COOKIE_NAME, "admin");
    },
    revokeAdminSession(cookieHeader) {
      return revoke(cookieHeader, ADMIN_COOKIE_NAME, "admin");
    },
    revokeAllAdminSessions(adminId) {
      return revokeAll("admin", adminId);
    },
    clearSession() {
      return expiredCookie(ADMIN_COOKIE_NAME, secure());
    },
    async verifySession(cookieHeader) {
      return (await service.verifyAdminSession(cookieHeader)) !== null;
    },
  };
  return service;
}

let productionServicePromise: Promise<SessionService> | undefined;

async function productionService(nowMs?: number): Promise<SessionService> {
  const { kv } = await import("./kv.ts");
  const database = await kv;
  if (nowMs !== undefined) {
    return createSessionService(database, { now: () => nowMs });
  }
  productionServicePromise ??= Promise.resolve(createSessionService(database));
  return await productionServicePromise;
}

export async function createMemberSession(
  memberId: string,
  expectedPasswordHash?: string,
  nowMs?: number,
): Promise<string> {
  return await (await productionService(nowMs)).createMemberSession(
    memberId,
    expectedPasswordHash,
  );
}

export async function verifyMemberSession(
  cookieHeader: string,
  nowMs?: number,
): Promise<string | null> {
  return await (await productionService(nowMs)).verifyMemberSession(
    cookieHeader,
  );
}

export async function revokeMemberSession(cookieHeader: string): Promise<void> {
  await (await productionService()).revokeMemberSession(cookieHeader);
}

export async function revokeAllMemberSessions(memberId: string): Promise<void> {
  await (await productionService()).revokeAllMemberSessions(memberId);
}

export function clearMemberSession(): string {
  return expiredCookie(MEMBER_COOKIE_NAME, isSecureConfigured());
}

export async function createAdminSession(
  adminId: string,
  expectedPasswordHash?: string,
  nowMs?: number,
): Promise<string> {
  return await (await productionService(nowMs)).createAdminSession(
    adminId,
    expectedPasswordHash,
  );
}

export async function verifyAdminSession(
  cookieHeader: string,
  nowMs?: number,
): Promise<string | null> {
  return await (await productionService(nowMs)).verifyAdminSession(
    cookieHeader,
  );
}

export async function revokeAdminSession(cookieHeader: string): Promise<void> {
  await (await productionService()).revokeAdminSession(cookieHeader);
}

export async function revokeAllAdminSessions(adminId: string): Promise<void> {
  await (await productionService()).revokeAllAdminSessions(adminId);
}

export function clearSession(): string {
  return expiredCookie(ADMIN_COOKIE_NAME, isSecureConfigured());
}

/** Boolean compatibility wrapper for existing admin middleware. */
export async function verifySession(
  cookieHeader: string,
  nowMs?: number,
): Promise<boolean> {
  return (await verifyAdminSession(cookieHeader, nowMs)) !== null;
}
