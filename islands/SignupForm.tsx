/** @jsxImportSource preact */
import { useState } from "preact/hooks";

interface EventOption {
  id: string;
  title: string;
  date: string;
}

interface Props {
  events: EventOption[];
}

export default function SignupForm({ events }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [comments, setComments] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const close = () => {
    const modal = document.getElementById("signupModal");
    if (modal) modal.style.display = "none";
  };

  const handleSubmit = async () => {
    if (!name || !email || !eventId) {
      setStatus("error");
      setMessage("Por favor rellena nombre, email y evento.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(`/api/events/${eventId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName: name, memberEmail: email, comments }),
      });
      if (res.ok) {
        setStatus("success");
        setMessage("¡Te has apuntado con éxito!");
        setName("");
        setEmail("");
        setComments("");
        setTimeout(close, 1500);
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error || "Error al apuntarse.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión.");
    }
  };

  return (
    <div id="signupModal" class="modal-back">
      <div class="modal">
        <div class="modal-head">
          <h3>Apuntarse a evento</h3>
          <button class="close" onClick={close}>×</button>
        </div>
        <div class="form">
          <input
            class="input"
            type="text"
            placeholder="Tu nombre"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
          <input
            class="input"
            type="email"
            placeholder="Tu email"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          />
          <select
            class="input"
            value={eventId}
            onChange={(e) => setEventId((e.target as HTMLSelectElement).value)}
          >
            <option value="">Selecciona un evento</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} — {new Date(ev.date).toLocaleDateString("es-ES")}
              </option>
            ))}
          </select>
          <textarea
            class="input"
            placeholder="Comentarios (opcional)"
            value={comments}
            onInput={(e) => setComments((e.target as HTMLTextAreaElement).value)}
          />
          {message && (
            <div style={`color:${status === "success" ? "var(--green)" : "var(--danger)"};font-size:13px`}>
              {message}
            </div>
          )}
          <button class="btn green" onClick={handleSubmit} disabled={status === "loading"}>
            {status === "loading" ? "Enviando..." : "Confirmar apuntación"}
          </button>
        </div>
      </div>
    </div>
  );
}
