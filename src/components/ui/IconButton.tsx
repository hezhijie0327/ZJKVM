import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";
import { ICON_BTN } from "@/lib/styles";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  /** Panel-disclosure buttons report state as aria-expanded instead of
   *  aria-pressed (family convention: every disclosure has aria-expanded). */
  expanded?: boolean;
}

/** Round icon button (ICON_BTN fragment); `active` lights the accent. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active = false, expanded, className, type = "button", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={expanded === undefined ? active || undefined : undefined}
      aria-expanded={expanded}
      className={cn(ICON_BTN, active && "bg-accent-soft text-accent hover:text-accent", className)}
      {...props}
    >
      {children}
    </button>
  );
});
