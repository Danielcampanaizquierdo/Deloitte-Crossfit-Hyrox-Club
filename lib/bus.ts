// A minimal custom-event bus for the few places where one island has to open
// something that lives inside another.
//
// Fresh islands hydrate independently and cannot share Preact state, so the
// hero's "Apuntarme" button has no way to reach the booking modal that
// EventsSection owns. Dispatching on window is the smallest mechanism that
// crosses that boundary without adding a state library.

export const OPEN_BOOKING = "club:open-booking";
export const OPEN_JOIN = "club:open-join";
/** Carries the new pending total after a moderation action, so the tab badge
 * stops counting items that have already been reviewed. */
export const PENDING_CHANGED = "club:pending-changed";

export function emit<T = undefined>(event: string, detail?: T): void {
  if (typeof document === "undefined") return;
  globalThis.dispatchEvent(new CustomEvent(event, { detail }));
}

/** Subscribes to a bus event. Returns the unsubscribe function, so callers can
 * hand it straight back from a useEffect. */
export function on<T = undefined>(
  event: string,
  handler: (detail: T) => void,
): () => void {
  if (typeof document === "undefined") return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<T>).detail);
  globalThis.addEventListener(event, listener);
  return () => globalThis.removeEventListener(event, listener);
}

/** Switches to a tab by setting the hash TabNavigation listens on. */
export function goToTab(id: string): void {
  if (typeof document === "undefined") return;
  if (globalThis.location.hash === `#${id}`) {
    // Same hash: no hashchange fires, so nudge listeners directly.
    globalThis.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    globalThis.location.hash = id;
  }
}
