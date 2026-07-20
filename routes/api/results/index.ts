import { Handlers } from "$fresh/server.ts";
import { resultService } from "../../../services/resultService.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { name, date, description, photoUrl } = body;
    if (!name || !date || !description) {
      return Response.json(
        { error: "Campos requeridos: name, date, description" },
        { status: 400 },
      );
    }

    const result = await resultService.create({ name, date, description, photoUrl });
    const approved = await resultService.approve(result.id);
    return Response.json(approved, { status: 201 });
  },
};
