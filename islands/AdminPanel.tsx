import { useState } from "preact/hooks";

interface Props {
  isAdmin: boolean;
}

export default function AdminPanel({ isAdmin }: Props) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!passcode) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        globalThis.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || "Passcode incorrecto");
        setPasscode("");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    globalThis.location.reload();
  };

  if (isAdmin) {
    return (
      <div class="admin-box">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h2 style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:.1em;margin:0">
              Moderation tools
            </h2>
            <p class="muted">
              Review and approve member submissions for events, PRs, results and
              profile updates.
            </p>
          </div>
          <button class="btn dark" onClick={handleLogout} style="padding:8px 12px">
            Lock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="admin-box">
      <h2 style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:.1em;margin-top:0">
        Admin access
      </h2>
      <p class="muted">Introduce el passcode para acceder al panel de moderación.</p>
      <div class="form" style="max-width:520px">
        <input
          class="input"
          type="password"
          placeholder="Admin passcode"
          value={passcode}
          onInput={(e) => setPasscode((e.target as HTMLInputElement).value)}
          onKeyUp={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
        />
        {error && (
          <div style="color:var(--danger);font-size:12px;margin-top:8px">{error}</div>
        )}
        <button class="btn green" onClick={handleLogin} disabled={loading}>
          {loading ? "..." : "Unlock admin tools"}
        </button>
      </div>
    </div>
  );
}
