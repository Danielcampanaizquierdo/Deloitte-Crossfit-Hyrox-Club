/** @jsxImportSource preact */
import { useState } from "preact/hooks";

export default function MemberForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("beginner");
  const [goal, setGoal] = useState("crossfit");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const close = () => {
    const modal = document.getElementById("memberModal");
    if (modal) modal.style.display = "none";
  };

  const handleSubmit = async () => {
    if (!name || !email || !location) {
      setStatus("error");
      setMessage("Nombre, email y ubicación son requeridos.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, level, goal, location }),
      });
      if (res.ok) {
        setStatus("success");
        setMessage("¡Perfil creado! Pendiente de aprobación.");
        setName("");
        setEmail("");
        setLocation("");
        setTimeout(close, 2000);
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error || "Error al crear perfil.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión.");
    }
  };

  return (
    <div id="memberModal" class="modal-back">
      <div class="modal">
        <div class="modal-head">
          <h3>Crear perfil</h3>
          <button class="close" onClick={close}>×</button>
        </div>
        <div class="form">
          <input
            class="input"
            type="text"
            placeholder="Nombre completo"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
          <input
            class="input"
            type="email"
            placeholder="Email"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          />
          <select
            class="input"
            value={level}
            onChange={(e) => setLevel((e.target as HTMLSelectElement).value)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <select
            class="input"
            value={goal}
            onChange={(e) => setGoal((e.target as HTMLSelectElement).value)}
          >
            <option value="crossfit">CrossFit</option>
            <option value="hyrox">HYROX</option>
            <option value="general">General fitness</option>
          </select>
          <input
            class="input"
            type="text"
            placeholder="Ubicación"
            value={location}
            onInput={(e) => setLocation((e.target as HTMLInputElement).value)}
          />
          {message && (
            <div style={`color:${status === "success" ? "var(--green)" : "var(--danger)"};font-size:13px`}>
              {message}
            </div>
          )}
          <button class="btn green" onClick={handleSubmit} disabled={status === "loading"}>
            {status === "loading" ? "Enviando..." : "Crear perfil"}
          </button>
        </div>
      </div>
    </div>
  );
}
