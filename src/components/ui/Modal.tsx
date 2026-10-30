import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { CARD } from "@/lib/styles";

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  /** blocking modals (connect gate) hide the close affordance */
  dismissible?: boolean;
  label: string;
  className?: string;
  children: ReactNode;
}

/** Family modal: ink scrim + blur, paper panel floating up, 240 ms exit
 *  animation with timeout fallback (DESIGN.md animation contract). */
export function Modal({ open, onClose, dismissible = true, label, className, children }: ModalProps) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  if (!render) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-100 flex items-center justify-center bg-ink/30 px-4 py-6 backdrop-blur-[2px]",
        closing ? "animate-fade-out" : "animate-fade-in",
      )}
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
        className={cn(
          CARD,
          "shadow-pop",
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
