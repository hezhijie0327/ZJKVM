import { useAtomValue, useSetAtom } from "jotai";
import { ChevronDown, ChevronUp, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import * as storage from "@/lib/storage";
import { MONO_CHIP, STATUS_CHIP, TOOLBAR } from "@/lib/styles";
import {
  connectGateChannelAtom,
  connectGateOpenAtom,
  demoModeAtom,
  firmwareAtom,
  ledsAtom,
  micGrantedAtom,
  pictureRectAtom,
  serialStateAtom,
  statsVisibleAtom,
  usbConnectedAtom,
  videoStateAtom,
  videoStatsAtom,
  videoStreamAtom,
} from "@/state/atoms";
import { checkMic, disconnectSerial, disconnectVideo, grantMic, stopDemoMode } from "@/state/connection";
import type { LedState } from "@/types";

function LedChip({ label, on, hint }: { label: string; on: boolean; hint: string }) {
  return (
    <span
      role="img"
      className={cn(STATUS_CHIP, on && "border-accent text-accent")}
      title={hint}
      aria-label={`${label} ${on ? "on" : "off"}`}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", on ? "bg-accent-strong" : "bg-line")} />
      {label}
    </span>
  );
}

function LedRow({ leds }: { leds: LedState }) {
  const { t } = useI18n();
  const hint = t("led.hint");
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <LedChip label={t("led.num")} on={leds.num} hint={hint} />
      <LedChip label={t("led.caps")} on={leds.caps} hint={hint} />
      <LedChip label={t("led.scroll")} on={leds.scroll} hint={hint} />
    </span>
  );
}

/** Bottom floating layer: demo banner stacked above the status-chips pill
 *  (the single status surface — video stats included), one grammar on every
 *  breakpoint. From `md` up with a live picture the stack docks inside the
 *  rendered picture's bottom edge (picture rect published by Stage);
 *  otherwise it floats above the centered copyright line. Collapsible
 *  (persisted). */
