import { Handlers } from "$fresh/server.ts";
import { signupService } from "../../../../services/signupService.ts";
import { eventService } from "../../../../services/eventService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(req, ctx) {
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { memberName, memberEmail, comments } = body;
    if (!memberName || !memberEmail) {
      return Response.json({ error: "Nombre y email requeridos" }, { status: 400 });
    }

    const event = await eventService.getById(ctx.params.id);
    if (!event || !event.approved) {
      return Response.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    try {
      const signup = await signupService.create({
        eventId: ctx.params.id,
        memberName,
        memberEmail,
        comments,
      });
      await eventService.addAttendee(ctx.params.id);
      return Response.json(signup, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Already signed up")) {
        return Response.json({ error: "Ya estás apuntado a este evento" }, { status: 409 });
      }
      throw err;
    }
  },
};
