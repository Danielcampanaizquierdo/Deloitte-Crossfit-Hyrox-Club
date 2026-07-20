import { FreshContext } from "$fresh/server.ts";
import { resultService } from "../../../services/resultService.ts";

export const handler = {
  // GET /api/results/pending - Get pending results (admin)
  async GET(_req: Request, _ctx: FreshContext) {
    try {
      const results = await resultService.getPending();
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
