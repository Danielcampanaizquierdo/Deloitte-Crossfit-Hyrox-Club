import { Handlers } from "$fresh/server.ts";
import { signupService } from "../../../../services/signupService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(req, ctx) {
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { memberEmail } = body;
    if (!memberEmail) {
      return Response.json({ error: "Email requerido" }, { status: 400 });
    }

    // Knowing the email used to book is what authorises the cancellation —
    // the same identity the booking was made under. This frees the spot and
    // decrements the event's attendee count atomically.
    const cancelled = await signupService.cancelByEmail(
      ctx.params.id,
      memberEmail,
    );
    if (!cancelled) {
      return Response.json(
        { error: "No encontramos ninguna reserva con ese email" },
        { status: 404 },
      );
    }

    return Response.json({ success: true });
  },
};
