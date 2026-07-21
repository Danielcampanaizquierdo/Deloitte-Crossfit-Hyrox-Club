// Seeds a local instance with representative club data.
//
// Usage:
//   deno run -A scripts/seed.ts [baseUrl]
//
// Refuses to run against anything but localhost unless SEED_ALLOW_REMOTE=1 is
// set, so it cannot be pointed at the production deployment by accident.

const baseUrl = Deno.args[0] ?? "http://localhost:8000";
const passcode = Deno.env.get("ADMIN_PASSCODE") ?? "ClubAdmin2026";

// Every seeded athlete gets the same password so the demo data is actually
// usable: you can log in as any of them and see the member view.
const DEMO_PASSWORD = Deno.env.get("SEED_PASSWORD") ?? "ClubDemo2026";

const host = new URL(baseUrl).hostname;
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(host) &&
  Deno.env.get("SEED_ALLOW_REMOTE") !== "1"
) {
  console.error(
    `Refusing to seed ${baseUrl}: not localhost. Set SEED_ALLOW_REMOTE=1 to override.`,
  );
  Deno.exit(1);
}

let cookie = "";

async function api(
  path: string,
  body?: unknown,
  method = "POST",
  asCookie?: string,
): Promise<Response> {
  const auth = asCookie ?? cookie;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { cookie: auth } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok && res.status !== 409) {
    console.warn(`  ! ${method} ${path} -> ${res.status}`);
  }
  return res;
}

/** Logs in as a seeded athlete and returns their session cookie, so their
 * bookings, PRs and WOD scores are made under their own identity — the same
 * path a real member takes. */
async function loginAs(email: string): Promise<string | null> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  if (!res.ok) {
    console.warn(`  ! login ${email} -> ${res.status}`);
    return null;
  }
  await res.body?.cancel();
  return res.headers.get("set-cookie")?.split(";")[0] ?? null;
}

