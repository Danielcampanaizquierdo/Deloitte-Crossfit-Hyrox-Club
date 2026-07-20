import { useState } from "preact/hooks";

const ADMIN_PASSCODE = "ClubAdmin2026";

export default function AdminPanel() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const handleUnlock = () => {
    if (passcode === ADMIN_PASSCODE) {
      setIsUnlocked(true);
      setError("");
      
      const lockedEl = document.getElementById("adminLocked");
      const openEl = document.getElementById("adminOpen");
      const adminOnlyEls = document.querySelectorAll(".admin-only");
      
      if (lockedEl) lockedEl.classList.add("hidden");
      if (openEl) openEl.classList.remove("hidden");
      adminOnlyEls.forEach((el) => el.classList.remove("hidden"));
    } else {
      setError("Passcode incorrecto");
      setPasscode("");
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setPasscode("");
    setError("");
    
    const lockedEl = document.getElementById("adminLocked");
    const openEl = document.getElementById("adminOpen");
    const adminOnlyEls = document.querySelectorAll(".admin-only");
    
    if (lockedEl) lockedEl.classList.remove("hidden");
    if (openEl) openEl.classList.add("hidden");
    adminOnlyEls.forEach((el) => el.classList.add("hidden"));
  };

  return (
    <div>
      {!isUnlocked && (
        <div id="adminLocked" class="admin-box">
          <h2 style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:.1em;margin-top:0">
            Admin access
          </h2>
          <p class="muted">
            Prototype moderation area. Use passcode <b>ClubAdmin2026</b>.
          </p>
          <div class="form" style="max-width:520px">
            <input
              class="input"
              type="password"
              placeholder="Admin passcode"
              value={passcode}
              onInput={(e) => setPasscode((e.target as HTMLInputElement).value)}
              onKeyUp={(e) => {
                if (e.key === "Enter") handleUnlock();
              }}
            />
            {error && <div style="color:var(--danger);font-size:12px;margin-top:8px">{error}</div>}
            <button class="btn green" onClick={handleUnlock}>
              Unlock admin tools
            </button>
          </div>
        </div>
      )}
      {isUnlocked && (
        <div>
          <div class="admin-box">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <h2 style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:.1em;margin:0">
                  Moderation tools
                </h2>
                <p class="muted">
                  Review and approve member submissions for events, PRs, results
                  and profile updates.
                </p>
              </div>
              <button class="btn dark" onClick={handleLock} style="padding:8px 12px">
                Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
