import { Handlers } from "$fresh/server.ts";
import { prService } from "../../../../services/prService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const pr = await prService.approve(ctx.params.id);
    if (!pr) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(pr);
  },
};
