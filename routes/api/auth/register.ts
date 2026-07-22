import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../services/memberService.ts";
import { hashPassword, validatePassword } from "../../../lib/password.ts";
import { toPublicMember } from "../../../types/Member.ts";
import { State } from "../../../types/State.ts";
import { DuplicateMemberEmailError } from "../../../repositories/memberRepository.ts";
import { kv } from "../../../lib/kv.ts";
import {
  clientAddress,
  consumeRateLimit,
  rateLimitedResponse,
} from "../../../lib/rateLimit.ts";

const privateHeaders = { "Cache-Control": "no-store" };

function validEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const handler: Handlers<unknown, State> = {
  async POST(req, ctx) {
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
    const password = typeof body.password === "string" ? body.password : "";
    const level = typeof body.level === "string" ? body.level : "";
    const goal = typeof body.goal === "string" ? body.goal : "";
    const location = typeof body.location === "string"
      ? body.location.trim()
      : "";
    if (!name || !email || !password || !level || !goal || !location) {
      return Response.json(
        {
          error:
            "Campos requeridos: name, email, password, level, goal, location",
        },
        { status: 400, headers: privateHeaders },
      );
    }
    if (
      name.length > 100 || location.length > 100 || !validEmail(email) ||
      (typeof body.bio === "string" && body.bio.trim().length > 500)
    ) {
      return Response.json(
        { error: "Nombre, email, ciudad o bio no tienen un formato válido" },
        { status: 400, headers: privateHeaders },
      );
    }
    if (!["beginner", "intermediate", "advanced"].includes(level)) {
      return Response.json(
        { error: "level inválido" },
        { status: 400, headers: privateHeaders },
      );
    }
    if (!["crossfit", "hyrox", "general"].includes(goal)) {
      return Response.json(
        { error: "goal inválido" },
        { status: 400, headers: privateHeaders },
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return Response.json(
        { error: passwordError },
        { status: 400, headers: privateHeaders },
      );
    }

    const limit = await consumeRateLimit(await kv, {
      scope: "member_register",
      identifier: clientAddress(req, ctx.remoteAddr?.hostname),
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

    if (await memberService.getByEmail(email)) {
      return Response.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409, headers: privateHeaders },
      );
    }

    const { hash, salt } = await hashPassword(password);
    let member;
    try {
      member = await memberService.create({
        name,
        email,
        level: level as "beginner" | "intermediate" | "advanced",
        goal: goal as "crossfit" | "hyrox" | "general",
        location,
        bio: typeof body.bio === "string"
          ? body.bio.trim() || undefined
          : undefined,
        passwordHash: hash,
        passwordSalt: salt,
      });
    } catch (error) {
      // The pre-check gives a quick response, while this catches two
      // simultaneous registrations racing for the same normalized email.
      if (error instanceof DuplicateMemberEmailError) {
        return Response.json(
          { error: "Ya existe una cuenta con ese email" },
          { status: 409, headers: privateHeaders },
        );
      }
      throw error;
    }

    // No session is issued here: the account still needs admin approval, and
    // an unapproved member has nothing to act on yet.
    return Response.json(
      {
        member: toPublicMember(member),
        message: "Cuenta creada. Un admin la aprobará en breve.",
      },
      { status: 201, headers: privateHeaders },
    );
  },
};
