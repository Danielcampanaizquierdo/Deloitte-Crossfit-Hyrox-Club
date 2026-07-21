const COOKIE_NAME = "admin_session";

function secret(): string {
  const s = Deno.env.get("SESSION_SECRET");
  if (!s) throw new Error("SESSION_SECRET env var not set");
  return s;
}

async function sign(token: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function createSession(): Promise<string> {
  const token = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  );
  const sig = await sign(token);
  const value = encodeURIComponent(`${token}.${sig}`);
  const secure = Deno.env.get("DENO_DEPLOYMENT_ID") ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}`;
}

export async function verifySession(cookieHeader: string): Promise<boolean> {
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;

  const raw = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  const dot = raw.lastIndexOf(".");
  if (dot === -1) return false;

  const token = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  try {
    const expected = await sign(token);
    if (expected.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export function clearSession(): string {
  const secure = Deno.env.get("DENO_DEPLOYMENT_ID") ? "; Secure" : "";
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}
