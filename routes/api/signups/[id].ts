import { FreshContext } from "$fresh/server.ts";
import { errorMessage } from "../../../lib/errors.ts";
import { signupService } from "../../../services/signupService.ts";

export const handler = {
  // GET /api/signups/[id] - Get signup by ID
  async GET(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const signup = await signupService.getById(id);
      if (!signup) {
        return new Response(JSON.stringify({ error: "Signup not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(signup), {
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

  // DELETE /api/signups/[id] - Delete signup
  async DELETE(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const success = await signupService.delete(id);
      if (!success) {
        return new Response(JSON.stringify({ error: "Signup not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Signup deleted" }), {
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
