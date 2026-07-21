/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import Modal from "../components/Modal.tsx";
import { toast } from "../lib/toast.ts";
import { on, OPEN_JOIN } from "../lib/bus.ts";
import {
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
  { members: initial, prs, pendingCount }: Props,
) {
  const [members] = useState(initial);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [goal, setGoal] = useState("all");
  const [detail, setDetail] = useState<MemberItem | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  // Opened from the hero's "Crear perfil" button, which lives in its own
  // island and cannot reach this state directly.
  useEffect(() => on(OPEN_JOIN, () => setJoinOpen(true)), []);

  const prsByAthlete = useMemo(() => {
    const map = new Map<string, MemberPR[]>();
    for (const pr of prs) {
      const key = pr.memberName.trim().toLowerCase();
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
        <button type="button" class="btn green" onClick={() => setJoinOpen(true)}>
          + Crear perfil
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
          const count = prsByAthlete.get(m.name.trim().toLowerCase())?.length ?? 0;
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
              const own = prsByAthlete.get(detail.name.trim().toLowerCase()) ?? [];
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
                      <small>
                        {new Date(pr.date).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </small>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        </Modal>
      )}

      {joinOpen && <JoinModal onClose={() => setJoinOpen(false)} />}
    </Fragment>
  );
}

function JoinModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("beginner");
  const [goal, setGoal] = useState("crossfit");
  const [location, setLocation] = useState("Madrid");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !location.trim()) {
      toast("Rellena nombre, email y ciudad.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          level,
          goal,
          location: location.trim(),
          bio: bio.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast("¡Perfil enviado! Un admin lo aprobará en breve.", "success");
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo crear el perfil.", "error");
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
      title="Crear perfil"
      subtitle="Un admin lo revisará antes de publicarlo"
      onClose={onClose}
    >
      <form class="form" onSubmit={submit}>
        <label class="field">
          <span>Nombre</span>
          <input
            class="input"
            type="text"
            required
            placeholder="Tu nombre y apellido"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Email</span>
          <input
            class="input"
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          />
        </label>
        <div class="field-row">
          <label class="field">
            <span>Nivel</span>
            <select
              class="input"
              value={level}
              onChange={(e) => setLevel((e.target as HTMLSelectElement).value)}
            >
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="advanced">Avanzado</option>
            </select>
          </label>
          <label class="field">
            <span>Objetivo</span>
            <select
              class="input"
              value={goal}
              onChange={(e) => setGoal((e.target as HTMLSelectElement).value)}
            >
              <option value="crossfit">CrossFit</option>
              <option value="hyrox">HYROX</option>
              <option value="general">Fitness general</option>
            </select>
          </label>
        </div>
        <label class="field">
          <span>Ciudad</span>
          <input
            class="input"
            type="text"
            required
            placeholder="Madrid"
            value={location}
            onInput={(e) => setLocation((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Sobre ti <em>(opcional)</em></span>
          <textarea
            class="input"
            placeholder="Desde cuándo entrenas, objetivos, competiciones…"
            value={bio}
            onInput={(e) => setBio((e.target as HTMLTextAreaElement).value)}
          />
        </label>
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Enviando…" : "Crear mi perfil"}
        </button>
      </form>
    </Modal>
  );
}
