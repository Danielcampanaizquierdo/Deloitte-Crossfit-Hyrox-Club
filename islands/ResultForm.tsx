/** @jsxImportSource preact */
import { useState } from "preact/hooks";

export default function ResultForm() {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const close = () => {
    const modal = document.getElementById("resultModal");
    if (modal) modal.style.display = "none";
  };

  const handleSubmit = async () => {
    if (!name || !date || !description) {
      setStatus("error");
      setMessage("Nombre, fecha y descripción son requeridos.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          date,
          description,
          photoUrl: photoUrl || undefined,
        }),
      });
      if (res.ok) {
        setStatus("success");
        setMessage("¡Resultado guardado!");
        setName("");
        setDate("");
        setDescription("");
        setPhotoUrl("");
        setTimeout(() => {
          close();
          globalThis.location.reload();
        }, 1500);
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error || "Error al guardar resultado.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión.");
    }
  };

  return (
    <div id="resultModal" class="modal-back">
      <div class="modal">
        <div class="modal-head">
          <h3>Añadir resultado</h3>
          <button class="close" onClick={close}>×</button>
        </div>
        <div class="form">
          <input
            class="input"
            type="text"
            placeholder="Nombre de la competición"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
          <input
            class="input"
            type="date"
            value={date}
            onInput={(e) => setDate((e.target as HTMLInputElement).value)}
          />
          <textarea
            class="input"
            placeholder="Descripción y resultados"
            value={description}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
          />
          <input
            class="input"
            type="url"
            placeholder="URL de la foto (opcional)"
            value={photoUrl}
            onInput={(e) => setPhotoUrl((e.target as HTMLInputElement).value)}
          />
          {message && (
            <div style={`color:${status === "success" ? "var(--green)" : "var(--danger)"};font-size:13px`}>
              {message}
            </div>
          )}
          <button class="btn green" onClick={handleSubmit} disabled={status === "loading"}>
            {status === "loading" ? "Guardando..." : "Guardar resultado"}
          </button>
        </div>
      </div>
    </div>
  );
}
