/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
export default function EventsSection() {
  return (
    <section id="events" class="content active">
      <div class="section-head">
        <h2>Lo que se viene</h2>
        <div class="tools">
          <button class="btn green" style="padding:10px 13px">
            Cards
          </button>
          <button class="btn dark" style="padding:10px 13px">
            Calendar
          </button>
          <button class="btn dark" style="padding:10px 13px">
            + Añadir evento
          </button>
        </div>
      </div>
      <div id="eventCards" class="grid cards2">
        <article class="card">
          <div class="imgph">Event image upload</div>
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;gap:14px">
              <h3>Entreno DEKA</h3>
              <span class="badge">8 apuntados</span>
            </div>
            <div class="meta">
              📅 12 Jul 2026 · 10:00
              <br />
              📍 GreenHorse Box, San Sebastián de los Reyes
            </div>
            <div class="mini-count countdown" data-countdown="2026-07-12T10:00:00">
            </div>
            <p class="muted">
              Formato DEKA para preparar competición, compartir ritmos y
              representar al club juntos.
            </p>
            <div class="actions">
              <button class="btn green">Apúntate</button>
              <button class="btn red admin-only hidden">
                Delete
              </button>
            </div>
          </div>
        </article>
        <article class="card">
          <div class="imgph">Training session</div>
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;gap:14px">
              <h3>HYROX Team Session</h3>
              <span class="badge">12 apuntados</span>
            </div>
            <div class="meta">
              📅 19 Jul 2026 · 09:30
              <br />
              📍 Madrid
            </div>
            <div class="mini-count countdown" data-countdown="2026-07-19T09:30:00">
            </div>
            <p class="muted">
              Team workout focused on sleds, wall balls and running transitions.
            </p>
            <div class="actions">
              <button class="btn green">Apúntate</button>
              <button class="btn red admin-only hidden">
                Delete
              </button>
            </div>
          </div>
        </article>
      </div>
      <div id="eventCalendar" class="calendar hidden">
        <div class="cal-head">
          <button class="btn dark" style="padding:8px 12px">
            Prev
          </button>
          <h3>Julio 2026</h3>
          <button class="btn dark" style="padding:8px 12px">
            Next
          </button>
        </div>
        <div class="cal-grid" id="calendarGrid"></div>
      </div>
    </section>
  );
}
