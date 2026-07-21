import { Handlers } from "$fresh/server.ts";
import { signupService } from "../../../services/signupService.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async GET(_req, ctx) {
    const signup = await signupService.getById(ctx.params.id);
    if (!signup) {
      return Response.json({ error: "Signup not found" }, { status: 404 });
    }
    // A booking record carries the booker's email and comments, so only its
    // owner or an admin may read it.
    const isOwner = ctx.state.member?.email.toLowerCase() ===
      signup.memberEmail.toLowerCase();
    if (!ctx.state.isAdmin && !isOwner) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return Response.json(signup);
  },

  async DELETE(_req, ctx) {
    const signup = await signupService.getById(ctx.params.id);
    if (!signup) {
      return Response.json({ error: "Signup not found" }, { status: 404 });
    }

    // Anyone could previously cancel any reservation by id.
    const isOwner = ctx.state.member?.email.toLowerCase() ===
      signup.memberEmail.toLowerCase();
    if (!ctx.state.isAdmin && !isOwner) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await signupService.delete(ctx.params.id);
    return Response.json({ message: "Signup deleted" });
  },
};
