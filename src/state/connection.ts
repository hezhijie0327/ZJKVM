/** Connection management: video (UVC), serial (CH9329 HID), demo mode, LED
 *  polling, disconnect handling. Plain functions over the default jotai store
 *  so both UI components and effects can drive them. */

import { getDefaultStore } from "jotai";
import { getOperatingSystem, supportsSerial } from "@/lib/browser";
import { DemoDevice } from "@/lib/device/demo-device";
import { attachDebugHook, createDemoStream } from "@/lib/device/demo-video";
import { type HidLink, SerialDevice, setActiveLink } from "@/lib/device/device";
import {
  camera,
  ensureCameraPermission,
  listCaptureDevices,
  pickCaptureDevice,
  watchDeviceChange,
} from "@/lib/media/camera";
import { checkPermission, requestPermission } from "@/lib/media/permission";
import {
  audioByGroupAtom,
  demoModeAtom,
  firmwareAtom,
  ledsAtom,
  micGrantedAtom,
  resolutionAtom,
  serialStateAtom,
  usbConnectedAtom,
  videoDeviceIdAtom,
  videoDevicesAtom,
  videoStateAtom,
  videoStreamAtom,
} from "@/state/atoms";
import { t } from "@/state/t";
import { pushToast } from "@/state/toast";

let demo: ReturnType<typeof createDemoStream> | null = null;
let demoDevice: DemoDevice | null = null;
let serialDevice: SerialDevice | null = null;
let ledTimer: number | null = null;
let unwatchDevices: (() => void) | null = null;

const store = getDefaultStore();

export async function refreshVideoDevices(): Promise<void> {
  try {
    const { video, audioByGroup } = await listCaptureDevices();
    store.set(videoDevicesAtom, video);
    store.set(audioByGroupAtom, audioByGroup);
  } catch {
    store.set(videoDevicesAtom, []);
  }
}

/** Probe camera permission and re-enumerate — device lists are anonymous
 *  (or empty) until the grant, so device dropdowns call this on open. */
export async function probeVideoDevices(): Promise<void> {
  await ensureCameraPermission();
  await refreshVideoDevices();
}

/** Sync the mic permission into the atom (statusbar chip state). */
export async function checkMic(): Promise<void> {
  store.set(micGrantedAtom, await checkPermission("microphone"));
}

/** Grant the mic, then re-enumerate and reopen the video stream so the
 *  capture card's paired audio track joins. Runs from the statusbar chip. */
export async function grantMic(): Promise<boolean> {
  const granted = await requestPermission("microphone");
  store.set(micGrantedAtom, granted);
  if (!granted) {
    pushToast(t("audio.micFail"), "danger");
    return false;
  }
  pushToast(t("toast.micGranted"));
  await probeVideoDevices();
  if (store.get(videoStateAtom) === "connected") {
    await connectVideo(store.get(videoDeviceIdAtom) || undefined);
  }
  return true;
}

/** Open the capture card. Resolves the target device robustly: without
 *  camera permission the enumeration hides real deviceIds (the "serial
 *  found but no video" report), so probe the permission, re-enumerate, then
 *  fall back to a sensible default capture card. The device lists are
 *  refreshed on every connect — audio inputs are also anonymous until the
 *  mic grant, so a stale map would silently drop the capture card's audio. */
export async function connectVideo(deviceId?: string): Promise<boolean> {
  store.set(videoStateAtom, "connecting");
  await refreshVideoDevices();

  let devices = store.get(videoDevicesAtom);
  if (devices.length === 0 || devices.every((d) => !d.label)) {
    const granted = await ensureCameraPermission();
    await refreshVideoDevices();
    devices = store.get(videoDevicesAtom);
    if (!granted) {
      store.set(videoStateAtom, "disconnected");
      pushToast(t("connect.cameraDenied"), "danger");
      return false;
    }
  }

  const requested = deviceId ?? store.get(videoDeviceIdAtom) ?? "";
  const resolved = devices.some((d) => d.deviceId && d.deviceId === requested)
    ? requested
    : (pickCaptureDevice(devices)?.deviceId ?? "");

  if (!resolved) {
    store.set(videoStateAtom, "disconnected");
    pushToast(t("connect.noVideo"), "danger");
    return false;
  }

  try {
    const resolution = store.get(resolutionAtom);
    const audio = store.get(audioByGroupAtom).get(groupIdOf(resolved))?.deviceId;
    await camera.open(resolved, resolution.width, resolution.height, audio);
    store.set(videoStreamAtom, camera.getStream());
    store.set(videoStateAtom, "connected");
    store.set(videoDeviceIdAtom, resolved);
    return true;
  } catch (error) {
    store.set(videoStateAtom, "disconnected");
    if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
      pushToast(t("connect.cameraDenied"), "danger");
    } else {
      pushToast(t("toast.videoFail"), "danger");
    }
    return false;
  }
}

