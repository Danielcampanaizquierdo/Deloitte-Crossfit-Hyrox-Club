import { FreshContext } from "$fresh/server.ts";
import { resultService } from "../../../../../services/resultService.ts";

export const handler = {
  // POST /api/admin/results/[id]/approve - Approve result
  async POST(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const result = await resultService.approve(id);
      if (!result) {
        return new Response(JSON.stringify({ error: "Result not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Result approved", result }), {
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
