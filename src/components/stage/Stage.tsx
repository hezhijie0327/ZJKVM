import { useAtomValue, useSetAtom } from "jotai";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useVideoStats } from "@/components/stage/useVideoStats";
import { computeVideoRect } from "@/components/stage/videoRect";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { EYEBROW, GHOST_TEXT, MONO_CHIP, STATUS_CHIP } from "@/lib/styles";
import {
  activePanelAtom,
  mouseStyleAtom,
  mutedAtom,
  pictureRectAtom,
  recordingAtom,
  recordingDurationAtom,
  rotationAtom,
  scaleModeAtom,
  videoStatsAtom,
  videoStreamAtom,
  volumeAtom,
} from "@/state/atoms";
import { connectVideo, videoRetrySuppressed } from "@/state/connection";
import { pushToast } from "@/state/toast";

/** The KVM stage: full-bleed ruled-paper surface, capture stream letterboxed
 *  in the middle, toolbar + REC floating above; video stats live in the
 *  statusbar pill (Statusbar) so the picture content stays clean. */
export function Stage() {
  const { t } = useI18n();
  const stream = useAtomValue(videoStreamAtom);
  const rotation = useAtomValue(rotationAtom);
  const scale = useAtomValue(scaleModeAtom);
  const mouseStyle = useAtomValue(mouseStyleAtom);
  const recording = useAtomValue(recordingAtom);
  const recordingDuration = useAtomValue(recordingDurationAtom);
  const volume = useAtomValue(volumeAtom);
  const muted = useAtomValue(mutedAtom);
  const setStats = useSetAtom(videoStatsAtom);
  const setPictureRect = useSetAtom(pictureRectAtom);
  const setActivePanel = useSetAtom(activePanelAtom);

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
      // An intentional demo stop ends its track too — that is teardown, not
      // a capture-card drop, so the auto-retry must stand down and leave the
      // stage to return to the no-signal state.
      if (videoRetrySuppressed()) return;
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

  /* Stream liveness, three states so the stage never sits blank: a connected
     source resolves dimensions within a few hundred ms (the element's own
     loadedmetadata/resize events flip us to "live" early), a dongle with no
     HDMI input keeps the track live-but-silent and escalates to the wiring
     guide after a 3 s grace, and in between a waiting chip gives instant
     feedback. A stream identity change (device switch, demo start) resets
     the verdict first — otherwise the previous source's "silent" sticks and
     the guide flashes over a live picture. */
  const [signal, setSignal] = useState<"pending" | "live" | "silent">("pending");
  useEffect(() => {
    setSignal("pending");
    if (!stream) return;
    const judge = () => {
      const live = videoEl && videoEl.readyState >= 2 && videoEl.videoWidth > 0;
      setSignal(live ? "live" : "silent");
    };
    // Early live verdict only: metadata with real dimensions means frames
    // are coming — an input-less dongle never resolves dimensions, so we
    // never call "silent" off an event; the grace timeout owns that call.
    const onMeta = () => {
      if (videoEl && videoEl.videoWidth > 0) setSignal("live");
    };
    videoEl?.addEventListener("loadedmetadata", onMeta);
    videoEl?.addEventListener("resize", onMeta);
    const timer = window.setInterval(judge, 3000);
    const timer2 = window.setTimeout(judge, 3000);
    return () => {
      videoEl?.removeEventListener("loadedmetadata", onMeta);
      videoEl?.removeEventListener("resize", onMeta);
      window.clearInterval(timer);
      window.clearTimeout(timer2);
    };
  }, [stream, videoEl]);

  const transform = rotation === 0 ? undefined : `rotate(${rotation}deg)`;
  const zoom = scale === "auto" ? undefined : `scale(${scale})`;

  /* In-picture badge anchoring: the video letterboxes inside the stage, so
     the badges ride the rendered content rect (videoRect math) instead of the
     stage corners. The observer only re-renders on box changes — the rect
     itself is derived from the live element each pass. */
  const [stageBox, setStageBox] = useState<{ clientWidth: number; clientHeight: number } | null>(null);
  useEffect(() => {
    if (!videoEl) return;
    const ro = new ResizeObserver(() =>
      setStageBox({ clientWidth: videoEl.clientWidth, clientHeight: videoEl.clientHeight }),
    );
    ro.observe(videoEl);
    return () => ro.disconnect();
  }, [videoEl]);
  const pictureRect = videoEl && stream ? computeVideoRect(videoEl, stageBox ?? videoEl, rotation, scale) : null;

  /* Publish the picture rect in viewport coordinates for floating layers
     (status chips pill). Rendered content is always centered on the element
     (computeVideoRect centers, transforms scale/rotate about the center), so
     the visual rect is the element's center box with dims swapped on 90/270. */
  useEffect(() => {
    if (!videoEl || !stream || !pictureRect) {
      setPictureRect(null);
      return;
    }
    const vr = videoEl.getBoundingClientRect();
    const rotated = rotation === 90 || rotation === 270;
    const w = rotated ? pictureRect.height : pictureRect.width;
    const h = rotated ? pictureRect.width : pictureRect.height;
    setPictureRect({ x: vr.x + vr.width / 2 - w / 2, y: vr.y + vr.height / 2 - h / 2, w, h });
  }, [videoEl, stream, pictureRect, rotation, setPictureRect]);

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

      {/* Recording badge rides the picture's top-right corner (letterbox-
          aware) — the only overlay on the picture content itself. */}
      {recording && (
        <div
          className={cn("absolute z-30", pictureRect ? "-translate-x-full" : "top-16 right-3 md:top-2")}
          style={
            pictureRect
              ? { left: pictureRect.offsetX + pictureRect.width - 10, top: pictureRect.offsetY + 10 }
              : undefined
          }
        >
          <span className={cn(STATUS_CHIP, "border-danger/60 text-danger")} aria-live="polite">
            <span aria-hidden="true" className="kvm-rec-dot size-1.5 rounded-full bg-danger" />
            REC {formatDuration(recordingDuration)}
          </span>
        </div>
      )}

      {stream && signal === "pending" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className={cn(MONO_CHIP, "border-line/80 bg-bg/85 px-3 py-1 text-ink-2 backdrop-blur-md")}>
            <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
            {t("stage.waiting")}
          </span>
        </div>
      )}

      {stream && signal === "silent" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-x-clip">
          <div className="relative flex w-full max-w-2xl flex-col items-center gap-2 px-6 text-center">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {t("stage.noHdmi")}
            </h2>
            <WiringDiagram />
          </div>
        </div>
      )}

      {!stream && <NoSignal onConnect={() => setActivePanel("devices")} />}

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
      <div className="relative flex w-full max-w-2xl flex-col items-center gap-2 px-6 text-center">
        <p className={EYEBROW}>ZJKVM</p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("stage.noSignal")}</h2>
        <WiringDiagram />
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

