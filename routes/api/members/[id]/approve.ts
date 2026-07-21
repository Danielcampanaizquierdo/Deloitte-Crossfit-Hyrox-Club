import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../../services/memberService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const member = await memberService.approve(ctx.params.id);
    if (!member) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(member);
  },
};
