import { Handlers } from "$fresh/server.ts";
import { prService } from "../../../services/prService.ts";
import { State } from "../../../types/State.ts";
import { toPublicPR } from "../../../types/PR.ts";

export const handler: Handlers<unknown, State> = {
  async GET(_req, ctx) {
    const pr = await prService.getById(ctx.params.id);
    // A PR awaiting moderation is not public yet.
    if (!pr || (!pr.approved && !ctx.state.isAdmin)) {
      return Response.json({ error: "PR not found" }, { status: 404 });
    }
    return Response.json(toPublicPR(pr));
  },

  // An athlete may retract their own record; an admin may remove any. This was
  // open to anyone holding the id.
  async DELETE(_req, ctx) {
    const pr = await prService.getById(ctx.params.id);
    if (!pr) {
      return Response.json({ error: "PR not found" }, { status: 404 });
    }

    const isOwner = ctx.state.member?.email.toLowerCase() ===
      pr.memberEmail.toLowerCase();
    if (!ctx.state.isAdmin && !isOwner) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await prService.delete(ctx.params.id);
    return Response.json({ message: "PR deleted" });
  },
};
