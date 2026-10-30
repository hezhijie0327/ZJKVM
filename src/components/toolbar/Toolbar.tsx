import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Circle,
  Keyboard as KeyboardIcon,
  Maximize,
  Monitor,
  MousePointer2,
  PictureInPicture2,
  Settings2,
  Square,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioPanel } from "@/components/toolbar/panels/AudioPanel";
import { KeyboardPanel } from "@/components/toolbar/panels/KeyboardPanel";
import { MousePanel } from "@/components/toolbar/panels/MousePanel";
import { SettingsPanel } from "@/components/toolbar/panels/SettingsPanel";
import { VideoPanel } from "@/components/toolbar/panels/VideoPanel";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { useIsMobile } from "@/hooks/useIsMobile";
import { supportsPictureInPicture } from "@/lib/browser";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { downloadBlob, StreamRecorder } from "@/lib/recorder";
import { captureFrame, copyBlobToClipboard } from "@/lib/snapshot";
import { TOOLBAR, TOOLBAR_DIVIDER } from "@/lib/styles";
import {
  activePanelAtom,
  recordingAtom,
  recordingDurationAtom,
  toolbarCollapsedAtom,
  toolbarPosAtom,
  videoStreamAtom,
} from "@/state/atoms";
import { pushToast } from "@/state/toast";

/** Floating console toolbar: glass pill above the stage (draggable on fine
 *  pointers), bottom bar on touch layouts. One panel open at a time. */
