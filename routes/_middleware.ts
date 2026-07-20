import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { verifySession } from "../lib/session.ts";
import { State } from "../types/State.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext<State>,
) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  ctx.state.isAdmin = await verifySession(cookieHeader);
  return ctx.next();
}
