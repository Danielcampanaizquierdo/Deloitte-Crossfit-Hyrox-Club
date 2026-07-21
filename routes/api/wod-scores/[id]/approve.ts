import { Handlers } from "$fresh/server.ts";
import { wodService } from "../../../../services/wodService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const score = await wodService.approveScore(ctx.params.id);
    if (!score) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(score);
  },
};
