/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useState } from "preact/hooks";
import Modal from "../components/Modal.tsx";
import { toast } from "../lib/toast.ts";
import { emit, OPEN_LOGIN } from "../lib/bus.ts";
import type { SessionMember } from "./MemberAuth.tsx";
import {
  formatCalendarDate,
  formatSeconds,
  parseTimeToSeconds,
} from "../lib/movements.ts";
import {
  WOD_FORMAT_LABELS,
  WOD_SCORE_LABELS,
  type WodFormat,
  type WodScoreType,
} from "../types/Wod.ts";

export interface WodScoreItem {
  id: string;
  memberName: string;
  value: number;
  scaled: boolean;
}

export interface WodItem {
  id: string;
  name: string;
  date: string;
  format: WodFormat;
  description: string;
  timeCapMinutes?: number;
  scoreType: WodScoreType;
  scores: WodScoreItem[];
}

interface Props {
  wods: WodItem[];
  isAdmin: boolean;
  member: SessionMember | null;
}

const FORMAT_CLASS: Record<WodFormat, string> = {
  amrap: "t-wod",
  for_time: "t-comp",
  emom: "t-social",
  strength: "t-open",
  hyrox: "t-hyrox",
};

const MEDALS = ["🥇", "🥈", "🥉"];

function formatScore(value: number, scoreType: WodScoreType): string {
  if (scoreType === "time") return formatSeconds(value);
  if (scoreType === "weight") return `${value}kg`;
  if (scoreType === "rounds") return `${value} rondas`;
  return `${value} reps`;
}

