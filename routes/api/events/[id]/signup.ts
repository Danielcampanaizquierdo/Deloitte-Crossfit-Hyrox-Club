import { Handlers } from "$fresh/server.ts";
import { signupService } from "../../../../services/signupService.ts";
import { eventService } from "../../../../services/eventService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(req, ctx) {
    const member = ctx.state.member;
    if (!member) {
      return Response.json(
        { error: "Inicia sesión para reservar plaza" },
        { status: 401 },
      );
    }

    // Comments are the only thing the client gets to supply. Name and email
    // come from the session, so a booking can only ever be made for the
    // logged-in member.
    let comments: string | undefined;
    try {
      const body = await req.json();
      comments = typeof body?.comments === "string" ? body.comments : undefined;
    } catch {
      comments = undefined;
    }

    const event = await eventService.getById(ctx.params.id);
    if (!event || !event.approved) {
      return Response.json({ error: "Evento no encontrado" }, { status: 404 });
    }
    if (new Date(event.date).getTime() <= Date.now()) {
      return Response.json(
        { error: "Este evento ya ha comenzado" },
        { status: 410 },
      );
    }

    try {
      const signup = await signupService.create({
        eventId: ctx.params.id,
        memberId: member.id,
        memberName: member.name,
        memberEmail: member.email,
        comments,
      });
      // The event can be deleted after the route's read but before the
      // repository transaction. Never report a successful creation with a
      // null body in that race.
      if (!signup) {
        return Response.json({ error: "Evento no encontrado" }, {
          status: 404,
        });
      }
      return Response.json(signup, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Already signed up")) {
        return Response.json({ error: "Ya estás apuntado a este evento" }, {
          status: 409,
        });
      }
      if (err instanceof Error && err.message.includes("Event is full")) {
        return Response.json(
          { error: "Este evento ya está completo" },
          { status: 409 },
        );
      }
      if (
        err instanceof Error &&
        err.message.includes("Event is not open for booking")
      ) {
        return Response.json(
          { error: "El evento ya no admite reservas" },
          { status: 409 },
        );
      }
      if (
        err instanceof Error &&
        err.message.includes("Event has already started")
      ) {
        return Response.json(
          { error: "Este evento ya ha comenzado" },
          { status: 410 },
        );
      }
      if (
        err instanceof Error && err.message.includes("Member is not eligible")
      ) {
        return Response.json(
          { error: "Tu cuenta ya no está activa o aprobada" },
          { status: 403 },
        );
      }
      throw err;
    }
  },
};
