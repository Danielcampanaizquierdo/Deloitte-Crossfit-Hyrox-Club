/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import Modal from "../components/Modal.tsx";
import Countdown from "../components/Countdown.tsx";
import { toast } from "../lib/toast.ts";
import { compressImage } from "../lib/imageCompress.ts";
import { isoToLocalDateTime, localDateTimeToIso } from "../lib/movements.ts";
import { emit, on, OPEN_BOOKING, OPEN_LOGIN } from "../lib/bus.ts";
import type { SessionMember } from "./MemberAuth.tsx";
// Shared with the server so "full" means the same thing on both sides of the
// booking request.
import { spotsLeft } from "../types/Event.ts";

export interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  attendees: number;
  capacity?: number;
  type?: string;
  locationUrl?: string;
  image?: string;
}

interface Attendee {
  id?: string;
  memberName: string;
  signedUpAt: string;
}

interface Props {
  events: EventItem[];
  isAdmin: boolean;
  /** The logged-in member, or null. Bookings are made as this member; the
   * server ignores any identity sent in the request body. */
  member: SessionMember | null;
}

type View = "cards" | "calendar";
type TimeFilter = "upcoming" | "past" | "all";

const EVENT_TYPES: Record<string, { label: string; cls: string }> = {
  wod: { label: "CrossFit", cls: "t-wod" },
  hyrox: { label: "HYROX", cls: "t-hyrox" },
  competition: { label: "Competición", cls: "t-comp" },
  social: { label: "Social", cls: "t-social" },
  open: { label: "Open box", cls: "t-open" },
  meeting: { label: "Meeting", cls: "t-meeting" },
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/** Local-time day key, so an event groups under the day the athlete sees it
 * on rather than its UTC date. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventsSection(
  { events: initial, isAdmin, member }: Props,
) {
  const [events, setEvents] = useState(initial);
  const [view, setView] = useState<View>("cards");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [booking, setBooking] = useState<EventItem | null>(null);
  const [cancelling, setCancelling] = useState<EventItem | null>(null);
  const [editing, setEditing] = useState<EventItem | null>(null);
  // list stays null while the roster request is in flight, so the modal can
  // show a loading state before the names arrive.
  const [roster, setRoster] = useState<
    { event: EventItem; list: Attendee[] | null } | null
  >(null);

  const now = Date.now();
  const visible = events
    .filter((ev) => {
      const t = new Date(ev.date).getTime();
      if (timeFilter === "upcoming") return t >= now;
      if (timeFilter === "past") return t < now;
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      // Past events read best newest-first; upcoming ones soonest-first.
      return timeFilter === "past" ? -diff : diff;
    });

  const upcomingCount =
    events.filter((e) => new Date(e.date).getTime() >= now).length;

  /** Booking needs an account. Rather than failing at submit, send anyone
   * without a session straight to the log-in form. */
  const requestBooking = (ev: EventItem) => {
    if (!member) {
      toast("Inicia sesión para reservar tu plaza.", "info");
      emit(OPEN_LOGIN);
      return;
    }
    setBooking(ev);
  };

  // The hero's "Reservar plaza" button lives in another island; it asks this
  // one to open the booking form for whatever comes next.
  useEffect(() =>
    on(OPEN_BOOKING, () => {
      if (!member) {
        toast("Inicia sesión para reservar tu plaza.", "info");
        emit(OPEN_LOGIN);
        return;
      }
      const next = events
        .filter((e) => new Date(e.date).getTime() >= Date.now())
        .filter((e) => {
          const left = spotsLeft(e);
          return left === null || left > 0;
        })
        .sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0];

      if (next) setBooking(next);
      else toast("Ahora mismo no hay eventos con plazas libres.", "info");
    }), [events, member]);

  const applyAttendeeDelta = (id: string, delta: number) => {
    setEvents((list) =>
      list.map((e) =>
        e.id === id ? { ...e, attendees: Math.max(0, e.attendees + delta) } : e
      )
    );
  };

  const openRoster = async (ev: EventItem) => {
    setRoster({ event: ev, list: null });
    try {
      const res = await fetch(`/api/events/${ev.id}/attendees`);
      if (!res.ok) throw new Error("failed");
      setRoster({ event: ev, list: await res.json() });
    } catch {
      toast("No se pudo cargar la lista de asistentes.", "error");
      setRoster(null);
    }
  };

  const deleteEvent = async (ev: EventItem) => {
    const res = await fetch(`/api/events/${ev.id}/delete`, {
      method: "DELETE",
    });
    if (res.ok) {
      setEvents((list) => list.filter((e) => e.id !== ev.id));
      toast(`"${ev.title}" eliminado.`, "success");
    } else {
      toast("No se pudo eliminar el evento.", "error");
    }
  };

  // ── Calendar grid ──────────────────────────────────────────────────────
  const eventsByDay = new Map<string, EventItem[]>();
  for (const ev of events) {
    const key = dayKey(new Date(ev.date));
    const bucket = eventsByDay.get(key);
    if (bucket) bucket.push(ev);
    else eventsByDay.set(key, [ev]);
  }

  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  // getDay() is Sunday-first (0=Sun); the grid is Monday-first, so shift it.
  const leadingBlanks = (new Date(
    month.getFullYear(),
    month.getMonth(),
    1,
  ).getDay() + 6) % 7;

  const cells: (Date | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1),
    ),
  ];

  const today = new Date();
  const selectedEvents = selectedDay
    ? (eventsByDay.get(dayKey(selectedDay)) ?? []).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    : [];

  return (
    <Fragment>
      <div class="section-head">
        <div>
          <h2>Lo que se viene</h2>
          <p class="section-sub">
            {upcomingCount === 0
              ? "Sin eventos programados"
              : `${upcomingCount} ${
                upcomingCount === 1 ? "evento próximo" : "eventos próximos"
              }`}
          </p>
        </div>
        <div class="head-tools">
          <div class="segmented" role="group" aria-label="Filtrar por fecha">
            {([["upcoming", "Próximos"], ["past", "Pasados"], [
              "all",
              "Todos",
            ]] as [TimeFilter, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                class={`seg ${timeFilter === value ? "active" : ""}`}
                aria-pressed={timeFilter === value}
                onClick={() => setTimeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div class="segmented" role="group" aria-label="Cambiar vista">
            {([["cards", "Tarjetas"], ["calendar", "Calendario"]] as [
              View,
              string,
            ][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                class={`seg ${view === value ? "active" : ""}`}
                aria-pressed={view === value}
                onClick={() => setView(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "cards" && (
        <div class="grid cards2">
          {visible.length === 0 && (
            <div class="empty-state">
              <div class="empty-icon" aria-hidden="true">📅</div>
              <h3>
                {timeFilter === "past"
                  ? "Todavía no hay historial"
                  : "No hay eventos próximos"}
              </h3>
              <p class="muted">
                {timeFilter === "past"
                  ? "Cuando pase el primer evento aparecerá aquí."
                  : "Vuelve pronto: el club publica sesiones cada semana."}
              </p>
            </div>
          )}

          {visible.map((ev) => {
            const left = spotsLeft(ev);
            const full = left === 0;
            const past = new Date(ev.date).getTime() < now;
            const meta = ev.type ? EVENT_TYPES[ev.type] : undefined;
            const pct = ev.capacity && ev.capacity > 0
              ? Math.min(100, Math.round((ev.attendees / ev.capacity) * 100))
              : 0;

            return (
              <article
                key={ev.id}
                class={`card event-card ${past ? "is-past" : ""}`}
              >
                {ev.image && (
                  <div class="event-cover">
                    <img src={ev.image} alt={ev.title} loading="lazy" />
                  </div>
                )}
                <div class="card-body">
                  <div class="card-top">
                    <div class="card-titles">
                      {meta && (
                        <span class={`tag ${meta.cls}`}>{meta.label}</span>
                      )}
                      <h3>{ev.title}</h3>
                    </div>
                    <span class={`badge ${full ? "badge-full" : ""}`}>
                      {full
                        ? "Completo"
                        : `${ev.attendees} ${
                          ev.attendees === 1 ? "apuntado" : "apuntados"
                        }`}
                    </span>
                  </div>

                  <div class="meta">
                    <span>📅 {formatDateTime(ev.date)}</span>
                    {ev.location &&
                      (ev.locationUrl
                        ? (
                          <a
                            class="map-link"
                            href={ev.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            📍 {ev.location}
                          </a>
                        )
                        : <span>📍 {ev.location}</span>)}
                  </div>

                  {!past && (
                    <Countdown targetDate={ev.date} className="mini-count" />
                  )}

                  {ev.description && <p class="muted">{ev.description}</p>}

                  {left !== null && (
                    <div class="capacity">
                      <div class="capacity-bar">
                        <div
                          class={`capacity-fill ${full ? "is-full" : ""}`}
                          style={`width:${pct}%`}
                        />
                      </div>
                      <small>
                        {full
                          ? "Sin plazas libres"
                          : `${left} ${
                            left === 1 ? "plaza" : "plazas"
                          } de ${ev.capacity}`}
                      </small>
                    </div>
                  )}

                  <div class="actions">
                    {!past && (
                      <button
                        type="button"
                        class="btn green"
                        disabled={full}
                        onClick={() => requestBooking(ev)}
                      >
                        {full ? "Completo" : "Apuntarme"}
                      </button>
                    )}
                    <button
                      type="button"
                      class="btn dark"
                      onClick={() => openRoster(ev)}
                    >
                      Quién va ({ev.attendees})
                    </button>
                    {!past && member && (
                      <button
                        type="button"
                        class="btn ghost"
                        onClick={() => setCancelling(ev)}
                      >
                        Cancelar mi reserva
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        class="btn dark"
                        onClick={() => setEditing(ev)}
                      >
                        Editar
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        class="btn red"
                        onClick={() => deleteEvent(ev)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {view === "calendar" && (
        <div class="calendar">
          <div class="cal-head">
            <button
              type="button"
              class="btn dark cal-nav"
              aria-label="Mes anterior"
              onClick={() => {
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() - 1, 1),
                );
                setSelectedDay(null);
              }}
            >
              ‹
            </button>
            <div class="cal-title">
              <h3>{MONTHS[month.getMonth()]} {month.getFullYear()}</h3>
              <button
                type="button"
                class="btn ghost cal-today"
                onClick={() => {
                  const n = new Date();
                  setMonth(new Date(n.getFullYear(), n.getMonth(), 1));
                  setSelectedDay(n);
                }}
              >
                Hoy
              </button>
            </div>
            <button
              type="button"
              class="btn dark cal-nav"
              aria-label="Mes siguiente"
              onClick={() => {
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() + 1, 1),
                );
                setSelectedDay(null);
              }}
            >
              ›
            </button>
          </div>

          <div class="cal-grid">
            {WEEKDAYS.map((d) => <div key={d} class="cal-label">{d}</div>)}
            {cells.map((date, idx) => {
              if (!date) return <div key={`b${idx}`} class="cal-cell empty" />;

              const dayEvents = eventsByDay.get(dayKey(date)) ?? [];
              const classes = [
                "cal-cell",
                isSameDay(date, today) ? "is-today" : "",
                selectedDay && isSameDay(date, selectedDay)
                  ? "is-selected"
                  : "",
                dayEvents.length > 0 ? "has-events" : "",
              ].filter(Boolean).join(" ");

              return (
                <button
                  key={dayKey(date)}
                  type="button"
                  class={classes}
                  aria-label={`${date.getDate()} de ${
                    MONTHS[date.getMonth()]
                  }, ${dayEvents.length} eventos`}
                  onClick={() => setSelectedDay(date)}
                >
                  <span class="day">{date.getDate()}</span>
                  <span class="cal-chips">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <span
                        key={ev.id}
                        class={`event-chip ${
                          ev.type ? EVENT_TYPES[ev.type]?.cls ?? "" : ""
                        }`}
                      >
                        {ev.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span class="cal-more">+{dayEvents.length - 2}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div class="cal-detail">
            {!selectedDay && (
              <p class="muted">
                Selecciona un día para ver sus sesiones y reservar plaza.
              </p>
            )}
            {selectedDay && selectedEvents.length === 0 && (
              <p class="muted">
                Nada programado el {selectedDay.toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                })}.
              </p>
            )}
            {selectedEvents.map((ev) => {
              const left = spotsLeft(ev);
              const past = new Date(ev.date).getTime() < now;
              return (
                <div key={ev.id} class="cal-event">
                  <div>
                    <b>{ev.title}</b>
                    <div class="meta">
                      <span>
                        🕘 {new Date(ev.date).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {ev.location && <span>📍 {ev.location}</span>}
                      {left !== null && (
                        <span>
                          {left === 0 ? "Completo" : `${left} plazas`}
                        </span>
                      )}
                    </div>
                  </div>
                  {!past && (
                    <button
                      type="button"
                      class="btn green"
                      disabled={left === 0}
                      onClick={() => requestBooking(ev)}
                    >
                      {left === 0 ? "Completo" : "Apuntarme"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {booking && member && (
        <BookingModal
          event={booking}
          member={member}
          onClose={() => setBooking(null)}
          onBooked={() => {
            applyAttendeeDelta(booking.id, 1);
            setBooking(null);
          }}
        />
      )}

      {cancelling && (
        <CancelModal
          event={cancelling}
          onClose={() => setCancelling(null)}
          onCancelled={() => {
            applyAttendeeDelta(cancelling.id, -1);
            setCancelling(null);
          }}
        />
      )}

      {roster && (
        <Modal
          open
          title="Quién va"
          subtitle={roster.event.title}
          onClose={() => setRoster(null)}
        >
          {roster.list === null && <p class="muted">Cargando…</p>}
          {roster.list?.length === 0 && (
            <p class="muted">Nadie se ha apuntado todavía. ¡Sé el primero!</p>
          )}
          {roster.list && roster.list.length > 0 && (
            <ol class="roster">
              {roster.list.map((a) => (
                <li key={a.id ?? `${a.memberName}-${a.signedUpAt}`}>
                  <span class="roster-avatar" aria-hidden="true">
                    {a.memberName.trim().charAt(0).toUpperCase()}
                  </span>
                  <span>{a.memberName}</span>
                </li>
              ))}
            </ol>
          )}
        </Modal>
      )}
      {editing && (
        <EventEditModal
          event={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Fragment>
  );
}

function EventEditModal(
  { event, onClose }: { event: EventItem; onClose: () => void },
) {
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(isoToLocalDateTime(event.date));
  const [location, setLocation] = useState(event.location);
  const [locationUrl, setLocationUrl] = useState(event.locationUrl ?? "");
  const [description, setDescription] = useState(event.description);
  const [type, setType] = useState(event.type ?? "wod");
  const [capacity, setCapacity] = useState(
    event.capacity ? String(event.capacity) : "",
  );
  const [image, setImage] = useState(event.image ?? "");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);

  const onPickImage = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Selecciona un archivo de imagen.", "error");
      input.value = "";
      return;
    }
    setProcessing(true);
    try {
      setImage(await compressImage(file));
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "No se pudo cargar la foto.",
        "error",
      );
    } finally {
      setProcessing(false);
      input.value = "";
    }
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!title.trim() || !date || !location.trim() || !description.trim()) {
      toast("Rellena todos los campos obligatorios.", "error");
      return;
    }
    const isoDate = localDateTimeToIso(date);
    if (!isoDate) {
      toast("La fecha del evento no es válida.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date: isoDate,
          location: location.trim(),
          locationUrl: locationUrl.trim(),
          image,
          description: description.trim(),
          type,
          capacity: capacity ? Number(capacity) : 0,
        }),
      });
      if (res.ok) {
        toast("Evento actualizado.", "success");
        globalThis.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo actualizar el evento.", "error");
      }
    } catch {
      toast("Error de conexión.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title="Editar evento" onClose={onClose}>
      <form class="form" onSubmit={submit}>
        <label class="field">
          <span>Título</span>
          <input
            class="input"
            type="text"
            required
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
        </label>
        <div class="field-row">
          <label class="field">
            <span>Fecha y hora</span>
            <input
              class="input input-datetime"
              type="datetime-local"
              required
              value={date}
              onInput={(e) => setDate((e.target as HTMLInputElement).value)}
              onChange={(e) => setDate((e.target as HTMLInputElement).value)}
            />
          </label>
          <label class="field">
            <span>Tipo</span>
            <select
              class="input"
              value={type}
              onChange={(e) => setType((e.target as HTMLSelectElement).value)}
            >
              <option value="wod">CrossFit</option>
              <option value="hyrox">HYROX</option>
              <option value="competition">Competición</option>
              <option value="social">Social</option>
              <option value="open">Open box</option>
              <option value="meeting">Meeting</option>
            </select>
          </label>
        </div>
        <div class="field-row">
          <label class="field">
            <span>Ubicación</span>
            <input
              class="input"
              type="text"
              required
              value={location}
              onInput={(e) => setLocation((e.target as HTMLInputElement).value)}
            />
          </label>
          <label class="field">
            <span>
              Plazas <em>(opcional)</em>
            </span>
            <input
              class="input"
              type="number"
              min="1"
              placeholder="Sin límite"
              value={capacity}
              onInput={(e) => setCapacity((e.target as HTMLInputElement).value)}
            />
          </label>
        </div>
        <label class="field">
          <span>
            Link de Google Maps <em>(opcional)</em>
          </span>
          <input
            class="input"
            type="url"
            placeholder="https://maps.google.com/..."
            value={locationUrl}
            onInput={(e) => setLocationUrl((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Descripción</span>
          <textarea
            class="input"
            required
            value={description}
            onInput={(e) =>
              setDescription((e.target as HTMLTextAreaElement).value)}
          />
        </label>
        <label class="field">
          <span>
            Foto de portada <em>(opcional)</em>
          </span>
          {image
            ? (
              <div class="image-preview">
                <img src={image} alt="Vista previa" />
                <button
                  type="button"
                  class="btn dark btn-sm"
                  onClick={() => setImage("")}
                >
                  Quitar foto
                </button>
              </div>
            )
            : (
              <input
                class="input"
                type="file"
                accept="image/*"
                disabled={processing}
                onChange={onPickImage}
              />
            )}
          {processing && <small class="muted">Procesando imagen…</small>}
        </label>
        <button
          class="btn green"
          type="submit"
          disabled={loading || processing}
        >
          {loading ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </Modal>
  );
}

function BookingModal(
  { event, member, onClose, onBooked }: {
    event: EventItem;
    member: SessionMember;
    onClose: () => void;
    onBooked: () => void;
  },
) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Only the comment travels: the server books for whoever the session
      // says you are.
      const res = await fetch(`/api/events/${event.id}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: comments.trim() || undefined }),
      });
      if (res.ok) {
        toast(`¡Plaza confirmada en ${event.title}!`, "success");
        onBooked();
      } else {
        if (res.status === 401) {
          onClose();
          toast("Tu sesión ha caducado. Vuelve a iniciarla.", "info");
          setTimeout(() => emit(OPEN_LOGIN), 0);
          return;
        }
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo completar la reserva.", "error");
      }
    } catch {
      toast("Error de conexión. Inténtalo de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  };

  const left = spotsLeft(event);

  return (
    <Modal
      open
      title="Reservar plaza"
      subtitle={`${event.title} · ${formatDateTime(event.date)}`}
      onClose={onClose}
    >
      <form class="form" onSubmit={submit}>
        {left !== null && (
          <div class="notice">
            Quedan <b>{left}</b> {left === 1 ? "plaza" : "plazas"} de{" "}
            {event.capacity}.
          </div>
        )}
        <div class="as-member">
          <span class="authbar-avatar" aria-hidden="true">
            {member.name.trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <b>{member.name}</b>
            <small>{member.email}</small>
          </div>
        </div>
        <label class="field">
          <span>
            Comentarios <em>(opcional)</em>
          </span>
          <textarea
            class="input"
            placeholder="Lesiones, escalados, dudas…"
            value={comments}
            onInput={(e) =>
              setComments((e.target as HTMLTextAreaElement).value)}
          />
        </label>
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Reservando…" : "Confirmar reserva"}
        </button>
      </form>
    </Modal>
  );
}

function CancelModal(
  { event, onClose, onCancelled }: {
    event: EventItem;
    onClose: () => void;
    onCancelled: () => void;
  },
) {
  const [loading, setLoading] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    try {
      // No email in the body: the server cancels the session holder's own
      // booking. Passing an address meant anyone could cancel another
      // member's place.
      const res = await fetch(`/api/events/${event.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        toast("Reserva cancelada. La plaza queda libre.", "success");
        onCancelled();
      } else {
        if (res.status === 401) {
          onClose();
          toast("Tu sesión ha caducado. Vuelve a iniciarla.", "info");
          setTimeout(() => emit(OPEN_LOGIN), 0);
          return;
        }
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo cancelar la reserva.", "error");
      }
    } catch {
      toast("Error de conexión. Inténtalo de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      title="Cancelar reserva"
      subtitle={event.title}
      onClose={onClose}
    >
      <form class="form" onSubmit={submit}>
        <p class="muted">
          Vamos a liberar tu plaza en{" "}
          <b>{event.title}</b>. Podrás volver a apuntarte mientras queden
          sitios.
        </p>
        <button class="btn red" type="submit" disabled={loading}>
          {loading ? "Cancelando…" : "Cancelar mi reserva"}
        </button>
      </form>
    </Modal>
  );
}
