import { cn } from "@/lib/cn";
import { MONO_CHIP } from "@/lib/styles";

/** Single-line PANEL_ROW label (text-sm) — the standard row label inside
 *  toolbar panels. Never wraps: narrow rows scale via column layout instead. */
export const ROW_LABEL = "shrink-0 whitespace-nowrap text-sm text-ink";

/** Mono chip for keys / states (MONO_CHIP fragment with tighter padding). */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn(MONO_CHIP, "px-1.5 py-0", className)}>{children}</span>;
}
