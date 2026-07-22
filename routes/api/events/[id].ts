import { Handlers } from "$fresh/server.ts";
import { eventService } from "../../../services/eventService.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async GET(_req, ctx) {
    const event = await eventService.getById(ctx.params.id);
    // An unapproved event is not public yet.
    if (!event || (!event.approved && !ctx.state.isAdmin)) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    return Response.json(event);
  },

  // Scheduling is a club decision, so editing and deleting are admin-only.
  // Both were previously open to anyone with the event id.
  async PUT(req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    // The cover photo travels inline as a compressed data URI; guard its size
    // and shape before it reaches KV (64 KiB per value). An empty string is a
    // deliberate "remove the photo".
    const image = body.image;
    if (typeof image === "string" && image !== "") {
      if (!image.startsWith("data:image/")) {
        return Response.json(
          { error: "La foto no tiene un formato válido." },
          { status: 400 },
        );
      }
      if (image.length > 60_000) {
        return Response.json(
          { error: "La foto es demasiado grande. Prueba con una más ligera." },
          { status: 400 },
        );
      }
    }

    // Whitelisted so a request cannot rewrite the attendee counter, which the
    // signup transaction owns.
    const allowed: Record<string, unknown> = {};
    for (
      const field of [
        "title",
        "date",
        "location",
        "locationUrl",
        "image",
        "description",
        "type",
        "capacity",
        "approved",
      ]
    ) {
      if (body[field] !== undefined) allowed[field] = body[field];
    }

    const event = await eventService.update(ctx.params.id, allowed);
    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    return Response.json(event);
  },

  async DELETE(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const success = await eventService.delete(ctx.params.id);
    if (!success) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    return Response.json({ message: "Event deleted" });
  },
};
