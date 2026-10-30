import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}

/** Family switch: hairline pill track, accent-strong when on. */
export function Switch({ checked, onChange, label, className, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5.5 w-10 shrink-0 rounded-full border transition-colors",
        checked ? "border-accent-strong bg-accent-strong" : "border-line bg-surface-2",
        disabled && "cursor-default opacity-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 size-4 -translate-y-1/2 rounded-full shadow-card transition-all",
          checked ? "left-[calc(100%-1.125rem)] bg-accent-contrast" : "left-0.5 bg-ink-3",
        )}
      />
    </button>
  );
}
