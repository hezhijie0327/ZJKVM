/** Virtual keyboard: hand-rolled floating window (the original shipped a
 *  400 KB keyboard lib). Desktop: a draggable paper card (position
 *  persisted); mobile: a bottom sheet. Modifier latch semantics from the
 *  original: tapping a modifier latches it down; the next normal key sends
 *  modifier+key and releases everything; tapping the same modifier again
 *  presses-and-releases it alone. */

import { X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/cn";
import { requireLink } from "@/lib/device/device";
import { KeyboardReport } from "@/lib/device/keyboard-report";
import { isModifier } from "@/lib/device/keymap";
import { useI18n } from "@/lib/i18n";
import * as storage from "@/lib/storage";
import { EYEBROW, SEGMENT, SEGMENT_ITEM_OFF, SEGMENT_ITEM_ON, TAPE } from "@/lib/styles";

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

/** Full numpad cluster: 4-column grid, + and ⏎ span two rows, 0 spans two columns. */
const NUMPAD: VKey[][] = [
  [K("NumLock", "Num"), K("NumpadDivide", "/"), K("NumpadMultiply", "*"), K("NumpadSubtract", "-")],
  [K("Numpad7", "7"), K("Numpad8", "8"), K("Numpad9", "9"), K("NumpadAdd", "+")],
  [K("Numpad4", "4"), K("Numpad5", "5"), K("Numpad6", "6")],
  [K("Numpad1", "1"), K("Numpad2", "2"), K("Numpad3", "3")],
  [K("Numpad0", "0", 2.1), K("NumpadDecimal", ".")],
];

/* ── Mobile layers: every row fits a 390 px screen, no scrolling ── */

const MOBILE_BASE: VKey[][] = [
  [
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
  ],
  [
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
  ],
  [
    K("KeyA", "a"),
    K("KeyS", "s"),
    K("KeyD", "d"),
    K("KeyF", "f"),
    K("KeyG", "g"),
    K("KeyH", "h"),
    K("KeyJ", "j"),
    K("KeyK", "k"),
    K("KeyL", "l"),
    K("Backspace", "⌫"),
  ],
  [
    K("ShiftLeft", "Shift"),
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
  ],
];

const MOBILE_FN: VKey[][] = [
  [K("Escape", "Esc"), K("F1"), K("F2"), K("F3"), K("F4"), K("F5"), K("F6"), K("F7")],
  [
    K("F8"),
    K("F9"),
    K("F10"),
    K("F11"),
    K("F12"),
    K("PrintScreen", "PrtSc"),
    K("ScrollLock", "ScrLk"),
    K("Pause", "Pause"),
  ],
  [
    K("Insert", "Ins"),
    K("Home", "Home"),
    K("PageUp", "PgUp"),
    K("Delete", "Del"),
    K("End", "End"),
    K("PageDown", "PgDn"),
  ],
  [K("ArrowUp", "↑"), K("ArrowLeft", "←"), K("ArrowDown", "↓"), K("ArrowRight", "→")],
];

const MOBILE_NUM: VKey[][] = [
  [K("NumLock", "Num"), K("NumpadDivide", "/"), K("NumpadMultiply", "*"), K("NumpadSubtract", "-")],
  [K("Numpad7", "7"), K("Numpad8", "8"), K("Numpad9", "9"), K("NumpadAdd", "+")],
  [K("Numpad4", "4"), K("Numpad5", "5"), K("Numpad6", "6"), K("NumpadEnter", "⏎")],
  [K("Numpad1", "1"), K("Numpad2", "2"), K("Numpad3", "3"), K("NumpadDecimal", ".")],
  [K("Numpad0", "0")],
];

type MobileLayer = "base" | "fn" | "num";

interface Pos {
  x: number;
  y: number;
}

const clampPos = (pos: Pos, width: number, height: number): Pos => ({
  x: Math.max(8, Math.min(window.innerWidth - width - 8, pos.x)),
  y: Math.max(8, Math.min(window.innerHeight - height - 8, pos.y)),
});

export function VirtualKeyboard({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const reportRef = useRef(new KeyboardReport());
  const latchedRef = useRef(new Set<string>());
  const [pressed, setPressed] = useState<Set<string>>(new Set());

  /* Floating window position (desktop). null = not measured yet — the layout
     effect places a fresh window bottom-center and clamps saved ones. */
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(() => storage.getKeyboardPos());
  const posRef = useRef<Pos | null>(pos);
  posRef.current = pos;
  const [layer, setLayer] = useState<MobileLayer>("base");

  useLayoutEffect(() => {
    if (isMobile || !panelRef.current) return;
    const el = panelRef.current;
    const saved = posRef.current;
    const fresh = {
      x: Math.round((window.innerWidth - el.offsetWidth) / 2),
      y: Math.max(8, window.innerHeight - el.offsetHeight - 48),
    };
    setPos(clampPos(saved ?? fresh, el.offsetWidth, el.offsetHeight));
  }, [isMobile]);

  const onHeaderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || !posRef.current || event.button !== 0) return;
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;
    event.preventDefault();
    const el = panelRef.current;
    if (!el) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...posRef.current };
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    const onMove = (move: PointerEvent) => {
      setPos(clampPos({ x: origin.x + move.clientX - startX, y: origin.y + move.clientY - startY }, width, height));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (posRef.current) {
        storage.setKeyboardPos(posRef.current);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

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
    // phone-style: Fn/Num layers fall back to letters after one tap
    if (isMobile && layer !== "base" && !isModifier(key.code)) {
      setLayer("base");
    }
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

  const renderKey = (key: VKey, extraClass?: string, fullHeight?: boolean, skipWidth?: boolean) => (
    <button
      key={key.code}
      type="button"
      aria-label={key.label || key.code}
      data-pressed={pressed.has(key.code) || undefined}
      className={cn("kvm-key select-none touch-none", extraClass)}
      style={{
        // inline (not a utility) on purpose: .kvm-key's unlayered min-width
        // would beat min-w-0 and force narrow mobile rows to overflow
        ...(skipWidth ? { minWidth: 0 } : key.width ? { minWidth: `${key.width * 2}rem` } : undefined),
        // kvm-key pins a fixed height; spanning keys must fill their grid area
        ...(fullHeight ? { height: "auto", minHeight: "100%" } : undefined),
      }}
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
    <div
      ref={panelRef}
      className={cn(
        "z-80 select-none border-line bg-surface shadow-pop",
        isMobile ? "fixed inset-x-0 bottom-0 rounded-t-2xl border-t backdrop-blur-md" : "fixed rounded-2xl border",
      )}
      style={isMobile ? undefined : { left: pos?.x ?? -9999, top: pos?.y ?? -9999, opacity: pos ? 1 : 0 }}
      role="group"
      aria-label={t("vk.title")}
    >
      <span aria-hidden="true" className={cn(TAPE, "-top-2 left-10 w-24 -rotate-3 bg-accent-soft/80")} />

      {/* Header doubles as the drag handle (desktop) */}
      <div
        className={cn(
          "flex items-center justify-between px-4 pt-2",
          !isMobile && "cursor-grab touch-none active:cursor-grabbing",
        )}
        onPointerDown={onHeaderPointerDown}
      >
        <p className={cn(EYEBROW, "flex items-center gap-2")}>
          {!isMobile && (
            <span aria-hidden="true" className="inline-block text-ink-3">
              <GripDots />
            </span>
          )}
          {t("vk.title")}
        </p>
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

      {/* Mobile: 10-key layers that always fit the screen — no horizontal
          scrolling. Fn layer holds F-keys/controls, Num layer the numpad;
          both fall back to the letter layer after a tap. */}
      {isMobile ? (
        <div className="px-2 pb-3 pt-1">
          <div className={cn(SEGMENT, "mx-auto mb-1.5 w-fit")}>
            {(
              [
                { id: "base", label: "ABC" },
                { id: "fn", label: "Fn" },
                { id: "num", label: "123" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={layer === tab.id}
                className={cn(layer === tab.id ? SEGMENT_ITEM_ON : SEGMENT_ITEM_OFF)}
                onClick={() => setLayer(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            {(layer === "base" ? MOBILE_BASE : layer === "fn" ? MOBILE_FN : MOBILE_NUM).map((row) => (
              <div key={row[0]?.code ?? row.length} className="flex gap-1">
                {row.map((k) => renderKey(k, "min-w-0 flex-1 h-10", false, true))}
              </div>
            ))}
            {layer === "base" && (
              <div className="flex gap-1">
                {renderKey(K("ControlLeft", "Ctrl"), "min-w-0 flex-1 h-10", false, true)}
                {renderKey(K("MetaLeft", "Win"), "min-w-0 flex-1 h-10", false, true)}
                {renderKey(K("AltLeft", "Alt"), "min-w-0 flex-1 h-10", false, true)}
                {renderKey(K("Space", ""), "min-w-0 flex-[3] h-10", false, true)}
                {renderKey(K("Enter", "⏎"), "min-w-0 flex-1 h-10", false, true)}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Desktop: centered keyboard group — main block + control/arrows +
            numpad clusters. */
        <div className="overflow-x-auto px-4 pb-4 pt-1">
          <div className="mx-auto flex w-fit max-w-full items-start gap-4">
            <div className="flex min-w-fit flex-col gap-1.5">
              {ROWS.map((row) => (
                <div key={row[0]?.code ?? row.length} className="flex gap-1.5">
                  {row.map((k) => renderKey(k))}
                </div>
              ))}
            </div>

            {/* Control cluster + arrows (wide screens) */}
            <div className="hidden shrink-0 flex-col justify-between gap-1.5 md:flex">
              <div className="grid grid-cols-3 gap-1.5">{CONTROL_KEYS.map((k) => renderKey(k))}</div>
              <div className="grid grid-cols-3 gap-1.5">
                <span />
                {renderKey(ARROWS[0]!)}
                <span />
                {renderKey(ARROWS[1]!)}
                {renderKey(ARROWS[2]!)}
                {renderKey(ARROWS[3]!)}
              </div>
            </div>

            {/* Numpad (wide screens) */}
            <div className="hidden shrink-0 grid-cols-4 gap-1.5 md:grid">
              {renderKey(NUMPAD[0]![0]!)}
              {renderKey(NUMPAD[0]![1]!)}
              {renderKey(NUMPAD[0]![2]!)}
              {renderKey(NUMPAD[0]![3]!)}
              {renderKey(NUMPAD[1]![0]!)}
              {renderKey(NUMPAD[1]![1]!)}
              {renderKey(NUMPAD[1]![2]!)}
              {renderKey(NUMPAD[1]![3]!, "row-span-2", true)}
              {renderKey(NUMPAD[2]![0]!)}
              {renderKey(NUMPAD[2]![1]!)}
              {renderKey(NUMPAD[2]![2]!)}
              {renderKey(NUMPAD[3]![0]!)}
              {renderKey(NUMPAD[3]![1]!)}
              {renderKey(NUMPAD[3]![2]!)}
              {renderKey(K("NumpadEnter", "⏎"), "row-span-2", true)}
              {renderKey(NUMPAD[4]![0]!, "col-span-2")}
              {renderKey(NUMPAD[4]![1]!)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GripDots() {
  return (
    <svg aria-hidden="true" width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="2" cy="2" r="1.2" />
      <circle cx="8" cy="2" r="1.2" />
      <circle cx="2" cy="7" r="1.2" />
      <circle cx="8" cy="7" r="1.2" />
      <circle cx="2" cy="12" r="1.2" />
      <circle cx="8" cy="12" r="1.2" />
    </svg>
  );
}
