import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { CARD, MODAL_SCRIM } from "@/lib/styles";

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  /** blocking modals (connect gate) hide the close affordance */
  dismissible?: boolean;
  label: string;
  className?: string;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Family modal: ink scrim + blur, paper panel floating up, 240 ms exit
 *  animation with timeout fallback (DESIGN.md animation contract). Focus is
 *  moved into the dialog on open, kept inside by a Tab trap, and returned to
 *  the trigger on close. */
export function Modal({ open, onClose, dismissible = true, label, className, children }: ModalProps) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: exit animation timing
  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
      return;
    }
    if (!render) return;
    setClosing(true);
    const timer = window.setTimeout(() => {
      setRender(false);
      setClosing(false);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!render || !dismissible || !onClose) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [render, dismissible, onClose]);

  /* Focus contract: remember the trigger, focus the panel, keep Tab inside,
     hand focus back when the dialog goes away. */
  useEffect(() => {
    if (!render) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => returnFocusRef.current?.focus?.();
  }, [render]);

  useEffect(() => {
    if (!render) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [render]);

  if (!render) return null;

  return createPortal(
    <div
      className={cn(MODAL_SCRIM, "py-6", closing ? "animate-fade-out" : "animate-fade-in")}
      role="presentation"
      onMouseDown={(event) => {
        if (dismissible && onClose && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          CARD,
          "shadow-pop outline-none",
          "max-h-full w-full max-w-lg overflow-y-auto",
          closing ? "animate-fade-out" : "animate-fade-up",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
