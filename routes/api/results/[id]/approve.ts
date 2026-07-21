import { Handlers } from "$fresh/server.ts";
import { resultService } from "../../../../services/resultService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await resultService.approve(ctx.params.id);
    if (!result) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(result);
  },
};
