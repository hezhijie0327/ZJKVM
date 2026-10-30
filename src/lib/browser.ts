/** Host browser / OS capability detection. The KVM stack leans on several
 *  Chromium-only APIs; the UI gates features (and shows honest fallbacks)
 *  from these checks instead of failing at click time. */

export type OperatingSystem = "Windows" | "macOS" | "Linux" | "Android" | "iOS" | "Unknown";

export function getOperatingSystem(): OperatingSystem {
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const platform = uaData?.platform ?? navigator.platform;
  if (/win/i.test(platform)) return "Windows";
  if (/mac/i.test(platform)) return "macOS";
  if (/android/i.test(navigator.userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "iOS";
  if (/linux/i.test(platform)) return "Linux";
  return "Unknown";
}

export function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Web Serial (the HID injection channel) — Chromium desktop only. */
export function supportsSerial(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

/** Web Authentication-free file saving (recording). */
export function supportsSaveFilePicker(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

/** FileSystemWritableFileStream for streaming recorder writes. */
export type SaveFilePicker = (options?: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle>;

export function supportsPictureInPicture(): boolean {
  return typeof document !== "undefined" && "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;
}

/** getUserMedia + enumerateDevices (the capture-card channel). */
export function supportsMediaDevices(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.enumerateDevices;
}

/** Remote keyboard.lock (intercept OS-level keys in fullscreen). */
export function supportsKeyboardLock(): boolean {
  return typeof navigator !== "undefined" && "keyboard" in navigator;
}

export function isSecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}
