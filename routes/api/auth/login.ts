import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../services/memberService.ts";
import { verifyPassword } from "../../../lib/password.ts";
import { createMemberSession } from "../../../lib/session.ts";
import { toPublicMember } from "../../../types/Member.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(req, _ctx) {
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { email, password } = body;
    if (!email || !password) {
      return Response.json(
        { error: "Email y contraseña requeridos" },
        { status: 400 },
      );
    }

    const member = await memberService.getByEmail(email);

    // Always run the verification, even when the email is unknown, so a
    // missing account and a wrong password take the same time and return the
    // same message. Otherwise this endpoint reveals which emails are members.
    const valid = await verifyPassword(password, {
      hash: member?.passwordHash,
      salt: member?.passwordSalt,
    });

    if (!member || !valid) {
      return Response.json(
        { error: "Email o contraseña incorrectos" },
        { status: 401 },
      );
    }

    if (!member.approved) {
      return Response.json(
        { error: "Tu cuenta todavía está pendiente de aprobación" },
        { status: 403 },
      );
    }

    return Response.json(
      { member: toPublicMember(member) },
      { headers: { "set-cookie": await createMemberSession(member.id) } },
    );
  },
};
