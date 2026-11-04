import { useAtomValue, useSetAtom } from "jotai";
import { Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { useVideoStats } from "@/components/stage/useVideoStats";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { EYEBROW, GHOST_TEXT, META, MONO_CHIP, STATUS_CHIP } from "@/lib/styles";
import {
  connectGateChannelAtom,
  connectGateOpenAtom,
  demoModeAtom,
  mouseStyleAtom,
  mutedAtom,
  recordingAtom,
  recordingDurationAtom,
  rotationAtom,
  scaleModeAtom,
  statsVisibleAtom,
  videoStatsAtom,
  videoStreamAtom,
  volumeAtom,
} from "@/state/atoms";
import { connectVideo } from "@/state/connection";
import { pushToast } from "@/state/toast";

/** The KVM stage: full-bleed ruled-paper surface, capture stream letterboxed
 *  in the middle, toolbar + stats floating above. */
export function Stage() {
  const { t } = useI18n();
  const stream = useAtomValue(videoStreamAtom);
  const rotation = useAtomValue(rotationAtom);
  const scale = useAtomValue(scaleModeAtom);
  const mouseStyle = useAtomValue(mouseStyleAtom);
  const demo = useAtomValue(demoModeAtom);
  const statsVisible = useAtomValue(statsVisibleAtom);
  const recording = useAtomValue(recordingAtom);
  const recordingDuration = useAtomValue(recordingDurationAtom);
  const volume = useAtomValue(volumeAtom);
  const muted = useAtomValue(mutedAtom);
  const setStats = useSetAtom(videoStatsAtom);
  const setGateOpen = useSetAtom(connectGateOpenAtom);
  const setGateChannel = useSetAtom(connectGateChannelAtom);

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const stats = useVideoStats(videoEl);

  useEffect(() => {
    setStats(stats);
  }, [stats, setStats]);

  useEffect(() => {
    if (videoEl && stream && videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});
    }
  }, [videoEl, stream]);

  /* USB capture dongles re-enumerate under load (weak power/hub) — the track
     "ends" and the picture dies silently. Reconnect once on the spot and
     once after a grace period; tell the user either way. */
  useEffect(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    let retryTimer: number | null = null;
    let attempts = 0;
    const onGone = () => {
      attempts += 1;
      if (attempts > 2) {
        pushToast(t("toast.videoLostGiveUp"), "danger");
        return;
      }
      pushToast(t("toast.videoLost"));
      retryTimer = window.setTimeout(
        () => {
          void connectVideo();
        },
        attempts === 1 ? 400 : 2500,
      );
    };
    track.addEventListener("ended", onGone);
    track.addEventListener("mute", onGone);
    return () => {
      track.removeEventListener("ended", onGone);
      track.removeEventListener("mute", onGone);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [stream, t]);

  useEffect(() => {
    if (!videoEl) return;
    videoEl.volume = volume;
    videoEl.muted = muted;
  }, [videoEl, volume, muted]);

  /* Stream healthy but zero frames = no HDMI signal on the capture card's
     input (MS2133 keeps the track live and silent). Say so after 3 s. */
  const [hdmiSilent, setHdmiSilent] = useState(false);
  useEffect(() => {
    if (!stream) {
      setHdmiSilent(false);
      return;
    }
    const timer = window.setInterval(() => {
      const live = videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0;
      setHdmiSilent(!live);
    }, 3000);
    const timer2 = window.setTimeout(() => {
      const live = videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0;
      setHdmiSilent(!live);
    }, 3000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(timer2);
    };
  }, [stream, videoEl]);

  const transform = rotation === 0 ? undefined : `rotate(${rotation}deg)`;
  const zoom = scale === "auto" ? undefined : `scale(${scale})`;

  return (
    <main className="kvm-stage relative min-h-0 flex-1 overflow-hidden">
      {/* biome-ignore lint/a11y/useMediaCaption: live capture stream — there is no caption track */}
      <video
        id="video"
        ref={setVideoEl}
        autoPlay
        playsInline
        disablePictureInPicture={false}
        className={cn("kvm-stage-video absolute inset-0 size-full object-contain", !stream && "invisible", mouseStyle)}
        style={{ transform: [transform, zoom].filter(Boolean).join(" ") || undefined }}
      />

      {statsVisible && stream && (
        <div className="absolute top-2 left-3 z-30 flex gap-1.5">
          <span className={STATUS_CHIP}>{stats.width > 0 ? `${stats.width}×${stats.height}` : "—"}</span>
          {stats.fps !== null && stats.fps > 0 && <span className={STATUS_CHIP}>{stats.fps} fps</span>}
        </div>
      )}

      {/* Recording badge lives on the stage (top-right) on every breakpoint —
          one element, same position, no per-view divergence. */}
      {recording && (
        <div className="absolute top-2 right-3 z-30">
          <span className={cn(STATUS_CHIP, "border-danger/60 text-danger")} aria-live="polite">
            <span aria-hidden="true" className="kvm-rec-dot size-1.5 rounded-full bg-danger" />
            REC {formatDuration(recordingDuration)}
          </span>
        </div>
      )}

      {stream && hdmiSilent && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className={cn(MONO_CHIP, "border-warning/60 bg-warning/10 px-3 py-1 text-warning")}>
            <Radio aria-hidden="true" className="size-3" />
            {t("stage.noHdmi")}
          </span>
        </div>
      )}

      {demo && (
        <p className="absolute bottom-3 left-3 z-30 hidden max-w-md md:block">
          <span className={cn(MONO_CHIP, "border-accent/60 bg-accent-soft/60 text-accent")}>
            <Radio aria-hidden="true" className="size-3" />
            {t("demo.banner")}
          </span>
        </p>
      )}

      {!stream && (
        <NoSignal
          onConnect={() => {
            setGateChannel("all");
            setGateOpen(true);
          }}
        />
      )}

      <Toolbar />
    </main>
  );
}

function NoSignal({ onConnect }: { onConnect: () => void }) {
  const { t } = useI18n();
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-x-clip">
      <span
        aria-hidden="true"
        className={cn(GHOST_TEXT, "top-1/2 -translate-y-[130%] right-0 text-[4.5rem] sm:text-[5.5rem]")}
      >
        NO&nbsp;SIGNAL
      </span>
      <div className="relative flex flex-col items-center gap-2 px-6 text-center">
        <p className={EYEBROW}>ZJKVM</p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("stage.noSignal")}</h2>
        <p className={cn(META, "max-w-sm")}>{t("stage.openSettings")}</p>
        <button
          type="button"
          onClick={onConnect}
          className="mt-2 rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium text-ink shadow-card transition-all hover:-translate-y-0.5 hover:text-accent hover:shadow-pop"
        >
          {t("connect.title")}
        </button>
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
