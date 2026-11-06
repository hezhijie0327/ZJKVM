import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Keyboard as KeyboardIcon,
  Maximize,
  MousePointer2,
  PictureInPicture2,
  Square,
  Usb,
  Video,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { DevicePanel } from "@/components/toolbar/panels/DevicePanel";
import { KeyboardPanel } from "@/components/toolbar/panels/KeyboardPanel";
import { MousePanel } from "@/components/toolbar/panels/MousePanel";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { useIsMobile } from "@/hooks/useIsMobile";
import { supportsPictureInPicture } from "@/lib/browser";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { downloadBlob, StreamRecorder } from "@/lib/recorder";
import { captureFrame, copyBlobToClipboard } from "@/lib/snapshot";
import { CARD, TOOLBAR, TOOLBAR_DIVIDER } from "@/lib/styles";
import {
  activePanelAtom,
  recordingAtom,
  recordingDurationAtom,
  toolbarCollapsedAtom,
  toolbarPosAtom,
  videoStreamAtom,
} from "@/state/atoms";
import { pushToast } from "@/state/toast";

/** Console toolbar. Desktop: draggable glass pill under the navigation, one
 *  panel open at a time (anchored popovers). Mobile: a fixed bottom dock —
 *  one scrollable button row (safe-area aware) with the open panel rendered
 *  as a sheet above the dock, so the status bar never gets covered. */
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
  const deviceButtonRef = useRef<HTMLButtonElement>(null);
  const keyboardButtonRef = useRef<HTMLButtonElement>(null);
  const mouseButtonRef = useRef<HTMLButtonElement>(null);
  const recorderRef = useRef(new StreamRecorder());
  const timerRef = useRef<number | null>(null);

  const [dragging, setDragging] = useState(false);
  const isMobile = useIsMobile();
  const togglePanel = useCallback(
    (panel: string) => {
      setActivePanel(activePanel === panel ? null : panel);
    },
    [activePanel, setActivePanel],
  );

  /* ── Drag (any pointer: mouse drag, touch drag via touch-none) ── */
  const onHandlePointerDown = (event: React.PointerEvent) => {
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

  const buttons = (withAnchors: boolean) => (
    <>
      <IconButton
        ref={withAnchors ? deviceButtonRef : undefined}
        label={t("tb.devices")}
        active={activePanel === "devices"}
        onClick={() => togglePanel("devices")}
        className="shrink-0"
      >
        <Usb aria-hidden="true" className="size-4" />
      </IconButton>
      <IconButton
        ref={withAnchors ? keyboardButtonRef : undefined}
        label={t("tb.keyboard")}
        active={activePanel === "keyboard"}
        onClick={() => togglePanel("keyboard")}
        className="shrink-0"
      >
        <KeyboardIcon aria-hidden="true" className="size-4" />
      </IconButton>
      <IconButton
        ref={withAnchors ? mouseButtonRef : undefined}
        label={t("tb.mouse")}
        active={activePanel === "mouse"}
        onClick={() => togglePanel("mouse")}
        className="shrink-0"
      >
        <MousePointer2 aria-hidden="true" className="size-4" />
      </IconButton>

      <span aria-hidden="true" className={TOOLBAR_DIVIDER} />

      <IconButton
        label={recording ? t("rec.stop") : t("rec.start")}
        onClick={toggleRecording}
        className={cn("shrink-0", recording && "text-danger hover:text-danger")}
      >
        {recording ? (
          // live: the stop glyph blinks with the same 1.2 s rhythm as the
          // picture-badge REC dot
          <Square aria-hidden="true" className="kvm-rec-dot size-4 fill-current" />
        ) : (
          <Video aria-hidden="true" className="size-4" />
        )}
      </IconButton>
      <IconButton label={t("tb.screenshot")} onClick={snapshot} className="shrink-0">
        <Camera aria-hidden="true" className="size-4" />
      </IconButton>
      {supportsPictureInPicture() && (
        <IconButton label={t("tb.pip")} onClick={togglePip} className="shrink-0">
          <PictureInPicture2 aria-hidden="true" className="size-4" />
        </IconButton>
      )}

      <span aria-hidden="true" className={TOOLBAR_DIVIDER} />

      <IconButton label={t("tb.fullscreen")} onClick={toggleFullscreen} className="shrink-0">
        <Maximize aria-hidden="true" className="size-4" />
      </IconButton>
      <IconButton label={t("tb.collapse")} onClick={() => setCollapsed(true)} className="shrink-0">
        <ChevronUp aria-hidden="true" className="size-4" />
      </IconButton>
    </>
  );

  const PANELS: Record<string, ReactNode> = {
    devices: <DevicePanel />,
    keyboard: <KeyboardPanel />,
    mouse: <MousePanel />,
  };

  if (collapsed) {
    return (
      // absolute like the expanded pill (not fixed): a viewport-fixed top-2
      // would sit under the sticky navigation (z-50) and become unreachable.
      <div className="pointer-events-none absolute inset-x-0 top-2 z-40 flex justify-center px-2">
        <div className="pointer-events-auto">
          <IconButton label={t("tb.expand")} active onClick={() => setCollapsed(false)} className="shadow-pop">
            <ChevronDown aria-hidden="true" className="size-4" />
          </IconButton>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        {/* Floating pill dock at the top of the stage — same grammar, free
            drag and collapse as desktop. absolute (not fixed): it anchors to
            the stage below the page header; a viewport-fixed top would hide
            under the header. */}
        <div
          role="toolbar"
          aria-label="KVM"
          aria-orientation="horizontal"
          className="pointer-events-none absolute inset-x-0 top-2 z-40 flex justify-center px-2"
          style={{ transform: `translateY(${pos.y}px)` }}
        >
          <div
            className={cn(
              "pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-line/80 bg-bg/85 p-1 shadow-pop backdrop-blur-md select-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none]",
              dragging && "cursor-grabbing",
            )}
            style={{ transform: `translateX(${pos.x}px)` }}
          >
            <button
              type="button"
              aria-label="drag"
              onPointerDown={onHandlePointerDown}
              className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-full text-ink-3 active:text-ink"
            >
              <GripDots />
            </button>
            {buttons(false)}
          </div>
        </div>

        {/* Panel sheet drops from under the pill */}
        {activePanel && PANELS[activePanel] && (
          <div
            className={cn(
              CARD,
              "animate-fade-up absolute inset-x-2 top-14 z-40 max-h-[60dvh] overflow-y-auto overscroll-contain shadow-pop",
            )}
          >
            {PANELS[activePanel]}
          </div>
        )}
        {recording && <span className="sr-only" aria-live="polite" />}
      </>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-2 z-40 flex justify-center px-2"
      style={{ transform: `translateY(${pos.y}px)` }}
    >
      <div
        ref={toolbarRef}
        className={cn(TOOLBAR, "pointer-events-auto select-none", dragging && "cursor-grabbing")}
        style={{ transform: `translateX(${pos.x}px)` }}
        role="toolbar"
        aria-label="KVM"
        aria-orientation="horizontal"
      >
        <button
          type="button"
          aria-label="drag"
          onPointerDown={onHandlePointerDown}
          className={cn(
            "grid size-8 cursor-grab touch-none place-items-center rounded-full text-ink-3 hover:text-ink",
            dragging && "cursor-grabbing",
          )}
        >
          <GripDots />
        </button>

        {buttons(true)}

        {/* Panels drop below the pill */}
        <Popover
          open={activePanel === "devices"}
          onClose={() => setActivePanel(null)}
          anchorRef={deviceButtonRef}
          className="w-80"
        >
          <DevicePanel />
        </Popover>
        <Popover
          open={activePanel === "keyboard"}
          onClose={() => setActivePanel(null)}
          anchorRef={keyboardButtonRef}
          className="w-96 max-w-[calc(100vw-1.5rem)]"
        >
          <KeyboardPanel />
        </Popover>
        <Popover
          open={activePanel === "mouse"}
          onClose={() => setActivePanel(null)}
          anchorRef={mouseButtonRef}
          className="w-80"
        >
          <MousePanel />
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
