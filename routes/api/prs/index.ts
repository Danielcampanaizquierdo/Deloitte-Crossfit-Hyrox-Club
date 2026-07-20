import { FreshContext } from "$fresh/server.ts";
import { prService } from "../../services/prService.ts";

export const handler = {
  // GET /api/prs - Get all approved PRs
  async GET(_req: Request, _ctx: FreshContext) {
    try {
      const url = new URL(_req.url);
      const movement = url.searchParams.get("movement");

      if (movement) {
        const prs = await prService.getByMovement(movement);
        return new Response(JSON.stringify(prs), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const prs = await prService.getApproved();
      return new Response(JSON.stringify(prs), {
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

  // POST /api/prs - Create PR
  async POST(req: Request, _ctx: FreshContext) {
    try {
      const data = await req.json();
      const pr = await prService.create(data);
      return new Response(JSON.stringify(pr), {
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