function groupIdOf(videoDeviceId: string): string {
  return store.get(videoDevicesAtom).find((d) => d.deviceId === videoDeviceId)?.groupId ?? "";
}

/** Switch resolution live (reopens the stream). */
export async function applyResolution(width: number, height: number): Promise<void> {
  store.set(resolutionAtom, { width, height });
  if (store.get(videoStateAtom) === "connected" && !store.get(demoModeAtom)) {
    await camera.updateResolution(width, height);
    store.set(videoStreamAtom, camera.getStream());
  }
}

/** Open the HID serial port. MUST be called from a user gesture. */
export async function openSerial(): Promise<boolean> {
  if (!supportsSerial()) {
    store.set(serialStateAtom, "unsupported");
    return false;
  }

  store.set(serialStateAtom, "connecting");
  const device = new SerialDevice();
  try {
    await device.open(() => onSerialLost());
    serialDevice = device;
    setActiveLink(device);
    serialWanted = true;
    armSerialRebind();
    store.set(serialStateAtom, "connected");
    pushToast(t("toast.connected"));
    startLedPolling();
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      // user dismissed the port picker — back to idle, no error toast
    } else {
      pushToast(t("toast.serialFail"), "danger");
    }
    store.set(serialStateAtom, "disconnected");
    void error;
    return false;
  }
}

/* ── Serial auto-rebind ──────────────────────────────────────────────────
   The CH9329 re-enumerates itself shortly after the port opens (classic
   USB-CDC behavior), so macOS tears the /dev node down and Chromium fires
   `disconnect`. The port is already authorized though: listen for the
   matching `connect` and reopen it silently — no second chooser. A burst
   of instant re-disconnects means the rebind itself re-triggers the
   re-enumeration; give up after five and let the user reconnect by hand. */

let serialWanted = false;
let rebindListener: ((event: Event) => void) | null = null;
let rebinding = false;
let reconnectBurst = 0;
let lastLossAt = 0;

function onSerialLost(): void {
  serialDevice = null;
  setActiveLink(null);
  store.set(serialStateAtom, "disconnected");
  stopLedPolling();
  if (serialWanted) {
    const now = Date.now();
    reconnectBurst = now - lastLossAt < 2000 ? reconnectBurst + 1 : 0;
    lastLossAt = now;
    if (reconnectBurst >= 5) {
      serialWanted = false;
      disarmSerialRebind();
      pushToast(t("toast.disconnected"), "danger");
      return;
    }
  }
  pushToast(t("toast.disconnected"), "danger");
}

function armSerialRebind(): void {
  if (rebindListener || !supportsSerial()) return;
  rebindListener = (event: Event) => {
    if (!serialWanted || store.get(serialStateAtom) === "connected" || rebinding) return;
    const port = event.target as SerialPort | null;
    void rebindSerial(port);
  };
  navigator.serial.addEventListener("connect", rebindListener);
}

function disarmSerialRebind(): void {
  if (rebindListener) {
    navigator.serial.removeEventListener("connect", rebindListener);
    rebindListener = null;
  }
  reconnectBurst = 0;
}

