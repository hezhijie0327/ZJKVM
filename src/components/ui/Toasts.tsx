import { useAtomValue } from "jotai";
import { cn } from "@/lib/cn";
import { toastsAtom } from "@/state/toast";

/** Toast stack: bottom-center paper cards, fade-up in, auto-removed by the
 *  store after 3 s. */
export function Toasts() {
  const toasts = useAtomValue(toastsAtom);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-110 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "animate-fade-up max-w-full rounded-xl border px-4 py-2 text-sm shadow-pop backdrop-blur-md",
            toast.tone === "danger"
              ? "border-danger/60 bg-danger/10 text-danger"
              : "border-line bg-surface/95 text-ink",
          )}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
