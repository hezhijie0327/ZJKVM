import { useSyncExternalStore } from "react";

/** Viewport breakpoint hook (matchMedia, SSR-safe default). */
function subscribe(callback: () => void) {
  const query = window.matchMedia("(max-width: 767px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}
