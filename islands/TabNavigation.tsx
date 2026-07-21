/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { on, PENDING_CHANGED } from "../lib/bus.ts";

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface Props {
  pendingCount?: number;
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

/** Shows one section and hides the rest.
 *
 * The sections are server-rendered siblings outside this island, so visibility
 * is toggled on the DOM nodes directly rather than by re-rendering them here. */
function showSection(id: string) {
  for (const tab of IDS) {
    document.getElementById(tab)?.classList.toggle("active", tab === id);
  }
}

export default function TabNavigation({ pendingCount = 0 }: Props) {
  const [active, setActive] = useState(TABS[0].id);
  // Server-rendered to start, then kept in step with the moderation queues,
  // which live in another island.
  const [pending, setPending] = useState(pendingCount);

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

  const select = (id: string) => {
    setActive(id);
    showSection(id);
    // Pushing the hash keeps the tab shareable and puts it in history, so the
    // back button steps between tabs instead of leaving the page.
    if (globalThis.location.hash !== `#${id}`) {
      globalThis.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <nav class="nav" aria-label="Secciones del club">
      {TABS.map((tab) => {
        const badge = tab.id === "admin" ? pending : 0;
        return (
          <button
            key={tab.id}
            type="button"
            class={`tab ${active === tab.id ? "active" : ""}`}
            aria-current={active === tab.id ? "page" : undefined}
            onClick={() => select(tab.id)}
          >
            {tab.label}
            {badge > 0 && <span class="tab-badge">{badge}</span>}
          </button>
        );
      })}
    </nav>
  );
}
