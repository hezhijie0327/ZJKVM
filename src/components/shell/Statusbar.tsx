import { useAtomValue } from "jotai";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { STATUS_CHIP } from "@/lib/styles";
import {
  demoModeAtom,
  firmwareAtom,
  ledsAtom,
  recordingAtom,
  recordingDurationAtom,
  serialStateAtom,
  videoStateAtom,
  videoStatsAtom,
} from "@/state/atoms";
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

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Bottom status strip: connection chips, lock LEDs, firmware, stats, rec timer. */
export function Statusbar() {
  const { t } = useI18n();
  const videoState = useAtomValue(videoStateAtom);
  const serialState = useAtomValue(serialStateAtom);
  const demo = useAtomValue(demoModeAtom);
  const leds = useAtomValue(ledsAtom);
  const firmware = useAtomValue(firmwareAtom);
  const recording = useAtomValue(recordingAtom);
  const duration = useAtomValue(recordingDurationAtom);
  const stats = useAtomValue(videoStatsAtom);

  return (
    <footer className="shrink-0 border-t border-line/80 bg-bg">
      <div className="flex h-9 items-center justify-between gap-3 overflow-x-auto px-4 font-mono text-[11px] whitespace-nowrap text-ink-3">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(STATUS_CHIP, videoState === "connected" && "border-ok/60 text-ok")}
            title={t("status.video")}
          >
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", videoState === "connected" ? "bg-ok" : "bg-line")}
            />
            {t("status.video")}
          </span>
          {demo ? (
            <span className={cn(STATUS_CHIP, "border-accent text-accent")} title={t("status.demo")}>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-strong" />
              {t("status.demo")}
            </span>
          ) : (
            <span
              className={cn(STATUS_CHIP, serialState === "connected" && "border-ok/60 text-ok")}
              title={t("status.serial")}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full",
                  serialState === "connected" ? "bg-ok" : serialState === "connecting" ? "bg-warning" : "bg-line",
                )}
              />
              {t("status.serial")}
            </span>
          )}
          <LedRow leds={leds} />
          {firmware && <span className="hidden sm:inline">{t("status.fw", { v: firmware })}</span>}
        </div>

        <div className="flex items-center gap-1.5">
          {recording && (
            <span className={cn(STATUS_CHIP, "border-danger/60 text-danger")} aria-live="polite">
              <span aria-hidden="true" className="kvm-rec-dot size-1.5 rounded-full bg-danger" />
              REC {formatDuration(duration)}
            </span>
          )}
          {stats.width > 0 && (
            <span aria-hidden="true" className="hidden md:inline">
              {stats.width}×{stats.height}
              {stats.fps !== null ? ` · ${stats.fps}fps` : ""}
            </span>
          )}
          <span aria-hidden="true" className="hidden md:inline">
            © 2026 ZJKVM
          </span>
        </div>
      </div>
    </footer>
  );
}
