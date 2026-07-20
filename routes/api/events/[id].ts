import { FreshContext } from "$fresh/server.ts";
import { eventService } from "../../../services/eventService.ts";

export const handler = {
  // GET /api/events/[id] - Get event by ID
  async GET(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const event = await eventService.getById(id);
      if (!event) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(event), {
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

  // PUT /api/events/[id] - Update event
  async PUT(req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const data = await req.json();
      const event = await eventService.update(id, data);
      if (!event) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(event), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  // DELETE /api/events/[id] - Delete event
  async DELETE(_req: Request, ctx: FreshContext) {
    try {
      const { id } = ctx.params;
      const success = await eventService.delete(id);
      if (!success) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Event deleted" }), {
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
