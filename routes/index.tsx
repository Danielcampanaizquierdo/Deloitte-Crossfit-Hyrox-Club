/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import Topbar from "../components/Topbar.tsx";
import Footer from "../components/Footer.tsx";
import Hero from "../islands/Hero.tsx";
import MemberAuth, { type SessionMember } from "../islands/MemberAuth.tsx";
import TabNavigation from "../islands/TabNavigation.tsx";
import EventsSection, { type EventItem } from "../islands/EventsSection.tsx";
import LeaderboardSection, { type PRItem } from "../islands/LeaderboardSection.tsx";
import WodSection, { type WodItem } from "../islands/WodSection.tsx";
import MembersSection, { type MemberItem } from "../islands/MembersSection.tsx";
import AdminSection, {
  type PendingEvent,
  type PendingMember,
  type PendingPR,
  type PendingResult,
  type PendingScore,
} from "../islands/AdminSection.tsx";
import { eventService } from "../services/eventService.ts";
import { memberService } from "../services/memberService.ts";
import { prService } from "../services/prService.ts";
import { resultService } from "../services/resultService.ts";
import { wodService } from "../services/wodService.ts";
import { formatCalendarDate, formatSeconds } from "../lib/movements.ts";
import { WOD_SCORE_LABELS } from "../types/Wod.ts";
import { State } from "../types/State.ts";

interface ResultData {
  id: string;
  name: string;
  date: string;
  description: string;
  photoUrl?: string;
}

interface PageData {
  isAdmin: boolean;
  /** The logged-in member, already stripped of credentials. */
  sessionMember: SessionMember | null;
  events: EventItem[];
  prs: PRItem[];
  wods: WodItem[];
  results: ResultData[];
  members: MemberItem[];
  nextEvent: { id: string; title: string; date: string; location: string } | null;
  pendingMembers: PendingMember[];
  pendingPRs: PendingPR[];
  pendingEvents: PendingEvent[];
  pendingResults: PendingResult[];
  pendingScores: PendingScore[];
}

const toStr = (d: unknown) => d instanceof Date ? d.toISOString() : String(d);

