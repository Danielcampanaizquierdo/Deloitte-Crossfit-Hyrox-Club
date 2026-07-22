import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../services/memberService.ts";
import { verifyPassword } from "../../../lib/password.ts";
import {
  createMemberSession,
  SessionCredentialsChangedError,
} from "../../../lib/session.ts";
import { kv } from "../../../lib/kv.ts";
import {
  clientAddress,
  consumeRateLimit,
  rateLimitedResponse,
} from "../../../lib/rateLimit.ts";
import { toPublicMember } from "../../../types/Member.ts";
import { State } from "../../../types/State.ts";

const DUMMY_PASSWORD_RECORD = {
  hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  salt: "AAAAAAAAAAAAAAAAAAAAAA==",
};

const privateHeaders = { "Cache-Control": "no-store" };

export const handler: Handlers<unknown, State> = {
  async POST(req, ctx) {
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const email = typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || email.length > 254 || password.length > 200) {
      return Response.json(
        { error: "Email y contraseña requeridos" },
        { status: 400, headers: privateHeaders },
      );
    }

    const limit = await consumeRateLimit(await kv, {
      scope: "member_login",
      identifier: `${clientAddress(req, ctx.remoteAddr?.hostname)}:${email}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

    const member = await memberService.getByEmail(email);

    // Always run the verification, even when the email is unknown, so a
    // missing account and a wrong password take the same time and return the
    // same message. Otherwise this endpoint reveals which emails are members.
    const record = member?.passwordHash && member.passwordSalt
      ? { hash: member.passwordHash, salt: member.passwordSalt }
      : DUMMY_PASSWORD_RECORD;
    const valid = await verifyPassword(password, record);

    if (!member || !valid || member.active === false || member.deletedAt) {
      return Response.json(
        { error: "Email o contraseña incorrectos" },
        { status: 401, headers: privateHeaders },
      );
    }

    if (!member.approved) {
      return Response.json(
        { error: "Tu cuenta todavía está pendiente de aprobación" },
        { status: 403, headers: privateHeaders },
      );
    }

    // Same failure mode as the admin route: the credentials were fine and the
    // session could still fail to issue on a misconfigured SESSION_SECRET.
    // Say so rather than letting it read as a rejected password.
    try {
      return Response.json(
        { member: toPublicMember(member) },
        {
          headers: {
            ...privateHeaders,
            "set-cookie": await createMemberSession(
              member.id,
              member.passwordHash,
            ),
          },
        },
      );
    } catch (err) {
      if (err instanceof SessionCredentialsChangedError) {
        return Response.json(
          { error: "Las credenciales han cambiado; inicia sesión de nuevo" },
          { status: 401, headers: privateHeaders },
        );
      }
      console.error("member login: could not create session", err);
      return Response.json(
        {
          error: "Credenciales correctas, pero el servidor no puede crear la " +
            "sesión. Avisa a un administrador (SESSION_SECRET).",
        },
        { status: 500 },
      );
    }
  },
};
