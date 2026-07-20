import { useState } from "preact/hooks";

const MOVEMENTS = [
  "Clean & Jerk",
  "Snatch",
  "Deadlift",
  "Back Squat",
  "Front Squat",
  "Overhead Press",
  "Bench Press",
  "Row",
];

export default function PRForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [movement, setMovement] = useState(MOVEMENTS[0]);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const close = () => {
    const modal = document.getElementById("prModal");
    if (modal) modal.style.display = "none";
  };

  const handleSubmit = async () => {
    if (!name || !email || !movement || !weight || !date) {
      setStatus("error");
      setMessage("Por favor rellena todos los campos.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/prs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName: name,
          memberEmail: email,
          movement,
          weight: Number(weight),
          date,
        }),
      });
      if (res.ok) {
        setStatus("success");
        setMessage("¡PR enviado para revisión!");
        setName("");
        setEmail("");
        setWeight("");
        setDate("");
        setTimeout(close, 1500);
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error || "Error al enviar PR.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión.");
    }
  };

  return (
    <div id="prModal" class="modal-back">
      <div class="modal">
        <div class="modal-head">
          <h3>Añadir PR</h3>
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
            value={movement}
            onChange={(e) => setMovement((e.target as HTMLSelectElement).value)}
          >
            {MOVEMENTS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            class="input"
            type="number"
            placeholder="Peso (kg)"
            value={weight}
            onInput={(e) => setWeight((e.target as HTMLInputElement).value)}
          />
          <input
            class="input"
            type="date"
            value={date}
            onInput={(e) => setDate((e.target as HTMLInputElement).value)}
          />
          {message && (
            <div style={`color:${status === "success" ? "var(--green)" : "var(--danger)"};font-size:13px`}>
              {message}
            </div>
          )}
          <button class="btn green" onClick={handleSubmit} disabled={status === "loading"}>
            {status === "loading" ? "Enviando..." : "Registrar PR"}
          </button>
        </div>
      </div>
    </div>
  );
}