export function Statusbar() {
  const { t } = useI18n();
  const videoState = useAtomValue(videoStateAtom);
  const serialState = useAtomValue(serialStateAtom);
  const demo = useAtomValue(demoModeAtom);
  const leds = useAtomValue(ledsAtom);
  const usb = useAtomValue(usbConnectedAtom);
  const firmware = useAtomValue(firmwareAtom);
  const micGranted = useAtomValue(micGrantedAtom);
  const stream = useAtomValue(videoStreamAtom);
  const stats = useAtomValue(videoStatsAtom);
  const statsVisible = useAtomValue(statsVisibleAtom);
  const pictureRect = useAtomValue(pictureRectAtom);
  const isMobile = useIsMobile();
  const inPicture = !isMobile && pictureRect !== null;
  const setGateOpen = useSetAtom(connectGateOpenAtom);
  const setGateChannel = useSetAtom(connectGateChannelAtom);
  const [collapsed, setCollapsed] = useState(storage.getChipsCollapsed());

  useEffect(() => {
    void checkMic();
  }, []);

  const openGate = (channel: "video" | "serial" | "all") => {
    setGateChannel(channel);
    setGateOpen(true);
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      storage.setChipsCollapsed(!prev);
      return !prev;
    });
  };

  const chips = (
    <>
      {statsVisible && stream && (
        <>
          <span className={STATUS_CHIP} title={t("status.statsHint")}>
            {stats.width > 0 ? `${stats.width}×${stats.height}` : "—"}
          </span>
          {stats.fps !== null && stats.fps > 0 && (
            <span className={STATUS_CHIP} title={t("status.statsHint")}>
              {stats.fps} fps
            </span>
          )}
        </>
      )}
      {demo && (
        <button
          type="button"
          className={cn(STATUS_CHIP, "border-accent text-accent")}
          title={t("status.demoStop")}
          onClick={() => stopDemoMode()}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-strong" />
          {t("status.demo")}
        </button>
      )}
      <button
        type="button"
        className={cn(
          STATUS_CHIP,
          videoState === "connected" && "border-ok/60 text-ok",
          videoState !== "connected" && "transition-colors hover:border-ink-3 hover:text-ink",
        )}
        title={videoState === "connected" ? t("status.disconnectVideo") : t("connect.title")}
        onClick={() => (videoState === "connected" ? disconnectVideo() : openGate("video"))}
      >
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", videoState === "connected" ? "bg-ok" : "bg-line")}
        />
        {t("status.video")}
      </button>
      <button
        type="button"
        className={cn(
          STATUS_CHIP,
          serialState === "connected" && "border-ok/60 text-ok",
          serialState === "disconnected" && "transition-colors hover:border-ink-3 hover:text-ink",
        )}
        title={
          serialState === "connected"
            ? t("status.disconnectSerial")
            : serialState === "disconnected"
              ? t("connect.serial")
              : t("status.serial")
        }
        onClick={() =>
          serialState === "connected" ? void disconnectSerial() : serialState === "disconnected" && openGate("serial")
        }
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            serialState === "connected" ? "bg-ok" : serialState === "connecting" ? "bg-warning" : "bg-line",
          )}
        />
        {t("status.serial")}
      </button>
      {micGranted !== null && (
        <button
          type="button"
          className={cn(
            STATUS_CHIP,
            micGranted ? "border-ok/60 text-ok" : "transition-colors hover:border-ink-3 hover:text-ink",
          )}
          title={micGranted ? t("audio.micGranted") : t("audio.micRequest")}
          onClick={() => !micGranted && void grantMic()}
        >
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", micGranted ? "bg-ok" : "bg-line")} />
          {t("status.mic")}
        </button>
      )}
      {usb !== null && (
        <span
          role="img"
          aria-label={`${t("status.hid")} ${usb ? "on" : "off"}`}
          className={cn(STATUS_CHIP, usb ? "border-ok/60 text-ok" : "border-warning/60 text-warning")}
          title={t("status.hidHint")}
        >
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", usb ? "bg-ok" : "bg-warning")} />
          {t("status.hid")}
        </span>
      )}
      <LedRow leds={leds} />
      {firmware && <span className={cn(STATUS_CHIP, "hidden lg:inline-flex")}>{t("status.fw", { v: firmware })}</span>}
    </>
  );

  return (
    <>
      {/* Floating bottom stack — demo banner above the chips pill so neither
          layer can occlude the other. */}
      <div
        className={cn(
          "pointer-events-none fixed z-40 flex flex-col items-center gap-2",
          !inPicture && "inset-x-0 bottom-11",
        )}
        style={
          inPicture && pictureRect
            ? {
                left: pictureRect.x,
                width: pictureRect.w,
                bottom: window.innerHeight - pictureRect.y - pictureRect.h + 10,
              }
            : undefined
        }
      >
        {demo && (
          <p className="pointer-events-none max-w-[min(28rem,100%)]">
            <span className={cn(MONO_CHIP, "border-accent/60 bg-accent-soft/60 text-accent")}>
              <Radio aria-hidden="true" className="size-3" />
              {t("demo.banner")}
            </span>
          </p>
        )}
        {collapsed ? (
          <button
            type="button"
            aria-expanded={false}
            aria-label={t("status.expand")}
            title={t("status.expand")}
            onClick={toggleCollapsed}
            className="pointer-events-auto grid size-9 place-items-center rounded-full border border-line/80 bg-bg/85 text-ink-2 shadow-pop backdrop-blur-md transition-colors hover:text-ink"
          >
            <ChevronUp aria-hidden="true" className="size-4" />
          </button>
        ) : (
          <div
            className={cn(TOOLBAR, "pointer-events-auto max-w-[min(100%,calc(100vw-2rem))]")}
            role="status"
            aria-label={t("status.chips")}
          >
            <div className="flex items-center gap-1.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {chips}
            </div>
            <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-line" />
            <button
              type="button"
              aria-expanded
              aria-label={t("status.collapse")}
              title={t("status.collapse")}
              onClick={toggleCollapsed}
              className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:text-ink"
            >
              <ChevronDown aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Centered copyright line (ZJBlog footer grammar) — the pill floats
          above it, so the two layers can never collide. */}
      <footer className="hidden shrink-0 border-t border-line/80 bg-bg md:block">
        <div className="flex h-9 items-center justify-center text-xs text-ink-3">
          <span aria-hidden="true">
            © {new Date().getFullYear()} {siteConfig.copyright}
          </span>
        </div>
      </footer>
    </>
  );
}
