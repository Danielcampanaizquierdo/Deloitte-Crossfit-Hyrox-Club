// Movement catalogue shared by the PR form, the leaderboard and the API.
//
// A PR's numeric value is persisted in PR.weight for every metric (see
// types/PR.ts) — kilograms for "weight", whole seconds for "time", repetitions
// for "reps". PR.metric says how to read and rank that number; records written
// before metric existed have no value and fall back to "weight", which is what
// they always were.

/** Converts a `<input type="datetime-local">` value into a UTC instant.
 *
 * That input yields a bare wall-clock string ("2026-08-15T10:00") with no zone,
 * meaning "10:00 where the user is". Posting it raw let the *server* parse it,
 * and Deno Deploy runs in UTC — so an admin in Madrid scheduling 10:00 stored
 * 10:00Z, which every member then saw as 12:00. Converting here, in the
 * browser, is the only place the user's real timezone is known.
 *
 * Returns null for input that is not a usable datetime, so callers can reject
 * it rather than post an Invalid Date. */
export function localDateTimeToIso(value: string): string | null {
  if (!value) return null;
  // No trailing Z and no offset: the runtime reads this as local time, which
  // in the browser is exactly what the user typed.
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/** Formats a calendar-date value (a PR, WOD or result date) as the day that
 * was actually entered.
 *
 * `<input type="date">` yields "2026-08-15", which the spec parses as UTC
 * midnight. Rendering that with the viewer's local timezone shows the previous
 * day anywhere west of UTC, so these are formatted in UTC — the zone they were
 * stored in. Event dates are genuine instants and must NOT use this; they are
 * meant to shift with the viewer. */
export function formatCalendarDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  return new Date(value).toLocaleDateString("es-ES", {
    ...options,
    timeZone: "UTC",
  });
}

export type PRMetric = "weight" | "time" | "reps";

export type MovementCategory =
  | "Halterofilia"
  | "Gimnásticos"
  | "Benchmark"
  | "Cardio";

export interface MovementDef {
  name: string;
  metric: PRMetric;
  category: MovementCategory;
}

export const MOVEMENTS: MovementDef[] = [
  // Barbell — heavier is better.
  { name: "Clean & Jerk", metric: "weight", category: "Halterofilia" },
  { name: "Snatch", metric: "weight", category: "Halterofilia" },
  { name: "Clean", metric: "weight", category: "Halterofilia" },
  { name: "Deadlift", metric: "weight", category: "Halterofilia" },
  { name: "Back Squat", metric: "weight", category: "Halterofilia" },
  { name: "Front Squat", metric: "weight", category: "Halterofilia" },
  { name: "Overhead Press", metric: "weight", category: "Halterofilia" },
  { name: "Bench Press", metric: "weight", category: "Halterofilia" },
  { name: "Thruster", metric: "weight", category: "Halterofilia" },

  // Gymnastics — more reps is better.
  { name: "Max Pull-ups", metric: "reps", category: "Gimnásticos" },
  { name: "Max Muscle-ups", metric: "reps", category: "Gimnásticos" },
  { name: "Max HSPU", metric: "reps", category: "Gimnásticos" },
  { name: "Max Double Unders", metric: "reps", category: "Gimnásticos" },
  { name: "Max Toes-to-Bar", metric: "reps", category: "Gimnásticos" },

  // Named benchmarks — faster is better.
  { name: "Fran", metric: "time", category: "Benchmark" },
  { name: "Murph", metric: "time", category: "Benchmark" },
  { name: "Helen", metric: "time", category: "Benchmark" },
  { name: "Grace", metric: "time", category: "Benchmark" },

  // Machines and running — faster is better.
  { name: "500m Row", metric: "time", category: "Cardio" },
  { name: "1K Row", metric: "time", category: "Cardio" },
  { name: "2K Row", metric: "time", category: "Cardio" },
  { name: "1000m SkiErg", metric: "time", category: "Cardio" },
  { name: "5K Run", metric: "time", category: "Cardio" },
  { name: "1 Mile Run", metric: "time", category: "Cardio" },
  { name: "HYROX Full", metric: "time", category: "Cardio" },
];

const BY_NAME = new Map(MOVEMENTS.map((m) => [m.name, m]));

/** Metric for a movement name. Unknown movements are treated as weight, which
 * is what every record written before metric existed actually was. */
export function movementMetric(movement: string): PRMetric {
  return BY_NAME.get(movement)?.metric ?? "weight";
}

export function movementCategory(movement: string): MovementCategory {
  return BY_NAME.get(movement)?.category ?? "Halterofilia";
}

/** Time metrics rank ascending (a smaller number is a better PR); weight and
 * reps rank descending. */
export function isHigherBetter(metric: PRMetric): boolean {
  return metric !== "time";
}

/** Sorts best-first for the metric. Does not mutate the input. */
export function rankByMetric<T extends { weight: number }>(
  entries: T[],
  metric: PRMetric,
): T[] {
  const higherBetter = isHigherBetter(metric);
  return [...entries].sort((a, b) =>
    higherBetter ? b.weight - a.weight : a.weight - b.weight
  );
}

/** Renders a stored value for display: "92kg", "3:21", "42 reps". */
export function formatPRValue(value: number, metric: PRMetric): string {
  if (metric === "time") return formatSeconds(value);
  if (metric === "reps") return `${value} reps`;
  return `${value}kg`;
}

/** Short unit label used next to numeric inputs. */
export function metricUnit(metric: PRMetric): string {
  if (metric === "time") return "mm:ss";
  if (metric === "reps") return "reps";
  return "kg";
}

export function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.round(total));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Parses "mm:ss", "h:mm:ss" or a bare seconds count. Returns null when the
 * input is not a valid duration, so callers can reject it. */
export function parseTimeToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":");
  if (parts.length > 3) return null;

  const numbers = parts.map((p) => Number(p));
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) return null;

  // Only the leading component may exceed its base — "90:00" is 90 minutes.
  if (numbers.slice(1).some((n) => n >= 60)) return null;

  const total = numbers.reduce((acc, n) => acc * 60 + n, 0);
  return total > 0 ? Math.round(total) : null;
}

/** Turns raw form input into the number persisted in PR.weight. Returns null
 * when the value is unusable for the metric. */
export function parsePRValue(raw: string, metric: PRMetric): number | null {
  if (metric === "time") return parseTimeToSeconds(raw);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return metric === "reps" ? Math.round(value) : value;
}
