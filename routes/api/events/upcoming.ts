import { FreshContext } from "$fresh/server.ts";
import { errorMessage } from "../../../lib/errors.ts";
import { eventService } from "../../../services/eventService.ts";

export const handler = {
  // GET /api/events/upcoming - Get upcoming events
  async GET(_req: Request, _ctx: FreshContext) {
    try {
      const events = (await eventService.getUpcoming()).filter((event) =>
        event.approved
      );
      return new Response(JSON.stringify(events), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: errorMessage(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
