/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { on, PENDING_CHANGED } from "../lib/bus.ts";

interface Tab {
  id: string;
  label: string;
}

interface Props {
  pendingCount?: number;
  isAdmin?: boolean;
}

const TABS: Tab[] = [
  { id: "events", label: "Eventos" },
  { id: "wod", label: "WOD" },
  { id: "leaderboard", label: "PRs" },
  { id: "results", label: "Resultados" },
  { id: "members", label: "Comunidad" },
  { id: "admin", label: "Admin" },
];

const IDS = TABS.map((t) => t.id);

// Emoji icons, matching the style already used elsewhere in the app (empty
// states, tags) rather than introducing a new SVG icon set.
const ICONS: Record<string, string> = {
  events: "📅",
  wod: "⏱️",
  leaderboard: "🏆",
  results: "🥇",
  members: "👥",
  admin: "⚙️",
};

/** Shows one section and hides the rest.
 *
 * The sections are server-rendered siblings outside this island, so visibility
 * is toggled on the DOM nodes directly rather than by re-rendering them here. */
function showSection(id: string) {
  for (const tab of IDS) {
    document.getElementById(tab)?.classList.toggle("active", tab === id);
  }
}

export default function TabNavigation({ pendingCount = 0, isAdmin = false }: Props) {
  const [active, setActive] = useState(TABS[0].id);
  // Server-rendered to start, then kept in step with the moderation queues,
  // which live in another island.
  const [pending, setPending] = useState(pendingCount);
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => on<number>(PENDING_CHANGED, setPending), []);

  useEffect(() => {
    // A hash in the URL (a shared link, a reload, or the back button) decides
    // which tab opens.
    const fromHash = () => {
      const hash = globalThis.location.hash.replace("#", "");
      const target = IDS.includes(hash) ? hash : TABS[0].id;
      setActive(target);
      showSection(target);
    };

    fromHash();
    globalThis.addEventListener("hashchange", fromHash);
    return () => globalThis.removeEventListener("hashchange", fromHash);
  }, []);

  // While the menu is open: trap Tab between the trigger and the items,
  // Escape closes, and the page behind can't scroll under the overlay.
  // Mirrors the pattern already used by components/Modal.tsx.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = [
        fabRef.current,
        ...Array.from(
          menuRef.current?.querySelectorAll<HTMLButtonElement>(".fab-item") ??
            [],
        ),
      ].filter((el): el is HTMLElement => el !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // Land keyboard focus on the current section's item, or the first one.
    const target = menuRef.current?.querySelector<HTMLButtonElement>(
      ".fab-item.is-active",
    ) ?? menuRef.current?.querySelector<HTMLButtonElement>(".fab-item");
    target?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const select = (id: string) => {
    setActive(id);
    showSection(id);
    // Pushing the hash keeps the tab shareable and puts it in history, so the
    // back button steps between tabs instead of leaving the page.
    if (globalThis.location.hash !== `#${id}`) {
      globalThis.history.pushState(null, "", `#${id}`);
    }
    setOpen(false);
    fabRef.current?.focus();
  };

  const close = () => {
    setOpen(false);
    fabRef.current?.focus();
  };

  const visibleTabs = TABS.filter((tab) => tab.id !== "admin" || isAdmin);

  return (
    <Fragment>
      <div
        class={`fab-backdrop ${open ? "is-open" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <nav
        ref={menuRef}
        class={`fab-menu ${open ? "is-open" : ""}`}
        aria-label="Secciones del club"
      >
        {visibleTabs.map((tab) => {
          const badge = tab.id === "admin" ? pending : 0;
          return (
            <button
              key={tab.id}
              type="button"
              class={`fab-item ${active === tab.id ? "is-active" : ""}`}
              aria-current={active === tab.id ? "page" : undefined}
              tabIndex={open ? 0 : -1}
              onClick={() => select(tab.id)}
            >
              <span class="fab-item-icon" aria-hidden="true">
                {ICONS[tab.id]}
              </span>
              <span class="fab-item-label">{tab.label}</span>
              {badge > 0 && <span class="fab-item-badge">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <div class="fab-wrap">
        <button
          ref={fabRef}
          type="button"
          class={`fab-btn ${open ? "is-open" : ""}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
          onClick={() => setOpen((v) => !v)}
        >
          <span class="fab-ring" aria-hidden="true" />
          <img class="fab-shield" src="/images/escudo.png" alt="" />
          <span class="fab-close" aria-hidden="true">✕</span>
          {pending > 0 && (
            <span class="fab-badge" aria-hidden="true">{pending}</span>
          )}
        </button>
      </div>
    </Fragment>
  );
}
