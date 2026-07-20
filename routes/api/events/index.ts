import { FreshContext } from "$fresh/server.ts";
import { eventService } from "../../services/eventService.ts";

export const handler = {
  // GET /api/events - Get all events
  async GET(_req: Request, _ctx: FreshContext) {
    try {
      const events = await eventService.getAll();
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

  // POST /api/events - Create event
  async POST(req: Request, _ctx: FreshContext) {
    try {
      const data = await req.json();
      const event = await eventService.create(data);
      return new Response(JSON.stringify(event), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
