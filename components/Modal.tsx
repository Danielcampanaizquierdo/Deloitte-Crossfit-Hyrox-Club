/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  /** Optional line under the title, for context the form itself doesn't carry
   * (which event is being booked, which WOD is being scored). */
  subtitle?: string;
}

/** Presentational modal shared by every island's forms.
 *
 * Rendered conditionally rather than toggled via style.display, which is what
 * the previous modals did: keeping them mounted-but-hidden left their inputs
 * in the tab order and readable by screen readers while "closed". */
export default function Modal(
  { open, title, subtitle, onClose, children }: Props,
) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      // Keep Tab inside the dialog while it is open.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

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

    // The page behind a modal must not scroll under it on touch devices.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the first real control so keyboard users land inside the form
    // rather than on the close button.
    const firstField = panelRef.current?.querySelector<HTMLElement>(
      "input, select, textarea",
    );
    (firstField ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const titleId = `modal-title-${title.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div
      class="modal-back is-open"
      onClick={(e) => {
        // Only a click on the backdrop itself closes; clicks that bubble up
        // from inside the panel must not.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <div class="modal-head">
          <div>
            <h3 id={titleId}>{title}</h3>
            {subtitle && <div class="modal-sub">{subtitle}</div>}
          </div>
          <button class="close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
