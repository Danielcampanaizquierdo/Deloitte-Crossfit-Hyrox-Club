import { Handlers } from "$fresh/server.ts";
import { eventService } from "../../../../services/eventService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const event = await eventService.update(ctx.params.id, { approved: true });
    if (!event) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(event);
  },
};
