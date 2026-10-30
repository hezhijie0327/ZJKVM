import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";
import { MacroModal } from "@/components/toolbar/MacroModal";
import { Button } from "@/components/ui/Button";
import { ROW_LABEL } from "@/components/ui/Kbd";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import { getActiveLink } from "@/lib/device/device";
import { sendQuick, typeText } from "@/lib/hid";
import { useI18n } from "@/lib/i18n";
import { DIVIDE_LIST, META, PANEL_ROW } from "@/lib/styles";
import { demoModeAtom, keyboardEnabledAtom, serialStateAtom, virtualKeyboardOpenAtom } from "@/state/atoms";
import { pushToast } from "@/state/toast";

const QUICK_KEYS: { label: string; keys: string[] }[] = [
  { label: "Esc", keys: ["Escape"] },
  { label: "Ctrl+Alt+Del", keys: ["ControlLeft", "AltLeft", "Delete"] },
  { label: "Alt+Tab", keys: ["AltLeft", "Tab"] },
  { label: "Win", keys: ["MetaLeft"] },
  { label: "Ctrl+Shift+Esc", keys: ["ControlLeft", "ShiftLeft", "Escape"] },
  { label: "Menu", keys: ["ContextMenu"] },
];

const SPEEDS = [
  { value: "slow", label: "paste.slow", ms: 90 },
  { value: "normal", label: "paste.normal", ms: 50 },
  { value: "fast", label: "paste.fast", ms: 22 },
] as const;

export function KeyboardPanel() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useAtom(keyboardEnabledAtom);
  const [virtualOpen, setVirtualOpen] = useAtom(virtualKeyboardOpenAtom);
  const serialState = useAtomValue(serialStateAtom);
  const demo = useAtomValue(demoModeAtom);

  const [text, setText] = useState("");
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]["value"]>("normal");
  const [typing, setTyping] = useState(false);
  const [lastSkip, setLastSkip] = useState<number | null>(null);
  const [macroOpen, setMacroOpen] = useState(false);

  const linked = serialState === "connected" || demo;

  const send = async () => {
    if (!text || typing) return;
    if (!getActiveLink()) return;
    setTyping(true);
    setLastSkip(null);
    try {
      const interval = SPEEDS.find((s) => s.value === speed)?.ms ?? 50;
      const result = await typeText(text, interval);
      if (result.skipped > 0) {
        setLastSkip(result.skipped);
      }
      pushToast(t("paste.sent", { n: result.typed }));
      setText("");
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className={DIVIDE_LIST}>
      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("kb.enable")}</span>
        <Switch checked={enabled} onChange={setEnabled} label={t("kb.enable")} />
      </div>

      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("kb.virtual")}</span>
        <Switch checked={virtualOpen} onChange={setVirtualOpen} label={t("kb.virtual")} />
      </div>

      <div className={cn(PANEL_ROW, "flex-wrap")}>
        <span className={ROW_LABEL}>{t("kb.quick")}</span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {QUICK_KEYS.map((quick) => (
            <button
              key={quick.label}
              type="button"
              disabled={!linked}
              onClick={() => sendQuick(quick.keys)}
              className="kvm-key h-8"
            >
              {quick.label}
            </button>
          ))}
        </div>
      </div>

      {/* Paste box */}
      <div className="space-y-2 px-4 py-3">
        <div className="flex items-center justify-between">
          <label htmlFor="kvm-paste-text" className={ROW_LABEL}>
            {t("kb.paste")}
          </label>
          <Segmented
            label={t("paste.speed")}
            value={speed}
            onChange={(value) => setSpeed(value as (typeof SPEEDS)[number]["value"])}
            options={SPEEDS.map((s) => ({ value: s.value, label: t(s.label) }))}
          />
        </div>
        <textarea
          id="kvm-paste-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("paste.placeholder")}
          rows={3}
          className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-accent"
        />
        <div className="flex items-center justify-between gap-3">
          <span className={META}>{lastSkip !== null ? t("paste.nonAscii", { n: lastSkip }) : ""}</span>
          <Button variant="primary" className="h-9 px-4" onClick={send} disabled={!linked || typing || !text.trim()}>
            {typing ? t("macro.playing") : t("paste.send")}
          </Button>
        </div>
      </div>

      <div className={cn(PANEL_ROW, "flex-wrap")}>
        <span className={ROW_LABEL}>{t("kb.macros")}</span>
        <Button className="h-9 px-4" onClick={() => setMacroOpen(true)} disabled={!linked}>
          {t("macro.title")}
        </Button>
      </div>

      {!enabled && <p className={cn(META, "px-4 py-3")}>{t("kb.captureHint")}</p>}

      <MacroModal open={macroOpen} onClose={() => setMacroOpen(false)} />
    </div>
  );
}