/** Redrawn wiring map (from Sipeed's NanoKVM-USB diagram, family tokens):
 *  the target's HDMI out feeds the dongle, the dongle injects USB HID back
 *  into the target, its HOST port carries video/audio/HID to the computer
 *  running this console, and an optional HDMI loop-out reaches a monitor.
 *  Shown whenever the stage sits dark so the fix is one glance away. */
function WiringDiagram() {
  const { t } = useI18n();
  return (
    <svg
      viewBox="0 0 620 204"
      role="img"
      aria-label={t("stage.wiring.title")}
      className="mt-1 w-full max-w-2xl"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <defs>
        <marker
          id="wiring-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0L8 4L0 8Z" fill="var(--ink-3)" />
        </marker>
      </defs>

      {/* target tower */}
      <rect x="18" y="48" width="104" height="96" rx="10" fill="var(--surface-2)" stroke="var(--ink-3)" />
      <rect x="36" y="66" width="68" height="9" rx="2" fill="var(--ink-3)" />
      <rect x="36" y="84" width="68" height="9" rx="2" fill="var(--ink-3)" />
      <rect x="36" y="102" width="68" height="9" rx="2" fill="var(--ink-3)" />
      <text x="70" y="166" textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--ink)">
        {t("stage.wiring.target")}
      </text>

      {/* NanoKVM USB dongle (accent border = the hub everything meets at);
          inside, the USB-A port's T/H switch glyph — the physical toggle
          maps that port to the target or to this computer. */}
      <rect x="258" y="76" width="128" height="64" rx="12" fill="var(--surface-2)" stroke="var(--accent)" />
      <text x="322" y="97" textAnchor="middle" fontSize="12" fill="var(--ink)">
        NanoKVM USB
      </text>
      <text x="300" y="121" textAnchor="middle" fontSize="9" fill="var(--ink-3)">
        T
      </text>
      <rect x="310" y="112" width="24" height="11" rx="5.5" fill="var(--surface-2)" stroke="var(--ink-3)" />
      <circle cx="316" cy="117.5" r="3.5" fill="var(--ink-3)" />
      <text x="344" y="121" textAnchor="middle" fontSize="9" fill="var(--ink-3)">
        H
      </text>
      <text x="322" y="158" textAnchor="middle" fontSize="10" fill="var(--ink-3)">
        {t("stage.wiring.usbSwitch")}
      </text>

      {/* monitor (optional loop-out) */}
      <rect x="498" y="20" width="104" height="58" rx="6" fill="var(--surface-2)" stroke="var(--ink-3)" />
      <rect x="540" y="78" width="20" height="6" rx="2" fill="var(--ink-3)" />
      <rect x="526" y="86" width="48" height="5" rx="2" fill="var(--ink-3)" />
      <text x="550" y="106" textAnchor="middle" fontSize="11" fill="var(--ink)">
        {t("stage.wiring.monitor")}
      </text>

      {/* host laptop */}
      <rect x="512" y="122" width="76" height="44" rx="5" fill="var(--surface-2)" stroke="var(--ink-3)" />
      <rect x="502" y="166" width="96" height="7" rx="3" fill="var(--ink-3)" />
      <text x="550" y="192" textAnchor="middle" fontSize="11" fill="var(--ink)">
        {t("stage.wiring.host")}
      </text>

      {/* HDMI: target out → dongle in */}
      <line x1="122" y1="84" x2="254" y2="84" stroke="var(--ink-3)" strokeWidth="1.5" markerEnd="url(#wiring-arrow)" />
      <text x="190" y="74" textAnchor="middle" fontSize="10" fill="var(--ink-3)">
        HDMI
      </text>

      {/* HID: dongle → target (keyboard/mouse injection) */}
      <line
        x1="258"
        y1="114"
        x2="126"
        y2="114"
        stroke="var(--ink-3)"
        strokeWidth="1.5"
        markerEnd="url(#wiring-arrow)"
      />
      <text x="190" y="134" textAnchor="middle" fontSize="10" fill="var(--ink-3)">
        {t("stage.wiring.hid")}
      </text>

      {/* optional HDMI loop-out */}
      <line
        x1="386"
        y1="84"
        x2="492"
        y2="46"
        stroke="var(--ink-3)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        markerEnd="url(#wiring-arrow)"
      />
      <text x="440" y="54" textAnchor="middle" fontSize="10" fill="var(--ink-3)">
        {t("stage.wiring.loop")}
      </text>

      {/* USB: dongle → host computer */}
      <line
        x1="386"
        y1="112"
        x2="506"
        y2="140"
        stroke="var(--ink-3)"
        strokeWidth="1.5"
        markerEnd="url(#wiring-arrow)"
      />
      <text x="448" y="116" textAnchor="middle" fontSize="10" fill="var(--ink-3)">
        {t("stage.wiring.usb")}
      </text>
    </svg>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