function daysFromNow(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ── Admin session ───────────────────────────────────────────────────────
const login = await fetch(`${baseUrl}/api/admin/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ passcode }),
});
if (!login.ok) {
  console.error(
    `Admin login failed (${login.status}). Is ADMIN_PASSCODE set on the server?`,
  );
  Deno.exit(1);
}
cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
console.log("✓ admin session");

// ── Events ──────────────────────────────────────────────────────────────
const events = [
  {
    title: "Entreno DEKA",
    date: daysFromNow(3, 10, 0),
    location: "Box Madrid Centro",
    description:
      "Sesión específica DEKA: transiciones, ritmo y trabajo de zona media.",
    type: "hyrox",
    capacity: 16,
  },
  {
    title: "HYROX Team Session",
    date: daysFromNow(7, 9, 30),
    location: "Casa de Campo",
    description:
      "Simulacro por parejas: running, sled push y wall balls a ritmo de competición.",
    type: "hyrox",
    capacity: 12,
  },
  {
    title: "Open Box Sábado",
    date: daysFromNow(10, 11, 0),
    location: "Box Madrid Centro",
    description: "Entrenamiento libre con coach de guardia. Abierto a invitados.",
    type: "open",
  },
  {
    title: "Cena de equipo",
    date: daysFromNow(14, 21, 0),
    location: "La Latina",
    description: "Cerramos el trimestre. Trae hambre, no zapatillas.",
    type: "social",
    capacity: 30,
  },
  {
    title: "Clasificatorio interno",
    date: daysFromNow(-12, 10, 0),
    location: "Box Madrid Centro",
    description: "Tres pruebas para elegir el equipo del próximo HYROX.",
    type: "competition",
    capacity: 20,
  },
];

const eventIds: string[] = [];
for (const ev of events) {
  const res = await api("/api/events", ev);
  if (res.ok) eventIds.push((await res.json()).id);
}
console.log(`✓ ${eventIds.length} events`);

// ── Members ─────────────────────────────────────────────────────────────
const members = [
  ["Lucía Fernández", "lucia@example.com", "advanced", "hyrox", "Madrid",
    "Compitiendo en HYROX desde 2024. Objetivo: sub 70 en individual."],
  ["Carlos Ibáñez", "carlos@example.com", "advanced", "crossfit", "Madrid",
    "Halterofilia y gimnásticos. Buscando el primer muscle-up estricto."],
  ["Marta Ruiz", "marta@example.com", "intermediate", "hyrox", "Madrid",
    "Vengo del atletismo, aprendiendo a mover hierro."],
  ["Diego Santos", "diego@example.com", "intermediate", "crossfit", "Alcobendas", ""],
  ["Ana Molina", "ana@example.com", "beginner", "general", "Madrid",
    "Empecé hace tres meses y ya no falto un día."],
  ["Javier Peña", "javier@example.com", "advanced", "crossfit", "Getafe", ""],
  ["Sofía Navarro", "sofia@example.com", "intermediate", "general", "Madrid", ""],
  ["Pablo Herrera", "pablo@example.com", "beginner", "hyrox", "Leganés", ""],
];

const memberIds: string[] = [];
const memberEmails: string[] = [];
for (const [name, email, level, goal, location, bio] of members) {
  const res = await api("/api/auth/register", {
    name,
    email,
    password: DEMO_PASSWORD,
    level,
    goal,
    location,
    bio: bio || undefined,
  });
  if (res.ok) {
    memberIds.push((await res.json()).member.id);
    memberEmails.push(email);
  }
}
// Approve all but the last two, so the moderation queue is not empty. Only
// approved accounts can log in.
const approvedEmails: string[] = [];
for (const [i, id] of memberIds.slice(0, -2).entries()) {
  await api(`/api/members/${id}/approve`);
  approvedEmails.push(memberEmails[i]);
}
console.log(`✓ ${memberIds.length} members (${approvedEmails.length} approved)`);

// One session per approved athlete: everything below is created as them.
const sessions = new Map<string, string>();
for (const email of approvedEmails) {
  const session = await loginAs(email);
  if (session) sessions.set(email, session);
}
console.log(`✓ ${sessions.size} member sessions`);

// ── PRs ─────────────────────────────────────────────────────────────────
const prs: [string, string, string, number][] = [
  ["Lucía Fernández", "lucia@example.com", "Deadlift", 145],
  ["Carlos Ibáñez", "carlos@example.com", "Deadlift", 210],
  ["Marta Ruiz", "marta@example.com", "Deadlift", 120],
  ["Javier Peña", "javier@example.com", "Deadlift", 185],
  ["Diego Santos", "diego@example.com", "Deadlift", 160],
  ["Carlos Ibáñez", "carlos@example.com", "Clean & Jerk", 125],
  ["Lucía Fernández", "lucia@example.com", "Clean & Jerk", 82],
  ["Javier Peña", "javier@example.com", "Clean & Jerk", 110],
  ["Carlos Ibáñez", "carlos@example.com", "Snatch", 98],
  ["Lucía Fernández", "lucia@example.com", "Snatch", 64],
  ["Carlos Ibáñez", "carlos@example.com", "Back Squat", 180],
  ["Marta Ruiz", "marta@example.com", "Back Squat", 105],
  ["Sofía Navarro", "sofia@example.com", "Back Squat", 95],
  // Time-scored: stored in seconds, shown as mm:ss, faster ranks first.
  ["Lucía Fernández", "lucia@example.com", "Fran", 181],
  ["Carlos Ibáñez", "carlos@example.com", "Fran", 164],
  ["Marta Ruiz", "marta@example.com", "Fran", 245],
  ["Diego Santos", "diego@example.com", "Fran", 208],
  ["Lucía Fernández", "lucia@example.com", "5K Run", 1245],
  ["Marta Ruiz", "marta@example.com", "5K Run", 1180],
  ["Ana Molina", "ana@example.com", "5K Run", 1620],
  ["Lucía Fernández", "lucia@example.com", "2K Row", 445],
  ["Javier Peña", "javier@example.com", "2K Row", 421],
  // Rep-scored.
  ["Carlos Ibáñez", "carlos@example.com", "Max Pull-ups", 32],
  ["Javier Peña", "javier@example.com", "Max Pull-ups", 27],
  ["Lucía Fernández", "lucia@example.com", "Max Pull-ups", 18],
  ["Sofía Navarro", "sofia@example.com", "Max Double Unders", 145],
  ["Diego Santos", "diego@example.com", "Max Double Unders", 92],
];

const prIds: string[] = [];
for (const [, memberEmail, movement, weight] of prs) {
  // Attribution now comes from the session, so the PR is filed as whoever is
  // logged in rather than whatever name the request claims.
  const session = sessions.get(memberEmail);
  if (!session) continue;
  const res = await api("/api/prs", {
    movement,
    weight,
    date: daysFromNow(-Math.floor(Math.random() * 120) - 1).slice(0, 10),
  }, "POST", session);
  if (res.ok) prIds.push((await res.json()).id);
}
// Leave the last three pending so the admin queue has something in it.
for (const id of prIds.slice(0, -3)) {
  await api(`/api/prs/${id}/approve`);
}
console.log(`✓ ${prIds.length} PRs (${prIds.length - 3} approved)`);

// ── WODs ────────────────────────────────────────────────────────────────
const wods = [
  {
    name: "Fran",
    date: daysFromNow(-1).slice(0, 10),
    format: "for_time",
    description: "21-15-9\nThrusters 43/30 kg\nPull-ups",
    scoreType: "time",
    timeCapMinutes: 10,
    scores: [
      ["Carlos Ibáñez", "carlos@example.com", "2:44", false],
      ["Lucía Fernández", "lucia@example.com", "3:01", false],
      ["Diego Santos", "diego@example.com", "3:28", false],
      ["Ana Molina", "ana@example.com", "4:52", true],
    ],
  },
  {
    name: "Cindy",
    date: daysFromNow(-4).slice(0, 10),
    format: "amrap",
    description: "AMRAP 20 min\n5 Pull-ups\n10 Push-ups\n15 Air squats",
    scoreType: "rounds",
    timeCapMinutes: 20,
    scores: [
      ["Javier Peña", "javier@example.com", 26, false],
      ["Carlos Ibáñez", "carlos@example.com", 24, false],
      ["Marta Ruiz", "marta@example.com", 19, false],
      ["Sofía Navarro", "sofia@example.com", 22, true],
    ],
  },
  {
    name: "Sled & Ski",
    date: daysFromNow(-7).slice(0, 10),
    format: "hyrox",
    description:
      "4 rondas\n50 m Sled push 100 kg\n500 m SkiErg\n20 Wall balls 9/6 kg",
    scoreType: "time",
    timeCapMinutes: 35,
    scores: [
      ["Lucía Fernández", "lucia@example.com", "22:14", false],
      ["Marta Ruiz", "marta@example.com", "25:03", false],
      ["Pablo Herrera", "pablo@example.com", "29:40", true],
    ],
  },
];

let scoreCount = 0;
for (const { scores, ...wod } of wods) {
  const res = await api("/api/wods", wod);
  if (!res.ok) continue;
  const created = await res.json();
  for (const [, memberEmail, value, scaled] of scores) {
    const session = sessions.get(memberEmail as string);
    if (!session) continue;
    const scoreRes = await api(`/api/wods/${created.id}/scores`, {
      value,
      scaled,
    }, "POST", session);
    if (scoreRes.ok) {
      const score = await scoreRes.json();
      // Leave one score pending per WOD for the moderation queue.
      if (memberEmail !== "ana@example.com" && memberEmail !== "pablo@example.com") {
        await api(`/api/wod-scores/${score.id}/approve`);
      }
      scoreCount++;
    }
  }
}
console.log(`✓ ${wods.length} WODs, ${scoreCount} scores`);

// ── Competition results ─────────────────────────────────────────────────
const results = [
  {
    name: "HYROX Madrid 2026",
    date: daysFromNow(-35).slice(0, 10),
    description:
      "Cinco atletas del club en individual y dos parejas. Lucía firmó un top-20 en su categoría y Carlos bajó de 80 minutos por primera vez.",
  },
  {
    name: "CrossFit Open 26.1",
    date: daysFromNow(-75).slice(0, 10),
    description:
      "Participación récord: 14 inscritos. El box terminó entre los tres primeros de la región por equipos.",
  },
  {
    name: "DEKA FIT Valencia",
    date: daysFromNow(-120).slice(0, 10),
    description:
      "Primera salida del club fuera de Madrid. Tres podios de grupo de edad y muchas ganas de repetir.",
  },
];
let resultCount = 0;
for (const r of results) {
  if ((await api("/api/results", r)).ok) resultCount++;
}
console.log(`✓ ${resultCount} results`);

// ── Bookings ────────────────────────────────────────────────────────────
const bookings: [number, string, string][] = [
  [0, "Lucía Fernández", "lucia@example.com"],
  [0, "Carlos Ibáñez", "carlos@example.com"],
  [0, "Marta Ruiz", "marta@example.com"],
  [0, "Diego Santos", "diego@example.com"],
  [1, "Lucía Fernández", "lucia@example.com"],
  [1, "Javier Peña", "javier@example.com"],
  [2, "Ana Molina", "ana@example.com"],
  [2, "Sofía Navarro", "sofia@example.com"],
  [3, "Carlos Ibáñez", "carlos@example.com"],
];
let bookingCount = 0;
for (const [index, , memberEmail] of bookings) {
  const id = eventIds[index];
  const session = sessions.get(memberEmail);
  if (!id || !session) continue;
  if ((await api(`/api/events/${id}/signup`, {}, "POST", session)).ok) {
    bookingCount++;
  }
}
console.log(`✓ ${bookingCount} bookings`);

console.log(`\nSeeded ${baseUrl}`);
console.log(`Demo athletes log in with the password: ${DEMO_PASSWORD}`);
