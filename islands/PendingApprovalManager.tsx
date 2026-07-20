import { useState } from "preact/hooks";
import { api } from "../lib/api.ts";

interface PendingItem {
  id: string;
  title: string;
  description: string;
  type: "member" | "pr" | "result";
}

export default function PendingApprovalManager() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleApprove = async (type: string, id: string) => {
    setLoading(true);
    try {
      await api.post(`/api/admin/${type}s/${id}/approve`, {});
      setMessage(`✓ ${type} aprobado`);
      setTimeout(() => {
        setMessage("");
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (type: string, id: string) => {
    setLoading(true);
    try {
      await api.delete(`/api/${type}s/${id}`);
      setMessage(`✗ ${type} rechazado`);
      setTimeout(() => {
        setMessage("");
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {message && (
        <div
          style={{
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "6px",
            background: message.includes("Error")
              ? "rgba(255, 107, 107, .2)"
              : "rgba(134, 188, 37, .2)",
            color: message.includes("Error") ? "var(--danger)" : "var(--green)",
            fontSize: "12px",
          }}
        >
          {message}
        </div>
      )}
      <div style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? "none" : "auto" }}>
        {/* Approve/Reject buttons are handled inline in the admin panel */}
      </div>
    </div>
  );
}
