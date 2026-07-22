import { Handlers } from "$fresh/server.ts";
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from "../../../lib/password.ts";
import {
  clearMemberSession,
  createMemberSession,
  revokeAllMemberSessions,
} from "../../../lib/session.ts";
import { kv } from "../../../lib/kv.ts";
import {
  consumeRateLimit,
  rateLimitedResponse,
} from "../../../lib/rateLimit.ts";
import { memberService } from "../../../services/memberService.ts";
import { toPublicMember } from "../../../types/Member.ts";
import type { State } from "../../../types/State.ts";

const privateHeaders = { "Cache-Control": "no-store" };

export const handler: Handlers<unknown, State> = {
  async POST(req, ctx) {
    const member = ctx.state.member;
    if (!member) {
      return Response.json(
        { error: "Inicia sesión para cambiar tu contraseña" },
        { status: 401, headers: privateHeaders },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "JSON inválido" },
        { status: 400, headers: privateHeaders },
      );
    }

    const currentPassword = typeof body.currentPassword === "string"
      ? body.currentPassword
      : "";
    const newPassword = typeof body.newPassword === "string"
      ? body.newPassword
      : "";
    if (!currentPassword || !newPassword || currentPassword.length > 200) {
      return Response.json(
        { error: "Contraseña actual y nueva requeridas" },
        { status: 400, headers: privateHeaders },
      );
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return Response.json(
        { error: passwordError },
        { status: 400, headers: privateHeaders },
      );
    }

    const limit = await consumeRateLimit(await kv, {
      scope: "member_change_password_reauth",
      identifier: member.id,
      limit: 6,
      windowMs: 15 * 60 * 1000,
    });
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

    const currentValid = await verifyPassword(currentPassword, {
      hash: member.passwordHash,
      salt: member.passwordSalt,
    });
    if (!currentValid) {
      return Response.json(
        { error: "La contraseña actual no es correcta" },
        { status: 401, headers: privateHeaders },
      );
    }

    const record = await hashPassword(newPassword);
    const updated = await memberService.update(member.id, {
      passwordHash: record.hash,
      passwordSalt: record.salt,
    });
    if (!updated) {
      return Response.json(
        { error: "La cuenta ya no está activa" },
        { status: 409, headers: privateHeaders },
      );
    }

    // A password change invalidates every copied/remembered cookie. The
    // current browser receives a completely new session afterwards.
    await revokeAllMemberSessions(member.id);
    try {
      const cookie = await createMemberSession(
        member.id,
        updated.passwordHash,
      );
      return Response.json(
        { member: toPublicMember(updated) },
        {
          headers: {
            ...privateHeaders,
            "set-cookie": cookie,
          },
        },
      );
    } catch (error) {
      console.error(
        "password change: could not create replacement session",
        error,
      );
      return Response.json(
        {
          error:
            "Contraseña cambiada, pero no se pudo renovar la sesión. Inicia sesión de nuevo.",
        },
        {
          status: 500,
          headers: {
            ...privateHeaders,
            "set-cookie": clearMemberSession(),
          },
        },
      );
    }
  },
};
