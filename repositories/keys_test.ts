import { assertEquals } from "std/assert/mod.ts";
import {
  eventKey,
  signupEmailKey,
  signupEventMemberKey,
  wodScoreMemberKey,
} from "./keys.ts";

Deno.test("keys use stable prefixes and normalized email", () => {
  assertEquals(eventKey("evt-1"), ["events", "evt-1"]);
  assertEquals(
    signupEmailKey("evt-1", "Athlete@Example.COM "),
    ["signups_by_event_email", "evt-1", "athlete@example.com"],
  );
  assertEquals(signupEventMemberKey("evt-1", "mbr-1"), [
    "signups_by_event_member",
    "evt-1",
    "mbr-1",
  ]);
  assertEquals(wodScoreMemberKey("wod-1", "mbr-1"), [
    "wod_scores_by_wod_member",
    "wod-1",
    "mbr-1",
  ]);
});
