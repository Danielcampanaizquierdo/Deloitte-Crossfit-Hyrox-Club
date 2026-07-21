/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
import { useState } from "preact/hooks";

type LevelType = "all" | "beginner" | "intermediate" | "advanced";
type GoalType = "all" | "crossfit" | "hyrox" | "general";

interface MemberItem {
  id: string;
  name: string;
  level: string;
  goal: string;
  location: string;
}

interface Props {
  members: MemberItem[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function goalLabel(goal: string) {
  if (goal === "crossfit") return "CrossFit";
  if (goal === "hyrox") return "HYROX";
  return "General fitness";
}

export default function MembersFilter({ members }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [level, setLevel] = useState<LevelType>("all");
  const [goal, setGoal] = useState<GoalType>("all");

  const filtered = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      m.name.toLowerCase().includes(term) ||
      m.level.includes(term) ||
      m.goal.includes(term) ||
      m.location.toLowerCase().includes(term);
    const matchesLevel = level === "all" || m.level === level;
    const matchesGoal = goal === "all" || m.goal === goal;
    return matchesSearch && matchesLevel && matchesGoal;
  });

  return (
    <>
      <div class="filters">
        <input
          class="input"
          placeholder="Search member, goal, location..."
          value={searchTerm}
          onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
        />
        <select
          class="input"
          value={level}
          onChange={(e) => setLevel((e.target as HTMLSelectElement).value as LevelType)}
        >
          <option value="all">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          class="input"
          value={goal}
          onChange={(e) => setGoal((e.target as HTMLSelectElement).value as GoalType)}
        >
          <option value="all">All goals</option>
          <option value="crossfit">CrossFit</option>
          <option value="hyrox">HYROX</option>
          <option value="general">General fitness</option>
        </select>
      </div>

      <div class="grid cards3">
        {filtered.length === 0 && (
          <p class="muted">No hay miembros que coincidan con los filtros.</p>
        )}
        {filtered.map((m) => (
          <article key={m.id} class="card member-card">
            <div class="card-body">
              <div class="member-head">
                <div class="avatar">{initials(m.name)}</div>
                <div>
                  <h3>{m.name}</h3>
                  <div class="meta">📍 {m.location}</div>
                </div>
              </div>
              <div style="margin-top:12px">
                <div class="eyebrow">Focus</div>
                <p class="muted">{goalLabel(m.goal)}</p>
                <div class="eyebrow" style="margin-top:10px">Level</div>
                <p class="muted">
                  {m.level.charAt(0).toUpperCase() + m.level.slice(1)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
