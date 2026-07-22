/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import Modal from "../components/Modal.tsx";
import { toast } from "../lib/toast.ts";
import { emit, PENDING_CHANGED } from "../lib/bus.ts";
import {
  formatCalendarDate,
  formatPRValue,
  localDateTimeToIso,
  movementMetric,
  type PRMetric,
} from "../lib/movements.ts";

export interface PendingMember {
  id: string;
  name: string;
  email: string;
  level: string;
  goal: string;
}

export interface PendingPR {
  id: string;
  memberName: string;
  movement: string;
  weight: number;
  metric?: PRMetric;
}

export interface PendingEvent {
  id: string;
  title: string;
  date: string;
}

export interface PendingResult {
  id: string;
  name: string;
  date: string;
}

export interface PendingScore {
  id: string;
  memberName: string;
  wodName: string;
  display: string;
  scaled: boolean;
}

interface Props {
  isAdmin: boolean;
  members: PendingMember[];
  prs: PendingPR[];
  events: PendingEvent[];
  results: PendingResult[];
  scores: PendingScore[];
}

export default function AdminSection(props: Props) {
  if (!props.isAdmin) return <LoginPanel />;
  return <ModerationPanel {...props} />;
}

function LoginPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        globalThis.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        const fallback = res.status >= 500
          ? "Error del servidor. Revisa la configuración (SESSION_SECRET)."
          : "Email o contraseña incorrectos.";
        toast(data.error ?? fallback, "error");
        if (res.status < 500) setPassword("");
      }
    } catch {
      toast("Error de conexión.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="admin-box admin-locked">
      <div class="lock-icon" aria-hidden="true">🔒</div>
      <h2>Zona de administración</h2>
      <p class="muted">
        Inicia sesión con tu cuenta para moderar inscripciones, PRs, resultados
        y WODs.
      </p>
      <form class="form admin-login" onSubmit={submit}>
        <input
          class="input"
          type="email"
          required
          autocomplete="username"
          placeholder="Email de administrador"
          aria-label="Email de administrador"
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
        />
        <input
          class="input"
          type="password"
          required
          autocomplete="current-password"
          placeholder="Contraseña"
          aria-label="Contraseña de administrador"
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
        />
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Iniciando sesión…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function ModerationPanel(
  { members: m0, prs: p0, events: e0, results: r0, scores: s0 }: Props,
) {
  const [members, setMembers] = useState(m0);
  const [prs, setPRs] = useState(p0);
  const [events, setEvents] = useState(e0);
  const [results, setResults] = useState(r0);
  const [scores, setScores] = useState(s0);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [resultFormOpen, setResultFormOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const total = members.length + prs.length + events.length + results.length +
    scores.length;

  // The tab badge is rendered by TabNavigation, which cannot see these
  // queues; tell it the new total whenever an item leaves one.
  useEffect(() => emit<number>(PENDING_CHANGED, total), [total]);

  /** Runs a moderation call and drops the item from its queue on success. */
  const act = async <T extends { id: string }>(
    url: string,
    method: "POST" | "DELETE",
    id: string,
    setter: (fn: (list: T[]) => T[]) => void,
    successMessage: string,
  ) => {
    try {
      const res = await fetch(url, { method });
      if (res.ok) {
        setter((list) => list.filter((x) => x.id !== id));
        toast(successMessage, "success");
      } else {
        if (res.status === 401 || res.status === 403) {
          toast("La sesión de administrador ha caducado.", "info");
          setTimeout(() => globalThis.location.reload(), 250);
          return;
        }
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo completar la acción.", "error");
      }
    } catch {
      toast("Error de conexión.", "error");
    }
  };

  const logout = async () => {
    setLogoutLoading(true);
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (res.ok) {
        globalThis.location.reload();
        return;
      }
      const data = await res.json().catch(() => ({}));
      toast(data.error ?? "No se pudo cerrar la sesión.", "error");
    } catch {
      toast("Error de conexión.", "error");
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <Fragment>
      <div class="admin-box">
        <div class="admin-bar">
          <div>
            <h2>Moderación</h2>
            <p class="muted">
              {total === 0
                ? "Todo al día. No hay nada pendiente de revisar."
                : `${total} ${
                  total === 1 ? "elemento pendiente" : "elementos pendientes"
                } de revisión.`}
            </p>
          </div>
          <div class="admin-actions">
            <button
              type="button"
              class="btn green"
              onClick={() => setEventFormOpen(true)}
            >
              + Evento
            </button>
            <button
              type="button"
              class="btn dark"
              onClick={() => setResultFormOpen(true)}
            >
              + Resultado
            </button>
            <button
              type="button"
              class="btn ghost"
              onClick={logout}
              disabled={logoutLoading}
            >
              {logoutLoading ? "Cerrando…" : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </div>

      <div class="grid cards2">
        <Queue
          title="Eventos"
          count={events.length}
          empty="No hay eventos pendientes."
        >
          {events.map((ev) => (
            <PendingRow
              key={ev.id}
              label={ev.title}
              sub={new Date(ev.date).toLocaleDateString("es-ES")}
              onApprove={() =>
                act(
                  `/api/events/${ev.id}/approve`,
                  "POST",
                  ev.id,
                  setEvents,
                  "Evento aprobado.",
                )}
              onReject={() =>
                act(
                  `/api/events/${ev.id}/delete`,
                  "DELETE",
                  ev.id,
                  setEvents,
                  "Evento rechazado.",
                )}
            />
          ))}
        </Queue>

        <Queue title="PRs" count={prs.length} empty="No hay PRs pendientes.">
          {prs.map((pr) => (
            <PendingRow
              key={pr.id}
              label={pr.memberName}
              sub={`${pr.movement} · ${
                formatPRValue(
                  pr.weight,
                  pr.metric ?? movementMetric(pr.movement),
                )
              }`}
              onApprove={() =>
                act(
                  `/api/prs/${pr.id}/approve`,
                  "POST",
                  pr.id,
                  setPRs,
                  "PR aprobado.",
                )}
              onReject={() =>
                act(
                  `/api/prs/${pr.id}/delete`,
                  "DELETE",
                  pr.id,
                  setPRs,
                  "PR rechazado.",
                )}
            />
          ))}
        </Queue>

        <Queue
          title="Scores de WOD"
          count={scores.length}
          empty="No hay scores pendientes."
        >
          {scores.map((s) => (
            <PendingRow
              key={s.id}
              label={s.memberName}
              sub={`${s.wodName} · ${s.display} · ${
                s.scaled ? "Scaled" : "Rx"
              }`}
              onApprove={() =>
                act(
                  `/api/wod-scores/${s.id}/approve`,
                  "POST",
                  s.id,
                  setScores,
                  "Score aprobado.",
                )}
              onReject={() =>
                act(
                  `/api/wod-scores/${s.id}/delete`,
                  "DELETE",
                  s.id,
                  setScores,
                  "Score rechazado.",
                )}
            />
          ))}
        </Queue>

        <Queue
          title="Resultados"
          count={results.length}
          empty="No hay resultados pendientes."
        >
          {results.map((r) => (
            <PendingRow
              key={r.id}
              label={r.name}
              sub={formatCalendarDate(r.date, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              onApprove={() =>
                act(
                  `/api/results/${r.id}/approve`,
                  "POST",
                  r.id,
                  setResults,
                  "Resultado aprobado.",
                )}
              onReject={() =>
                act(
                  `/api/results/${r.id}/delete`,
                  "DELETE",
                  r.id,
                  setResults,
                  "Resultado rechazado.",
                )}
            />
          ))}
        </Queue>

        <Queue
          title="Miembros"
          count={members.length}
          empty="No hay miembros pendientes."
        >
          {members.map((mb) => (
            <PendingRow
              key={mb.id}
              label={mb.name}
              sub={`${mb.email} · ${mb.level} · ${mb.goal}`}
              onApprove={() =>
                act(
                  `/api/members/${mb.id}/approve`,
                  "POST",
                  mb.id,
                  setMembers,
                  "Miembro aprobado.",
                )}
              onReject={() =>
                act(
                  `/api/members/${mb.id}/reject`,
                  "POST",
                  mb.id,
                  setMembers,
                  "Miembro rechazado.",
                )}
            />
          ))}
        </Queue>
      </div>

      {eventFormOpen && (
        <EventFormModal onClose={() => setEventFormOpen(false)} />
      )}
      {resultFormOpen && (
        <ResultFormModal onClose={() => setResultFormOpen(false)} />
      )}
    </Fragment>
  );
}

function Queue(
  { title, count, empty, children }: {
    title: string;
    count: number;
    empty: string;
    children: h.JSX.Element[];
  },
) {
  return (
    <div class="pending">
      <h3>
        {title}
        <span class={`badge ${count > 0 ? "badge-alert" : ""}`}>{count}</span>
      </h3>
      {count === 0 && <p class="muted queue-empty">{empty}</p>}
      {children}
    </div>
  );
}

function PendingRow(
  { label, sub, onApprove, onReject }: {
    label: string;
    sub: string;
    onApprove: () => void;
    onReject: () => void;
  },
) {
  return (
    <div class="pending-item">
      <div class="pending-info">
        <b>{label}</b>
        <small>{sub}</small>
      </div>
      <div class="pending-actions">
        <button type="button" class="btn green btn-sm" onClick={onApprove}>
          Aprobar
        </button>
        <button type="button" class="btn red btn-sm" onClick={onReject}>
          Rechazar
        </button>
      </div>
    </div>
  );
}

function EventFormModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("wod");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(false);

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
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date: isoDate,
          location: location.trim(),
          description: description.trim(),
          type,
          capacity: capacity || undefined,
        }),
      });
      if (res.ok) {
        toast("Evento creado y publicado.", "success");
        globalThis.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo crear el evento.", "error");
      }
    } catch {
      toast("Error de conexión.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title="Crear evento" onClose={onClose}>
      <form class="form" onSubmit={submit}>
        <label class="field">
          <span>Título</span>
          <input
            class="input"
            type="text"
            required
            placeholder="Entreno DEKA"
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
              <option value="wod">WOD</option>
              <option value="hyrox">HYROX</option>
              <option value="competition">Competición</option>
              <option value="social">Social</option>
              <option value="open">Open box</option>
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
              placeholder="Box Madrid Centro"
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
          <span>Descripción</span>
          <textarea
            class="input"
            required
            placeholder="Qué se va a entrenar, a quién va dirigido…"
            value={description}
            onInput={(e) =>
              setDescription((e.target as HTMLTextAreaElement).value)}
          />
        </label>
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Creando…" : "Crear evento"}
        </button>
      </form>
    </Modal>
  );
}

function ResultFormModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!name.trim() || !date || !description.trim()) {
      toast("Rellena nombre, fecha y descripción.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          date,
          description: description.trim(),
          photoUrl: photoUrl.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast("Resultado publicado.", "success");
        globalThis.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo publicar el resultado.", "error");
      }
    } catch {
      toast("Error de conexión.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title="Publicar resultado" onClose={onClose}>
      <form class="form" onSubmit={submit}>
        <label class="field">
          <span>Competición</span>
          <input
            class="input"
            type="text"
            required
            placeholder="HYROX Madrid 2026"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Fecha</span>
          <input
            class="input"
            type="date"
            required
            value={date}
            onInput={(e) => setDate((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Cómo fue</span>
          <textarea
            class="input"
            required
            placeholder="Posiciones, tiempos, quién compitió…"
            value={description}
            onInput={(e) =>
              setDescription((e.target as HTMLTextAreaElement).value)}
          />
        </label>
        <label class="field">
          <span>
            Foto <em>(URL, opcional)</em>
          </span>
          <input
            class="input"
            type="url"
            placeholder="https://…"
            value={photoUrl}
            onInput={(e) => setPhotoUrl((e.target as HTMLInputElement).value)}
          />
        </label>
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Publicando…" : "Publicar resultado"}
        </button>
      </form>
    </Modal>
  );
}
