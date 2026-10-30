/** Video geometry: compute the actual on-screen rectangle of the rendered
 *  video inside the stage element, honoring object-contain letterboxing,
 *  CSS rotation (0/90/180/270) and the zoom factor — then map client
 *  coordinates back to normalized video coordinates (0..1).
 *
 *  The original only corrected for letterboxing; with rotation applied its
 *  absolute-mouse coordinates drifted. This module does the full transform. */

import type { Rotation } from "@/types";

export interface VideoRect {
  /** rendered rect in element-local pixels (already rotated/scaled) */
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export function computeVideoRect(
  video: { videoWidth: number; videoHeight: number },
  element: { clientWidth: number; clientHeight: number },
  rotation: Rotation,
  scale: "auto" | number,
): VideoRect {
  if (!video.videoWidth || !video.videoHeight || !element.clientWidth || !element.clientHeight) {
    return { offsetX: 0, offsetY: 0, width: element.clientWidth, height: element.clientHeight };
  }

  // After rotation, the video's effective aspect swaps on 90/270
  const rotated = rotation === 90 || rotation === 270;
  const videoW = rotated ? video.videoHeight : video.videoWidth;
  const videoH = rotated ? video.videoWidth : video.videoHeight;

  const elementW = element.clientWidth;
  const elementH = element.clientHeight;
  const ratio = Math.min(elementW / videoW, elementH / videoH);

  const factor = scale === "auto" ? 1 : scale;
  const width = videoW * ratio * factor;
  const height = videoH * ratio * factor;

  return {
    offsetX: (elementW - width) / 2,
    offsetY: (elementH - height) / 2,
    width,
    height,
  };
}

/** Map a client point to normalized video coordinates (0..1), inverting the
 *  CSS rotation. Returns null when outside the rendered video rect. */
export function clientToVideo(
  clientX: number,
  clientY: number,
  element: DOMRect,
  rect: VideoRect,
  rotation: Rotation,
): { x: number; y: number } | null {
  const localX = clientX - element.left - rect.offsetX;
  const localY = clientY - element.top - rect.offsetY;
  if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) {
    return null;
  }

  // Position within the rendered (rotated) rect, 0..1
  const rx = localX / rect.width;
  const ry = localY / rect.height;

  // Invert the rotation to get video-source coordinates
  switch (rotation) {
    case 90: {
      // content rotated 90° CW: source u = ry, v = 1 - rx
      return { x: ry, y: 1 - rx };
    }
    case 180:
      return { x: 1 - rx, y: 1 - ry };
    case 270: {
      return { x: 1 - ry, y: rx };
    }
    default:
      return { x: rx, y: ry };
  }
}