async function rebindSerial(port: SerialPort | null): Promise<void> {
  if (rebinding) return;
  rebinding = true;
  try {
    store.set(serialStateAtom, "connecting");
    if (!port) {
      const ports = await navigator.serial.getPorts();
      port = ports[0] ?? null;
    }
    if (!port) throw new Error("no authorized port");
    const device = new SerialDevice();
    await device.openPort(port, () => onSerialLost());
    serialDevice = device;
    setActiveLink(device);
    store.set(serialStateAtom, "connected");
    pushToast(t("toast.serialReconnected"));
    startLedPolling();
  } catch {
    store.set(serialStateAtom, "disconnected");
  } finally {
    rebinding = false;
  }
}

/** Demo mode: synthetic capture card + virtual HID device. */
export function startDemo(): void {
  stopDemo();
  demo = createDemoStream();
  attachDebugHook(demo);
  demoDevice = new DemoDevice(demo.state);
  setActiveLink(demoDevice);
  store.set(demoModeAtom, true);
  store.set(videoStreamAtom, demo.stream);
  store.set(videoStateAtom, "connected");
  startLedPolling();
}

function stopDemo(): void {
  demo?.stop();
  demo = null;
  demoDevice = null;
  store.set(demoModeAtom, false);
}

/** Disconnect the capture card only (video chip in the statusbar). */
export function disconnectVideo(): void {
  camera.close();
  store.set(videoStreamAtom, null);
  store.set(videoStateAtom, "disconnected");
}

/** Disconnect the HID serial link only (serial chip in the statusbar).
 *  Telemetry keeps running if demo mode took over the link. */
export async function disconnectSerial(): Promise<void> {
  serialWanted = false; // user-initiated — the rebind must stay quiet
  disarmSerialRebind();
  if (serialDevice) {
    await serialDevice.close();
    serialDevice = null;
  }
  if (!demoDevice) {
    setActiveLink(null);
    stopLedPolling();
    store.set(firmwareAtom, null);
    store.set(usbConnectedAtom, null);
    store.set(ledsAtom, { num: false, caps: false, scroll: false });
  }
  store.set(serialStateAtom, supportsSerial() ? "disconnected" : "unsupported");
}

/** Stop demo mode (demo chip in the statusbar) and clear the stage unless
 *  real hardware is still feeding it. */
export function stopDemoMode(): void {
  if (!demo) return;
  stopDemo();
  if (!camera.stream) {
    store.set(videoStreamAtom, null);
    store.set(videoStateAtom, "disconnected");
  }
  if (!serialDevice?.connected) {
    setActiveLink(null);
    stopLedPolling();
    store.set(firmwareAtom, null);
    store.set(usbConnectedAtom, null);
    store.set(ledsAtom, { num: false, caps: false, scroll: false });
  }
}

/* ── LED / firmware polling (the original shipped getInfo but never used it) ── */

let ledPollWarned = false;

function startLedPolling(): void {
  stopLedPolling();
  ledPollWarned = false;
  const poll = async () => {
    const link: HidLink | null = demoDevice ?? (serialDevice?.connected ? serialDevice : null);
    if (!link) return;
    try {
      const info = await link.getInfo();
      store.set(ledsAtom, { num: info.NUM_LOCK, caps: info.CAPS_LOCK, scroll: info.SCROLL_LOCK });
      store.set(firmwareAtom, info.CHIP_VERSION);
      store.set(usbConnectedAtom, info.IS_CONNECTED);
      ledPollWarned = false;
    } catch (err) {
      // Transient read failures are normal while the bus is busy, but a device
      // that never answers GET_INFO would otherwise fail silently forever.
      if (!ledPollWarned) {
        ledPollWarned = true;
        console.warn("[zjkvm] LED/firmware poll failed:", err);
      }
    }
  };
  void poll();
  ledTimer = window.setInterval(poll, 3000);
}

function stopLedPolling(): void {
  if (ledTimer !== null) {
    clearInterval(ledTimer);
    ledTimer = null;
  }
}

/** Hotplug: keep the device lists fresh while connected. */
export function watchVideoHotplug(): () => void {
  void refreshVideoDevices();
  unwatchDevices?.();
  unwatchDevices = watchDeviceChange(() => {
    void refreshVideoDevices();
  });
  return () => {
    unwatchDevices?.();
    unwatchDevices = null;
  };
}

export function isMacHost(): boolean {
  return getOperatingSystem() === "macOS";
}
