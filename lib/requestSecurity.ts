const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function configuredOrigin(): string | null {
  const value = Deno.env.get("APP_ORIGIN")?.trim();
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    throw new Error("APP_ORIGIN must be an absolute URL");
  }
}

/**
 * Browser mutations authenticated by a cookie must come from this
 * application. SameSite cookies are useful defence in depth, but an Origin
 * check also covers a compromised sibling subdomain in the same site.
 *
 * Non-browser API clients normally omit both Origin and Sec-Fetch-Site and
 * remain supported. Browsers send at least Origin for unsafe CORS/form
 * requests, and modern browsers also send Fetch Metadata.
 */
export function isTrustedMutation(req: Request): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return true;

  const fetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;

  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;

  try {
    const expected = configuredOrigin() ?? new URL(req.url).origin;
    return new URL(origin).origin === expected;
  } catch {
    return false;
  }
}

export function rejectUntrustedApiMutation(req: Request): Response | null {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/api/") || isTrustedMutation(req)) return null;

  return Response.json(
    { error: "Origen de la petición no permitido" },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "Vary": "Origin, Sec-Fetch-Site",
      },
    },
  );
}
