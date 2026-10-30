import { useAtom, useAtomValue } from "jotai";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { ROW_LABEL } from "@/components/ui/Kbd";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import * as storage from "@/lib/storage";
import { DIVIDE_LIST, META, PANEL_COL, PANEL_ROW } from "@/lib/styles";
import {
  customResolutionsAtom,
  resolutionAtom,
  rotationAtom,
  scaleModeAtom,
  statsVisibleAtom,
  videoDeviceIdAtom,
  videoDevicesAtom,
} from "@/state/atoms";
import { applyResolution, connectVideo } from "@/state/connection";
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

export function VideoPanel() {
  const { t } = useI18n();
  const devices = useAtomValue(videoDevicesAtom);
  const [deviceId, setDeviceId] = useAtom(videoDeviceIdAtom);
  const [resolution, setResolution] = useAtom(resolutionAtom);
  const [customs, setCustoms] = useAtom(customResolutionsAtom);
  const [rotation, setRotation] = useAtom(rotationAtom);
  const [scale, setScale] = useAtom(scaleModeAtom);
  const [stats, setStats] = useAtom(statsVisibleAtom);

  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [customNote, setCustomNote] = useState<string | null>(null);

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
      <div className={PANEL_ROW}>
        <label className={ROW_LABEL} htmlFor="panel-video-device">
          {t("video.device")}
        </label>
        <Dropdown
          id="panel-video-device"
          label={t("video.device")}
          value={deviceId}
          onChange={handleDevice}
          options={devices.map((device) => ({
            value: device.deviceId,
            label: device.label || t("connect.videoAuto"),
          }))}
          className="w-40"
        />
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

      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("video.stats")}</span>
        <Switch checked={stats} onChange={setStats} label={t("video.stats")} />
      </div>
    </div>
  );
}
