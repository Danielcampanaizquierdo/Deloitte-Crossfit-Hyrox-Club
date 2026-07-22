import { Handlers } from "$fresh/server.ts";
import {
  clearMemberSession,
  revokeMemberSession,
} from "../../../lib/session.ts";
import { State } from "../../../types/State.ts";

interface LogoutDependencies {
  revoke?: (cookieHeader: string) => Promise<void>;
  clear?: () => string;
}

export function createMemberLogoutHandler(
  {
    revoke = revokeMemberSession,
    clear = clearMemberSession,
  }: LogoutDependencies = {},
): (req: Request) => Promise<Response> {
  return async (req) => {
    const headers = {
      "Cache-Control": "no-store",
      "set-cookie": clear(),
    };
    try {
      await revoke(req.headers.get("cookie") ?? "");
      return Response.json({ success: true }, { headers });
    } catch (error) {
      console.error("member logout: could not revoke session", error);
      return Response.json(
        { error: "No se pudo revocar la sesión" },
        { status: 500, headers },
      );
    }
  };
}

const logout = createMemberLogoutHandler();

export const handler: Handlers<unknown, State> = {
  POST(req, _ctx) {
    return logout(req);
  },
};
