import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../services/memberService.ts";
import { toDirectoryMember, toPublicMember } from "../../../types/Member.ts";
import type { UpdateMemberRequest } from "../../../types/Member.ts";
import { State } from "../../../types/State.ts";
import {
  clearMemberSession,
  revokeAllMemberSessions,
} from "../../../lib/session.ts";
import { verifyPassword } from "../../../lib/password.ts";
import { kv } from "../../../lib/kv.ts";
import {
  consumeRateLimit,
  rateLimitedResponse,
} from "../../../lib/rateLimit.ts";

const LEVELS = new Set(["beginner", "intermediate", "advanced"]);
const GOALS = new Set(["crossfit", "hyrox", "general"]);

function invalid(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

export const handler: Handlers<unknown, State> = {
  async GET(_req, ctx) {
    const member = await memberService.getById(ctx.params.id);
    // Unapproved profiles are only visible to an admin; to everyone else they
    // do not exist yet.
    if (
      !member || member.active === false || member.deletedAt ||
      (!member.approved && !ctx.state.isAdmin)
    ) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }
    return Response.json(toDirectoryMember(member));
  },

  // A member may edit their own profile; an admin may edit anyone's. This
  // used to be open to anyone, which allowed self-approval and overwriting
  // another member's stored credentials.
  async PUT(req, ctx) {
    const isSelf = ctx.state.member?.id === ctx.params.id;
    if (!ctx.state.isAdmin && !isSelf) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return invalid("El perfil debe ser un objeto JSON");
    }
    const body = parsed as Record<string, unknown>;

    const accepted = new Set([
      "name",
      "level",
      "goal",
      "location",
      "bio",
      "avatar",
    ]);
    if (ctx.state.isAdmin) accepted.add("approved");
    const unsupported = Object.keys(body).filter((key) => !accepted.has(key));
    if (unsupported.length > 0) {
      return invalid(`Campos no permitidos: ${unsupported.join(", ")}`);
    }
    if (Object.keys(body).length === 0) {
      return invalid("No se ha indicado ningún cambio");
    }

    const allowed: UpdateMemberRequest = {};
    if (body.name !== undefined) {
      if (typeof body.name !== "string") return invalid("name debe ser texto");
      const name = body.name.trim();
      if (!name || name.length > 100) {
        return invalid("name debe tener entre 1 y 100 caracteres");
      }
      allowed.name = name;
    }
    if (body.location !== undefined) {
      if (typeof body.location !== "string") {
        return invalid("location debe ser texto");
      }
      const location = body.location.trim();
      if (!location || location.length > 100) {
        return invalid("location debe tener entre 1 y 100 caracteres");
      }
      allowed.location = location;
    }
    if (body.level !== undefined) {
      if (typeof body.level !== "string" || !LEVELS.has(body.level)) {
        return invalid("level inválido");
      }
      allowed.level = body.level as UpdateMemberRequest["level"];
    }
    if (body.goal !== undefined) {
      if (typeof body.goal !== "string" || !GOALS.has(body.goal)) {
        return invalid("goal inválido");
      }
      allowed.goal = body.goal as UpdateMemberRequest["goal"];
    }
    if (body.bio !== undefined) {
      if (typeof body.bio !== "string") return invalid("bio debe ser texto");
      const bio = body.bio.trim();
      if (bio.length > 500) {
        return invalid("bio no puede superar 500 caracteres");
      }
      allowed.bio = bio || undefined;
    }
    // The avatar travels inline as a compressed data URI; guard its size and
    // shape before it reaches KV (64 KiB per value). An empty string removes it.
    if (body.avatar !== undefined) {
      if (typeof body.avatar !== "string") {
        return invalid("avatar debe ser texto");
      }
      const avatar = body.avatar;
      if (avatar !== "") {
        if (!avatar.startsWith("data:image/")) {
          return invalid("La foto no tiene un formato válido.");
        }
        if (avatar.length > 60_000) {
          return invalid("La foto es demasiado grande. Prueba con otra más ligera.");
        }
      }
      allowed.avatar = avatar || undefined;
    }
    // Approval is a moderation decision, so only an admin may change it.
    if (ctx.state.isAdmin && body.approved !== undefined) {
      if (typeof body.approved !== "boolean") {
        return invalid("approved debe ser booleano");
      }
      allowed.approved = body.approved;
    }

    const member = await memberService.update(ctx.params.id, allowed);
    if (!member) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }
    return Response.json(toPublicMember(member));
  },

  async DELETE(req, ctx) {
    const isSelf = ctx.state.member?.id === ctx.params.id;
    if (!ctx.state.isAdmin && !isSelf) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isSelf && !ctx.state.isAdmin) {
      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return invalid("Confirma la operación con tu contraseña actual");
      }
      const currentPassword = typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";
      if (!currentPassword || currentPassword.length > 200) {
        return invalid("Confirma la operación con tu contraseña actual");
      }
      const limit = await consumeRateLimit(await kv, {
        scope: "member_delete_reauth",
        identifier: ctx.state.member!.id,
        limit: 6,
        windowMs: 15 * 60 * 1000,
      });
      if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);
      const authenticated = await verifyPassword(currentPassword, {
        hash: ctx.state.member?.passwordHash,
        salt: ctx.state.member?.passwordSalt,
      });
      if (!authenticated) {
        return Response.json(
          { error: "La contraseña actual no es correcta" },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        );
      }
    }
    const success = await memberService.delete(ctx.params.id);
    if (!success) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }
    await revokeAllMemberSessions(ctx.params.id);
    return Response.json(
      { message: "Member deleted" },
      isSelf
        ? {
          headers: {
            "Cache-Control": "no-store",
            "Set-Cookie": clearMemberSession(),
          },
        }
        : undefined,
    );
  },
};
