/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import CountdownTimer from "../islands/CountdownTimer.tsx";
import TabNavigation from "../islands/TabNavigation.tsx";
import EventViewToggle from "../islands/EventViewToggle.tsx";
import ModalManager from "../islands/ModalManager.tsx";
import AdminPanel from "../islands/AdminPanel.tsx";
import AdminPendingPanel from "../islands/AdminPendingPanel.tsx";
import MembersFilter from "../islands/MembersFilter.tsx";
import Calendar from "../islands/Calendar.tsx";
import SignupForm from "../islands/SignupForm.tsx";
import PRForm from "../islands/PRForm.tsx";
import MemberForm from "../islands/MemberForm.tsx";
import EventForm from "../islands/EventForm.tsx";
import ResultForm from "../islands/ResultForm.tsx";
import Topbar from "../components/Topbar.tsx";
import Hero from "../components/Hero.tsx";
import Footer from "../components/Footer.tsx";
import { eventService } from "../services/eventService.ts";
import { memberService } from "../services/memberService.ts";
import { prService } from "../services/prService.ts";
import { resultService } from "../services/resultService.ts";
import { State } from "../types/State.ts";

interface EventData {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  attendees: number;
}

interface PREntry {
  id: string;
  memberName: string;
  weight: number;
}

interface PRGroup {
  movement: string;
  top: PREntry[];
}

interface ResultData {
  id: string;
  name: string;
  date: string;
  description: string;
  photoUrl?: string;
}

interface MemberData {
  id: string;
  name: string;
  level: string;
  goal: string;
  location: string;
}

interface PendingMemberData {
  id: string;
  name: string;
  email: string;
  level: string;
  goal: string;
}

interface PendingPRData {
  id: string;
  memberName: string;
  memberEmail: string;
  movement: string;
  weight: number;
}

interface PendingEventData {
  id: string;
  title: string;
  date: string;
}

interface PendingResultData {
  id: string;
  name: string;
  date: string;
}

interface PageData {
  isAdmin: boolean;
  events: EventData[];
  prGroups: PRGroup[];
  results: ResultData[];
  members: MemberData[];
  memberStats: { total: number; hyrox: number; competitors: number };
  pendingMembers: PendingMemberData[];
  pendingPRs: PendingPRData[];
  pendingEvents: PendingEventData[];
  pendingResults: PendingResultData[];
}

export const handler: Handlers<PageData, State> = {
  async GET(_req, ctx) {
    const [allMembers, allPRs, allEvents, allResults] = await Promise.all([
      memberService.getAll(),
      prService.getAll(),
      eventService.getAll(),
      resultService.getAll(),
    ]);

    const toStr = (d: unknown) =>
      d instanceof Date ? d.toISOString() : String(d);

    const approvedEvents: EventData[] = allEvents
      .filter((e) => e.approved)
      .map((e) => ({
        id: e.id,
        title: e.title,
        date: toStr(e.date),
        location: e.location,
        description: e.description,
        attendees: e.attendees,
      }));

    const approvedPRs = allPRs.filter((p) => p.approved);
    const grouped: Record<string, PREntry[]> = {};
    for (const pr of approvedPRs) {
      if (!grouped[pr.movement]) grouped[pr.movement] = [];
      grouped[pr.movement].push({ id: pr.id, memberName: pr.memberName, weight: pr.weight });
    }
    const prGroups: PRGroup[] = Object.entries(grouped)
      .map(([movement, entries]) => ({
        movement,
        top: entries.sort((a, b) => b.weight - a.weight).slice(0, 3),
      }))
      .slice(0, 4);

    const approvedResults: ResultData[] = allResults
      .filter((r) => r.approved)
      .map((r) => ({
        id: r.id,
        name: r.name,
        date: toStr(r.date),
        description: r.description,
        photoUrl: r.photoUrl,
      }));

    const approvedMembers: MemberData[] = allMembers
      .filter((m) => m.approved)
      .map((m) => ({
        id: m.id,
        name: m.name,
        level: m.level,
        goal: m.goal,
        location: m.location,
      }));

    const memberStats = {
      total: approvedMembers.length,
      hyrox: approvedMembers.filter((m) => m.goal === "hyrox").length,
      competitors: approvedMembers.filter((m) => m.level === "advanced").length,
    };

    const pendingMembers: PendingMemberData[] = allMembers
      .filter((m) => !m.approved)
      .map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        level: m.level,
        goal: m.goal,
      }));

    const pendingPRs: PendingPRData[] = allPRs
      .filter((p) => !p.approved)
      .map((p) => ({
        id: p.id,
        memberName: p.memberName,
        memberEmail: p.memberEmail,
        movement: p.movement,
        weight: p.weight,
      }));

    const pendingEvents: PendingEventData[] = allEvents
      .filter((e) => !e.approved)
      .map((e) => ({ id: e.id, title: e.title, date: toStr(e.date) }));

    const pendingResults: PendingResultData[] = allResults
      .filter((r) => !r.approved)
      .map((r) => ({ id: r.id, name: r.name, date: toStr(r.date) }));

    return ctx.render({
      isAdmin: ctx.state.isAdmin,
      events: approvedEvents,
      prGroups,
      results: approvedResults,
      members: approvedMembers,
      memberStats,
      pendingMembers,
      pendingPRs,
      pendingEvents,
      pendingResults,
    });
  },
};

