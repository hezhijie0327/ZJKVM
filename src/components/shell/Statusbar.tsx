import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { STATUS_CHIP } from "@/lib/styles";
import {
  connectGateChannelAtom,
  connectGateOpenAtom,
  demoModeAtom,
  firmwareAtom,
  ledsAtom,
  micGrantedAtom,
  serialStateAtom,
  usbConnectedAtom,
  videoStateAtom,
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
    <span className="inline-flex items-center gap-1">
      <LedChip label={t("led.num")} on={leds.num} hint={hint} />
      <LedChip label={t("led.caps")} on={leds.caps} hint={hint} />
      <LedChip label={t("led.scroll")} on={leds.scroll} hint={hint} />
    </span>
  );
}

/** Bottom status strip: connection chips, lock LEDs, firmware, stats, rec timer.
 *  Video/serial chips double as reconnect affordances while disconnected —
 *  clicking one opens the connect gate (the gate auto-closes on success,
 *  which would otherwise leave no way to connect the serial port alone). */
export function Statusbar() {
  const { t } = useI18n();
  const videoState = useAtomValue(videoStateAtom);
  const serialState = useAtomValue(serialStateAtom);
  const demo = useAtomValue(demoModeAtom);
  const leds = useAtomValue(ledsAtom);
  const usb = useAtomValue(usbConnectedAtom);
  const firmware = useAtomValue(firmwareAtom);
  const micGranted = useAtomValue(micGrantedAtom);
  const setGateOpen = useSetAtom(connectGateOpenAtom);
  const setGateChannel = useSetAtom(connectGateChannelAtom);

  useEffect(() => {
    void checkMic();
  }, []);

  const openGate = (channel: "video" | "serial" | "all") => {
    setGateChannel(channel);
    setGateOpen(true);
  };

  /* Connection chips double as per-channel switches: a disconnected channel
   * opens just its own slice of the connect gate; a connected one disconnects
   * that channel alone. 演示 only appears while demo mode is running. */
  /* Connection chips double as per-channel switches: a disconnected channel
   * opens just its own slice of the connect gate; a connected one disconnects
   * that channel alone. 演示 only appears while demo mode is running. */
  return (
    <footer className="relative hidden shrink-0 border-t border-line/80 bg-bg md:block">
      <div className="flex h-9 items-center justify-between gap-3 overflow-x-auto px-3 font-mono text-[11px] whitespace-nowrap text-ink-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-4">
        <div className="flex items-center gap-1.5 md:gap-1.5">
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
              serialState === "connected"
                ? void disconnectSerial()
                : serialState === "disconnected" && openGate("serial")
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
              className={cn(
                STATUS_CHIP,
                "hidden md:inline-flex",
                usb ? "border-ok/60 text-ok" : "border-warning/60 text-warning",
              )}
              title={t("status.hidHint")}
            >
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", usb ? "bg-ok" : "bg-warning")} />
              {t("status.hid")}
            </span>
          )}
          <span className="hidden items-center gap-1.5 md:inline-flex">
            <LedRow leds={leds} />
          </span>
          {firmware && <span className="hidden sm:inline">{t("status.fw", { v: firmware })}</span>}
          {/* Mobile: pinned right of the chips (no room for a centered copy) */}
          <span aria-hidden="true" className="shrink-0 md:hidden">
            © {siteConfig.copyright}
          </span>
        </div>
      </div>
      {/* Desktop: centered like the ZJBlog footer */}
      <span aria-hidden="true" className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
        © {new Date().getFullYear()} {siteConfig.copyright}
      </span>
    </footer>
  );
}
