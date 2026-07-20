import { FreshContext } from "$fresh/server.ts";
import { memberService } from "../../services/memberService.ts";

export const handler = {
  // GET /api/members - Get all approved members
  async GET(_req: Request, _ctx: FreshContext) {
    try {
      const url = new URL(_req.url);
      const search = url.searchParams.get("search") || "";
      const level = url.searchParams.get("level");
      const goal = url.searchParams.get("goal");

      if (search) {
        const members = await memberService.search(search, level || undefined, goal || undefined);
        return new Response(JSON.stringify(members), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const members = await memberService.getApproved();
      return new Response(JSON.stringify(members), {
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

  // POST /api/members - Create member
  async POST(req: Request, _ctx: FreshContext) {
    try {
      const data = await req.json();
      const member = await memberService.create(data);
      return new Response(JSON.stringify(member), {
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
