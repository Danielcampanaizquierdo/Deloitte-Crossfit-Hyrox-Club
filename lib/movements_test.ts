import { assertEquals } from "std/assert/mod.ts";
import {
  formatPRValue,
  formatSeconds,
  isHigherBetter,
  movementMetric,
  parsePRValue,
  parseTimeToSeconds,
  rankByMetric,
} from "./movements.ts";

Deno.test("movementMetric falls back to weight for movements it does not know", () => {
  assertEquals(movementMetric("Snatch"), "weight");
  assertEquals(movementMetric("Fran"), "time");
  assertEquals(movementMetric("Max Pull-ups"), "reps");
  // Records written before the catalogue existed carry arbitrary movement
  // names and were always kilograms.
  assertEquals(movementMetric("Some Legacy Movement"), "weight");
});

Deno.test("time PRs rank ascending, weight and reps rank descending", () => {
  assertEquals(isHigherBetter("time"), false);
  assertEquals(isHigherBetter("weight"), true);
  assertEquals(isHigherBetter("reps"), true);

  const entries = [{ weight: 300 }, { weight: 180 }, { weight: 240 }];

  assertEquals(rankByMetric(entries, "time").map((e) => e.weight), [
    180,
    240,
    300,
  ]);
  assertEquals(rankByMetric(entries, "weight").map((e) => e.weight), [
    300,
    240,
    180,
  ]);
});

Deno.test("rankByMetric does not mutate its input", () => {
  const entries = [{ weight: 100 }, { weight: 200 }];
  rankByMetric(entries, "time");
  assertEquals(entries.map((e) => e.weight), [100, 200]);
});

Deno.test("parseTimeToSeconds accepts mm:ss and h:mm:ss", () => {
  assertEquals(parseTimeToSeconds("3:21"), 201);
  assertEquals(parseTimeToSeconds("1:02:03"), 3723);
  // A bare number is read as seconds.
  assertEquals(parseTimeToSeconds("45"), 45);
  // The leading component may exceed its base: 90 minutes flat.
  assertEquals(parseTimeToSeconds("90:00"), 5400);
});

Deno.test("parseTimeToSeconds rejects input that is not a duration", () => {
  assertEquals(parseTimeToSeconds(""), null);
  assertEquals(parseTimeToSeconds("abc"), null);
  assertEquals(parseTimeToSeconds("-1:00"), null);
  assertEquals(parseTimeToSeconds("0:00"), null);
  // Trailing components are bounded by 60.
  assertEquals(parseTimeToSeconds("3:75"), null);
  assertEquals(parseTimeToSeconds("1:2:3:4"), null);
});

Deno.test("formatSeconds drops the hour component below one hour", () => {
  assertEquals(formatSeconds(201), "3:21");
  assertEquals(formatSeconds(59), "0:59");
  assertEquals(formatSeconds(3723), "1:02:03");
});

Deno.test("formatPRValue renders each metric in its own unit", () => {
  assertEquals(formatPRValue(92.5, "weight"), "92.5kg");
  assertEquals(formatPRValue(201, "time"), "3:21");
  assertEquals(formatPRValue(42, "reps"), "42 reps");
});

Deno.test("parsePRValue converts raw form input per metric", () => {
  assertEquals(parsePRValue("3:21", "time"), 201);
  assertEquals(parsePRValue("92.5", "weight"), 92.5);
  // Reps are whole numbers.
  assertEquals(parsePRValue("42.6", "reps"), 43);
});

Deno.test("parsePRValue rejects non-positive and non-numeric values", () => {
  assertEquals(parsePRValue("0", "weight"), null);
  assertEquals(parsePRValue("-5", "weight"), null);
  assertEquals(parsePRValue("heavy", "weight"), null);
  assertEquals(parsePRValue("not a time", "time"), null);
});
