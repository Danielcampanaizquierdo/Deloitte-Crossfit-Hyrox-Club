import { useState } from "preact/hooks";
import { api } from "../lib/api.ts";
import { Event } from "../types/Event.ts";

export default function PRFormModal() {
  const [formData, setFormData] = useState({
    memberId: "",
    movement: "clean_and_jerk",
    weight: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // For now, use a default member ID - in real app, get from user selection
      await api.post("/api/prs", {
        ...formData,
        memberId: "mbr-001",
        weight: parseInt(formData.weight),
      });
      setFormData({
        memberId: "",
        movement: "clean_and_jerk",
        weight: "",
        date: new Date().toISOString().split("T")[0],
      });
      const modal = document.getElementById("prModal");
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
      <select
        class="input"
        value={formData.movement}
        onChange={(e) =>
          setFormData({ ...formData, movement: (e.target as HTMLSelectElement).value })
        }
      >
        <option value="clean_and_jerk">Clean & Jerk</option>
        <option value="snatch">Snatch</option>
        <option value="deadlift">Deadlift</option>
        <option value="squat">Squat</option>
        <option value="bench_press">Bench Press</option>
        <option value="back_squat">Back Squat</option>
        <option value="front_squat">Front Squat</option>
      </select>
      <input
        class="input"
        type="number"
        placeholder="Peso (kg)"
        value={formData.weight}
        onChange={(e) =>
          setFormData({ ...formData, weight: (e.target as HTMLInputElement).value })
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
      {error && <div style="color:var(--danger);font-size:12px">{error}</div>}
      <button class="btn green" type="submit" disabled={loading}>
        {loading ? "Registrando..." : "Registrar PR"}
      </button>
    </form>
  );
}
