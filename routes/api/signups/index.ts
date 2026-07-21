import { FreshContext } from "$fresh/server.ts";
import { signupService } from "../../../services/signupService.ts";
import { eventService } from "../../../services/eventService.ts";

export const handler = {
  // GET /api/signups - Get all signups
  async GET(_req: Request, _ctx: FreshContext) {
    try {
      const url = new URL(_req.url);
      const eventId = url.searchParams.get("eventId");

      if (eventId) {
        const signups = await signupService.getByEventId(eventId);
        return new Response(JSON.stringify(signups), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const signups = await signupService.getAll();
      return new Response(JSON.stringify(signups), {
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

  // POST /api/signups - Create signup
  async POST(req: Request, _ctx: FreshContext) {
    try {
      const data = await req.json();
      const signup = await signupService.create(data);

      if (!signup) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(signup), {
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
