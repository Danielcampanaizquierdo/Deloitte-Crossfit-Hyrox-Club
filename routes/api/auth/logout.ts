import { Handlers } from "$fresh/server.ts";
import { clearMemberSession } from "../../../lib/session.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  POST(_req, _ctx) {
    return Response.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "set-cookie": clearMemberSession(),
        },
      },
    );
  },
};
