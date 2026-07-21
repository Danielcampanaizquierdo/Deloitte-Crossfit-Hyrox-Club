import { FreshContext } from "$fresh/server.ts";
import { errorMessage } from "../../../lib/errors.ts";
import { memberService } from "../../../services/memberService.ts";

export const handler = {
  // GET /api/members/pending - Get pending members (admin)
  async GET(_req: Request, _ctx: FreshContext) {
    try {
      const members = await memberService.getPending();
      return new Response(JSON.stringify(members), {
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
