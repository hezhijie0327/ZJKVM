/** Virtual keyboard: hand-rolled (the original shipped a 400 KB keyboard lib).
 *  Modifier latch semantics from the original: tapping a modifier latches it
 *  down; the next normal key sends modifier+key and releases everything;
 *  tapping the same modifier again presses-and-releases it alone. */

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { requireLink } from "@/lib/device/device";
import { KeyboardReport } from "@/lib/device/keyboard-report";
import { isModifier } from "@/lib/device/keymap";
import { useI18n } from "@/lib/i18n";
import { EYEBROW, TAPE } from "@/lib/styles";

interface VKey {
  code: string;
  label: string;
  width?: number; // in key units
}

const K = (code: string, label?: string, width?: number): VKey => ({ code, label: label ?? code, width });

const ROWS: VKey[][] = [
  [
    K("Escape", "Esc"),
    K("F1"),
    K("F2"),
    K("F3"),
    K("F4"),
    K("F5"),
    K("F6"),
    K("F7"),
    K("F8"),
    K("F9"),
    K("F10"),
    K("F11"),
    K("F12"),
  ],
  [
    K("Backquote", "`"),
    K("Digit1", "1"),
    K("Digit2", "2"),
    K("Digit3", "3"),
    K("Digit4", "4"),
    K("Digit5", "5"),
    K("Digit6", "6"),
    K("Digit7", "7"),
    K("Digit8", "8"),
    K("Digit9", "9"),
    K("Digit0", "0"),
    K("Minus", "-"),
    K("Equal", "="),
    K("Backspace", "⌫", 2),
  ],
  [
    K("Tab", "Tab", 1.5),
    K("KeyQ", "q"),
    K("KeyW", "w"),
    K("KeyE", "e"),
    K("KeyR", "r"),
    K("KeyT", "t"),
    K("KeyY", "y"),
    K("KeyU", "u"),
    K("KeyI", "i"),
    K("KeyO", "o"),
    K("KeyP", "p"),
    K("BracketLeft", "["),
    K("BracketRight", "]"),
    K("Backslash", "\\", 1.5),
  ],
  [
    K("CapsLock", "Caps", 1.8),
    K("KeyA", "a"),
    K("KeyS", "s"),
    K("KeyD", "d"),
    K("KeyF", "f"),
    K("KeyG", "g"),
    K("KeyH", "h"),
    K("KeyJ", "j"),
    K("KeyK", "k"),
    K("KeyL", "l"),
    K("Semicolon", ";"),
    K("Quote", "'"),
    K("Enter", "⏎", 2.2),
  ],
  [
    K("ShiftLeft", "Shift", 2.3),
    K("KeyZ", "z"),
    K("KeyX", "x"),
    K("KeyC", "c"),
    K("KeyV", "v"),
    K("KeyB", "b"),
    K("KeyN", "n"),
    K("KeyM", "m"),
    K("Comma", ","),
    K("Period", "."),
    K("Slash", "/"),
    K("ShiftRight", "Shift", 2.3),
  ],
  [
    K("ControlLeft", "Ctrl", 1.5),
    K("MetaLeft", "Win", 1.5),
    K("AltLeft", "Alt", 1.2),
    K("Space", "", 7),
    K("AltRight", "Alt", 1.2),
    K("ControlRight", "Ctrl", 1.5),
  ],
];

const CONTROL_KEYS: VKey[] = [
  K("PrintScreen", "PrtSc"),
  K("ScrollLock", "ScrLk"),
  K("Pause", "Pause"),
  K("Insert", "Ins"),
  K("Home", "Home"),
  K("PageUp", "PgUp"),
  K("Delete", "Del"),
  K("End", "End"),
  K("PageDown", "PgDn"),
];

const ARROWS: VKey[] = [K("ArrowUp", "↑"), K("ArrowLeft", "←"), K("ArrowDown", "↓"), K("ArrowRight", "→")];

export function VirtualKeyboard({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const reportRef = useRef(new KeyboardReport());
  const latchedRef = useRef(new Set<string>());
  const [pressed, setPressed] = useState<Set<string>>(new Set());

  const send = useCallback(async (report: number[]) => {
    try {
      await requireLink().sendKeyboardData(report);
    } catch {
      // link dropped
    }
  }, []);

  const visualPress = (code: string) => {
    setPressed((prev) => new Set(prev).add(code));
  };
  const visualRelease = (code: string) => {
    setPressed((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  };

  /** pointerdown on a key */
  const keyPress = async (key: VKey) => {
    visualPress(key.code);
    if (isModifier(key.code)) {
      if (latchedRef.current.has(key.code)) {
        // second tap = a clean single press + release
        latchedRef.current.delete(key.code);
        await send(reportRef.current.keyUp(key.code));
        visualRelease(key.code);
      } else {
        latchedRef.current.add(key.code);
        await send(reportRef.current.keyDown(key.code));
      }
      return;
    }
    await send(reportRef.current.keyDown(key.code));
  };

  /** pointerup on a key */
  const keyRelease = async (key: VKey) => {
    if (isModifier(key.code)) {
      return; // stays latched until re-tap or a normal key completes
    }
    visualRelease(key.code);
    await send(reportRef.current.keyUp(key.code));

    // release any latched modifiers now that the combo completed
    for (const mod of latchedRef.current) {
      latchedRef.current.delete(mod);
      await send(reportRef.current.keyUp(mod));
      visualRelease(mod);
    }
  };

  /* releasing the keyboard entirely when it closes */
  useEffect(() => {
    return () => {
      const report = reportRef.current.reset();
      latchedRef.current.clear();
      void send(report);
    };
  }, [send]);

  const renderKey = (key: VKey) => (
    <button
      key={key.code}
      type="button"
      aria-label={key.label || key.code}
      data-pressed={pressed.has(key.code) || undefined}
      className="kvm-key select-none touch-none"
      style={key.width ? { minWidth: `${key.width * 2}rem` } : undefined}
      onPointerDown={(event) => {
        event.preventDefault();
        void keyPress(key);
      }}
      onPointerUp={() => void keyRelease(key)}
      onPointerLeave={() => {
        if (pressed.has(key.code) && !isModifier(key.code)) void keyRelease(key);
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {key.label || key.code}
    </button>
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-80 border-t border-line bg-surface/95 shadow-pop backdrop-blur-md">
      <span aria-hidden="true" className={cn(TAPE, "-top-2 left-10 w-24 -rotate-3 bg-accent-soft/80")} />
      <div className="flex items-center justify-between px-4 pt-2">
        <p className={EYEBROW}>{t("vk.title")}</p>
        <button
          type="button"
          aria-label={t("common.close")}
          title={t("common.close")}
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 pb-4 pt-1">
        <div className="flex min-w-fit flex-col gap-1.5">
          {ROWS.map((row) => (
            <div key={row[0]?.code ?? row.length} className="flex gap-1.5">
              {row.map(renderKey)}
            </div>
          ))}
        </div>

        {/* Control cluster + arrows (wide screens) */}
        <div className="hidden flex-col justify-between gap-1.5 md:flex">
          <div className="grid grid-cols-3 gap-1.5">{CONTROL_KEYS.map(renderKey)}</div>
          <div className="grid grid-cols-3 gap-1.5">
            <span />
            {renderKey(ARROWS[0]!)}
            <span />
            {renderKey(ARROWS[1]!)}
            {renderKey(ARROWS[2]!)}
            {renderKey(ARROWS[3]!)}
          </div>
        </div>
      </div>
    </div>
  );
}
