// Regression test for the Task 6 finding: POST /api/signups used to respond
// 201 with a literal `null` body when the given eventId didn't reference a
// real event, because signupService.create() (via signupRepository.create())
// returns null for a missing event instead of throwing. This route now
// checks for that null result and returns 404 with an error body instead,
// matching the sibling route routes/api/events/[id]/signup.ts's pattern of
// pre-checking event existence.

import { assert, assertEquals } from "std/assert/mod.ts";
import { handler } from "../routes/api/signups/index.ts";

Deno.test("POST /api/signups returns 404 (not 201 with a null body) when eventId does not exist", async () => {
  const post = handler.POST;
  if (!post) throw new Error("POST handler is required");

  const request = new Request("http://localhost/api/signups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: "evt-does-not-exist-regression-test",
      memberName: "Regression Tester",
      memberEmail: "regression-tester@example.com",
    }),
  });

  const response = await post(request, {} as never);
  const body = await response.json();

  assertEquals(response.status, 404);
  assert(body !== null, "response body must not be literal null");
  assertEquals(body, { error: "Event not found" });
});
