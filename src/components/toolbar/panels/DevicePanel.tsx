import { useAtom, useAtomValue } from "jotai";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { ROW_LABEL } from "@/components/ui/Kbd";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { isCaptureLike } from "@/lib/media/camera";
import * as storage from "@/lib/storage";
import { DIVIDE_LIST, EYEBROW, META, PANEL_COL, PANEL_ROW, PANEL_STATE_CHIP } from "@/lib/styles";
import {
  cameraGrantedAtom,
  customResolutionsAtom,
  demoModeAtom,
  micGrantedAtom,
  mutedAtom,
  resolutionAtom,
  rotationAtom,
  scaleModeAtom,
  serialStateAtom,
  videoDeviceIdAtom,
  videoDevicesAtom,
  videoStateAtom,
  volumeAtom,
} from "@/state/atoms";
import {
  applyResolution,
  connectVideo,
  disconnectSerial,
  disconnectVideo,
  grantCamera,
  grantMic,
  openSerial,
  probeVideoDevices,
} from "@/state/connection";
import type { Resolution, Rotation } from "@/types";

const PRESETS: Resolution[] = [
  { width: 3840, height: 2160 },
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 800, height: 600 },
  { width: 640, height: 480 },
];

const RES_KEY = (r: Resolution) => `${r.width}x${r.height}`;

/** Unified device panel: every hardware link (capture card, HID serial, mic)
 *  with its connect/disconnect action, plus the video display tweaks that
 *  ride on the capture card. Feedback-only state stays in the statusbar
 *  pill; this panel is where links are managed. */
