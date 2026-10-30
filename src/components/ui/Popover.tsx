import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { CARD } from "@/lib/styles";

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** Which edge of the anchor the panel attaches to. */
  side?: "bottom" | "top";
  align?: "center" | "start" | "end";
  className?: string;
  children: ReactNode;
  anchorRef: React.RefObject<HTMLElement | null>;
}

/** Anchored floating panel (CARD, fade-up). Closes on outside pointerdown and
 *  Escape. One instance per toolbar trigger; `activePanelAtom` guarantees a
 *  single open panel across the toolbar. */
export function Popover({
  open,
  onClose,
  side = "bottom",
  align = "center",
  className,
  children,
  anchorRef,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) {
        return;
      }
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const alignClass = align === "center" ? "left-1/2 -translate-x-1/2" : align === "start" ? "left-0" : "right-0";
  const sideClass = side === "bottom" ? "top-full mt-2" : "bottom-full mb-2";

  return (
    <div
      ref={panelRef}
      className={cn(
        CARD,
        "animate-fade-up absolute z-90 w-76 overflow-y-auto overscroll-contain shadow-pop",
        "max-w-[calc(100vw-1.5rem)]",
        sideClass,
        alignClass,
        className,
      )}
    >
      {children}
    </div>
  );
}
