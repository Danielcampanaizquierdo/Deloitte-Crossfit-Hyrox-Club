import { Handlers } from "$fresh/server.ts";
import { prService } from "../../../../../services/prService.ts";
import { State } from "../../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  // POST /api/admin/prs/[id]/approve - Approve PR
  async POST(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

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
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
