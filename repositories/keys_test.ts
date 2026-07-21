import { assertEquals } from "std/assert/mod.ts";
import { eventKey, signupEmailKey } from "./keys.ts";

Deno.test("keys use stable prefixes and normalized email", () => {
  assertEquals(eventKey("evt-1"), ["events", "evt-1"]);
  assertEquals(
    signupEmailKey("evt-1", "Athlete@Example.COM "),
    ["signups_by_event_email", "evt-1", "athlete@example.com"],
  );
});
