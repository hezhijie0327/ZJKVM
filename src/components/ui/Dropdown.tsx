import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
 *  Replaces every native <select> — the OS dropdown sheet broke the style.
 *  Keyboard: ArrowDown/Up opens and moves through options, Home/End jump,
 *  Enter picks, Esc closes back to the trigger (APG listbox pattern). */
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
  const listRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value);

  /* Focus lands on the selected option when the list opens (APG pattern). */
  useEffect(() => {
    if (!open) return;
    const selected = listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    (selected ?? listRef.current?.querySelector<HTMLButtonElement>("button"))?.focus();
  }, [open]);

  const openMenu = () => {
    if (!open) {
      onOpen?.();
    }
    setOpen(true);
  };

  const moveFocus = (event: React.KeyboardEvent) => {
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("button[role=option]") ?? [])];
    if (buttons.length === 0) return;
    const activeIdx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next = activeIdx;
    if (event.key === "ArrowDown") next = Math.min(activeIdx + 1, buttons.length - 1);
    else if (event.key === "ArrowUp") next = Math.max(activeIdx - 1, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    buttons[next]?.focus();
  };

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
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openMenu();
          }
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
        <div
          ref={listRef}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={moveFocus}
          className="divide-y divide-line/70"
        >
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
