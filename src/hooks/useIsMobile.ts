import { useSyncExternalStore } from "react";

/** Phone-class device: a coarse (touch) primary pointer whose viewport is
 *  phone-sized on EITHER axis — portrait reads the width (≤767px, the classic
 *  md breakpoint), landscape reads the height. Width alone misclassified a
 *  landscape phone (~932×430) as desktop, which rendered the desktop floating
 *  virtual keyboard (~500px tall, numpad included) into a 430px-tall viewport.
 *  The coarse-pointer gate keeps a short desktop browser window (devtools docked
 *  bottom, half-snapped tiling) on the desktop layout; an iPad's 768px short
 *  side stays desktop in both orientations. */
const COARSE = "(pointer: coarse)";
const WIDTH = "(max-width: 767px)";
const HEIGHT = "(max-height: 767px)";

function subscribe(callback: () => void) {
  const queries = [COARSE, WIDTH, HEIGHT].map((q) => window.matchMedia(q));
  for (const query of queries) query.addEventListener("change", callback);
  return () => {
    for (const query of queries) query.removeEventListener("change", callback);
  };
}

function snapshot(): boolean {
  const coarse = window.matchMedia(COARSE).matches;
  return coarse && (window.matchMedia(WIDTH).matches || window.matchMedia(HEIGHT).matches);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
