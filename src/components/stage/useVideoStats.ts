/** Live video stats: native resolution + measured fps via
 *  requestVideoFrameCallback (falls back to no fps reading where unsupported). */

import { useEffect, useState } from "react";

export interface VideoStats {
  width: number;
  height: number;
  fps: number | null;
}

export function useVideoStats(video: HTMLVideoElement | null): VideoStats {
  const [stats, setStats] = useState<VideoStats>({ width: 0, height: 0, fps: null });

  useEffect(() => {
    if (!video) return;

    let frames = 0;
    let raf = 0;
    let windowStart = performance.now();
    let stopped = false;

    const tick = () => {
      frames += 1;
      const now = performance.now();
      const elapsed = now - windowStart;
      if (elapsed >= 1000) {
        const fps = Math.round((frames * 1000) / elapsed);
        setStats((prev) => ({ ...prev, fps }));
        frames = 0;
        windowStart = now;
      }
      if (!stopped) {
        schedule();
      }
    };

    const schedule = () => {
      if (typeof video.requestVideoFrameCallback === "function") {
        raf = video.requestVideoFrameCallback(() => tick());
      } else {
        raf = requestAnimationFrame(() => tick());
      }
    };

    const syncSize = () => {
      setStats((prev) => ({ ...prev, width: video.videoWidth, height: video.videoHeight }));
    };

    syncSize();
    video.addEventListener("loadedmetadata", syncSize);
    video.addEventListener("resize", syncSize);
    schedule();

    return () => {
      stopped = true;
      if (typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(raf);
      } else {
        cancelAnimationFrame(raf);
      }
      video.removeEventListener("loadedmetadata", syncSize);
      video.removeEventListener("resize", syncSize);
    };
  }, [video]);

  return stats;
}
