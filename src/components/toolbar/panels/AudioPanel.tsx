import { useAtom, useAtomValue } from "jotai";
import { ROW_LABEL } from "@/components/ui/Kbd";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { camera } from "@/lib/media/camera";
import { DIVIDE_LIST, META, PANEL_ROW } from "@/lib/styles";
import { micGrantedAtom, mutedAtom, videoStateAtom, volumeAtom } from "@/state/atoms";

/** Audio panel: volume lives here; mic authorization lives in the statusbar
 *  (the MIC chip), so this panel only points at it and reports the stream's
 *  audio-track state. */
export function AudioPanel() {
  const { t } = useI18n();
  const [volume, setVolume] = useAtom(volumeAtom);
  const [muted, setMuted] = useAtom(mutedAtom);
  const videoState = useAtomValue(videoStateAtom);
  const micGranted = useAtomValue(micGrantedAtom);

  const hasAudio = camera.hasAudio();

  return (
    <div className={DIVIDE_LIST}>
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

      {micGranted === false && <p className={cn(META, "px-4 py-3")}>{t("audio.micHint")}</p>}
      {micGranted === true && videoState === "connected" && !hasAudio && (
        <p className={cn(META, "px-4 py-3")}>{t("audio.noAudio")}</p>
      )}
    </div>
  );
}
