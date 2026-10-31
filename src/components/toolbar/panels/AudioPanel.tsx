import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/Button";
import { ROW_LABEL } from "@/components/ui/Kbd";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { camera } from "@/lib/media/camera";
import { requestPermission } from "@/lib/media/permission";
import { DIVIDE_LIST, META, PANEL_ROW } from "@/lib/styles";
import { mutedAtom, videoDeviceIdAtom, videoStateAtom, volumeAtom } from "@/state/atoms";
import { connectVideo, probeVideoDevices } from "@/state/connection";

export function AudioPanel() {
  const { t } = useI18n();
  const [volume, setVolume] = useAtom(volumeAtom);
  const [muted, setMuted] = useAtom(mutedAtom);
  const videoState = useAtomValue(videoStateAtom);
  const deviceId = useAtomValue(videoDeviceIdAtom);

  const hasAudio = camera.hasAudio();

  const requestMic = async () => {
    const granted = await requestPermission("microphone");
    if (!granted) {
      return;
    }
    // audio inputs are anonymous until the mic grant — re-enumerate, then
    // reopen the stream so the paired capture-card audio track comes along
    await probeVideoDevices();
    if (videoState === "connected") {
      await connectVideo(deviceId || undefined);
    }
  };

  return (
    <div className={DIVIDE_LIST}>
      <div className={cn(PANEL_ROW, "flex-col items-stretch gap-2 py-3")}>
        <div className="flex items-center justify-between">
          <span className={ROW_LABEL}>{t("audio.volume")}</span>
          <Switch checked={muted} onChange={setMuted} label={t("audio.mute")} />
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

      <div className={cn(PANEL_ROW, "flex-wrap")}>
        <div className="min-w-0">
          <p className={ROW_LABEL}>{t("audio.mic")}</p>
          <p className={cn(META, "mt-0.5 max-w-56")}>{t("audio.micHint")}</p>
        </div>
        <Button className="h-9 px-4 text-xs" onClick={requestMic}>
          {t("audio.micRequest")}
        </Button>
      </div>

      {videoState === "connected" && !hasAudio && <p className={cn(META, "px-4 py-3")}>{t("audio.noAudio")}</p>}
    </div>
  );
}