export const handler: Handlers<PageData, State> = {
  async GET(_req, ctx) {
    // Public visitors only load approved data. Besides doing less work, this
    // keeps moderation records (including member emails) out of Fresh's
    // serialized island props altogether.
    const [allMembers, allPRs, allEvents, allResults, board] = await Promise.all([
      ctx.state.isAdmin ? memberService.getAll() : memberService.getApproved(),
      ctx.state.isAdmin ? prService.getAll() : prService.getApproved(),
      ctx.state.isAdmin ? eventService.getAll() : eventService.getApproved(),
      ctx.state.isAdmin ? resultService.getAll() : resultService.getApproved(),
      wodService.getBoard(),
    ]);

    const pendingScoresRaw = ctx.state.isAdmin
      ? await wodService.getPendingScores()
      : [];

    const events: EventItem[] = allEvents
      .filter((e) => e.approved)
      .map((e) => ({
        id: e.id,
        title: e.title,
        date: toStr(e.date),
        location: e.location,
        description: e.description,
        attendees: e.attendees,
        capacity: e.capacity,
        type: e.type,
        locationUrl: e.locationUrl,
        image: e.image,
      }));

    const prs: PRItem[] = allPRs
      .filter((p) => p.approved)
      .map((p) => ({
        id: p.id,
        athleteId: p.memberId || p.memberName.trim().toLowerCase(),
        memberName: p.memberName,
        movement: p.movement,
        weight: p.weight,
        metric: p.metric,
        date: toStr(p.date),
      }));

    const wods: WodItem[] = board.map((w) => ({
      id: w.id,
      name: w.name,
      date: toStr(w.date),
      format: w.format,
      description: w.description,
      timeCapMinutes: w.timeCapMinutes,
      scoreType: w.scoreType,
      scores: w.scores.map((s) => ({
        id: s.id,
        memberName: s.memberName,
        value: s.value,
        scaled: s.scaled,
      })),
    }));

    const results: ResultData[] = allResults
      .filter((r) => r.approved)
      .map((r) => ({
        id: r.id,
        name: r.name,
        date: toStr(r.date),
        description: r.description,
        photoUrl: r.photoUrl,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const members: MemberItem[] = allMembers
      .filter((m) => m.approved)
      .map((m) => ({
        id: m.id,
        name: m.name,
        level: m.level,
        goal: m.goal,
        location: m.location,
        bio: m.bio,
      }));

    const now = Date.now();
    const upcoming = events
      .filter((e) => new Date(e.date).getTime() >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextEvent = upcoming[0]
      ? {
        id: upcoming[0].id,
        title: upcoming[0].title,
        date: upcoming[0].date,
        location: upcoming[0].location,
      }
      : null;

    // Pending WOD scores carry only a wodId, so resolve each one's name and
    // render its value in that WOD's own unit for the moderation queue.
    const wodsById = new Map(
      (ctx.state.isAdmin ? await wodService.getAll() : board).map((w) => [
        w.id,
        w,
      ]),
    );
    const pendingScores: PendingScore[] = pendingScoresRaw.map((s) => {
      const wod = wodsById.get(s.wodId);
      const type = wod?.scoreType ?? "reps";
      return {
        id: s.id,
        memberName: s.memberName,
        wodName: wod?.name ?? "WOD eliminado",
        display: type === "time"
          ? formatSeconds(s.value)
          : `${s.value} ${WOD_SCORE_LABELS[type].toLowerCase()}`,
        scaled: s.scaled,
      };
    });

    return ctx.render({
      isAdmin: ctx.state.isAdmin,
      // Only the three fields the UI needs; never the whole member record,
      // which carries the password hash.
      sessionMember: ctx.state.member
        ? {
          id: ctx.state.member.id,
          name: ctx.state.member.name,
          email: ctx.state.member.email,
        }
        : null,
      events,
      prs,
      wods,
      results,
      members,
      nextEvent,
      pendingMembers: ctx.state.isAdmin
        ? allMembers
        .filter((m) => !m.approved)
        .map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          level: m.level,
          goal: m.goal,
        }))
        : [],
      pendingPRs: ctx.state.isAdmin
        ? allPRs
        .filter((p) => !p.approved)
        .map((p) => ({
          id: p.id,
          memberName: p.memberName,
          movement: p.movement,
          weight: p.weight,
          metric: p.metric,
        }))
        : [],
      pendingEvents: ctx.state.isAdmin
        ? allEvents
        .filter((e) => !e.approved)
        .map((e) => ({ id: e.id, title: e.title, date: toStr(e.date) }))
        : [],
      pendingResults: ctx.state.isAdmin
        ? allResults
        .filter((r) => !r.approved)
        .map((r) => ({ id: r.id, name: r.name, date: toStr(r.date) }))
        : [],
      pendingScores,
    });
  },
};

export default function Home({ data }: PageProps<PageData>) {
  const {
    isAdmin,
    sessionMember,
    events,
    prs,
    wods,
    results,
    members,
    nextEvent,
    pendingMembers,
    pendingPRs,
    pendingEvents,
    pendingResults,
    pendingScores,
  } = data;

  const pendingCount = isAdmin
    ? pendingMembers.length + pendingPRs.length + pendingEvents.length +
      pendingResults.length + pendingScores.length
    : 0;

  const title = "Deloitte CrossFit & HYROX Club · Madrid";
  const description =
    "El hub del club: reserva entrenos, consulta el WOD del día, registra tus PRs y sigue los resultados de competición.";

  return (
    <Fragment>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="theme-color" content="#86BC25" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="/images/escudo.png" />
        <meta name="twitter:card" content="summary" />
        <link rel="icon" href="/images/escudo.png" />
        <link
          rel="preload"
          href="/fonts/SairaCondensed-ExtraBold.woff2"
          as="font"
          type="font/woff2"
          crossorigin="anonymous"
        />
        <link rel="stylesheet" href="/styles.css" />
      </Head>

      <a class="skip-link" href="#events">Saltar al contenido</a>

      <div class="wrap">
        <Topbar />
        <MemberAuth member={sessionMember} />
        <Hero
          nextEvent={nextEvent}
          memberCount={members.length}
          eventCount={events.length}
          prCount={prs.length}
        />
        <TabNavigation pendingCount={pendingCount} isAdmin={isAdmin} />

        <section id="events" class="content active">
          <EventsSection
            events={events}
            isAdmin={isAdmin}
            member={sessionMember}
          />
        </section>

        <section id="wod" class="content">
          <WodSection wods={wods} isAdmin={isAdmin} member={sessionMember} />
        </section>

        <section id="leaderboard" class="content">
          <LeaderboardSection prs={prs} member={sessionMember} />
        </section>

        <section id="results" class="content">
          <div class="section-head">
            <div>
              <h2>Nuestras batallas</h2>
              <p class="section-sub">
                {results.length === 0
                  ? "Sin competiciones publicadas"
                  : `${results.length} ${
                    results.length === 1 ? "competición" : "competiciones"
                  }`}
              </p>
            </div>
          </div>

          {results.length === 0 && (
            <div class="empty-state">
              <div class="empty-icon" aria-hidden="true">🏆</div>
              <h3>Todavía no hay resultados</h3>
              <p class="muted">
                Cuando el club compita, las crónicas aparecerán aquí.
              </p>
            </div>
          )}

          <div class="grid cards3">
            {results.map((r) => (
              <article key={r.id} class="card result-card">
                {r.photoUrl
                  ? (
                    <img
                      class="result-photo"
                      src={r.photoUrl}
                      alt={r.name}
                      loading="lazy"
                    />
                  )
                  : <div class="imgph" aria-hidden="true">🏅</div>}
                <div class="card-body">
                  <div class="eyebrow">
                    {formatCalendarDate(r.date, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <h3>{r.name}</h3>
                  <p class="muted">{r.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="members" class="content">
          <MembersSection
            members={members}
            prs={prs}
            pendingCount={pendingMembers.length}
            sessionMember={sessionMember}
            isAdmin={isAdmin}
          />
        </section>

        <section id="admin" class="content">
          <AdminSection
            isAdmin={isAdmin}
            members={pendingMembers}
            prs={pendingPRs}
            events={pendingEvents}
            results={pendingResults}
            scores={pendingScores}
          />
        </section>

        <Footer />
      </div>
    </Fragment>
  );
}
