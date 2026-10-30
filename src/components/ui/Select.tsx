import { ChevronDown } from "lucide-react";
import type { ChangeEvent, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  onValueChange: (value: string) => void;
}

/** Native select wearing the family skin (token border/surface, mono-safe). */
export function Select({ label, onValueChange, className, children, ...props }: SelectProps) {
  const handle = (event: ChangeEvent<HTMLSelectElement>) => onValueChange(event.target.value);
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <select aria-label={label} title={label} className="kvm-select appearance-none pe-8" onChange={handle} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-2.5 size-4 text-ink-3" />
    </div>
  );
}
