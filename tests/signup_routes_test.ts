// POST /api/signups is retired.
//
// It originally answered 201 with a literal `null` body for a non-existent
// eventId, which a previous fix turned into a 404. It is now gone entirely: it
// took the booker's name and email straight from the request, so anyone could
// reserve a place in another member's name. Booking goes through
// POST /api/events/[id]/signup, which derives identity from the session.
//
// This test pins the endpoint as retired so it cannot quietly come back as an
// unauthenticated way to create signups.

import { assert, assertEquals } from "std/assert/mod.ts";
import { handler } from "../routes/api/signups/index.ts";

Deno.test("POST /api/signups is gone and never creates a signup", async () => {
  const post = handler.POST;
  if (!post) throw new Error("POST handler is required");

  const request = new Request("http://localhost/api/signups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: "evt-does-not-exist-regression-test",
      memberName: "Impostor",
      memberEmail: "victim@example.com",
    }),
  });

  const response = await post(
    request,
    { state: { isAdmin: false, member: null } } as never,
  );
  const body = await response.json();

  assertEquals(response.status, 410);
  assert(body !== null, "response body must not be literal null");
  // Points callers at the authenticated route rather than failing silently.
  assert(
    String(body.error).includes("/api/events/"),
    "the error should name the replacement endpoint",
  );
});
