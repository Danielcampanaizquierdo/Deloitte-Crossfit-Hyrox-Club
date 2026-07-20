import { FreshContext } from "$fresh/server.ts";
import { memberService } from "../../../services/memberService.ts";

export const handler = {
  // GET /api/members/[id] - Get member by ID
  async GET(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const member = await memberService.getById(id);
      if (!member) {
        return new Response(JSON.stringify({ error: "Member not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(member), {
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

  // PUT /api/members/[id] - Update member
  async PUT(req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const data = await req.json();
      const member = await memberService.update(id, data);
      if (!member) {
        return new Response(JSON.stringify({ error: "Member not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(member), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  // DELETE /api/members/[id] - Delete member
  async DELETE(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const success = await memberService.delete(id);
      if (!success) {
        return new Response(JSON.stringify({ error: "Member not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Member deleted" }), {
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
