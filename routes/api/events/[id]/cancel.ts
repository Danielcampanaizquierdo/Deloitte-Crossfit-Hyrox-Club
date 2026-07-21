import { Handlers } from "$fresh/server.ts";
import { signupService } from "../../../../services/signupService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(_req, ctx) {
    const member = ctx.state.member;
    if (!member) {
      return Response.json(
        { error: "Inicia sesión para gestionar tu reserva" },
        { status: 401 },
      );
    }

    // The email comes from the session, never from the request. Taking it from
    // the body meant anyone who knew a member's address could cancel their
    // reservation.
    const cancelled = await signupService.cancelByEmail(
      ctx.params.id,
      member.email,
    );
    if (!cancelled) {
      return Response.json(
        { error: "No tienes ninguna reserva en este evento" },
        { status: 404 },
      );
    }

    return Response.json({ success: true });
  },
};
