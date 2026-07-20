import { FreshContext } from "$fresh/server.ts";
import { eventService } from "../../../services/eventService.ts";

export const handler = {
  // GET /api/events/upcoming - Get upcoming events
  async GET(_req: Request, _ctx: FreshContext) {
    try {
      const events = await eventService.getUpcoming();
      return new Response(JSON.stringify(events), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
