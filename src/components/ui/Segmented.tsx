import { cn } from "@/lib/cn";
import { SEGMENT, SEGMENT_ITEM_OFF, SEGMENT_ITEM_ON } from "@/lib/styles";

export interface SegmentedProps<T extends string | number> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Family segmented control: warm track + accent-strong selected pill. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn(SEGMENT, className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(selected ? SEGMENT_ITEM_ON : SEGMENT_ITEM_OFF)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
