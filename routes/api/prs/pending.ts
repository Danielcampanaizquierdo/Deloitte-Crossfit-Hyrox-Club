import { FreshContext } from "$fresh/server.ts";
import { errorMessage } from "../../../lib/errors.ts";
import { prService } from "../../../services/prService.ts";
import { State } from "../../../types/State.ts";

export const handler = {
  // GET /api/prs/pending - Get pending PRs (admin)
  async GET(_req: Request, ctx: FreshContext<State>) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const prs = await prService.getPending();
      return new Response(JSON.stringify(prs), {
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
