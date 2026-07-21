import { Handlers } from "$fresh/server.ts";
import { eventService } from "../../../services/eventService.ts";
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

    const { title, date, location, description, type } = body;
    if (!title || !date || !location || !description) {
      return Response.json(
        { error: "Campos requeridos: title, date, location, description" },
        { status: 400 },
      );
    }

    const event = await eventService.create({ title, date, location, description, type });
    const approved = await eventService.update(event.id, { approved: true });
    return Response.json(approved, { status: 201 });
  },
};
