import { Handlers } from "$fresh/server.ts";
import { eventService } from "../../../../services/eventService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async DELETE(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const ok = await eventService.delete(ctx.params.id);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ success: true });
  },
  async POST(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const ok = await eventService.delete(ctx.params.id);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 303, headers: { location: "/" } });
  },
};
