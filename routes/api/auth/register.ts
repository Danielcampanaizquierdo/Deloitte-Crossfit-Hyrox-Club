import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../services/memberService.ts";
import { hashPassword, validatePassword } from "../../../lib/password.ts";
import { toPublicMember } from "../../../types/Member.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(req, _ctx) {
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { name, email, password, level, goal, location } = body;
    if (!name || !email || !password || !level || !goal || !location) {
      return Response.json(
        {
          error:
            "Campos requeridos: name, email, password, level, goal, location",
        },
        { status: 400 },
      );
    }
    if (!["beginner", "intermediate", "advanced"].includes(level)) {
      return Response.json({ error: "level inválido" }, { status: 400 });
    }
    if (!["crossfit", "hyrox", "general"].includes(goal)) {
      return Response.json({ error: "goal inválido" }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return Response.json({ error: passwordError }, { status: 400 });
    }

    if (await memberService.getByEmail(email)) {
      return Response.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409 },
      );
    }

    const { hash, salt } = await hashPassword(password);
    const member = await memberService.create({
      name,
      email,
      level: level as "beginner" | "intermediate" | "advanced",
      goal: goal as "crossfit" | "hyrox" | "general",
      location,
      bio: body.bio,
      passwordHash: hash,
      passwordSalt: salt,
    });

    // No session is issued here: the account still needs admin approval, and
    // an unapproved member has nothing to act on yet.
    return Response.json(
      {
        member: toPublicMember(member),
        message: "Cuenta creada. Un admin la aprobará en breve.",
      },
      { status: 201 },
    );
  },
};
