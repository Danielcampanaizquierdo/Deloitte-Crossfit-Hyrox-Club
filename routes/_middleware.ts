import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { verifyMemberSession, verifySession } from "../lib/session.ts";
import { memberService } from "../services/memberService.ts";
import { State } from "../types/State.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext<State>,
) {
  const cookieHeader = req.headers.get("cookie") ?? "";

  const [isAdmin, memberId] = await Promise.all([
    verifySession(cookieHeader),
    verifyMemberSession(cookieHeader),
  ]);

  ctx.state.isAdmin = isAdmin;

  // The session only carries an id; the member is loaded fresh on every
  // request so an approval revoked (or an account deleted) takes effect
  // immediately rather than lingering until the cookie expires.
  let member = memberId ? await memberService.getById(memberId) : null;
  if (member && !member.approved) member = null;
  ctx.state.member = member;

  return ctx.next();
}
