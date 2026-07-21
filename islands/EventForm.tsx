import { useState } from "preact/hooks";

export default function EventForm() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const close = () => {
    const modal = document.getElementById("eventModal");
    if (modal) modal.style.display = "none";
  };

  const handleSubmit = async () => {
    if (!title || !date || !description) {
      setStatus("error");
      setMessage("Título, fecha y descripción son requeridos.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, location, description }),
      });
      if (res.ok) {
        setStatus("success");
        setMessage("¡Evento creado!");
        setTitle("");
        setDate("");
        setLocation("");
        setDescription("");
        setTimeout(() => {
          close();
          globalThis.location.reload();
        }, 1500);
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error || "Error al crear evento.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión.");
    }
  };

  return (
    <div id="eventModal" class="modal-back">
      <div class="modal">
        <div class="modal-head">
          <h3>Añadir evento</h3>
          <button class="close" onClick={close}>×</button>
        </div>
        <div class="form">
          <input
            class="input"
            type="text"
            placeholder="Nombre del evento"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
          <input
            class="input"
            type="datetime-local"
            value={date}
            onInput={(e) => setDate((e.target as HTMLInputElement).value)}
          />
          <input
            class="input"
            type="text"
            placeholder="Ubicación"
            value={location}
            onInput={(e) => setLocation((e.target as HTMLInputElement).value)}
          />
          <textarea
            class="input"
            placeholder="Descripción del evento"
            value={description}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
          />
          {message && (
            <div style={`color:${status === "success" ? "var(--green)" : "var(--danger)"};font-size:13px`}>
              {message}
            </div>
          )}
          <button class="btn green" onClick={handleSubmit} disabled={status === "loading"}>
            {status === "loading" ? "Creando..." : "Crear evento"}
          </button>
        </div>
      </div>
    </div>
  );
}
