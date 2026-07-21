import { FreshContext } from "$fresh/server.ts";
import { errorMessage } from "../../../lib/errors.ts";
import { resultService } from "../../../services/resultService.ts";
import { State } from "../../../types/State.ts";

export const handler = {
  // GET /api/results/pending - Get pending results (admin)
  async GET(_req: Request, ctx: FreshContext<State>) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const results = await resultService.getPending();
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: errorMessage(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
