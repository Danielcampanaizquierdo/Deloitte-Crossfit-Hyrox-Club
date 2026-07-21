import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../services/memberService.ts";
import { toDirectoryMembers } from "../../../types/Member.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  // Approved members only, optionally filtered by ?search=, ?level= and
  // ?goal=. Credentials are stripped before anything leaves the server.
  async GET(req, _ctx) {
    const params = new URL(req.url).searchParams;
    const search = params.get("search") ?? "";
    const level = params.get("level") ?? undefined;
    const goal = params.get("goal") ?? undefined;
    return Response.json(
      toDirectoryMembers(await memberService.search(search, level, goal)),
    );
  },

  // Registration moved to POST /api/auth/register, which requires a password.
  // Leaving this open created accounts with no credentials at all, which is
  // an authentication bypass now that actions are gated on a member session.
  POST(_req, _ctx) {
    return Response.json(
      { error: "Usa POST /api/auth/register para crear una cuenta" },
      { status: 410 },
    );
  },
};
