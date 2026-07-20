import { FreshContext } from "$fresh/server.ts";
import { resultService } from "../../services/resultService.ts";

export const handler = {
  // GET /api/results - Get all approved results
  async GET(_req: Request, _ctx: FreshContext) {
    try {
      const results = await resultService.getApproved();
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

  // POST /api/results - Create result
  async POST(req: Request, _ctx: FreshContext) {
    try {
      const data = await req.json();
      const result = await resultService.create(data);
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
