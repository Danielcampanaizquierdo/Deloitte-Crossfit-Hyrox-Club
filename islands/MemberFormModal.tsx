import { useState } from "preact/hooks";
import { api } from "../lib/api.ts";
import { Event } from "../types/Event.ts";

export default function MemberFormModal() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    level: "beginner",
    goal: "crossfit",
    location: "",
    bio: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/api/members", formData);
      setFormData({
        name: "",
        email: "",
        level: "beginner",
        goal: "crossfit",
        location: "",
        bio: "",
      });
      const modal = document.getElementById("memberModal");
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
        placeholder="Nombre completo"
        value={formData.name}
        onChange={(e) =>
          setFormData({ ...formData, name: (e.target as HTMLInputElement).value })
        }
        required
      />
      <input
        class="input"
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) =>
          setFormData({ ...formData, email: (e.target as HTMLInputElement).value })
        }
        required
      />
      <select
        class="input"
        value={formData.level}
        onChange={(e) =>
          setFormData({ ...formData, level: (e.target as HTMLSelectElement).value })
        }
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <select
        class="input"
        value={formData.goal}
        onChange={(e) =>
          setFormData({ ...formData, goal: (e.target as HTMLSelectElement).value })
        }
      >
        <option value="crossfit">CrossFit</option>
        <option value="hyrox">HYROX</option>
        <option value="general">General fitness</option>
      </select>
      <input
        class="input"
        type="text"
        placeholder="Ubicación"
        value={formData.location}
        onChange={(e) =>
          setFormData({ ...formData, location: (e.target as HTMLInputElement).value })
        }
      />
      <textarea
        class="input"
        placeholder="Bio (opcional)"
        value={formData.bio}
        onChange={(e) =>
          setFormData({ ...formData, bio: (e.target as HTMLTextAreaElement).value })
        }
      ></textarea>
      {error && <div style="color:var(--danger);font-size:12px">{error}</div>}
      <button class="btn green" type="submit" disabled={loading}>
        {loading ? "Creando..." : "Crear perfil"}
      </button>
    </form>
  );
}
