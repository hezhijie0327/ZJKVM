import { useAtomValue, useSetAtom } from "jotai";
import { Activity, Info, Languages, Moon, Sun, SunMoon } from "lucide-react";
import { useRef, useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { type Lang, useI18n } from "@/lib/i18n";
import { LIST_ROW, STATUS_CHIP } from "@/lib/styles";
import { nextThemeStyle, readThemeStyle, setThemeStyle } from "@/lib/theme";
import {
  aboutOpenAtom,
  demoModeAtom,
  firmwareAtom,
  ledsAtom,
  recordingAtom,
  recordingDurationAtom,
  usbConnectedAtom,
  videoStatsAtom,
  videoStreamAtom,
} from "@/state/atoms";
import { stopDemoMode } from "@/state/connection";
import type { LedState } from "@/types";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

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

/** Navigation bar: sticky glass, serif wordmark with the family golden period. */
export function Navigation() {
  const { t, lang, setLang } = useI18n();
  const setAboutOpen = useSetAtom(aboutOpenAtom);
  const [langOpen, setLangOpen] = useState(false);
  const langAnchorRef = useRef<HTMLButtonElement>(null);
  const demo = useAtomValue(demoModeAtom);
  const leds = useAtomValue(ledsAtom);
  const usb = useAtomValue(usbConnectedAtom);
  const firmware = useAtomValue(firmwareAtom);
  const stream = useAtomValue(videoStreamAtom);
  const stats = useAtomValue(videoStatsAtom);
  const recording = useAtomValue(recordingAtom);
  const duration = useAtomValue(recordingDurationAtom);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoAnchorRef = useRef<HTMLButtonElement>(null);

  const cycleTheme = () => {
    setThemeStyle(nextThemeStyle(readThemeStyle()));
  };

  const langOptions: { value: Lang; label: string }[] = [
    { value: "zh", label: "简体中文" },
    { value: "en", label: "English" },
  ];

  return (
    <header className="app-bar sticky top-0 z-50 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <nav className="container mx-auto flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-baseline">
          <span className="font-serif text-xl font-semibold tracking-tight text-ink">
            ZJKVM
            <span aria-hidden="true" className="ms-[0.14em] inline-block size-[0.25em] rounded-full bg-accent-strong" />
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {recording && (
            <span className={cn(STATUS_CHIP, "border-danger/60 text-danger")} aria-live="polite" title={t("rec.stop")}>
              <span aria-hidden="true" className="kvm-rec-dot size-1.5 rounded-full bg-danger" />
              REC {formatDuration(duration)}
            </span>
          )}

          <IconButton label={`${t("nav.theme")} (${readThemeStyle()})`} onClick={cycleTheme}>
            <SunMoon aria-hidden="true" className="theme-icon theme-icon-auto size-4" />
            <Sun aria-hidden="true" className="theme-icon theme-icon-light size-4" />
            <Moon aria-hidden="true" className="theme-icon theme-icon-dark size-4" />
          </IconButton>

          <div className="relative">
            <IconButton
              ref={langAnchorRef}
              label={t("nav.lang")}
              active={langOpen}
              onClick={() => setLangOpen((open) => !open)}
            >
              <Languages aria-hidden="true" className="size-4" />
            </IconButton>
            <Popover
              open={langOpen}
              onClose={() => setLangOpen(false)}
              side="bottom"
              align="end"
              anchorRef={langAnchorRef}
              className="w-44"
            >
              <div className="divide-y divide-line/70">
                {langOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setLang(option.value);
                      setLangOpen(false);
                    }}
                    className={cn(
                      LIST_ROW,
                      "px-4 py-3 text-sm",
                      lang === option.value ? "text-accent" : "text-ink hover:bg-surface-2",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Popover>
          </div>

          <div className="relative">
            <IconButton
              ref={infoAnchorRef}
              label={t("status.info")}
              active={infoOpen}
              onClick={() => setInfoOpen((open) => !open)}
            >
              <Activity aria-hidden="true" className="size-4" />
            </IconButton>
            <Popover
              open={infoOpen}
              onClose={() => setInfoOpen(false)}
              side="bottom"
              align="end"
              anchorRef={infoAnchorRef}
              className="w-72"
            >
              <div className="p-3">
                <p aria-hidden="true" className="pb-2 text-[10px] tracking-[0.2em] text-ink-3">
                  STATUS
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {stream && (
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
                  {firmware && <span className={STATUS_CHIP}>{t("status.fw", { v: firmware })}</span>}
                </div>
              </div>
            </Popover>
          </div>

          <IconButton label={t("nav.help")} onClick={() => setAboutOpen(true)}>
            <Info aria-hidden="true" className="size-4" />
          </IconButton>
        </div>
      </nav>
    </header>
  );
}
