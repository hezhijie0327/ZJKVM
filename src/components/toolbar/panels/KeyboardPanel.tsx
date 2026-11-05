import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ROW_LABEL } from "@/components/ui/Kbd";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import { getActiveLink } from "@/lib/device/device";
import { typeText } from "@/lib/hid";
import { useI18n } from "@/lib/i18n";
import { DIVIDE_LIST, EYEBROW, META, PANEL_ROW } from "@/lib/styles";
import {
  activePanelAtom,
  demoModeAtom,
  keyboardEnabledAtom,
  serialStateAtom,
  virtualKeyboardOpenAtom,
} from "@/state/atoms";
import { pushToast } from "@/state/toast";

const SPEEDS = [
  { value: "slow", label: "paste.slow", ms: 90 },
  { value: "normal", label: "paste.normal", ms: 50 },
  { value: "fast", label: "paste.fast", ms: 22 },
] as const;

export function KeyboardPanel() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useAtom(keyboardEnabledAtom);
  const [virtualOpen, setVirtualOpen] = useAtom(virtualKeyboardOpenAtom);
  const setActivePanel = useSetAtom(activePanelAtom);
  const serialState = useAtomValue(serialStateAtom);
  const demo = useAtomValue(demoModeAtom);

  /** Opening the floating keyboard from this panel closes the panel — the
   *  keyboard spawns under the toolbar and would sit behind/under the panel. */
  const toggleVirtual = (next: boolean) => {
    setVirtualOpen(next);
    if (next) setActivePanel(null);
  };

  const [text, setText] = useState("");
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]["value"]>("normal");
  const [typing, setTyping] = useState(false);
  const [lastSkip, setLastSkip] = useState<number | null>(null);
  /** Paste preview dialog: shows the text + progress before/while typing. */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [typed, setTyped] = useState(0);
  const cancelRef = useRef(false);

  const linked = serialState === "connected" || demo;

  /** Open the preview instead of typing blindly — long pastes can be
   *  reviewed and cancelled mid-stream. */
  const openPreview = () => {
    if (!text || typing) return;
    if (!getActiveLink()) return;
    cancelRef.current = false;
    setTyped(0);
    setPreviewOpen(true);
  };

  const confirmSend = async () => {
    if (!text || typing) return;
    setTyping(true);
    setLastSkip(null);
    try {
      const interval = SPEEDS.find((s) => s.value === speed)?.ms ?? 50;
      const result = await typeText(text, interval, {
        onProgress: setTyped,
        isCancelled: () => cancelRef.current,
      });
      if (result.skipped > 0) {
        setLastSkip(result.skipped);
      }
      pushToast(t("paste.sent", { n: result.typed }));
      setText("");
      setPreviewOpen(false);
    } finally {
      setTyping(false);
    }
  };

  const cancelSend = () => {
    cancelRef.current = true;
    setPreviewOpen(false);
  };

  return (
    <div className={DIVIDE_LIST}>
      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("kb.enable")}</span>
        <Switch checked={enabled} onChange={setEnabled} label={t("kb.enable")} />
      </div>

      {/* The serial link itself is managed in the unified DevicePanel. */}

      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("kb.virtual")}</span>
        <Switch checked={virtualOpen} onChange={toggleVirtual} label={t("kb.virtual")} />
      </div>

      {/* Quick keys now live on the virtual keyboard, above the numpad. */}

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
          <Button
            variant="primary"
            className="h-9 px-4"
            onClick={openPreview}
            disabled={!linked || typing || !text.trim()}
          >
            {typing ? t("paste.sending") : t("paste.send")}
          </Button>
        </div>
      </div>

      {!enabled && <p className={cn(META, "px-4 py-3")}>{t("kb.captureHint")}</p>}

      {/* Paste preview: review the text, then type it out with progress and a
          live cancel — long pastes should never fire blindly. */}
      <Modal open={previewOpen} onClose={cancelSend} label={t("paste.previewTitle")} className="max-w-md">
        <div className="relative border-b border-line/70 px-5 pt-5 pb-3">
          <p className={EYEBROW}>PASTE</p>
          <h2 className="mt-1 font-serif text-lg font-semibold tracking-tight text-ink">{t("paste.previewTitle")}</h2>
        </div>
        <div className="px-5 py-4">
          <div className="max-h-32 overflow-y-auto rounded-xl border border-line bg-surface px-3 py-2 text-sm whitespace-pre-wrap text-ink">
            {text || "—"}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={META}>{t("paste.charCount", { n: text.length })}</span>
            {typing && <span className={META}>{t("paste.progress", { typed, n: text.length })}</span>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <Button className="h-9 px-4" onClick={cancelSend} disabled={!typing}>
            {t("paste.cancel")}
          </Button>
          <Button
            variant="primary"
            className="h-9 px-4"
            onClick={confirmSend}
            disabled={typing || !linked || !text.trim()}
          >
            {t("paste.confirm")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
