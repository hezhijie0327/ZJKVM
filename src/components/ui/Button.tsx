import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";
import { BTN_OUTLINE, BTN_PRIMARY } from "@/lib/styles";

type Variant = "primary" | "outline" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: BTN_PRIMARY,
  outline: BTN_OUTLINE,
  ghost:
    "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
  danger:
    "inline-flex h-10 items-center gap-2 rounded-full border border-danger/60 bg-danger/10 px-5 text-sm font-medium text-danger transition-colors hover:bg-danger/20",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Pill button in the family language (see lib/styles.ts fragments). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(VARIANTS[variant], className)} {...props} />;
});