export function Toolbar() {
  const { t } = useI18n();
  const activePanel = useAtomValue(activePanelAtom);
  const setActivePanel = useSetAtom(activePanelAtom);
  const collapsed = useAtomValue(toolbarCollapsedAtom);
  const setCollapsed = useSetAtom(toolbarCollapsedAtom);
  const pos = useAtomValue(toolbarPosAtom);
  const setPos = useSetAtom(toolbarPosAtom);
  const recording = useAtomValue(recordingAtom);
  const setRecording = useSetAtom(recordingAtom);
  const setDuration = useSetAtom(recordingDurationAtom);
  const stream = useAtomValue(videoStreamAtom);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const videoButtonRef = useRef<HTMLButtonElement>(null);
  const audioButtonRef = useRef<HTMLButtonElement>(null);
  const keyboardButtonRef = useRef<HTMLButtonElement>(null);
  const mouseButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const recorderRef = useRef(new StreamRecorder());
  const timerRef = useRef<number | null>(null);

  const [dragging, setDragging] = useState(false);
  const isMobile = useIsMobile();
  const panelSide = isMobile ? "top" : "bottom";
  const togglePanel = useCallback(
    (panel: string) => {
      setActivePanel(activePanel === panel ? null : panel);
    },
    [activePanel, setActivePanel],
  );

  /* ── Drag (fine pointers only) ── */
  const onHandlePointerDown = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    event.preventDefault();
    setDragging(true);
    const startX = event.clientX;
    const startY = event.clientY;
    const startPos = { ...pos };

    const onMove = (move: PointerEvent) => {
      const width = toolbarRef.current?.offsetWidth ?? 400;
      const maxX = window.innerWidth / 2 - width / 2 - 8;
      const maxY = window.innerHeight - 120;
      setPos({
        x: Math.max(-maxX, Math.min(maxX, startPos.x + move.clientX - startX)),
        y: Math.max(0, Math.min(maxY, startPos.y + move.clientY - startY)),
      });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  /* ── Recording ── */
  const toggleRecording = async () => {
    if (recording) {
      const blob = await recorderRef.current.stop();
      setRecording(false);
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setDuration(0);
      if (blob) {
        downloadBlob(blob, `zjkvm-recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`);
      }
      pushToast(t("toast.recSaved"));
      return;
    }
    if (!stream) {
      pushToast(t("toast.recFail"), "danger");
      return;
    }
    try {
      await recorderRef.current.start(stream, () => pushToast(t("toast.recFail"), "danger"));
      setRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        const store = getDefaultStore();
        store.set(recordingDurationAtom, (seconds) => seconds + 1);
      }, 1000);
    } catch {
      pushToast(t("toast.recFail"), "danger");
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, []);

  /* ── Screenshot ── */
  const snapshot = async () => {
    const video = document.getElementById("video") as HTMLVideoElement | null;
    if (!video?.videoWidth) {
      pushToast(t("toast.snapFail"), "danger");
      return;
    }
    try {
      const blob = await captureFrame(video);
      downloadBlob(blob, `zjkvm-snapshot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`);
      try {
        await copyBlobToClipboard(blob);
        pushToast(t("toast.snapCopied"));
      } catch {
        pushToast(t("toast.snapSaved"));
      }
    } catch {
      pushToast(t("toast.snapFail"), "danger");
    }
  };

  /* ── Picture in picture ── */
  const togglePip = async () => {
    const video = document.getElementById("video") as HTMLVideoElement | null;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video) {
        await video.requestPictureInPicture();
      }
    } catch {
      pushToast(t("toast.pipFail"), "danger");
    }
  };

  /* ── Fullscreen (+ keyboard lock so Win/Cmd reach the target machine) ── */
  type KeyboardLock = { lock?: (keys?: string[]) => Promise<void>; unlock?: () => void };
  const keyboardApi = (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard;

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        keyboardApi?.unlock?.();
        await document.exitFullscreen();
      } else {
        await toolbarRef.current?.closest(".kvm-stage")?.requestFullscreen();
        await keyboardApi?.lock?.(["MetaLeft", "MetaRight", "AltLeft", "AltRight"]);
      }
    } catch {
      // fullscreen rejected — ignore
    }
  };

  if (collapsed) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-16 z-40 flex justify-center md:bottom-auto md:top-2">
        <div className="pointer-events-auto">
          <IconButton label={t("tb.expand")} active onClick={() => setCollapsed(false)} className="shadow-pop">
            <ChevronDown aria-hidden="true" className="size-4" />
          </IconButton>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "z-40 flex justify-center px-2",
        isMobile ? "fixed inset-x-0 bottom-3" : "pointer-events-none absolute inset-x-0 top-2 max-md:static",
      )}
      style={isMobile ? undefined : { transform: `translateY(${pos.y}px)` }}
    >
      <div
        ref={toolbarRef}
        className={cn(
          TOOLBAR,
          "pointer-events-auto select-none",
          isMobile && "max-w-full flex-wrap justify-center",
          dragging && "cursor-grabbing",
        )}
        style={isMobile ? undefined : { transform: `translateX(${pos.x}px)` }}
        role="toolbar"
        aria-label="KVM"
        aria-orientation="horizontal"
      >
        {!isMobile && (
          <button
            type="button"
            aria-label="drag"
            onPointerDown={onHandlePointerDown}
            className={cn(
              "grid size-8 cursor-grab place-items-center rounded-full text-ink-3 hover:text-ink",
              dragging && "cursor-grabbing",
            )}
          >
            <GripDots />
          </button>
        )}

        <IconButton
          ref={videoButtonRef}
          label={t("tb.video")}
          active={activePanel === "video"}
          onClick={() => togglePanel("video")}
        >
          <Monitor aria-hidden="true" className="size-4" />
        </IconButton>
        <IconButton
          ref={audioButtonRef}
          label={t("tb.audio")}
          active={activePanel === "audio"}
          onClick={() => togglePanel("audio")}
        >
          <Volume2 aria-hidden="true" className="size-4" />
        </IconButton>
        <IconButton
          ref={keyboardButtonRef}
          label={t("tb.keyboard")}
          active={activePanel === "keyboard"}
          onClick={() => togglePanel("keyboard")}
        >
          <KeyboardIcon aria-hidden="true" className="size-4" />
        </IconButton>
        <IconButton
          ref={mouseButtonRef}
          label={t("tb.mouse")}
          active={activePanel === "mouse"}
          onClick={() => togglePanel("mouse")}
        >
          <MousePointer2 aria-hidden="true" className="size-4" />
        </IconButton>

        <span aria-hidden="true" className={TOOLBAR_DIVIDER} />

        <IconButton
          label={recording ? t("rec.stop") : t("rec.start")}
          active={recording}
          onClick={toggleRecording}
          className={recording ? "text-danger hover:text-danger" : undefined}
        >
          {recording ? (
            <Square aria-hidden="true" className="size-4" />
          ) : (
            <Circle aria-hidden="true" className="size-4" />
          )}
        </IconButton>
        <IconButton label={t("tb.screenshot")} onClick={snapshot}>
          <Camera aria-hidden="true" className="size-4" />
        </IconButton>
        {supportsPictureInPicture() && (
          <IconButton label={t("tb.pip")} onClick={togglePip}>
            <PictureInPicture2 aria-hidden="true" className="size-4" />
          </IconButton>
        )}

        <span aria-hidden="true" className={TOOLBAR_DIVIDER} />

        <IconButton
          ref={settingsButtonRef}
          label={t("tb.settings")}
          active={activePanel === "settings"}
          onClick={() => togglePanel("settings")}
        >
          <Settings2 aria-hidden="true" className="size-4" />
        </IconButton>
        <IconButton label={t("tb.fullscreen")} onClick={toggleFullscreen}>
          <Maximize aria-hidden="true" className="size-4" />
        </IconButton>
        <IconButton label={t("tb.collapse")} onClick={() => setCollapsed(true)}>
          <ChevronUp aria-hidden="true" className="size-4" />
        </IconButton>

        {/* Panels: drop below the pill on desktop, rise above the bar on mobile */}
        <Popover
          open={activePanel === "video"}
          onClose={() => setActivePanel(null)}
          side={panelSide}
          anchorRef={videoButtonRef}
          className="w-80"
        >
          <VideoPanel />
        </Popover>
        <Popover
          open={activePanel === "audio"}
          onClose={() => setActivePanel(null)}
          side={panelSide}
          anchorRef={audioButtonRef}
          className="w-80"
        >
          <AudioPanel />
        </Popover>
        <Popover
          open={activePanel === "keyboard"}
          onClose={() => setActivePanel(null)}
          side={panelSide}
          anchorRef={keyboardButtonRef}
          className="w-96 max-w-[calc(100vw-1.5rem)]"
        >
          <KeyboardPanel />
        </Popover>
        <Popover
          open={activePanel === "mouse"}
          onClose={() => setActivePanel(null)}
          side={panelSide}
          anchorRef={mouseButtonRef}
          className="w-80"
        >
          <MousePanel />
        </Popover>
        <Popover
          open={activePanel === "settings"}
          onClose={() => setActivePanel(null)}
          side={panelSide}
          anchorRef={settingsButtonRef}
          className="w-80"
        >
          <SettingsPanel onAbout={() => setActivePanel(null)} />
        </Popover>
      </div>
      {recording && <span className="sr-only" aria-live="polite" />}
    </div>
  );
}

function GripDots() {
  return (
    <svg aria-hidden="true" width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="2" cy="2" r="1.2" />
      <circle cx="8" cy="2" r="1.2" />
      <circle cx="2" cy="7" r="1.2" />
      <circle cx="8" cy="7" r="1.2" />
      <circle cx="2" cy="12" r="1.2" />
      <circle cx="8" cy="12" r="1.2" />
    </svg>
  );
}
