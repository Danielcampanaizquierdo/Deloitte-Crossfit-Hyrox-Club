import { Handlers } from "$fresh/server.ts";
import { signupService } from "../../../../services/signupService.ts";
import { State } from "../../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async GET(_req, ctx) {
    const signups = await signupService.getByEventId(ctx.params.id);
    const ordered = signups.sort((a, b) =>
      new Date(a.signedUpAt).getTime() - new Date(b.signedUpAt).getTime()
    );

    // Emails and free-text comments belong to the athlete who wrote them; the
    // public roster is names and booking order only. Admins moderating the
    // event get the contact details.
    if (!ctx.state.isAdmin) {
      return Response.json(
        ordered.map((s) => ({
          id: s.id,
          memberName: s.memberName,
          signedUpAt: s.signedUpAt,
        })),
      );
    }

    return Response.json(ordered);
  },
};
