import { assertEquals } from "std/assert/mod.ts";
import { isFull, spotsLeft } from "./Event.ts";
import { rankWodScores, wodHigherIsBetter } from "./Wod.ts";

Deno.test("an event without a capacity is uncapped", () => {
  // Every event created before capacity existed looks like this.
  assertEquals(spotsLeft({ attendees: 12 }), null);
  assertEquals(spotsLeft({ attendees: 12, capacity: 0 }), null);
  assertEquals(isFull({ attendees: 999 }), false);
});

Deno.test("spotsLeft never reports a negative number of spots", () => {
  assertEquals(spotsLeft({ attendees: 8, capacity: 20 }), 12);
  assertEquals(spotsLeft({ attendees: 20, capacity: 20 }), 0);
  // Capacity lowered below the bookings already taken.
  assertEquals(spotsLeft({ attendees: 25, capacity: 20 }), 0);
  assertEquals(isFull({ attendees: 25, capacity: 20 }), true);
});

Deno.test("time-scored WODs rank fastest first", () => {
  assertEquals(wodHigherIsBetter("time"), false);
  assertEquals(wodHigherIsBetter("reps"), true);
  assertEquals(wodHigherIsBetter("rounds"), true);

  const scores = [
    { value: 300, scaled: false },
    { value: 180, scaled: false },
  ];
  assertEquals(rankWodScores(scores, "time").map((s) => s.value), [180, 300]);
  assertEquals(rankWodScores(scores, "reps").map((s) => s.value), [300, 180]);
});

Deno.test("Rx scores outrank scaled scores regardless of value", () => {
  const scores = [
    { value: 500, scaled: true },
    { value: 100, scaled: false },
  ];
  const ranked = rankWodScores(scores, "reps");
  assertEquals(ranked[0].value, 100);
  assertEquals(ranked[0].scaled, false);
});

Deno.test("rankWodScores does not mutate its input", () => {
  const scores = [{ value: 100, scaled: false }, { value: 200, scaled: false }];
  rankWodScores(scores, "reps");
  assertEquals(scores.map((s) => s.value), [100, 200]);
});
