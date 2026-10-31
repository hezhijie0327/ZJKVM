import { useAtom } from "jotai";
import { Ban, Circle, Play, Plus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { sendChord, sendSequence } from "@/lib/hid";
import { useI18n } from "@/lib/i18n";
import { formatKeys } from "@/lib/keys";
import { EYEBROW, META, MONO_CHIP, PAPER_STRIP, STRIP_PRIMARY, TAPE } from "@/lib/styles";
import { DEFAULT_MACROS, macrosAtom } from "@/state/atoms";
import { pushToast } from "@/state/toast";
import type { ShortcutMacro } from "@/types";

const MAX_CHORD_KEYS = 6;

/** Shortcut & macro manager: chord combos (all keys together, like the
 *  original shortcuts) plus sequenced macros with an optional repeat count —
 *  the missing capability (BIOS boot-key spam, long key sequences). */
export function MacroModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [macros, setMacros] = useAtom(macrosAtom);

  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<ShortcutMacro["mode"]>("chord");
  const [repeat, setRepeat] = useState(1);
  const [playingId, setPlayingId] = useState<string | null>(null);

  /* Capture mode: listen on document, collect distinct codes, stop at 6. */
  useEffect(() => {
    if (!capturing) return;

    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      if (!event.code) return;
      setCaptured((keys) => {
        if (keys.includes(event.code) || keys.length >= MAX_CHORD_KEYS) return keys;
        return [...keys, event.code];
      });
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [capturing]);

  const resetCapture = () => {
    setCapturing(false);
    setCaptured([]);
    setName("");
    setMode("chord");
    setRepeat(1);
  };

  const saveMacro = () => {
    if (captured.length === 0) return;
    const label = name.trim() || formatKeys(captured);
    const macro: ShortcutMacro = { id: `m-${Date.now()}`, name: label, keys: captured, mode, repeat };
    setMacros((list) => [...list, macro]);
    resetCapture();
  };

  const play = async (macro: ShortcutMacro) => {
    setPlayingId(macro.id);
    try {
      if (macro.mode === "chord") {
        await sendChord(macro.keys);
      } else {
        await sendSequence(macro.keys, 60, 120, Math.max(1, Math.min(99, macro.repeat)));
      }
      pushToast(t("toast.macSent", { name: macro.name }));
    } finally {
      setPlayingId(null);
    }
  };

  const remove = (id: string) => {
    setMacros((list) => list.filter((macro) => macro.id !== id));
  };

  const restoreDefaults = () => {
    setMacros(DEFAULT_MACROS);
  };

  return (
    <Modal open={open} onClose={onClose} label={t("macro.title")} className="max-w-xl">
      <div className="relative border-b border-line/70 px-6 pt-6 pb-5">
        <span aria-hidden="true" className={cn(TAPE, "-top-2 right-10 w-20 rotate-6 bg-accent-soft/80")} />
        <button
          type="button"
          aria-label={t("common.close")}
          title={t("common.close")}
          onClick={onClose}
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
        <p className={EYEBROW}>MACRO</p>
        <h2 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-ink">{t("macro.title")}</h2>
        <p className={cn(META, "mt-1.5")}>{t("macro.sysHint")}</p>
      </div>

      <div className="max-h-[60vh] divide-y divide-line/70 overflow-y-auto">
        {macros.map((macro) => (
          <div key={macro.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{macro.name}</p>
              <p className="mt-1 flex flex-wrap items-center gap-1">
                {macro.keys.map((key) => (
                  <Kbd key={key}>{prettyKey(key)}</Kbd>
                ))}
                <span className={cn(MONO_CHIP, "ms-1")}>
                  {macro.mode === "chord" ? t("macro.modeChord") : `${t("macro.modeSeq")} ×${macro.repeat}`}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button className="h-9 px-4" onClick={() => play(macro)} disabled={playingId !== null}>
                {playingId === macro.id ? (
                  <Square aria-hidden="true" className="size-3.5" />
                ) : (
                  <Play aria-hidden="true" className="size-3.5" />
                )}
                {playingId === macro.id ? t("macro.playing") : t("macro.play")}
              </Button>
              <Button
                variant="danger"
                className="h-9 w-9 px-0"
                aria-label={t("common.delete")}
                onClick={() => remove(macro.id)}
              >
                <Ban aria-hidden="true" className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {macros.length === 0 && (
          <div className="px-6 py-6 text-center">
            <p className={META}>{t("macro.add")}</p>
          </div>
        )}

        {/* Capture / editor */}
        <div className="space-y-3 px-6 py-4">
          {capturing ? (
            <div className="space-y-3">
              <p className="text-sm text-accent" aria-live="polite">
                {t("macro.captureHint")} {captured.length}/6
              </p>
              <div className="flex flex-wrap gap-1.5">
                {captured.map((key) => (
                  <Kbd key={key}>{prettyKey(key)}</Kbd>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={formatKeys(captured)}
                  aria-label="Name"
                  className="kvm-input flex-1 min-w-32"
                />
                <Segmented
                  label={t("macro.mode")}
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "chord", label: t("macro.modeChord") },
                    { value: "sequence", label: t("macro.modeSeq") },
                  ]}
                />
                {mode === "sequence" && (
                  <label className="flex items-center gap-1 text-xs text-ink-2">
                    {t("macro.repeat")}
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={repeat}
                      onChange={(event) => setRepeat(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}
                      className="kvm-input w-16 text-center"
                    />
                  </label>
                )}
                <button type="button" className={cn(PAPER_STRIP, STRIP_PRIMARY, "h-9 px-4")} onClick={saveMacro}>
                  {t("common.save")}
                </button>
                <Button variant="ghost" className="h-9 px-3" onClick={resetCapture}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <Button className="h-9 px-4" onClick={() => setCapturing(true)}>
                <Plus aria-hidden="true" className="size-4" />
                {t("macro.add")}
              </Button>
              <Button variant="ghost" className="h-9 px-3 text-xs" onClick={restoreDefaults}>
                <Circle aria-hidden="true" className="size-3" />
                {t("common.default")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function prettyKey(code: string): string {
  return formatKeys([code]);
}
