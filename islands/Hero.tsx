/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import Countdown from "../components/Countdown.tsx";
import { emit, goToTab, OPEN_BOOKING, OPEN_JOIN } from "../lib/bus.ts";

interface Props {
  nextEvent:
    | { id: string; title: string; date: string; location: string }
    | null;
  memberCount: number;
  eventCount: number;
  prCount: number;
}

export default function Hero(
  { nextEvent, memberCount, eventCount, prCount }: Props,
) {
  /** Moves to the tab that owns the modal, then asks that island to open it. */
  const open = (tab: string, event: string) => {
    goToTab(tab);
    emit(event);
  };

  return (
    <section class="hero">
      <div class="hero-copy">
        <div class="pill">
          <span class="dot" aria-hidden="true"></span> Deloitte CrossFit & HYROX
          Club · Madrid
        </div>
        <h1>
          Train hard.<br />Progress <span>together.</span>
        </h1>
        <p>
          El punto de encuentro del club: próximos entrenos, reservas, perfiles
          de miembros, récords personales, WODs y resultados de competición.
        </p>

        <div class="actions">
          <button
            type="button"
            class="btn green btn-lg"
            onClick={() => open("events", OPEN_BOOKING)}
          >
            Reservar plaza
          </button>
          <button
            type="button"
            class="btn dark btn-lg"
            onClick={() => open("members", OPEN_JOIN)}
          >
            Crear perfil
          </button>
        </div>

        <dl class="hero-stats">
          <div>
            <dt>Atletas</dt>
            <dd>{memberCount}</dd>
          </div>
          <div>
            <dt>Eventos</dt>
            <dd>{eventCount}</dd>
          </div>
          <div>
            <dt>PRs</dt>
            <dd>{prCount}</dd>
          </div>
        </dl>
      </div>

      <aside class="hero-card">
        <div class="wordmark">
          <img
            src="/images/letras.png"
            alt="Deloitte CrossFit HYROX Club"
            width="320"
            height="120"
          />
        </div>

        {nextEvent
          ? (
            <Fragment>
              <div class="eyebrow">Próximo evento</div>
              <h2 class="hero-next-title">{nextEvent.title}</h2>
              <div class="hero-next-meta">
                <span>
                  📅 {new Date(nextEvent.date).toLocaleString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {nextEvent.location && <span>📍 {nextEvent.location}</span>}
              </div>
              <Countdown targetDate={nextEvent.date} />
            </Fragment>
          )
          : (
            <Fragment>
              <div class="eyebrow">Próximo evento</div>
              <h2 class="hero-next-title">Nada programado</h2>
              <p class="muted" style="margin:0">
                El calendario está vacío ahora mismo. Vuelve pronto.
              </p>
            </Fragment>
          )}
      </aside>
    </section>
  );
}
