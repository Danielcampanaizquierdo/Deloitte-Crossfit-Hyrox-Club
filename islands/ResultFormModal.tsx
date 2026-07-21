/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { api } from "../lib/api.ts";
import { Event } from "../types/Event.ts";

export default function ResultFormModal() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    resultsText: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Parse results from textarea (format: "1. Member A - time/score")
      const resultLines = formData.resultsText
        .split("\n")
        .filter((line) => line.trim());
      const results = resultLines.map((line, index) => {
        const parts = line.split("-").map((p) => p.trim());
        return {
          position: index + 1,
          memberName: parts[0].replace(/^\d+\.\s*/, ""),
          time: parts[1] || undefined,
        };
      });

      await api.post("/api/results", {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        results,
      });
      setFormData({ title: "", description: "", date: "", resultsText: "" });
      const modal = document.getElementById("resultModal");
      if (modal) modal.style.display = "none";
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
        placeholder="Nombre de la competición"
        value={formData.title}
        onChange={(e) =>
          setFormData({ ...formData, title: (e.target as HTMLInputElement).value })
        }
        required
      />
      <input
        class="input"
        type="date"
        value={formData.date}
        onChange={(e) =>
          setFormData({ ...formData, date: (e.target as HTMLInputElement).value })
        }
        required
      />
      <textarea
        class="input"
        placeholder="Descripción y resultados"
        value={formData.description}
        onChange={(e) =>
          setFormData({
            ...formData,
            description: (e.target as HTMLTextAreaElement).value,
          })
        }
        required
      ></textarea>
      <textarea
        class="input"
        placeholder='Resultados (formato: 1. Nombre - Tiempo)\n2. Otro - Tiempo'
        value={formData.resultsText}
        onChange={(e) =>
          setFormData({
            ...formData,
            resultsText: (e.target as HTMLTextAreaElement).value,
          })
        }
      ></textarea>
      {error && <div style="color:var(--danger);font-size:12px">{error}</div>}
      <button class="btn green" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar resultado"}
      </button>
    </form>
  );
}
