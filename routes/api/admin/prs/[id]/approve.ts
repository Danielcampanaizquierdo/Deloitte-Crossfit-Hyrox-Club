import { FreshContext } from "$fresh/server.ts";
import { prService } from "../../../../../services/prService.ts";

export const handler = {
  // POST /api/admin/prs/[id]/approve - Approve PR
  async POST(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const pr = await prService.approve(id);
      if (!pr) {
        return new Response(JSON.stringify({ error: "PR not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "PR approved", pr }), {
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
