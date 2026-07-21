import { Handlers } from "$fresh/server.ts";
import { eventService } from "../../../services/eventService.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  // Public listing is approved events only; an admin also sees what is still
  // waiting for moderation.
  async GET(_req, ctx) {
    const events = ctx.state.isAdmin
      ? await eventService.getAll()
      : (await eventService.getAll()).filter((e) => e.approved);
    return Response.json(
      events.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    );
  },

  async POST(req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { title, date, location, description, type } = body as Record<
      string,
      string
    >;
    if (!title || !date || !location || !description) {
      return Response.json(
        { error: "Campos requeridos: title, date, location, description" },
        { status: 400 },
      );
    }

    // Absent or blank capacity means an uncapped event, which is how every
    // event created before capacity existed behaves.
    const rawCapacity = body.capacity;
    let capacity: number | undefined;
    if (rawCapacity !== undefined && rawCapacity !== null && rawCapacity !== "") {
      const parsed = Number(rawCapacity);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return Response.json(
          { error: "capacity debe ser un número positivo" },
          { status: 400 },
        );
      }
      capacity = Math.round(parsed) || undefined;
    }

    const event = await eventService.create({
      title,
      date,
      location,
      description,
      type,
      capacity,
    });
    const approved = await eventService.update(event.id, { approved: true });
    return Response.json(approved, { status: 201 });
  },
};
