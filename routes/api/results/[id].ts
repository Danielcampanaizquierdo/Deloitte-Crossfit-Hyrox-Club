import { FreshContext } from "$fresh/server.ts";
import { errorMessage } from "../../../lib/errors.ts";
import { resultService } from "../../../services/resultService.ts";

export const handler = {
  // GET /api/results/[id] - Get result by ID
  async GET(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const result = await resultService.getById(id);
      if (!result) {
        return new Response(JSON.stringify({ error: "Result not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(result), {
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

  // DELETE /api/results/[id] - Delete result
  async DELETE(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const success = await resultService.delete(id);
      if (!success) {
        return new Response(JSON.stringify({ error: "Result not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Result deleted" }), {
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
