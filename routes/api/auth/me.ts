import { Handlers } from "$fresh/server.ts";
import { toPublicMember } from "../../../types/Member.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  GET(_req, ctx) {
    if (!ctx.state.member) {
      return Response.json({ member: null }, { status: 200 });
    }
    return Response.json({ member: toPublicMember(ctx.state.member) });
  },
};
