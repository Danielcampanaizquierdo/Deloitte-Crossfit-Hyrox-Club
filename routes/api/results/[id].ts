import { Handlers } from "$fresh/server.ts";
import { resultService } from "../../../services/resultService.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async GET(_req, ctx) {
    const result = await resultService.getById(ctx.params.id);
    // An unapproved result is not published yet.
    if (!result || (!result.approved && !ctx.state.isAdmin)) {
      return Response.json({ error: "Result not found" }, { status: 404 });
    }
    return Response.json(result);
  },

  // Competition write-ups are club records, so only an admin may remove one.
  async DELETE(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const success = await resultService.delete(ctx.params.id);
    if (!success) {
      return Response.json({ error: "Result not found" }, { status: 404 });
    }
    return Response.json({ message: "Result deleted" });
  },
};
