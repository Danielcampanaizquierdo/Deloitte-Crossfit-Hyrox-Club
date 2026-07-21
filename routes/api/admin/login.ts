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
      return Response.json(
        { error: "El servidor no tiene ADMIN_PASSCODE configurado." },
        { status: 500 },
      );
    }

    if (body.passcode !== adminPasscode) {
      return Response.json({ error: "Passcode incorrecto" }, { status: 401 });
    }

    // Issuing the cookie can fail on a misconfigured SESSION_SECRET, which
    // happens *after* the passcode matched. Letting that throw produced a bare
    // 500 that the UI reported as "passcode incorrecto", sending admins to
    // re-check a passcode that was right all along.
    try {
      const cookie = await createSession();
      return Response.json({ success: true }, {
        headers: { "set-cookie": cookie },
      });
    } catch (err) {
      console.error("admin login: could not create session", err);
      return Response.json(
        {
          error:
            "Passcode correcto, pero el servidor no puede crear la sesión: " +
            "revisa SESSION_SECRET (mínimo 32 caracteres).",
        },
        { status: 500 },
      );
    }
  },
};
