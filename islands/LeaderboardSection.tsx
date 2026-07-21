/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useMemo, useState } from "preact/hooks";
import Modal from "../components/Modal.tsx";
import { toast } from "../lib/toast.ts";
import { emit, OPEN_LOGIN } from "../lib/bus.ts";
import type { SessionMember } from "./MemberAuth.tsx";
import {
  formatPRValue,
  isHigherBetter,
  MOVEMENTS,
  type MovementCategory,
  movementCategory,
  movementMetric,
  metricUnit,
  parsePRValue,
  type PRMetric,
  rankByMetric,
} from "../lib/movements.ts";

export interface PRItem {
  id: string;
  memberName: string;
  movement: string;
  weight: number;
  metric?: PRMetric;
  date: string;
}

interface Props {
  prs: PRItem[];
  member: SessionMember | null;
}

const CATEGORIES: (MovementCategory | "Todos")[] = [
  "Todos",
  "Halterofilia",
  "Gimnásticos",
  "Benchmark",
  "Cardio",
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardSection({ prs: initial, member }: Props) {
  const [prs] = useState(initial);
  const [category, setCategory] = useState<MovementCategory | "Todos">("Todos");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  /** A PR is filed under the session's identity, so an account is required. */
  const requestForm = () => {
    if (!member) {
      toast("Inicia sesión para registrar tu PR.", "info");
      emit(OPEN_LOGIN);
      return;
    }
    setFormOpen(true);
  };

  const boards = useMemo(() => {
    const term = search.trim().toLowerCase();

    const byMovement = new Map<string, PRItem[]>();
    for (const pr of prs) {
      if (
        category !== "Todos" && movementCategory(pr.movement) !== category
      ) continue;
      const bucket = byMovement.get(pr.movement);
      if (bucket) bucket.push(pr);
      else byMovement.set(pr.movement, [pr]);
    }

    return [...byMovement.entries()]
      .map(([movement, entries]) => {
        const metric = entries[0].metric ?? movementMetric(movement);
        // Only one PR per athlete counts on a board: their best.
        const bestPerAthlete = new Map<string, PRItem>();
        for (const entry of entries) {
          const key = entry.memberName.trim().toLowerCase();
          const current = bestPerAthlete.get(key);
          if (!current) {
            bestPerAthlete.set(key, entry);
            continue;
          }
          const better = isHigherBetter(metric)
            ? entry.weight > current.weight
            : entry.weight < current.weight;
          if (better) bestPerAthlete.set(key, entry);
        }

        const ranked = rankByMetric([...bestPerAthlete.values()], metric);
        return { movement, metric, ranked };
      })
      .filter(({ ranked }) =>
        !term ||
        ranked.some((r) => r.memberName.toLowerCase().includes(term))
      )
      .sort((a, b) =>
        b.ranked.length - a.ranked.length || a.movement.localeCompare(b.movement)
      );
  }, [prs, category, search]);

  const athletes = new Set(prs.map((p) => p.memberName.trim().toLowerCase()));

  return (
    <Fragment>
      <div class="section-head">
        <div>
          <h2>PRs del club</h2>
          <p class="section-sub">
            {prs.length} récords · {athletes.size}{" "}
            {athletes.size === 1 ? "atleta" : "atletas"}
          </p>
        </div>
        <button
          type="button"
          class="btn green"
          onClick={() => requestForm()}
        >
          + Registrar PR
        </button>
      </div>

      <div class="filters filters-lb">
        <input
          class="input"
          type="search"
          placeholder="Buscar atleta…"
          value={search}
          aria-label="Buscar atleta"
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
        <div class="chips" role="group" aria-label="Filtrar por categoría">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              class={`chip ${category === c ? "active" : ""}`}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {boards.length === 0 && (
        <div class="empty-state">
          <div class="empty-icon" aria-hidden="true">🏋️</div>
          <h3>Todavía no hay récords aquí</h3>
          <p class="muted">
            {prs.length === 0
              ? "Sé el primero en registrar un PR del club."
              : "Prueba con otra categoría o limpia la búsqueda."}
          </p>
          <button
            type="button"
            class="btn green"
            onClick={() => requestForm()}
          >
            Registrar el primero
          </button>
        </div>
      )}

      <div class="grid cards2">
        {boards.map(({ movement, metric, ranked }) => {
          const best = ranked[0].weight;
          return (
            <article key={movement} class="card leader-card">
              <div class="card-body">
                <div class="card-top">
                  <h3>{movement}</h3>
                  <span class="tag t-metric">{movementCategory(movement)}</span>
                </div>
                {ranked.slice(0, 5).map((entry, i) => {
                  // A time board's bar is inverted: the fastest athlete fills
                  // the bar and slower times shrink away from it.
                  const pct = isHigherBetter(metric)
                    ? Math.round((entry.weight / best) * 100)
                    : Math.round((best / entry.weight) * 100);
                  return (
                    <div key={entry.id} class="row">
                      <div class="rank">
                        {i < 3 ? MEDALS[i] : `#${i + 1}`}
                      </div>
                      <div class="row-main">
                        <b>{entry.memberName}</b>
                        <div class="bar">
                          <div
                            class={`fill ${i === 0 ? "is-best" : ""}`}
                            style={`width:${Math.max(6, pct)}%`}
                          />
                        </div>
                      </div>
                      <div class="row-value">
                        <b>{formatPRValue(entry.weight, metric)}</b>
                      </div>
                    </div>
                  );
                })}
                {ranked.length > 5 && (
                  <p class="muted more-note">
                    +{ranked.length - 5}{" "}
                    {ranked.length - 5 === 1 ? "atleta más" : "atletas más"}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {formOpen && member && (
        <PRFormModal
          member={member}
          onClose={() => setFormOpen(false)}
          onSubmitted={() => setFormOpen(false)}
        />
      )}
    </Fragment>
  );
}

function PRFormModal(
  { member, onClose, onSubmitted }: {
    member: SessionMember;
    onClose: () => void;
    onSubmitted: () => void;
  },
) {
  const [movement, setMovement] = useState(MOVEMENTS[0].name);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const metric = movementMetric(movement);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!date) {
      toast("Indica la fecha del PR.", "error");
      return;
    }

    // Validated client-side so a mistyped time gets an immediate, specific
    // message instead of a round trip.
    const numeric = parsePRValue(value, metric);
    if (numeric === null) {
      toast(
        metric === "time"
          ? "Introduce un tiempo válido en formato mm:ss."
          : "Introduce un número positivo.",
        "error",
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/prs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The PR is filed under whoever the session says you are.
        body: JSON.stringify({ movement, weight: numeric, metric, date }),
      });
      if (res.ok) {
        toast("¡PR enviado! Aparecerá en cuanto lo revise un admin.", "success");
        onSubmitted();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo registrar el PR.", "error");
      }
    } catch {
      toast("Error de conexión. Inténtalo de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  };

  const grouped = MOVEMENTS.reduce<Record<string, string[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m.name);
    return acc;
  }, {});

  return (
    <Modal
      open
      title="Registrar PR"
      subtitle="Lo revisará un admin antes de publicarse"
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
          <span>Movimiento</span>
          <select
            class="input"
            value={movement}
            onChange={(e) => {
              setMovement((e.target as HTMLSelectElement).value);
              // The unit changes with the movement, so a value typed for the
              // previous one would be misread.
              setValue("");
            }}
          >
            {Object.entries(grouped).map(([cat, names]) => (
              <optgroup key={cat} label={cat}>
                {names.map((n) => <option key={n} value={n}>{n}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label class="field">
          <span>
            Marca <em>({metricUnit(metric)})</em>
          </span>
          <input
            class="input"
            type={metric === "time" ? "text" : "number"}
            inputMode={metric === "time" ? "text" : "decimal"}
            required
            step={metric === "reps" ? "1" : "any"}
            min={metric === "time" ? undefined : "0"}
            placeholder={metric === "time"
              ? "3:21"
              : metric === "reps"
              ? "42"
              : "100"}
            value={value}
            onInput={(e) => setValue((e.target as HTMLInputElement).value)}
          />
          <small class="hint">
            {metric === "time"
              ? "Formato mm:ss (o h:mm:ss). Menos tiempo es mejor."
              : metric === "reps"
              ? "Número de repeticiones sin parar."
              : "Peso en kilogramos."}
          </small>
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
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Enviando…" : "Registrar PR"}
        </button>
      </form>
    </Modal>
  );
}
