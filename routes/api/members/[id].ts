import { Handlers } from "$fresh/server.ts";
import { memberService } from "../../../services/memberService.ts";
import { toPublicMember } from "../../../types/Member.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async GET(_req, ctx) {
    const member = await memberService.getById(ctx.params.id);
    // Unapproved profiles are only visible to an admin; to everyone else they
    // do not exist yet.
    if (!member || (!member.approved && !ctx.state.isAdmin)) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }
    return Response.json(toPublicMember(member));
  },

  // A member may edit their own profile; an admin may edit anyone's. This
  // used to be open to anyone, which allowed self-approval and overwriting
  // another member's stored credentials.
  async PUT(req, ctx) {
    const isSelf = ctx.state.member?.id === ctx.params.id;
    if (!ctx.state.isAdmin && !isSelf) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    // Only these fields are accepted from a request. Spreading the body
    // straight into the update let a caller set approved, or replace
    // passwordHash/passwordSalt.
    const allowed: Record<string, unknown> = {};
    for (const field of ["name", "level", "goal", "location", "bio"]) {
      if (body[field] !== undefined) allowed[field] = body[field];
    }
    // Approval is a moderation decision, so only an admin may change it.
    if (ctx.state.isAdmin && typeof body.approved === "boolean") {
      allowed.approved = body.approved;
    }

    const member = await memberService.update(ctx.params.id, allowed);
    if (!member) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }
    return Response.json(toPublicMember(member));
  },

  async DELETE(_req, ctx) {
    const isSelf = ctx.state.member?.id === ctx.params.id;
    if (!ctx.state.isAdmin && !isSelf) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const success = await memberService.delete(ctx.params.id);
    if (!success) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }
    return Response.json({ message: "Member deleted" });
  },
};
