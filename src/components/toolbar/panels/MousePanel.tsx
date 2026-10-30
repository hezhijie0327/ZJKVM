import { useAtom } from "jotai";
import { ROW_LABEL } from "@/components/ui/Kbd";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { mouseJiggler } from "@/lib/mouse-jiggler";
import { DIVIDE_LIST, META, PANEL_ROW } from "@/lib/styles";
import {
  jigglerAtom,
  type MouseStyle,
  mouseModeAtom,
  mouseStyleAtom,
  wheelDirectionAtom,
  wheelIntervalAtom,
} from "@/state/atoms";

const SPEED_TO_INTERVAL = (speed: number) => 300 - speed * 3;
const INTERVAL_TO_SPEED = (interval: number) => Math.round((300 - interval) / 3);

export function MousePanel() {
  const { t } = useI18n();
  const [mode, setMode] = useAtom(mouseModeAtom);
  const [style, setStyle] = useAtom(mouseStyleAtom);
  const [direction, setDirection] = useAtom(wheelDirectionAtom);
  const [interval, setIntervalState] = useAtom(wheelIntervalAtom);
  const [jiggler, setJiggler] = useAtom(jigglerAtom);

  const handleJiggler = (on: boolean) => {
    setJiggler(on ? "enable" : "disable");
    mouseJiggler.setMode(on ? "enable" : "disable");
  };

  return (
    <div className={DIVIDE_LIST}>
      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("mouse.mode")}</span>
        <Segmented
          label={t("mouse.mode")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "absolute", label: t("mouse.absolute") },
            { value: "relative", label: t("mouse.relative") },
          ]}
        />
      </div>
      {mode === "relative" && <p className={cn(META, "px-4 pb-1 -mt-1")}>{t("mouse.relativeHint")}</p>}

      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("mouse.style")}</span>
        <Segmented
          label={t("mouse.style")}
          value={style}
          onChange={(value) => setStyle(value as MouseStyle)}
          options={[
            { value: "cursor-default", label: t("mouse.styleDefault") },
            { value: "cursor-grab", label: t("mouse.styleGrab") },
            { value: "cursor-cell", label: t("mouse.styleCross") },
            { value: "kvm-cursor-none", label: t("mouse.styleHidden") },
          ]}
        />
      </div>

      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("mouse.wheelDir")}</span>
        <Segmented
          label={t("mouse.wheelDir")}
          value={String(direction)}
          onChange={(value) => setDirection(Number(value))}
          options={[
            { value: "1", label: t("mouse.forward") },
            { value: "-1", label: t("mouse.reverse") },
          ]}
        />
      </div>

      <div className={cn(PANEL_ROW, "flex-col items-stretch gap-1 py-3")}>
        <span className={ROW_LABEL}>{t("mouse.wheelSpeed")}</span>
        <Slider
          value={INTERVAL_TO_SPEED(interval)}
          min={0}
          max={100}
          step={10}
          onChange={(speed) => setIntervalState(SPEED_TO_INTERVAL(speed))}
          label={t("mouse.wheelSpeed")}
          display={String(INTERVAL_TO_SPEED(interval))}
        />
      </div>

      <div className={cn(PANEL_ROW, "flex-wrap")}>
        <div className="min-w-0">
          <p className={ROW_LABEL}>{t("mouse.jiggler")}</p>
          <p className={cn(META, "mt-0.5 max-w-56")}>{t("mouse.jigglerHint")}</p>
        </div>
        <Switch checked={jiggler === "enable"} onChange={handleJiggler} label={t("mouse.jiggler")} />
      </div>
    </div>
  );
}
