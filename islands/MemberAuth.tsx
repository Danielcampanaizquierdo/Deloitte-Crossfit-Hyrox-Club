/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import Modal from "../components/Modal.tsx";
import { toast } from "../lib/toast.ts";
import { on, OPEN_JOIN, OPEN_LOGIN } from "../lib/bus.ts";

export interface SessionMember {
  id: string;
  name: string;
  email: string;
}

interface Props {
  member: SessionMember | null;
}

/** Account bar: who is logged in, plus the log-in and sign-up forms.
 *
 * Owns both forms so any island can ask for them over the bus rather than
 * duplicating them. */
export default function MemberAuth({ member }: Props) {
  const [mode, setMode] = useState<
    "login" | "register" | "change-password" | null
  >(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => on(OPEN_LOGIN, () => setMode("login")), []);
  useEffect(() => on(OPEN_JOIN, () => setMode("register")), []);

  const logout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      globalThis.location.reload();
    } catch {
      toast("No se pudo cerrar la sesión. Inténtalo de nuevo.", "error");
      setLoggingOut(false);
    }
  };

  return (
    <Fragment>
      <div class="authbar">
        {member
          ? (
            <Fragment>
              <span class="authbar-who">
                <span class="authbar-avatar" aria-hidden="true">
                  {member.name.trim().charAt(0).toUpperCase()}
                </span>
                <span>{member.name}</span>
              </span>
              <button
                type="button"
                class="btn ghost btn-sm"
                onClick={() => setMode("change-password")}
              >
                Seguridad
              </button>
              <button
                type="button"
                class="btn ghost btn-sm"
                onClick={logout}
                disabled={loggingOut}
              >
                {loggingOut ? "Saliendo…" : "Salir"}
              </button>
            </Fragment>
          )
          : (
            <Fragment>
              <button
                type="button"
                class="btn ghost btn-sm"
                onClick={() => setMode("login")}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                class="btn green btn-sm"
                onClick={() => setMode("register")}
              >
                Crear cuenta
              </button>
            </Fragment>
          )}
      </div>

      {mode === "login" && (
        <LoginModal
          onClose={() => setMode(null)}
          onSwitch={() => setMode("register")}
        />
      )}
      {mode === "register" && (
        <RegisterModal
          onClose={() => setMode(null)}
          onSwitch={() => setMode("login")}
        />
      )}
      {mode === "change-password" && member && (
        <ChangePasswordModal onClose={() => setMode(null)} />
      )}
    </Fragment>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast("La nueva contraseña debe tener al menos 8 caracteres.", "error");
      return;
    }
    if (newPassword !== confirmation) {
      toast("Las contraseñas no coinciden.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast(data.error ?? "No se pudo cambiar la contraseña.", "error");
        return;
      }
      toast("Contraseña cambiada y sesiones anteriores cerradas.", "success");
      globalThis.location.reload();
    } catch {
      toast("Error de conexión. Inténtalo de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      title="Cambiar contraseña"
      subtitle="Se cerrarán las demás sesiones de tu cuenta"
      onClose={onClose}
    >
      <form class="form" onSubmit={submit}>
        <label class="field">
          <span>Contraseña actual</span>
          <input
            class="input"
            type="password"
            required
            autocomplete="current-password"
            value={currentPassword}
            onInput={(e) =>
              setCurrentPassword((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Nueva contraseña</span>
          <input
            class="input"
            type="password"
            required
            minLength={8}
            autocomplete="new-password"
            value={newPassword}
            onInput={(e) =>
              setNewPassword((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Repite la nueva contraseña</span>
          <input
            class="input"
            type="password"
            required
            minLength={8}
            autocomplete="new-password"
            value={confirmation}
            onInput={(e) =>
              setConfirmation((e.target as HTMLInputElement).value)}
          />
        </label>
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Actualizando…" : "Cambiar contraseña"}
        </button>
      </form>
    </Modal>
  );
}

function LoginModal(
  { onClose, onSwitch }: { onClose: () => void; onSwitch: () => void },
) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        toast("Sesión iniciada.", "success");
        globalThis.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        const fallback = res.status >= 500
          ? "Error del servidor. Avisa a un administrador."
          : "No se pudo iniciar sesión.";
        toast(data.error ?? fallback, "error");
      }
    } catch {
      toast("Error de conexión. Inténtalo de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      title="Iniciar sesión"
      subtitle="Entra para reservar plaza y registrar tus marcas"
      onClose={onClose}
    >
      <form class="form" onSubmit={submit}>
        <label class="field">
          <span>Email</span>
          <input
            class="input"
            type="email"
            required
            autocomplete="email"
            placeholder="tu@email.com"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Contraseña</span>
          <input
            class="input"
            type="password"
            required
            autocomplete="current-password"
            placeholder="Tu contraseña"
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          />
        </label>
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
        <p class="form-alt">
          ¿Todavía no tienes cuenta?{" "}
          <button type="button" class="linkbtn" onClick={onSwitch}>
            Crear una
          </button>
        </p>
      </form>
    </Modal>
  );
}

function RegisterModal(
  { onClose, onSwitch }: { onClose: () => void; onSwitch: () => void },
) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [level, setLevel] = useState("beginner");
  const [goal, setGoal] = useState("crossfit");
  const [location, setLocation] = useState("Madrid");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (password.length < 8) {
      toast("La contraseña debe tener al menos 8 caracteres.", "error");
      return;
    }
    if (password !== passwordConfirmation) {
      toast("Las contraseñas no coinciden.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          level,
          goal,
          location: location.trim(),
          bio: bio.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast(
          "¡Cuenta creada! Un admin la aprobará antes de que puedas entrar.",
          "success",
        );
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo crear la cuenta.", "error");
      }
    } catch {
      toast("Error de conexión. Inténtalo de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      title="Crear cuenta"
      subtitle="Un admin la aprobará antes del primer acceso"
      onClose={onClose}
    >
      <form class="form" onSubmit={submit}>
        <label class="field">
          <span>Nombre</span>
          <input
            class="input"
            type="text"
            required
            autocomplete="name"
            placeholder="Tu nombre y apellido"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Email</span>
          <input
            class="input"
            type="email"
            required
            autocomplete="email"
            placeholder="tu@email.com"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Contraseña</span>
          <input
            class="input"
            type="password"
            required
            minLength={8}
            autocomplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>Repite la contraseña</span>
          <input
            class="input"
            type="password"
            required
            minLength={8}
            autocomplete="new-password"
            placeholder="Repite tu contraseña"
            value={passwordConfirmation}
            onInput={(e) =>
              setPasswordConfirmation((e.target as HTMLInputElement).value)}
          />
        </label>
        <div class="field-row">
          <label class="field">
            <span>Nivel</span>
            <select
              class="input"
              value={level}
              onChange={(e) => setLevel((e.target as HTMLSelectElement).value)}
            >
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="advanced">Avanzado</option>
            </select>
          </label>
          <label class="field">
            <span>Objetivo</span>
            <select
              class="input"
              value={goal}
              onChange={(e) => setGoal((e.target as HTMLSelectElement).value)}
            >
              <option value="crossfit">CrossFit</option>
              <option value="hyrox">HYROX</option>
              <option value="general">Fitness general</option>
            </select>
          </label>
        </div>
        <label class="field">
          <span>Ciudad</span>
          <input
            class="input"
            type="text"
            required
            placeholder="Madrid"
            value={location}
            onInput={(e) => setLocation((e.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>
            Sobre ti <em>(opcional)</em>
          </span>
          <textarea
            class="input"
            placeholder="Desde cuándo entrenas, objetivos, competiciones…"
            value={bio}
            onInput={(e) => setBio((e.target as HTMLTextAreaElement).value)}
          />
        </label>
        <button class="btn green" type="submit" disabled={loading}>
          {loading ? "Creando…" : "Crear cuenta"}
        </button>
        <p class="form-alt">
          ¿Ya tienes cuenta?{" "}
          <button type="button" class="linkbtn" onClick={onSwitch}>
            Iniciar sesión
          </button>
        </p>
      </form>
    </Modal>
  );
}
