import { FreshContext } from "$fresh/server.ts";
import { errorMessage } from "../../../lib/errors.ts";
import { prService } from "../../../services/prService.ts";

export const handler = {
  // GET /api/prs/[id] - Get PR by ID
  async GET(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const pr = await prService.getById(id);
      if (!pr) {
        return new Response(JSON.stringify({ error: "PR not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(pr), {
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

  // DELETE /api/prs/[id] - Delete PR
  async DELETE(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const success = await prService.delete(id);
      if (!success) {
        return new Response(JSON.stringify({ error: "PR not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "PR deleted" }), {
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
