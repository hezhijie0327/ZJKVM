/** Toast notifications: jotai-backed queue, auto-dismiss after 3 s. */

import { atom, getDefaultStore } from "jotai";

export interface ToastItem {
  id: number;
  text: string;
  tone: "ok" | "danger";
}

export const toastsAtom = atom<ToastItem[]>([]);

let nextId = 1;

export function pushToast(text: string, tone: ToastItem["tone"] = "ok"): void {
  const store = getDefaultStore();
  const id = nextId++;
  store.set(toastsAtom, (list) => [...list.slice(-3), { id, text, tone }]);
  window.setTimeout(() => {
    store.set(toastsAtom, (list) => list.filter((toast) => toast.id !== id));
  }, 3000);
}
