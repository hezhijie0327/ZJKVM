/** Connection management: video (UVC), serial (CH9329 HID), demo mode, LED
 *  polling, disconnect handling. Plain functions over the default jotai store
 *  so both UI components and effects can drive them. */

import { getDefaultStore } from "jotai";
import { getOperatingSystem, supportsSerial } from "@/lib/browser";
import { DemoDevice } from "@/lib/device/demo-device";
import { attachDebugHook, createDemoStream } from "@/lib/device/demo-video";
import { type HidLink, SerialDevice, setActiveLink } from "@/lib/device/device";
import { camera, listCaptureDevices, watchDeviceChange } from "@/lib/media/camera";
import {
  audioByGroupAtom,
  connectGateOpenAtom,
  demoModeAtom,
  firmwareAtom,
  ledsAtom,
  resolutionAtom,
  serialStateAtom,
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

/** Open the capture card (defaults to the saved/picked device id). */
export async function connectVideo(deviceId?: string): Promise<boolean> {
  const id = deviceId ?? store.get(videoDeviceIdAtom);
  if (!id) {
    store.set(videoStateAtom, "disconnected");
    return false;
  }

  store.set(videoStateAtom, "connecting");
  try {
    const resolution = store.get(resolutionAtom);
    const audio = store.get(audioByGroupAtom).get(groupIdOf(id))?.deviceId;
    await camera.open(id, resolution.width, resolution.height, audio);
    store.set(videoStreamAtom, camera.getStream());
    store.set(videoStateAtom, "connected");
    store.set(videoDeviceIdAtom, id);
    store.set(connectGateOpenAtom, false);
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
    await device.open(() => {
      store.set(serialStateAtom, "disconnected");
      stopLedPolling();
      pushToast(t("toast.disconnected"), "danger");
    });
    serialDevice = device;
    setActiveLink(device);
    store.set(serialStateAtom, "connected");
    store.set(connectGateOpenAtom, false);
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
  store.set(connectGateOpenAtom, false);
  startLedPolling();
}

function stopDemo(): void {
  demo?.stop();
  demo = null;
  demoDevice = null;
  store.set(demoModeAtom, false);
}

/** Tear everything down. */
export async function disconnectAll(): Promise<void> {
  stopLedPolling();
  stopDemo();
  setActiveLink(null);
  if (serialDevice) {
    await serialDevice.close();
    serialDevice = null;
  }
  camera.close();
  store.set(videoStreamAtom, null);
  store.set(videoStateAtom, "disconnected");
  store.set(serialStateAtom, supportsSerial() ? "disconnected" : "unsupported");
  store.set(firmwareAtom, null);
  store.set(ledsAtom, { num: false, caps: false, scroll: false });
}

/* ── LED / firmware polling (the original shipped getInfo but never used it) ── */

function startLedPolling(): void {
  stopLedPolling();
  const poll = async () => {
    const link: HidLink | null = demoDevice ?? (serialDevice?.connected ? serialDevice : null);
    if (!link) return;
    try {
      const info = await link.getInfo();
      store.set(ledsAtom, { num: info.NUM_LOCK, caps: info.CAPS_LOCK, scroll: info.SCROLL_LOCK });
      store.set(firmwareAtom, info.CHIP_VERSION);
    } catch {
      // transient read failures are normal while the bus is busy
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
