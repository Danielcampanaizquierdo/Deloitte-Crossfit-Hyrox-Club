/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useMemo, useState } from "preact/hooks";
import Modal from "../components/Modal.tsx";
import { emit, OPEN_JOIN } from "../lib/bus.ts";
import {
  formatCalendarDate,
  formatPRValue,
  movementMetric,
  type PRMetric,
} from "../lib/movements.ts";

export interface MemberItem {
  id: string;
  name: string;
  level: string;
  goal: string;
  location: string;
  bio?: string;
}

interface MemberPR {
  athleteId: string;
  memberName: string;
  movement: string;
  weight: number;
  metric?: PRMetric;
  date: string;
}

interface Props {
  members: MemberItem[];
  prs: MemberPR[];
  pendingCount: number;
}

const LEVELS: Record<string, { label: string; cls: string }> = {
  beginner: { label: "Principiante", cls: "lvl-b" },
  intermediate: { label: "Intermedio", cls: "lvl-i" },
  advanced: { label: "Avanzado", cls: "lvl-a" },
};

const GOALS: Record<string, string> = {
  crossfit: "CrossFit",
  hyrox: "HYROX",
  general: "Fitness general",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function MembersSection(
  { members, prs, pendingCount }: Props,
) {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [goal, setGoal] = useState("all");
  const [detail, setDetail] = useState<MemberItem | null>(null);

  const prsByAthlete = useMemo(() => {
    const map = new Map<string, MemberPR[]>();
    for (const pr of prs) {
      const key = pr.athleteId;
      const bucket = map.get(key);
      if (bucket) bucket.push(pr);
      else map.set(key, [pr]);
    }
    return map;
  }, [prs]);

  const filtered = members.filter((m) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term ||
      m.name.toLowerCase().includes(term) ||
      m.location.toLowerCase().includes(term) ||
      (GOALS[m.goal] ?? "").toLowerCase().includes(term);
    return matchesSearch &&
      (level === "all" || m.level === level) &&
      (goal === "all" || m.goal === goal);
  });

  const stats = [
    { label: "Miembros", value: members.length },
    {
      label: "Competidores",
      value: members.filter((m) => m.level === "advanced").length,
    },
    {
      label: "Foco HYROX",
      value: members.filter((m) => m.goal === "hyrox").length,
    },
    { label: "Pendientes", value: pendingCount },
  ];

  return (
    <Fragment>
      <div class="section-head">
        <div>
          <h2>La comunidad</h2>
          <p class="section-sub">
            {members.length} {members.length === 1 ? "atleta" : "atletas"} en el
            club
          </p>
        </div>
        <button type="button" class="btn green" onClick={() => emit(OPEN_JOIN)}>
          + Crear cuenta
        </button>
      </div>

      <div class="stats">
        {stats.map((s) => (
          <div key={s.label} class="stat">
            <small>{s.label}</small>
            <b>{s.value}</b>
          </div>
        ))}
      </div>

      <div class="filters">
        <input
          class="input"
          type="search"
          placeholder="Buscar por nombre, ciudad u objetivo…"
          aria-label="Buscar miembro"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
        <select
          class="input"
          aria-label="Filtrar por nivel"
          value={level}
          onChange={(e) => setLevel((e.target as HTMLSelectElement).value)}
        >
          <option value="all">Todos los niveles</option>
          <option value="beginner">Principiante</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzado</option>
        </select>
        <select
          class="input"
          aria-label="Filtrar por objetivo"
          value={goal}
          onChange={(e) => setGoal((e.target as HTMLSelectElement).value)}
        >
          <option value="all">Todos los objetivos</option>
          <option value="crossfit">CrossFit</option>
          <option value="hyrox">HYROX</option>
          <option value="general">Fitness general</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <div class="empty-state">
          <div class="empty-icon" aria-hidden="true">👥</div>
          <h3>
            {members.length === 0
              ? "Todavía no hay perfiles"
              : "Ningún miembro coincide"}
          </h3>
          <p class="muted">
            {members.length === 0
              ? "Crea el primer perfil del club."
              : "Prueba a limpiar los filtros o buscar otra cosa."}
          </p>
        </div>
      )}

      <div class="grid cards3">
        {filtered.map((m) => {
          const lvl = LEVELS[m.level] ?? { label: m.level, cls: "lvl-b" };
          const count = prsByAthlete.get(m.id)?.length ?? 0;
          return (
            <article
              key={m.id}
              class="card member-card is-clickable"
              tabIndex={0}
              role="button"
              aria-label={`Ver perfil de ${m.name}`}
              onClick={() => setDetail(m)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetail(m);
                }
              }}
            >
              <div class="card-body">
                <div class="member-head">
                  <div class="avatar">{initials(m.name)}</div>
                  <div>
                    <h3>{m.name}</h3>
                    <div class="meta"><span>📍 {m.location}</span></div>
                  </div>
                </div>
                <div class="member-tags">
                  <span class={`tag ${lvl.cls}`}>{lvl.label}</span>
                  <span class="tag t-goal">{GOALS[m.goal] ?? m.goal}</span>
                </div>
                <div class="member-foot">
                  <span>{count} {count === 1 ? "PR" : "PRs"}</span>
                  <span class="link-like">Ver perfil →</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {detail && (
        <Modal
          open
          title={detail.name}
          subtitle={`${LEVELS[detail.level]?.label ?? detail.level} · ${
            GOALS[detail.goal] ?? detail.goal
          }`}
          onClose={() => setDetail(null)}
        >
          <div class="profile">
            <div class="profile-head">
              <div class="avatar avatar-lg">{initials(detail.name)}</div>
              <div>
                <div class="meta"><span>📍 {detail.location}</span></div>
                {detail.bio && <p class="muted">{detail.bio}</p>}
              </div>
            </div>

            <h4 class="profile-sub">Récords personales</h4>
            {(() => {
              const own = prsByAthlete.get(detail.id) ?? [];
              if (own.length === 0) {
                return (
                  <p class="muted">
                    Todavía no ha registrado ningún PR aprobado.
                  </p>
                );
              }
              const sorted = [...own].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              return (
                <ul class="profile-prs">
                  {sorted.map((pr, i) => (
                    <li key={`${pr.movement}-${i}`}>
                      <span>{pr.movement}</span>
                      <b>
                        {formatPRValue(
                          pr.weight,
                          pr.metric ?? movementMetric(pr.movement),
                        )}
                      </b>
                      <small>{formatCalendarDate(pr.date)}</small>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        </Modal>
      )}

    </Fragment>
  );
}
