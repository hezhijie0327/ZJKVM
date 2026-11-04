import { useAtom, useAtomValue } from "jotai";
import { Usb, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { isSecureContext, supportsSerial } from "@/lib/browser";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { isCaptureLike } from "@/lib/media/camera";
import { ALERT_DANGER, CARD, EYEBROW, META, PAPER_STRIP, STRIP_PAPER, TAPE } from "@/lib/styles";
import {
  connectGateChannelAtom,
  micGrantedAtom,
  serialStateAtom,
  videoDeviceIdAtom,
  videoDevicesAtom,
  videoStateAtom,
} from "@/state/atoms";
import {
  connectVideo,
  disconnectSerial,
  disconnectVideo,
  grantMic,
  openSerial,
  probeVideoDevices,
  refreshVideoDevices,
} from "@/state/connection";

/** Connect gate: hardware auth + device picks only (capture card + HID
 *  serial) — a compact card docked to the bottom-left corner (above the
 *  statusbar chips that open it), no backdrop: every auth and device pick
 *  happens down here. One chip opens one slice (video → capture card only,
 *  serial → serial only); the cold start opens both. Auto-opens when nothing
 *  is connected; dismissible so the console chrome stays explorable. */
export function ConnectGate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [channel] = useAtom(connectGateChannelAtom);
  const videoDevices = useAtomValue(videoDevicesAtom);
  const videoDeviceId = useAtomValue(videoDeviceIdAtom);
  const videoState = useAtomValue(videoStateAtom);
  const serialState = useAtomValue(serialStateAtom);
  const micGranted = useAtomValue(micGrantedAtom);

  const [picked, setPicked] = useState(videoDeviceId);
  const [videoBusy, setVideoBusy] = useState(false);
  const [serialBusy, setSerialBusy] = useState(false);

  /* Capture-card devices first: virtual cameras (OBS etc.) are noise for a
   * KVM. If nothing matches the capture signature, fall back to all devices
   * so unusual card names never disappear from the list. */
  const captureDevices = videoDevices.filter((d) => isCaptureLike(d.label));
  const listedDevices = captureDevices.length > 0 ? captureDevices : videoDevices;

  useEffect(() => {
    if (open) {
      void refreshVideoDevices();
    }
  }, [open]);

  useEffect(() => {
    if (listedDevices.length > 0 && !listedDevices.some((d) => d.deviceId === picked)) {
      setPicked(listedDevices[0]?.deviceId ?? "");
    }
  }, [listedDevices, picked]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const handleVideo = async () => {
    setVideoBusy(true);
    await connectVideo(picked || undefined);
    setVideoBusy(false);
  };

  const handleSerial = async () => {
    setSerialBusy(true);
    await openSerial();
    setSerialBusy(false);
  };

  const connected = videoState === "connected" || serialState === "connected";

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={t("connect.title")}
      className={cn(
        CARD,
        "animate-fade-up fixed bottom-12 left-2 right-2 z-50 max-h-[70dvh] overflow-y-auto shadow-pop md:bottom-12 md:left-4 md:right-auto md:w-[23rem]",
      )}
    >
      <div className="relative border-b border-line/70 px-4 pt-4 pb-3">
        <span aria-hidden="true" className={cn(TAPE, "-top-2 left-10 w-24 -rotate-3 bg-accent-soft/80")} />
        <p className={EYEBROW}>CONNECT</p>
        <h2 className="mt-1 font-serif text-lg font-semibold tracking-tight text-ink">{t("connect.title")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-2">
          {t(channel === "video" ? "connect.descVideo" : channel === "serial" ? "connect.descSerial" : "connect.desc")}
        </p>
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={onClose}
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>

      <div className="divide-y divide-line/70">
        {!isSecureContext() && (
          <div className="px-4 pt-3">
            <p role="alert" className={ALERT_DANGER}>
              {t("browser.secureMissing")}
            </p>
          </div>
        )}

        {/* Capture card */}
        {channel !== "serial" && (
          <div className="px-4 py-3">
            <label className={cn(META, "mb-1.5 block font-medium text-ink-2")} htmlFor="connect-video-device">
              {t("connect.video")}
            </label>
            <Dropdown
              id="connect-video-device"
              label={t("connect.video")}
              value={picked}
              onChange={setPicked}
              onOpen={() => void probeVideoDevices()}
              options={
                listedDevices.length === 0
                  ? [{ value: "", label: t("connect.noVideo") }]
                  : listedDevices.map((device) => ({
                      value: device.deviceId,
                      label: device.label || t("connect.videoAuto"),
                    }))
              }
              className="w-full"
            />
            <Button variant="primary" className="mt-2 w-full" onClick={handleVideo} disabled={!picked || videoBusy}>
              {videoBusy ? t("connect.connecting") : t("connect.openVideo")}
            </Button>
            {videoState === "connected" && (
              <Button className="mt-2 w-full" onClick={disconnectVideo}>
                {t("status.disconnectVideo")}
              </Button>
            )}
            {videoState !== "connected" && <p className={cn(META, "mt-2")}>{t("connect.authHint")}</p>}
          </div>
        )}

        {/* HID serial */}
        {channel !== "video" && (
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-ink">{t("connect.serial")}</p>
            <p className={cn(META, "mt-0.5")}>{t("connect.serialHint")}</p>
            <Button className="mt-2 w-full" onClick={handleSerial} disabled={!supportsSerial() || serialBusy}>
              <Usb aria-hidden="true" className="size-4" />
              {serialBusy
                ? t("connect.connecting")
                : serialState === "connected"
                  ? t("common.retry")
                  : t("connect.serialButton")}
            </Button>
            {!supportsSerial() && (
              <p role="alert" className={cn(ALERT_DANGER, "mt-3 py-2")}>
                {t("browser.serialMissing")}
              </p>
            )}
            {serialState === "connected" && (
              <Button className="mt-2 w-full" onClick={() => void disconnectSerial()}>
                {t("status.disconnectSerial")}
              </Button>
            )}
            {serialState === "connected" && <p className={cn(META, "mt-2")}>✓ {t("status.serial")}</p>}
          </div>
        )}

        {/* Microphone (capture-card audio) — hidden on the serial slice */}
        {channel !== "serial" && micGranted !== null && (
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-ink">{t("audio.mic")}</p>
            <p className={cn(META, "mt-0.5")}>{micGranted ? t("audio.micGrantedHint") : t("audio.micHint")}</p>
            <Button className="mt-2 w-full" onClick={() => void grantMic()} disabled={micGranted}>
              {micGranted ? t("audio.micGranted") : t("audio.micRequest")}
            </Button>
          </div>
        )}

        {/* Close strip (only meaningful once something is connected) */}
        {connected && (
          <div className="px-4 py-3">
            <button type="button" className={cn(PAPER_STRIP, STRIP_PAPER, "w-full")} onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
