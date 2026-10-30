/** UVC capture card access: getUserMedia with capture-friendly constraints
 *  (high fps, low latency, no resize), video+audio paired by groupId.
 *  Enhanced vs the original: live device hotplug via devicechange. */

import { checkPermission } from "@/lib/media/permission";
import type { MediaDevice } from "@/types";

class Camera {
  id = "";
  width = 1920;
  height = 1080;
  audioId = "";
  stream: MediaStream | null = null;

  async open(id: string, width: number, height: number, audioId?: string) {
    if (!id && !this.id) {
      return;
    }

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

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video, audio });
    } catch {
      this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    }
  }

  async updateResolution(width: number, height: number) {
    return this.open(this.id, width, height, this.audioId);
  }

  close(): void {
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

  hasAudio(): boolean {
    return Boolean(this.stream?.getAudioTracks().length);
  }
}

export const camera = new Camera();

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
