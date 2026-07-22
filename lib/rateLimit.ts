export interface RateLimitOptions {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const MAX_RETRIES = 5;

async function identifierDigest(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Fixed-window limiter backed by KV and safe across concurrent isolates. */
export async function consumeRateLimit(
  kv: Deno.Kv,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  if (options.limit < 1 || options.windowMs < 1) {
    throw new Error("Rate limit and window must be positive");
  }

  const nowMs = options.nowMs ?? Date.now();
  const window = Math.floor(nowMs / options.windowMs);
  const windowEnd = (window + 1) * options.windowMs;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowEnd - nowMs) / 1000),
  );
  const key: Deno.KvKey = [
    "auth_rate_limits",
    options.scope,
    await identifierDigest(options.identifier),
    window,
  ];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await kv.get<number>(key);
    const count = current.value ?? 0;
    if (count >= options.limit) {
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    const result = await kv.atomic()
      .check(current)
      .set(key, count + 1, {
        expireIn: Math.max(options.windowMs, windowEnd - Date.now() + 1000),
      })
      .commit();
    if (result.ok) {
      return {
        allowed: true,
        remaining: Math.max(0, options.limit - count - 1),
        retryAfterSeconds,
      };
    }
  }

  // Heavy contention is safer to treat as limited than to fail open.
  return { allowed: false, remaining: 0, retryAfterSeconds };
}

export type TrustedProxyHeader =
  | "cf-connecting-ip"
  | "x-real-ip"
  | "x-forwarded-for";

function validForwardedAddress(value: string | null): string | null {
  const address = value?.trim() ?? "";
  // Proxy-provided IPs are intentionally restricted to IPv4/IPv6 characters.
  // This also avoids attacker-controlled arbitrary strings becoming buckets
  // when a deployment has explicitly enabled a trusted proxy header.
  return address && address.length <= 64 && /^[0-9a-f:.]+$/i.test(address)
    ? address
    : null;
}

/**
 * Returns the socket peer by default. A forwarding header is considered only
 * when TRUST_PROXY_HEADER names that exact header and the edge proxy is known
 * to overwrite/sanitize it.
 */
export function clientAddress(
  req: Request,
  directAddress?: string,
  trustedHeader: TrustedProxyHeader | "none" = (
    Deno.env.get("TRUST_PROXY_HEADER") ?? "none"
  ) as TrustedProxyHeader | "none",
): string {
  if (
    trustedHeader === "cf-connecting-ip" || trustedHeader === "x-real-ip" ||
    trustedHeader === "x-forwarded-for"
  ) {
    const raw = trustedHeader === "x-forwarded-for"
      ? req.headers.get(trustedHeader)?.split(",")[0] ?? null
      : req.headers.get(trustedHeader);
    const forwarded = validForwardedAddress(raw);
    if (forwarded) return forwarded;
  }
  return directAddress?.trim() || "unknown";
}

export function rateLimitedResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Demasiados intentos. Espera antes de volver a intentarlo." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
