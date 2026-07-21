import { Handlers } from "$fresh/server.ts";
import { createSession } from "../../../lib/session.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(req, _ctx) {
    let body: { passcode?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    if (!body.passcode) {
      return Response.json({ error: "Passcode requerido" }, { status: 400 });
    }

    const adminPasscode = Deno.env.get("ADMIN_PASSCODE") ?? "";
    if (!adminPasscode) {
      return Response.json({ error: "ADMIN_PASSCODE not configured" }, { status: 500 });
    }

    if (body.passcode !== adminPasscode) {
      return Response.json({ error: "Passcode incorrecto" }, { status: 401 });
    }

    const cookie = await createSession();
    return Response.json({ success: true }, {
      headers: { "set-cookie": cookie },
    });
  },
};
