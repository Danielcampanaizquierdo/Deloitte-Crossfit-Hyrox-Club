import { Handlers } from "$fresh/server.ts";
import { resultService } from "../../../../../services/resultService.ts";
import { State } from "../../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  // POST /api/admin/results/[id]/approve - Approve result
  async POST(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const { id } = ctx.params;
      const result = await resultService.approve(id);
      if (!result) {
        return new Response(JSON.stringify({ error: "Result not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ message: "Result approved", result }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
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
