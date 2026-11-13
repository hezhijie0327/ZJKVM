/** Toast notifications: jotai-backed queue, auto-dismiss (danger lingers
 *  longer — failure text that vanishes as fast as success text gets missed,
 *  and burst failures like serial rebind loops would otherwise replace each
 *  other unread). */

import { atom, getDefaultStore } from "jotai";

export interface ToastItem {
  id: number;
  text: string;
  tone: "ok" | "danger";
}

export const toastsAtom = atom<ToastItem[]>([]);

const OK_MS = 3000;
const DANGER_MS = 6000;

let nextId = 1;

export function pushToast(text: string, tone: ToastItem["tone"] = "ok"): void {
  const store = getDefaultStore();
  const id = nextId++;
  store.set(toastsAtom, (list) => [...list.slice(-3), { id, text, tone }]);
  window.setTimeout(
    () => {
      store.set(toastsAtom, (list) => list.filter((toast) => toast.id !== id));
    },
    tone === "danger" ? DANGER_MS : OK_MS,
  );
}
