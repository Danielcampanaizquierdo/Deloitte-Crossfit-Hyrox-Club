import { Handlers } from "$fresh/server.ts";
import { clearSession, revokeAdminSession } from "../../../lib/session.ts";
import { State } from "../../../types/State.ts";

interface LogoutDependencies {
  revoke?: (cookieHeader: string) => Promise<void>;
  clear?: () => string;
}

export function createAdminLogoutHandler(
  {
    revoke = revokeAdminSession,
    clear = clearSession,
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
      console.error("admin logout: could not revoke session", error);
      return Response.json(
        { error: "No se pudo revocar la sesión" },
        { status: 500, headers },
      );
    }
  };
}

const logout = createAdminLogoutHandler();

export const handler: Handlers<unknown, State> = {
  POST(req, _ctx) {
    return logout(req);
  },
};
