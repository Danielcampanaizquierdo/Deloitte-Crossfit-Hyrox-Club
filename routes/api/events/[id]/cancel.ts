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

    // Ownership is the stable member id from the session. Email is used only
    // to find bookings written before accounts carried an id.
    const cancelled = await signupService.cancelForMember(
      ctx.params.id,
      member.id,
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
