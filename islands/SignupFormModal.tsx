/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { api } from "../lib/api.ts";
import { Event } from "../types/Event.ts";

export default function SignupFormModal() {
  const [formData, setFormData] = useState({
    eventId: "",
    memberName: "",
    memberEmail: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Get the first event ID from data attribute or default
      const eventId = (document.getElementById("signupModal") as any)?.dataset?.eventId || "evt-001";
      await api.post("/api/signups", { ...formData, eventId });
      setSuccess(true);
      setTimeout(() => {
        const modal = document.getElementById("signupModal");
        if (modal) modal.style.display = "none";
        setFormData({ eventId: "", memberName: "", memberEmail: "", notes: "" });
        setSuccess(false);
      }, 1500);
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
        placeholder="Tu nombre"
        value={formData.memberName}
        onChange={(e) =>
          setFormData({
            ...formData,
            memberName: (e.target as HTMLInputElement).value,
          })
        }
        required
      />
      <input
        class="input"
        type="email"
        placeholder="Tu email"
        value={formData.memberEmail}
        onChange={(e) =>
          setFormData({
            ...formData,
            memberEmail: (e.target as HTMLInputElement).value,
          })
        }
        required
      />
      <textarea
        class="input"
        placeholder="Comentarios (opcional)"
        value={formData.notes}
        onChange={(e) =>
          setFormData({ ...formData, notes: (e.target as HTMLTextAreaElement).value })
        }
      ></textarea>
      {error && <div style="color:var(--danger);font-size:12px">{error}</div>}
      {success && <div style="color:var(--green);font-size:12px">¡Apuntado correctamente!</div>}
      <button class="btn green" type="submit" disabled={loading || success}>
        {loading ? "Apuntando..." : success ? "✓ Confirmado" : "Confirmar apuntación"}
      </button>
    </form>
  );
}
