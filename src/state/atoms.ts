/** Global app state: bare jotai atoms, hydrated lazily from localStorage at
 *  module init (same split as the original: atoms hold runtime state,
 *  storage holds preferences; App owns the persist effects). */

import { atom } from "jotai";
import * as storage from "@/lib/storage";
import type { LedState, MediaDevice, Resolution, Rotation, SerialState, VideoState } from "@/types";

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
/** USB enumeration on the controlled machine (GET_INFO data[1]); null = unknown. */
export const usbConnectedAtom = atom<boolean | null>(null);
export const firmwareAtom = atom<string | null>(null);
/** Mic permission for the capture-card audio track; null = unknown. */
export const micGrantedAtom = atom<boolean | null>(null);
export const videoStatsAtom = atom<{ width: number; height: number; fps: number | null }>({
  width: 0,
  height: 0,
  fps: null,
});
/** Viewport-space rect of the rendered picture (letterbox + rotation + zoom
 *  resolved), published by Stage so floating layers can dock to the video
 *  content instead of the stage corners. */
export const pictureRectAtom = atom<{ x: number; y: number; w: number; h: number } | null>(null);

/* ── Recorder ── */
export const recordingAtom = atom(false);
export const recordingDurationAtom = atom(0);

/* ── UI ── */
export const activePanelAtom = atom<string | null>(null);
export const toolbarCollapsedAtom = atom(storage.getToolbarCollapsed());
export const toolbarPosAtom = atom(storage.getToolbarPos() ?? { x: 0, y: 0 });
export const aboutOpenAtom = atom(false);
