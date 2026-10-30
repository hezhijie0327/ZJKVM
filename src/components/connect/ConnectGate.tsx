import { useAtomValue } from "jotai";
import { Usb } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { isSecureContext, supportsSerial } from "@/lib/browser";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { ALERT_DANGER, EYEBROW, META, PAPER_STRIP, STRIP_PAPER, STRIP_PRIMARY, TAPE } from "@/lib/styles";
import {
  audioByGroupAtom,
  demoModeAtom,
  serialStateAtom,
  videoDeviceIdAtom,
  videoDevicesAtom,
  videoStateAtom,
} from "@/state/atoms";
import { connectVideo, openSerial, refreshVideoDevices, startDemo } from "@/state/connection";

/** Connect gate: capture card + HID serial + demo escape hatch. Auto-opens
 *  when nothing is connected (same contract as the original DeviceModal, but
 *  dismissible so the console chrome stays explorable). */
export function ConnectGate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const videoDevices = useAtomValue(videoDevicesAtom);
  const audioByGroup = useAtomValue(audioByGroupAtom);
  const videoDeviceId = useAtomValue(videoDeviceIdAtom);
  const videoState = useAtomValue(videoStateAtom);
  const serialState = useAtomValue(serialStateAtom);
  const demo = useAtomValue(demoModeAtom);

  const [picked, setPicked] = useState(videoDeviceId);
  const [videoBusy, setVideoBusy] = useState(false);
  const [serialBusy, setSerialBusy] = useState(false);

  useEffect(() => {
    if (open) {
      void refreshVideoDevices();
    }
  }, [open]);

  useEffect(() => {
    if (videoDevices.length > 0 && !picked) {
      setPicked(videoDevices[0]?.deviceId ?? "");
    }
  }, [videoDevices, picked]);

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

  const connected = videoState === "connected" || serialState === "connected" || demo;

  return (
    <Modal open={open} onClose={onClose} label={t("connect.title")} className="max-w-xl">
      <div className="relative border-b border-line/70 px-6 pt-6 pb-5">
        <span
          aria-hidden="true"
          className={cn(TAPE, "-top-2 left-1/2 w-28 -translate-x-1/2 -rotate-3 bg-accent-soft/80")}
        />
        <p className={EYEBROW}>CONNECT</p>
        <h2 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-ink">{t("connect.title")}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{t("connect.desc")}</p>
      </div>

      <div className="divide-y divide-line/70">
        {!isSecureContext() && (
          <div className="px-6 pt-4">
            <p role="alert" className={ALERT_DANGER}>
              {t("browser.secureMissing")}
            </p>
          </div>
        )}

        {/* Capture card */}
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-sm font-medium text-ink" htmlFor="connect-video-device">
              {t("connect.video")}
            </label>
            <div className="flex items-center gap-2">
              <Select
                id="connect-video-device"
                label={t("connect.video")}
                value={picked}
                onValueChange={setPicked}
                className="max-w-64"
              >
                {videoDevices.length === 0 && <option value="">{t("connect.noVideo")}</option>}
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || t("connect.videoAuto")}
                  </option>
                ))}
              </Select>
              <Button variant="primary" onClick={handleVideo} disabled={!picked || videoBusy}>
                {videoBusy ? t("connect.connecting") : t("connect.openVideo")}
              </Button>
            </div>
          </div>
          {videoState === "connected" && <p className={cn(META, "mt-2")}>✓ {t("status.video")}</p>}
        </div>

        {/* HID serial */}
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{t("connect.serial")}</p>
              <p className={cn(META, "mt-0.5")}>{t("connect.serialHint")}</p>
            </div>
            <Button onClick={handleSerial} disabled={!supportsSerial() || serialBusy}>
              <Usb aria-hidden="true" className="size-4" />
              {serialBusy
                ? t("connect.connecting")
                : serialState === "connected"
                  ? t("common.retry")
                  : t("connect.serialButton")}
            </Button>
          </div>
          {!supportsSerial() && (
            <p role="alert" className={cn(ALERT_DANGER, "mt-3 py-2")}>
              {t("browser.serialMissing")}
            </p>
          )}
          {serialState === "connected" && <p className={cn(META, "mt-2")}>✓ {t("status.serial")}</p>}
        </div>

        {/* Demo mode */}
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{t("connect.demo")}</p>
              <p className={cn(META, "mt-0.5 max-w-sm")}>{t("connect.demoHint")}</p>
            </div>
            <button type="button" className={cn(PAPER_STRIP, STRIP_PRIMARY)} onClick={startDemo}>
              {t("connect.demo")}
            </button>
          </div>
        </div>

        {/* Secondary strip: skip */}
        <div className="flex items-center justify-between px-6 py-4">
          <p className={META}>{audioByGroup.size > 0 ? `${audioByGroup.size} audio` : ""}</p>
          <div className="flex items-center gap-2">
            {connected && (
              <button type="button" className={cn(PAPER_STRIP, STRIP_PAPER)} onClick={onClose}>
                {t("common.close")}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
