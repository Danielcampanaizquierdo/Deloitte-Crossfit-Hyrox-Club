import { FreshContext } from "$fresh/server.ts";
import { memberService } from "../../../../../services/memberService.ts";

export const handler = {
  // POST /api/admin/members/[id]/approve - Approve member
  async POST(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const member = await memberService.approve(id);
      if (!member) {
        return new Response(JSON.stringify({ error: "Member not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Member approved", member }), {
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
