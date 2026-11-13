/** UVC capture card access: getUserMedia with capture-friendly constraints
 *  (high fps, low latency, no resize), video+audio paired by groupId.
 *  Enhanced vs the original: live device hotplug via devicechange. */

import { checkPermission, requestPermission } from "@/lib/media/permission";
import type { MediaDevice } from "@/types";

class Camera {
  id = "";
  width = 1920;
  height = 1080;
  audioId = "";
  stream: MediaStream | null = null;
  /** In-flight generation guard: overlapping opens (double click + racing
   *  track-loss retry) must not leak the loser's getUserMedia tracks. */
  private openSeq = 0;
  /** Set when the last open wanted audio but had to fall back to video-only. */
  audioDegraded = false;

  async open(id: string, width: number, height: number, audioId?: string) {
    if (!id && !this.id) {
      return;
    }

    const seq = ++this.openSeq;
    this.close();

    const video: MediaTrackConstraints & { resizeMode?: string } = {
      deviceId: { exact: id },
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: 60 },
      resizeMode: "none",
    };

    const isMicGranted = await checkPermission("microphone");
    const audio: MediaTrackConstraints | false =
      isMicGranted && audioId
        ? {
            deviceId: { exact: audioId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
          }
        : false;

    this.id = id;
    this.width = width;
    this.height = height;
    if (audioId) this.audioId = audioId;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      this.audioDegraded = false;
    } catch {
      // The paired audio track failing must not kill the video — but the
      // user deserves to know why there is no sound.
      stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      this.audioDegraded = audio !== false;
    }

    // A newer open superseded this one — discard the stale result and stop
    // its tracks so they never leak.
    if (seq !== this.openSeq) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      return;
    }
    this.stream = stream;
  }

  async updateResolution(width: number, height: number) {
    return this.open(this.id, width, height, this.audioId);
  }

  close(): void {
    this.openSeq += 1;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.stream = null;
    }
  }

  getStream(): MediaStream | null {
    return this.stream;
  }
}

export const camera = new Camera();

/** Without camera permission, enumerateDevices() hides real deviceIds and
 *  labels (both empty strings) — the capture card then looks "missing" even
 *  though it is plugged in. Probe the permission with a generic getUserMedia
 *  so the enumeration becomes usable, then re-enumerate. */
export async function ensureCameraPermission(): Promise<boolean> {
  if (await checkPermission("camera")) return true;
  return requestPermission("camera");
}

/** Capture-card-looking label (HDMI/USB capture dongles). Virtual cameras
 *  (OBS etc.) don't match — the KVM only lists real capture hardware. */
export function isCaptureLike(label: string): boolean {
  return /hdmi|capture|采集|usb|ms21|macrosilicon|avermedia|elgato|nanokvm/i.test(label);
}

/** Pick a sensible default capture card: prefer HDMI/USB-capture-looking
 *  labels (the dongle next to a built-in webcam), fall back to the first. */
export function pickCaptureDevice(devices: MediaDevice[]): MediaDevice | null {
  if (devices.length === 0) return null;
  return devices.find((d) => isCaptureLike(d.label)) ?? devices[0] ?? null;
}

/** Pair a capture card's audio input with its video by groupId. */
export async function listCaptureDevices(): Promise<{ video: MediaDevice[]; audioByGroup: Map<string, MediaDevice> }> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const video = devices
    .filter((d) => d.kind === "videoinput")
    .map((d) => ({ deviceId: d.deviceId, label: d.label, groupId: d.groupId, kind: d.kind }));
  const audioByGroup = new Map<string, MediaDevice>();
  for (const d of devices.filter((d) => d.kind === "audioinput")) {
    if (!audioByGroup.has(d.groupId)) {
      audioByGroup.set(d.groupId, { deviceId: d.deviceId, label: d.label, groupId: d.groupId, kind: d.kind });
    }
  }
  return { video, audioByGroup };
}

/** Subscribe to hotplug events (returns unsubscribe). */
export function watchDeviceChange(onChange: () => void): () => void {
  navigator.mediaDevices?.addEventListener("devicechange", onChange);
  return () => navigator.mediaDevices?.removeEventListener("devicechange", onChange);
}
