/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { api } from "../lib/api.ts";
import { Event } from "../types/Event.ts";

export default function EventFormModal() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/api/events", formData);
      // Reset form
      setFormData({ title: "", description: "", date: "", location: "" });
      // Close modal
      const modal = document.getElementById("eventModal");
      if (modal) modal.style.display = "none";
      // Reload events (in real app, use state management)
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        class="input"
        type="text"
        placeholder="Nombre del evento"
        value={formData.title}
        onChange={(e) =>
          setFormData({ ...formData, title: (e.target as HTMLInputElement).value })
        }
        required
      />
      <textarea
        class="input"
        placeholder="Descripción"
        value={formData.description}
        onChange={(e) =>
          setFormData({
            ...formData,
            description: (e.target as HTMLTextAreaElement).value,
          })
        }
        required
      ></textarea>
      <input
        class="input"
        type="datetime-local"
        value={formData.date}
        onChange={(e) =>
          setFormData({ ...formData, date: (e.target as HTMLInputElement).value })
        }
        required
      />
      <input
        class="input"
        type="text"
        placeholder="Ubicación"
        value={formData.location}
        onChange={(e) =>
          setFormData({ ...formData, location: (e.target as HTMLInputElement).value })
        }
        required
      />
      {error && <div style="color:var(--danger);font-size:12px">{error}</div>}
      <button class="btn green" type="submit" disabled={loading}>
        {loading ? "Creando..." : "Crear evento"}
      </button>
    </form>
  );
}
