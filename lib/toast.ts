// Toast notifications, shared by every island.
//
// Deliberately not an island: islands can't render into each other, and a
// toast has to be callable from whichever island the user is interacting with.
// Appending to a single document-level host keeps one stacking context and one
// z-index for every toast in the app.

export type ToastKind = "success" | "error" | "info";

const HOST_ID = "toastHost";
const VISIBLE_MS = 4000;
const EXIT_MS = 300;

function host(): HTMLElement {
  let el = document.getElementById(HOST_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = HOST_ID;
    el.className = "toast-host";
    // Screen readers announce toasts without stealing focus from the form the
    // user is still filling in.
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  return el;
}

const ICONS: Record<ToastKind, string> = {
  success: "✓",
  error: "!",
  info: "i",
};

export function toast(message: string, kind: ToastKind = "info"): void {
  // Islands import this module during SSR too; there is no document to render
  // into until the island hydrates.
  if (typeof document === "undefined") return;

  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.innerHTML =
    `<span class="toast-icon" aria-hidden="true">${ICONS[kind]}</span>` +
    `<span class="toast-msg"></span>`;
  // Message goes in as text, never markup — it can carry API error strings.
  el.querySelector(".toast-msg")!.textContent = message;

  host().appendChild(el);

  const remove = () => {
    el.classList.add("toast-out");
    setTimeout(() => el.remove(), EXIT_MS);
  };

  const timer = setTimeout(remove, VISIBLE_MS);
  el.addEventListener("click", () => {
    clearTimeout(timer);
    remove();
  });
}
