import type { ChangeEvent } from "react";
import { cn } from "@/lib/cn";
import { META } from "@/lib/styles";

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  /** Optional right-side mono readout (e.g. `80%`) */
  display?: string;
  className?: string;
}

export function Slider({ value, min, max, step = 1, onChange, label, display, className }: SliderProps) {
  const handle = (event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <input
        type="range"
        className="kvm-range min-w-0 flex-1"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        title={label}
        onChange={handle}
      />
      {display !== undefined && <span className={cn(META, "w-10 text-right tabular-nums")}>{display}</span>}
    </div>
  );
}