export function DevicePanel() {
  const { t } = useI18n();
  const allDevices = useAtomValue(videoDevicesAtom);
  const [deviceId, setDeviceId] = useAtom(videoDeviceIdAtom);
  const [resolution, setResolution] = useAtom(resolutionAtom);
  const [customs, setCustoms] = useAtom(customResolutionsAtom);
  const [rotation, setRotation] = useAtom(rotationAtom);
  const [scale, setScale] = useAtom(scaleModeAtom);
  const videoState = useAtomValue(videoStateAtom);
  const serialState = useAtomValue(serialStateAtom);
  const demo = useAtomValue(demoModeAtom);
  const micGranted = useAtomValue(micGrantedAtom);
  const cameraGranted = useAtomValue(cameraGrantedAtom);
  const [volume, setVolume] = useAtom(volumeAtom);
  const [muted, setMuted] = useAtom(mutedAtom);

  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [customNote, setCustomNote] = useState<string | null>(null);

  // KVM 视角只关心采集卡:虚拟摄像头(OBS 等)不属于这条链路。若全部设备
  // 都不像采集卡(特殊命名),兜底显示全部,避免真卡从列表消失。
  const devices = (() => {
    const captures = allDevices.filter((d) => isCaptureLike(d.label));
    return captures.length > 0 ? captures : allDevices;
  })();

  const allResolutions = [...PRESETS, ...customs];

  const handleDevice = async (id: string) => {
    setDeviceId(id);
    await connectVideo(id);
  };

  const handleResolution = async (key: string) => {
    const found = allResolutions.find((r) => RES_KEY(r) === key);
    if (!found) return;
    setResolution(found);
    await applyResolution(found.width, found.height);
  };

  const addCustom = () => {
    const width = Number(customWidth);
    const height = Number(customHeight);
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 160 ||
      height < 120 ||
      width > 7680 ||
      height > 4320
    ) {
      setCustomNote("160×120 – 7680×4320");
      return;
    }
    const value = { width, height };
    if (allResolutions.some((r) => RES_KEY(r) === RES_KEY(value))) {
      setCustomNote(t("video.customExists"));
      return;
    }
    setCustoms((list) => {
      storage.addCustomResolution(value);
      return [...list, value];
    });
    setCustomWidth("");
    setCustomHeight("");
    setCustomNote(null);
  };

  return (
    <div className={DIVIDE_LIST}>
      {/* ── HID 串口:键鼠注入链路 ── */}
      <p aria-hidden="true" className={cn(EYEBROW, "px-4 pt-3 pb-1")}>
        SERIAL
      </p>
      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("status.serial")}</span>
        <span className="flex items-center gap-1.5">
          <span
            role="img"
            aria-label={
              demo
                ? t("status.demo")
                : serialState === "connected"
                  ? t("device.connected")
                  : serialState === "connecting"
                    ? t("connect.connecting")
                    : t("device.disconnected")
            }
            className={cn(
              PANEL_STATE_CHIP,
              serialState === "connected" ? "border-ok/60 text-ok" : "text-ink-3",
              demo && "border-accent/60 text-accent",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                serialState === "connected"
                  ? "bg-ok"
                  : serialState === "connecting"
                    ? "bg-warning"
                    : demo
                      ? "bg-accent-strong"
                      : "bg-line",
              )}
            />
            {demo
              ? t("status.demo")
              : serialState === "connected"
                ? t("device.connected")
                : serialState === "connecting"
                  ? t("connect.connecting")
                  : t("device.disconnected")}
          </span>
          {demo ? null : serialState === "connected" ? (
            <Button className="h-8 px-3" onClick={() => void disconnectSerial()}>
              {t("status.disconnectSerial")}
            </Button>
          ) : serialState !== "connecting" ? (
            <Button variant="primary" className="h-8 px-3" onClick={() => void openSerial()}>
              {t("connect.serialButton")}
            </Button>
          ) : null}
        </span>
      </div>

      {/* ── 音频:输出音量 ── */}
      <p aria-hidden="true" className={cn(EYEBROW, "px-4 pt-3 pb-1")}>
        AUDIO
      </p>
      <div className={cn(PANEL_ROW, "flex-col items-stretch gap-2 py-3")}>
        <div className="flex items-center justify-between">
          <span className={ROW_LABEL}>{t("audio.volume")}</span>
          {/* switch = sound audible (NOT mute) — the inverted semantics read
              like the toggle kept switching itself off */}
          <Switch checked={!muted} onChange={(next) => setMuted(!next)} label={t("audio.sound")} />
        </div>
        <Slider
          value={Math.round(volume * 100)}
          min={0}
          max={100}
          onChange={(value) => {
            setVolume(value / 100);
            setMuted(false);
          }}
          label={t("audio.volume")}
          display={`${Math.round(volume * 100)}%`}
        />
      </div>
      {/* ── 采集卡:设备选择 + 连接状态 + 显示设置 ── */}
      <p aria-hidden="true" className={cn(EYEBROW, "px-4 pt-3 pb-1")}>
        VIDEO
      </p>
      <div className={PANEL_ROW}>
        <label className={ROW_LABEL} htmlFor="panel-video-device">
          {t("video.device")}
        </label>
        <Dropdown
          id="panel-video-device"
          label={t("video.device")}
          value={deviceId}
          onChange={handleDevice}
          onOpen={() => void probeVideoDevices()}
          options={devices.map((device) => ({
            value: device.deviceId,
            label: device.label || t("connect.videoAuto"),
          }))}
          className="w-40"
        />
      </div>
      {/* Cold start: no capture device in the list yet — the first connect
          attempt is what triggers the camera permission prompt. */}
      {videoState === "disconnected" && !demo && devices.length === 0 && (
        <div className={cn(PANEL_COL, "gap-2")}>
          <Button variant="primary" className="h-9" onClick={() => void connectVideo()}>
            {t("connect.openVideo")}
          </Button>
          <p className={META}>{t("connect.authHint")}</p>
        </div>
      )}
      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("device.state")}</span>
        <span className="flex items-center gap-1.5">
          <span
            role="img"
            aria-label={
              demo ? t("status.demo") : videoState === "connected" ? t("device.connected") : t("device.disconnected")
            }
            className={cn(
              PANEL_STATE_CHIP,
              videoState === "connected" ? "border-ok/60 text-ok" : "text-ink-3",
              demo && "border-accent/60 text-accent",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                videoState === "connected" ? "bg-ok" : demo ? "bg-accent-strong" : "bg-line",
              )}
            />
            {demo ? t("status.demo") : videoState === "connected" ? t("device.connected") : t("device.disconnected")}
          </span>
          {videoState === "connected" && (
            <Button className="h-8 px-3" onClick={() => disconnectVideo()}>
              {t("status.disconnectVideo")}
            </Button>
          )}
        </span>
      </div>
      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("video.resolution")}</span>
        <Dropdown
          label={t("video.resolution")}
          value={RES_KEY(resolution)}
          onChange={handleResolution}
          options={allResolutions.map((r) => ({
            value: RES_KEY(r),
            label: `${RES_KEY(r)}${customs.some((c) => RES_KEY(c) === RES_KEY(r)) ? " ★" : ""}`,
          }))}
          className="w-40"
        />
      </div>
      <div className={PANEL_COL}>
        <span className={ROW_LABEL}>{t("video.customAdd")}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            aria-label={t("video.width")}
            placeholder={t("video.width")}
            value={customWidth}
            onChange={(event) => setCustomWidth(event.target.value)}
            className="kvm-input w-24 text-center"
            min={160}
            max={7680}
          />
          <span aria-hidden="true" className={META}>
            ×
          </span>
          <input
            type="number"
            inputMode="numeric"
            aria-label={t("video.height")}
            placeholder={t("video.height")}
            value={customHeight}
            onChange={(event) => setCustomHeight(event.target.value)}
            className="kvm-input w-24 text-center"
            min={120}
            max={4320}
          />
          <button
            type="button"
            aria-label={t("common.add")}
            title={t("common.add")}
            onClick={addCustom}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </div>
        {customNote && <p className={cn(META, "text-warning")}>{customNote}</p>}
      </div>
      <div className={PANEL_COL}>
        <span className={ROW_LABEL}>{t("video.rotation")}</span>
        <Segmented
          label={t("video.rotation")}
          value={rotation}
          onChange={(value) => setRotation(value as Rotation)}
          options={[
            { value: 0, label: "0°" },
            { value: 90, label: "90°" },
            { value: 180, label: "180°" },
            { value: 270, label: "270°" },
          ]}
          className="w-full [&>button]:flex-1"
        />
      </div>
      <div className={PANEL_COL}>
        <span className={ROW_LABEL}>{t("video.scale")}</span>
        <Segmented
          label={t("video.scale")}
          value={String(scale)}
          onChange={(value) => setScale(value === "auto" ? "auto" : Number(value))}
          options={[
            { value: "auto", label: t("common.auto") },
            { value: "0.75", label: "75%" },
            { value: "1", label: "100%" },
            { value: "1.5", label: "150%" },
            { value: "2", label: "200%" },
          ]}
          className="w-full [&>button]:flex-1"
        />
      </div>
      {/* 统计芯片跟随视频流常驻(状态胶囊),不再提供开关 */}

      {/* ── 浏览器权限:相机 + 麦克风授权 ── */}
      <p aria-hidden="true" className={cn(EYEBROW, "px-4 pt-3 pb-1")}>
        PERMISSIONS
      </p>
      {cameraGranted !== null && (
        <div className={PANEL_ROW}>
          <span className={ROW_LABEL}>{t("video.camera")}</span>
          <span className="flex items-center gap-1.5">
            <span
              role="img"
              aria-label={cameraGranted ? t("video.cameraGranted") : t("video.cameraRequest")}
              className={cn(PANEL_STATE_CHIP, cameraGranted ? "border-ok/60 text-ok" : "text-ink-3")}
            >
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", cameraGranted ? "bg-ok" : "bg-line")} />
              {cameraGranted ? t("video.cameraGranted") : t("device.disconnected")}
            </span>
            {!cameraGranted && (
              <Button variant="primary" className="h-8 px-3" onClick={() => void grantCamera()}>
                {t("video.cameraRequest")}
              </Button>
            )}
          </span>
        </div>
      )}
      {micGranted !== null && (
        <div className={PANEL_ROW}>
          <span className={ROW_LABEL}>{t("audio.mic")}</span>
          <span className="flex items-center gap-1.5">
            <span
              role="img"
              aria-label={micGranted ? t("audio.micGranted") : t("audio.micRequest")}
              className={cn(PANEL_STATE_CHIP, micGranted ? "border-ok/60 text-ok" : "text-ink-3")}
            >
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", micGranted ? "bg-ok" : "bg-line")} />
              {micGranted ? t("audio.micGranted") : t("device.disconnected")}
            </span>
            {!micGranted && (
              <Button variant="primary" className="h-8 px-3" onClick={() => void grantMic()}>
                {t("audio.micRequest")}
              </Button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