export default function Home({ data }: PageProps<PageData>) {
  const { isAdmin, events, prGroups, results, members, memberStats } = data;

  return (
    <>
      <Head>
        <link
          rel="preload"
          href="/fonts/SairaCondensed-ExtraBold.woff2"
          as="font"
          type="font/woff2"
          crossorigin
        />
        <link rel="stylesheet" href="/styles.css" />
      </Head>
      <div class="wrap">
        <Topbar />
        <Hero />
        <TabNavigation />

        {/* ── Events ── */}
        <section id="events" class="content active">
          <div class="section-head">
            <h2>Lo que se viene</h2>
            <div style="display:flex;gap:8px;align-items:center">
              {isAdmin && (
                <ModalManager
                  buttonLabel="+ Añadir evento"
                  modalId="eventModal"
                  buttonClass="btn dark"
                />
              )}
              <EventViewToggle />
            </div>
          </div>

          <div id="eventCards" class="grid cards2">
            {events.length === 0 && (
              <p class="muted">No hay eventos próximos. ¡Vuelve pronto!</p>
            )}
            {events.map((ev) => (
              <article key={ev.id} class="card">
                <div class="imgph">Event image</div>
                <div class="card-body">
                  <div style="display:flex;justify-content:space-between;gap:14px">
                    <h3>{ev.title}</h3>
                    <span class="badge">{ev.attendees} apuntados</span>
                  </div>
                  <div class="meta">
                    📅 {new Date(ev.date).toLocaleString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {ev.location && (
                      <>
                        <br />
                        📍 {ev.location}
                      </>
                    )}
                  </div>
                  <CountdownTimer targetDate={ev.date} className="mini-count" />
                  <p class="muted">{ev.description}</p>
                  <div class="actions">
                    <ModalManager
                      buttonLabel="Apúntate"
                      modalId="signupModal"
                      buttonClass="btn green"
                    />
                    {isAdmin && (
                      <form
                        method="POST"
                        action={`/api/events/${ev.id}/delete`}
                        style="margin:0"
                      >
                        <button type="submit" class="btn red">
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <Calendar events={events.map((e) => ({ id: e.id, title: e.title, date: e.date }))} />
        </section>

        {/* ── Leaderboard ── */}
        <section id="leaderboard" class="content">
          <div class="section-head">
            <h2>PRs del club</h2>
            <ModalManager
              buttonLabel="+ Añadir PR"
              modalId="prModal"
              buttonClass="btn dark"
            />
          </div>

          <div class="grid cards2">
            {prGroups.length === 0 && (
              <p class="muted">
                No hay PRs aprobados aún. ¡Sé el primero en registrar el tuyo!
              </p>
            )}
            {prGroups.map(({ movement, top }) => (
              <article key={movement} class="card leader-card">
                <div class="card-body">
                  <h3>{movement}</h3>
                  {top.map((entry, i) => (
                    <div key={entry.id} class="row">
                      <div class="rank">#{i + 1}</div>
                      <div>
                        <b>{entry.memberName}</b>
                        <div class="bar">
                          <div
                            class="fill"
                            style={`width:${Math.round((entry.weight / top[0].weight) * 100)}%`}
                          />
                        </div>
                      </div>
                      <div>
                        <b>{entry.weight}kg</b>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Results ── */}
        <section id="results" class="content">
          <div class="section-head">
            <h2>Nuestras batallas</h2>
            {isAdmin && (
              <ModalManager
                buttonLabel="+ Añadir resultado"
                modalId="resultModal"
                buttonClass="btn dark"
              />
            )}
          </div>

          <div class="grid cards3">
            {results.length === 0 && (
              <p class="muted">No hay resultados publicados aún.</p>
            )}
            {results.map((r) => (
              <article key={r.id} class="card">
                {r.photoUrl
                  ? (
                    <img
                      src={r.photoUrl}
                      alt={r.name}
                      style="width:100%;height:160px;object-fit:cover;border-bottom:1px solid var(--line)"
                    />
                  )
                  : <div class="imgph">Past event photo</div>}
                <div class="card-body">
                  <h3>{r.name}</h3>
                  <div class="eyebrow">
                    {new Date(r.date).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <p class="muted">{r.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Members ── */}
        <section id="members" class="content">
          <div class="section-head">
            <h2>Member profiles</h2>
            <ModalManager
              buttonLabel="+ Añadir miembro"
              modalId="memberModal"
              buttonClass="btn dark"
            />
          </div>

          <div class="stats">
            <div class="stat">
              <small>Members</small>
              <b>{memberStats.total}</b>
            </div>
            <div class="stat">
              <small>Competitors</small>
              <b>{memberStats.competitors}</b>
            </div>
            <div class="stat">
              <small>HYROX focus</small>
              <b>{memberStats.hyrox}</b>
            </div>
            <div class="stat">
              <small>Pending approval</small>
              <b>{data.pendingMembers.length}</b>
            </div>
          </div>

          <MembersFilter members={members} />
        </section>

        {/* ── Admin ── */}
        <section id="admin" class="content">
          <AdminPanel isAdmin={isAdmin} />
          {isAdmin && (
            <AdminPendingPanel
              members={data.pendingMembers}
              prs={data.pendingPRs}
              events={data.pendingEvents}
              results={data.pendingResults}
            />
          )}
        </section>

        <Footer />
      </div>

      {/* ── Modal islands ── */}
      <SignupForm events={events.map((e) => ({ id: e.id, title: e.title, date: e.date }))} />
      <PRForm />
      <MemberForm />
      {isAdmin && <EventForm />}
      {isAdmin && <ResultForm />}
    </>
  );
}
