/** Typed localStorage settings store. All keys live under the zjkvm-*
 *  namespace; export()/import() round-trip every key for backup/restore. */

import type { Resolution, Rotation } from "@/types";

const PREFIX = "zjkvm-";

const KEYS = {
  language: `${PREFIX}language`,
  videoDeviceId: `${PREFIX}video-device-id`,
  videoResolution: `${PREFIX}video-resolution`,
  customResolutions: `${PREFIX}custom-resolutions`,
  videoScale: `${PREFIX}video-scale`,
  videoRotation: `${PREFIX}video-rotation`,
  mouseStyle: `${PREFIX}mouse-style`,
  mouseMode: `${PREFIX}mouse-mode`,
  wheelDirection: `${PREFIX}wheel-direction`,
  wheelInterval: `${PREFIX}wheel-interval`,
  jiggler: `${PREFIX}mouse-jiggler`,
  toolbarCollapsed: `${PREFIX}toolbar-collapsed`,
  toolbarPos: `${PREFIX}toolbar-pos`,
  keyboardPos: `${PREFIX}keyboard-pos`,
} as const;

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable — settings just won't persist
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function getJSON<T>(key: string): T | null {
  const raw = get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* Language */
export const getLanguage = () => get(KEYS.language);
export const setLanguage = (v: string) => set(KEYS.language, v);

/* Video device */
export const getVideoDeviceId = () => get(KEYS.videoDeviceId);
export const setVideoDeviceId = (v: string) => set(KEYS.videoDeviceId, v);

/* Resolution */
export const getVideoResolution = (): Resolution | null => getJSON<Resolution>(KEYS.videoResolution);
export const setVideoResolution = (r: Resolution) => set(KEYS.videoResolution, JSON.stringify(r));

export const getCustomResolutions = (): Resolution[] => getJSON<Resolution[]>(KEYS.customResolutions) ?? [];
export const addCustomResolution = (r: Resolution) => {
  const list = getCustomResolutions();
  if (list.some((x) => x.width === r.width && x.height === r.height)) return;
  set(KEYS.customResolutions, JSON.stringify([...list, r]));
};
export const removeCustomResolutions = () => remove(KEYS.customResolutions);

/* Scale ("auto" | numeric factor) / rotation */
export function getScaleMode(): "auto" | number | null {
  const raw = get(KEYS.videoScale);
  if (raw === null) return null;
  if (raw === "auto") return "auto";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
export const setScaleMode = (v: "auto" | number) => set(KEYS.videoScale, String(v));

export function getVideoRotation(): Rotation | null {
  const n = Number(get(KEYS.videoRotation));
  return n === 0 || n === 90 || n === 180 || n === 270 ? n : null;
}
export const setVideoRotation = (v: Rotation) => set(KEYS.videoRotation, String(v));

/* Mouse */
export const getMouseStyle = () => get(KEYS.mouseStyle);
export const setMouseStyle = (v: string) => set(KEYS.mouseStyle, v);

export const getMouseMode = () => get(KEYS.mouseMode);
export const setMouseMode = (v: string) => set(KEYS.mouseMode, v);

export function getWheelDirection(): number | null {
  const n = Number(get(KEYS.wheelDirection));
  return n === 1 || n === -1 ? n : null;
}
export const setWheelDirection = (v: number) => set(KEYS.wheelDirection, String(v));

export function getWheelInterval(): number | null {
  const n = Number(get(KEYS.wheelInterval));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export const setWheelInterval = (v: number) => set(KEYS.wheelInterval, String(v));

export const getJiggler = () => get(KEYS.jiggler);
export const setJiggler = (v: "enable" | "disable") => set(KEYS.jiggler, v);

/* UI */
export const getToolbarCollapsed = () => get(KEYS.toolbarCollapsed) === "true";
export const setToolbarCollapsed = (v: boolean) => set(KEYS.toolbarCollapsed, String(v));

export const getToolbarPos = () => getJSON<{ x: number; y: number }>(KEYS.toolbarPos);
export const setToolbarPos = (v: { x: number; y: number }) => set(KEYS.toolbarPos, JSON.stringify(v));

/** Statusbar chips pill collapsed — folded by default; only an explicit
 *  expand (stored "false") keeps it open. */

export const getKeyboardPos = () => getJSON<{ x: number; y: number }>(KEYS.keyboardPos);
export const setKeyboardPos = (v: { x: number; y: number }) => set(KEYS.keyboardPos, JSON.stringify(v));
