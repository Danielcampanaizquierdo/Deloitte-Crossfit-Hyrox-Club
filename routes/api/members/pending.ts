import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../services/memberService.ts";
import { toPublicMembers } from "../../../types/Member.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  // Moderation queue. Unapproved profiles carry personal details nobody has
  // vetted yet, so this is admin-only.
  async GET(_req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(toPublicMembers(await memberService.getPending()));
  },
};
