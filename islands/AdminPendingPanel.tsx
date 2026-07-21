import { useState } from "preact/hooks";

interface PendingMember {
  id: string;
  name: string;
  email: string;
  level: string;
  goal: string;
}

interface PendingPR {
  id: string;
  memberName: string;
  memberEmail: string;
  movement: string;
  weight: number;
}

interface PendingEvent {
  id: string;
  title: string;
  date: string;
}

interface PendingResult {
  id: string;
  name: string;
  date: string;
}

interface Props {
  members: PendingMember[];
  prs: PendingPR[];
  events: PendingEvent[];
  results: PendingResult[];
}

function PendingCard({ label, onApprove, onReject }: { label: string; onApprove: () => void; onReject?: () => void }) {
  return (
    <div class="pending-item">
      <b>{label}</b>
      <div class="actions" style="margin-top:8px;gap:8px">
        <button class="btn green" style="flex:1;padding:8px" onClick={onApprove}>
          Approve
        </button>
        {onReject && (
          <button class="btn red" style="flex:1;padding:8px" onClick={onReject}>
            Reject
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminPendingPanel({
  members: initialMembers,
  prs: initialPRs,
  events: initialEvents,
  results: initialResults,
}: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [prs, setPRs] = useState(initialPRs);
  const [events, setEvents] = useState(initialEvents);
  const [results, setResults] = useState(initialResults);

  const approveMember = async (id: string) => {
    const res = await fetch(`/api/members/${id}/approve`, { method: "POST" });
    if (res.ok) setMembers((m) => m.filter((x) => x.id !== id));
  };

  const rejectMember = async (id: string) => {
    const res = await fetch(`/api/members/${id}/reject`, { method: "POST" });
    if (res.ok) setMembers((m) => m.filter((x) => x.id !== id));
  };

  const approvePR = async (id: string) => {
    const res = await fetch(`/api/prs/${id}/approve`, { method: "POST" });
    if (res.ok) setPRs((p) => p.filter((x) => x.id !== id));
  };

  const rejectPR = async (id: string) => {
    const res = await fetch(`/api/prs/${id}/delete`, { method: "DELETE" });
    if (res.ok) setPRs((p) => p.filter((x) => x.id !== id));
  };

  const approveEvent = async (id: string) => {
    const res = await fetch(`/api/events/${id}/approve`, { method: "POST" });
    if (res.ok) setEvents((e) => e.filter((x) => x.id !== id));
  };

  const rejectEvent = async (id: string) => {
    const res = await fetch(`/api/events/${id}/delete`, { method: "DELETE" });
    if (res.ok) setEvents((e) => e.filter((x) => x.id !== id));
  };

  const approveResult = async (id: string) => {
    const res = await fetch(`/api/results/${id}/approve`, { method: "POST" });
    if (res.ok) setResults((r) => r.filter((x) => x.id !== id));
  };

  return (
    <div class="grid cards2" style="margin-top:16px">
      <div class="pending">
        <h3>
          Pending events <span class="badge">{events.length} pending</span>
        </h3>
        {events.length === 0 && (
          <p class="muted" style="font-size:13px">No hay eventos pendientes.</p>
        )}
        {events.map((ev) => (
          <PendingCard
            key={ev.id}
            label={`${ev.title} · ${new Date(ev.date).toLocaleDateString("es-ES")}`}
            onApprove={() => approveEvent(ev.id)}
            onReject={() => rejectEvent(ev.id)}
          />
        ))}
      </div>

      <div class="pending">
        <h3>
          Pending PRs <span class="badge">{prs.length} pending</span>
        </h3>
        {prs.length === 0 && (
          <p class="muted" style="font-size:13px">No hay PRs pendientes.</p>
        )}
        {prs.map((pr) => (
          <PendingCard
            key={pr.id}
            label={`${pr.memberName} · ${pr.movement} · ${pr.weight}kg`}
            onApprove={() => approvePR(pr.id)}
            onReject={() => rejectPR(pr.id)}
          />
        ))}
      </div>

      <div class="pending">
        <h3>
          Pending results <span class="badge">{results.length} pending</span>
        </h3>
        {results.length === 0 && (
          <p class="muted" style="font-size:13px">No hay resultados pendientes.</p>
        )}
        {results.map((result) => (
          <PendingCard
            key={result.id}
            label={`${result.name} · ${new Date(result.date).toLocaleDateString("es-ES")}`}
            onApprove={() => approveResult(result.id)}
          />
        ))}
      </div>

      <div class="pending">
        <h3>
          Pending members <span class="badge">{members.length} pending</span>
        </h3>
        {members.length === 0 && (
          <p class="muted" style="font-size:13px">No hay miembros pendientes.</p>
        )}
        {members.map((m) => (
          <PendingCard
            key={m.id}
            label={`${m.name} · ${m.level} · ${m.goal}`}
            onApprove={() => approveMember(m.id)}
            onReject={() => rejectMember(m.id)}
          />
        ))}
      </div>
    </div>
  );
}
