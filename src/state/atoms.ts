/** Global app state: bare jotai atoms, hydrated lazily from localStorage at
 *  module init (same split as the original: atoms hold runtime state,
 *  storage holds preferences; App owns the persist effects). */

import { atom } from "jotai";
import * as storage from "@/lib/storage";
import type { LedState, MediaDevice, Resolution, Rotation, SerialState, ShortcutMacro, VideoState } from "@/types";

/* ── Connection ── */
export const videoStateAtom = atom<VideoState>("disconnected");
export const serialStateAtom = atom<SerialState>(
  typeof navigator !== "undefined" && "serial" in navigator ? "disconnected" : "unsupported",
);
export const demoModeAtom = atom(false);
export const videoStreamAtom = atom<MediaStream | null>(null);

/* ── Video ── */
export const videoDeviceIdAtom = atom<string>(storage.getVideoDeviceId() ?? "");
export const videoDevicesAtom = atom<MediaDevice[]>([]);
export const audioByGroupAtom = atom<Map<string, MediaDevice>>(new Map());
export const resolutionAtom = atom<Resolution>(storage.getVideoResolution() ?? { width: 1920, height: 1080 });
export const customResolutionsAtom = atom<Resolution[]>(storage.getCustomResolutions());
export const scaleModeAtom = atom<"auto" | number>(storage.getScaleMode() ?? "auto");
export const rotationAtom = atom<Rotation>(storage.getVideoRotation() ?? 0);

/* ── Audio ── */
export const volumeAtom = atom(1);
export const mutedAtom = atom(false);

/* ── Keyboard ── */
export const keyboardEnabledAtom = atom(true);
export const virtualKeyboardOpenAtom = atom(false);

/* ── Mouse ── */
export type MouseStyle = "cursor-default" | "cursor-grab" | "cursor-cell" | "kvm-cursor-none";
export const mouseStyleAtom = atom<MouseStyle>((storage.getMouseStyle() as MouseStyle | null) ?? "cursor-default");
export const mouseModeAtom = atom<"absolute" | "relative">(
  storage.getMouseMode() === "relative" ? "relative" : "absolute",
);
export const wheelDirectionAtom = atom(storage.getWheelDirection() ?? 1);
export const wheelIntervalAtom = atom(storage.getWheelInterval() ?? 0);
export const jigglerAtom = atom<"enable" | "disable">(storage.getJiggler() === "enable" ? "enable" : "disable");

/* ── Device telemetry ── */
export const ledsAtom = atom<LedState>({ num: false, caps: false, scroll: false });
export const firmwareAtom = atom<string | null>(null);
export const videoStatsAtom = atom<{ width: number; height: number; fps: number | null }>({
  width: 0,
  height: 0,
  fps: null,
});

/* ── Recorder ── */
export const recordingAtom = atom(false);
export const recordingDurationAtom = atom(0);

/* ── Macros ── */
export const DEFAULT_MACROS: ShortcutMacro[] = [
  { id: "cad", name: "Ctrl+Alt+Del", keys: ["ControlLeft", "AltLeft", "Delete"], mode: "chord", repeat: 1 },
  { id: "wintab", name: "Win+Tab", keys: ["MetaLeft", "Tab"], mode: "chord", repeat: 1 },
];
export const macrosAtom = atom<ShortcutMacro[]>(storage.getMacros() ?? DEFAULT_MACROS);

/* ── UI ── */
export const activePanelAtom = atom<string | null>(null);
export const toolbarCollapsedAtom = atom(storage.getToolbarCollapsed());
export const toolbarPosAtom = atom(storage.getToolbarPos() ?? { x: 0, y: 0 });
export const statsVisibleAtom = atom(storage.getStatsVisible() ?? true);
export const connectGateOpenAtom = atom(false);
export const aboutOpenAtom = atom(false);
