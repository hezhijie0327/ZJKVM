import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";
import { ICON_BTN } from "@/lib/styles";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

/** Round icon button (ICON_BTN fragment); `active` lights the accent. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active = false, className, type = "button", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cn(ICON_BTN, active && "bg-accent-soft text-accent hover:text-accent", className)}
      {...props}
    >
      {children}
    </button>
  );
});
