// Password hashing for member accounts.
//
// PBKDF2-SHA256 via Web Crypto, which Deno and Deno Deploy both provide, so
// this needs no dependency. Iteration count follows the OWASP 2023 guidance
// for PBKDF2-HMAC-SHA256. Every password gets its own random salt, so two
// members choosing the same password do not share a hash.

const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export const MIN_PASSWORD_LENGTH = 8;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

// Pinned to ArrayBuffer rather than the default ArrayBufferLike: Web Crypto's
// BufferSource excludes SharedArrayBuffer-backed views.
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    key,
    KEY_BITS,
  );
  return toBase64(new Uint8Array(bits));
}

export interface PasswordRecord {
  hash: string;
  salt: string;
}

export async function hashPassword(password: string): Promise<PasswordRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return { hash: await derive(password, salt), salt: toBase64(salt) };
}

/** Constant-time-ish comparison: always walks the whole string so a wrong
 * password does not return faster the earlier it diverges. */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  record: Partial<PasswordRecord> | null | undefined,
): Promise<boolean> {
  // Members created before accounts existed carry no hash and simply cannot
  // log in; they must be given a password before they can.
  if (!record?.hash || !record?.salt) return false;
  try {
    const candidate = await derive(password, fromBase64(record.salt));
    return equals(candidate, record.hash);
  } catch {
    return false;
  }
}

/** Returns an error message when the password is unusable, or null when it is
 * acceptable. */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > 200) {
    return "La contraseña es demasiado larga.";
  }
  return null;
}
