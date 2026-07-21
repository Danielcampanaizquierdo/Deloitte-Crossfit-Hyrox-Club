import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../services/memberService.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  // Approved members only, optionally filtered by ?search=, ?level= and
  // ?goal=. Never exposes pending profiles, which nobody has approved yet.
  async GET(req, _ctx) {
    const params = new URL(req.url).searchParams;
    const search = params.get("search") ?? "";
    const level = params.get("level") ?? undefined;
    const goal = params.get("goal") ?? undefined;
    return Response.json(await memberService.search(search, level, goal));
  },

  async POST(req, _ctx) {
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { name, email, level, goal, location } = body;
    if (!name || !email || !level || !goal || !location) {
      return Response.json(
        { error: "Campos requeridos: name, email, level, goal, location" },
        { status: 400 },
      );
    }
    if (!["beginner", "intermediate", "advanced"].includes(level)) {
      return Response.json({ error: "level inválido" }, { status: 400 });
    }
    if (!["crossfit", "hyrox", "general"].includes(goal)) {
      return Response.json({ error: "goal inválido" }, { status: 400 });
    }

    const existing = await memberService.getByEmail(email);
    if (existing) {
      return Response.json({ error: "Ya existe un perfil con ese email" }, { status: 409 });
    }

    const member = await memberService.create({
      name,
      email,
      level: level as "beginner" | "intermediate" | "advanced",
      goal: goal as "crossfit" | "hyrox" | "general",
      location,
      bio: body.bio,
    });

    return Response.json(member, { status: 201 });
  },
};
