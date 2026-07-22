import { Handlers } from "$fresh/server.ts";
import { kv } from "../../../lib/kv.ts";
import {
  clientAddress,
  consumeRateLimit,
  rateLimitedResponse,
} from "../../../lib/rateLimit.ts";
import { createAdminSession } from "../../../lib/session.ts";
import {
  type AdminService,
  adminService,
  ensureInitialAdmin,
} from "../../../services/adminService.ts";
import { toPublicAdmin } from "../../../types/Admin.ts";
import { State } from "../../../types/State.ts";

const privateHeaders = { "Cache-Control": "no-store" };

interface LoginDependencies {
  service: Pick<AdminService, "authenticate">;
  bootstrap?: () => Promise<unknown>;
  createSession?: (
    adminId: string,
    expectedPasswordHash?: string,
  ) => Promise<string>;
  rateLimit?: (
    req: Request,
    email: string,
    directAddress?: string,
  ) => Promise<Response | null>;
}

export async function checkAdminLoginRateLimit(
  rateLimitKv: Deno.Kv,
  req: Request,
  email: string,
  directAddress?: string,
): Promise<Response | null> {
  const result = await consumeRateLimit(rateLimitKv, {
    scope: "admin_login",
    identifier: `${clientAddress(req, directAddress)}\u0000${email}`,
    limit: 6,
    windowMs: 15 * 60 * 1000,
  });
  return result.allowed ? null : rateLimitedResponse(result.retryAfterSeconds);
}

export function createAdminLoginHandler(
  {
    service,
    bootstrap = async () => undefined,
    createSession = createAdminSession,
    rateLimit = async () => null,
  }: LoginDependencies,
): (req: Request, directAddress?: string) => Promise<Response> {
  return async (req, directAddress) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "JSON inválido" },
        { status: 400, headers: privateHeaders },
      );
    }

    const record = body && typeof body === "object"
      ? body as Record<string, unknown>
      : {};
    const email = typeof record.email === "string"
      ? record.email.trim().toLowerCase()
      : "";
    const password = typeof record.password === "string" ? record.password : "";
    if (!email || !password || email.length > 254 || password.length > 200) {
      return Response.json(
        { error: "Email y contraseña requeridos" },
        { status: 400, headers: privateHeaders },
      );
    }

    try {
      const limited = await rateLimit(req, email, directAddress);
      if (limited) return limited;
    } catch (error) {
      console.error("admin login: could not apply rate limit", error);
      return Response.json(
        { error: "No se pudo comprobar el límite de intentos" },
        { status: 500, headers: privateHeaders },
      );
    }

    let authentication;
    try {
      await bootstrap();
      authentication = await service.authenticate(email, password);
    } catch (error) {
      console.error(
        "admin login: could not read administrator accounts",
        error,
      );
      return Response.json(
        { error: "No se pudo comprobar la cuenta de administrador" },
        { status: 500, headers: privateHeaders },
      );
    }

    if (authentication.status === "invalid") {
      return Response.json(
        { error: "Email o contraseña incorrectos" },
        { status: 401, headers: privateHeaders },
      );
    }
    if (authentication.status === "inactive") {
      return Response.json(
        { error: "La cuenta de administrador está desactivada" },
        { status: 403, headers: privateHeaders },
      );
    }

    try {
      const cookie = await createSession(
        authentication.admin.id,
        authentication.admin.passwordHash,
      );
      return Response.json(
        { success: true, admin: toPublicAdmin(authentication.admin) },
        {
          headers: {
            ...privateHeaders,
            "set-cookie": cookie,
          },
        },
      );
    } catch (error) {
      console.error("admin login: could not create session", error);
      return Response.json(
        {
          error: "Credenciales correctas, pero el servidor no puede crear la " +
            "sesión. Revisa SESSION_SECRET.",
        },
        { status: 500, headers: privateHeaders },
      );
    }
  };
}

const login = createAdminLoginHandler({
  service: adminService,
  bootstrap: ensureInitialAdmin,
  rateLimit: async (req, email, directAddress) =>
    await checkAdminLoginRateLimit(await kv, req, email, directAddress),
});

export const handler: Handlers<unknown, State> = {
  POST(req, ctx) {
    return login(req, ctx.remoteAddr?.hostname);
  },
};
