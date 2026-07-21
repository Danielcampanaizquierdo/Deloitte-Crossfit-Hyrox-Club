import { assertEquals } from "std/assert/mod.ts";
import { handler } from "../routes/index.tsx";

Deno.test("anonymous page data never contains moderation queues", async () => {
  const capture: { value: Record<string, unknown> | null } = { value: null };
  const context = {
    state: { isAdmin: false, member: null },
    render(value: Record<string, unknown>) {
      capture.value = value;
      return new Response("ok");
    },
  };

  const response = await handler.GET!(
    new Request("http://localhost/"),
    context as never,
  );

  assertEquals(response.status, 200);
  if (!capture.value) throw new Error("route did not render page data");
  assertEquals(capture.value.sessionMember, null);
  for (
    const key of [
      "pendingMembers",
      "pendingPRs",
      "pendingEvents",
      "pendingResults",
      "pendingScores",
    ]
  ) {
    assertEquals(
      capture.value[key],
      [],
      `${key} must not be serialized publicly`,
    );
  }
});
