import { Handlers } from "$fresh/server.ts";
import { signupService } from "../../../services/signupService.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  // Signups carry the booker's email and free-text comments, so the full list
  // is admin-only. The public roster lives at
  // /api/events/[id]/attendees, which returns names alone.
  async GET(req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const eventId = new URL(req.url).searchParams.get("eventId");
    return Response.json(
      eventId
        ? await signupService.getByEventId(eventId)
        : await signupService.getAll(),
    );
  },

  // Booking goes through POST /api/events/[id]/signup, which takes the
  // member's identity from their session. This accepted an arbitrary name and
  // email, so it could be used to book on somebody else's behalf.
  POST(_req, _ctx) {
    return Response.json(
      { error: "Usa POST /api/events/{id}/signup para reservar plaza" },
      { status: 410 },
    );
  },
};