export default function WodSection({ wods: initial, isAdmin, member }: Props) {
  const [wods, setWods] = useState(initial);
  const [scoring, setScoring] = useState<WodItem | null>(null);
  const [creating, setCreating] = useState(false);

  /** A score is attributed from the session, so an account is required. */
  const requestScore = (wod: WodItem) => {
    if (!member) {
      toast("Inicia sesión para registrar tu score.", "info");
      emit(OPEN_LOGIN);
      return;
    }
    setScoring(wod);
  };

  const deleteWod = async (wod: WodItem) => {
    const res = await fetch(`/api/wods/${wod.id}/delete`, { method: "DELETE" });
    if (res.ok) {
      setWods((list) => list.filter((w) => w.id !== wod.id));
      toast(`"${wod.name}" eliminado.`, "success");
    } else {
      toast("No se pudo eliminar el WOD.", "error");
    }
  };

  return (
    <Fragment>
      <div class="section-head">
        <div>
          <h2>Workout of the day</h2>
          <p class="section-sub">
            El pizarrón del box: apunta tu score y compárate con el club
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            class="btn dark"
            onClick={() => setCreating(true)}
          >
            + Publicar WOD
          </button>
        )}
      </div>

      {wods.length === 0 && (
        <div class="empty-state">
          <div class="empty-icon" aria-hidden="true">📋</div>
          <h3>El pizarrón está vacío</h3>
          <p class="muted">
            {isAdmin
              ? "Publica el primer WOD y el club podrá registrar sus scores."
              : "Todavía no hay ningún WOD publicado. Vuelve pronto."}
          </p>
        </div>
      )}

      <div class="grid cards2">
        {wods.map((wod) => (
          <article key={wod.id} class="card wod-card">
            <div class="card-body">
              <div class="card-top">
                <div class="card-titles">
                  <span class={`tag ${FORMAT_CLASS[wod.format]}`}>
                    {WOD_FORMAT_LABELS[wod.format]}
                  </span>
                  <h3>{wod.name}</h3>
                </div>
                <span class="badge">
                  {formatCalendarDate(wod.date, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>

              <pre class="wod-board">{wod.description}</pre>

              <div class="wod-meta">
                <span>Score: {WOD_SCORE_LABELS[wod.scoreType]}</span>
                {wod.timeCapMinutes && <span>⏱ Cap {wod.timeCapMinutes}′</span>}
                <span>
                  {wod.scores.length}{" "}
                  {wod.scores.length === 1 ? "score" : "scores"}
                </span>
              </div>

              {wod.scores.length > 0 && (
                <ol class="wod-scores">
                  {wod.scores.slice(0, 5).map((s, i) => (
                    <li key={s.id}>
                      <span class="rank">
                        {i < 3 ? MEDALS[i] : `#${i + 1}`}
                      </span>
                      <span class="wod-athlete">
                        {s.memberName}
                        <span class={`tag ${s.scaled ? "t-scaled" : "t-rx"}`}>
                          {s.scaled ? "Scaled" : "Rx"}
                        </span>
                      </span>
                      <b>{formatScore(s.value, wod.scoreType)}</b>
                    </li>
                  ))}
                </ol>
              )}

              <div class="actions">
                <button
                  type="button"
                  class="btn green"
                  onClick={() => requestScore(wod)}
                >
                  Registrar mi score
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    class="btn red"
                    onClick={() => deleteWod(wod)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {scoring && member && (
        <ScoreModal
          wod={scoring}
          member={member}
          onClose={() => setScoring(null)}
        />
      )}
      {creating && <WodFormModal onClose={() => setCreating(false)} />}
    </Fragment>
  );
}

function ScoreModal(
  { wod, member, onClose }: {
    wod: WodItem;
    member: SessionMember;
    onClose: () => void;
  },
) {
  const [value, setValue] = useState("");
  const [scaled, setScaled] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const isTime = wod.scoreType === "time";

  const submit = async (e: Event) => {
    e.preventDefault();

    const numeric = isTime ? parseTimeToSeconds(value) : Number(value);
    if (numeric === null || !Number.isFinite(numeric) || numeric <= 0) {
      toast(
        isTime
          ? "Introduce un tiempo válido en formato mm:ss."
          : "Introduce un número positivo.",
        "error",
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/wods/${wod.id}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Attribution comes from the session; times go over the wire as mm:ss
        // and are parsed server-side too, so the API stays usable without the
        // form.
        body: JSON.stringify({
          value: isTime ? value.trim() : numeric,
          scaled,
          notes: notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast("¡Score enviado! Se publicará tras revisarlo.", "success");
        onClose();
      } else {
        if (res.status === 401) {
          onClose();
          toast("Tu sesión ha caducado. Vuelve a iniciarla.", "info");
          setTimeout(() => emit(OPEN_LOGIN), 0);
          return;
        }
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo registrar el score.", "error");
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
      title="Registrar score"
      subtitle={`${wod.name} · ${WOD_SCORE_LABELS[wod.scoreType]}`}
      onClose={onClose}
    >
      <form class="form" onSubmit={submit}>
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
            Resultado{" "}
            <em>({isTime ? "mm:ss" : WOD_SCORE_LABELS[wod.scoreType]})</em>
          </span>
          <input
            class="input"
            type={isTime ? "text" : "number"}
            inputMode={isTime ? "text" : "decimal"}
            required
            min={isTime ? undefined : "0"}
            placeholder={isTime ? "12:40" : "120"}
            value={value}
            onInput={(e) => setValue((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="check">
          <input
            type="checkbox"
            checked={scaled}
            onChange={(e) => setScaled((e.target as HTMLInputElement).checked)}
          />
          <span>Lo hice escalado (scaled)</span>
        </label>
        <label class="field">
          <span>
            Notas <em>(opcional)</em>
          </span>
          <textarea
            class="input"
            placeholder="Pesos usados, escalados, sensaciones…"
            value={notes}
            onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
          />
        </label>
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Enviando…" : "Enviar score"}
        </button>
      </form>
    </Modal>
  );
}

function WodFormModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState<WodFormat>("for_time");
  const [description, setDescription] = useState("");
  const [scoreType, setScoreType] = useState<WodScoreType>("time");
  const [timeCap, setTimeCap] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast("El WOD necesita nombre y descripción.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          date,
          format,
          description: description.trim(),
          scoreType,
          timeCapMinutes: timeCap || undefined,
        }),
      });
      if (res.ok) {
        toast("WOD publicado.", "success");
        globalThis.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo publicar el WOD.", "error");
      }
    } catch {
      toast("Error de conexión. Inténtalo de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title="Publicar WOD" onClose={onClose}>
      <form class="form" onSubmit={submit}>
        <label class="field">
          <span>Nombre</span>
          <input
            class="input"
            type="text"
            required
            placeholder="Fran, Murph, Chipper del viernes…"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </label>
        <div class="field-row">
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
            <span>Formato</span>
            <select
              class="input"
              value={format}
              onChange={(e) =>
                setFormat((e.target as HTMLSelectElement).value as WodFormat)}
            >
              {Object.entries(WOD_FORMAT_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        <label class="field">
          <span>El workout</span>
          <textarea
            class="input wod-input"
            required
            placeholder={"21-15-9\nThrusters 43kg\nPull-ups"}
            value={description}
            onInput={(e) =>
              setDescription((e.target as HTMLTextAreaElement).value)}
          />
          <small class="hint">
            Se muestra tal cual, respetando los saltos de línea.
          </small>
        </label>
        <div class="field-row">
          <label class="field">
            <span>Cómo se puntúa</span>
            <select
              class="input"
              value={scoreType}
              onChange={(e) =>
                setScoreType(
                  (e.target as HTMLSelectElement).value as WodScoreType,
                )}
            >
              {Object.entries(WOD_SCORE_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </label>
          <label class="field">
            <span>
              Time cap <em>(min, opcional)</em>
            </span>
            <input
              class="input"
              type="number"
              min="1"
              placeholder="20"
              value={timeCap}
              onInput={(e) => setTimeCap((e.target as HTMLInputElement).value)}
            />
          </label>
        </div>
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Publicando…" : "Publicar WOD"}
        </button>
      </form>
    </Modal>
  );
}
