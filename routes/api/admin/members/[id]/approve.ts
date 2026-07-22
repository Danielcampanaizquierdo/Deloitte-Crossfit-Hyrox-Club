import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../../../services/memberService.ts";
import { State } from "../../../../../types/State.ts";
import { toPublicMember } from "../../../../../types/Member.ts";

export const handler: Handlers<unknown, State> = {
  // POST /api/admin/members/[id]/approve - Approve member
  async POST(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const { id } = ctx.params;
      const member = await memberService.approve(id);
      if (!member) {
        return new Response(JSON.stringify({ error: "Member not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          message: "Member approved",
          member: toPublicMember(member),
        }),
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
