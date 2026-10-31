import { Check, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { Popover } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { LIST_ROW } from "@/lib/styles";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Called once when the menu opens (e.g. to probe permissions / refresh the list). */
  onOpen?: () => void;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  id?: string;
}

/** Custom select wearing the family skin: kvm-select trigger button + CARD
 *  popover list (LIST_ROW rows, accent check on the selected option).
 *  Replaces every native <select> — the OS dropdown sheet broke the style. */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  onOpen,
  className,
  menuClassName,
  disabled,
  id,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = options.find((option) => option.value === value);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        title={label}
        disabled={disabled || options.length === 0}
        onClick={() => {
          if (!open) {
            onOpen?.();
          }
          setOpen((o) => !o);
        }}
        className="kvm-select inline-flex w-full items-center justify-between gap-2"
      >
        <span className="min-w-0 flex-1 truncate text-left">{current?.label ?? "—"}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        side="bottom"
        align="end"
        anchorRef={buttonRef}
        className={cn("w-full min-w-44", menuClassName)}
      >
        <div role="listbox" aria-label={label} className="divide-y divide-line/70">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(LIST_ROW, "px-4 py-2.5 text-sm", selected ? "text-accent" : "text-ink")}
              >
                <span className="min-w-0 flex-1 truncate text-left">{option.label}</span>
                {selected && <Check aria-hidden="true" className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}
