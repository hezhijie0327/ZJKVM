/** Physical keyboard capture → HID forwarding. Port of the original capture
 *  logic (IME skip, Windows AltGr fix, macOS Meta release fix, full release
 *  on blur/hidden) with one enhancement: forwarding auto-pauses while focus
 *  sits in one of OUR inputs (paste box, macro editor) instead of requiring a
 *  manual switch — target-machine keys keep flowing everywhere else. */

import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { getOperatingSystem } from "@/lib/browser";
import { requireLink } from "@/lib/device/device";
import { KeyboardReport } from "@/lib/device/keyboard-report";
import { isModifier } from "@/lib/device/keymap";
import { demoModeAtom, keyboardEnabledAtom, serialStateAtom } from "@/state/atoms";

interface AltGrState {
  active: boolean;
  ctrlLeftTimestamp: number;
}

const ALTGR_THRESHOLD_MS = 10;

function isOurEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']");
}

export function PhysicalKeyboard() {
  const enabled = useAtomValue(keyboardEnabledAtom);
  const serialState = useAtomValue(serialStateAtom);
  const demo = useAtomValue(demoModeAtom);
  const os = getOperatingSystem();
  const active = enabled && (serialState === "connected" || demo);

  const keyboardRef = useRef(new KeyboardReport());
  const pressedKeys = useRef(new Set<string>());
  const altGrState = useRef<AltGrState | null>(null);
  const isComposing = useRef(false);

  useEffect(() => {
    if (os === "Windows" && !altGrState.current) {
      altGrState.current = { active: false, ctrlLeftTimestamp: 0 };
    }

    if (!active) {
      void releaseKeys();
      return;
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("compositionstart", handleCompositionStart);
    document.addEventListener("compositionend", handleCompositionEnd);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    async function handleKeyDown(event: KeyboardEvent): Promise<void> {
      // Typing into our own inputs (paste box, macro editor) must stay local
      if (isOurEditableTarget(event.target)) return;
      if (isComposing.current || event.isComposing) return;

      event.preventDefault();
      event.stopPropagation();

      const code = normalizeKeyCode(event, os);
      // Locking keys are toggles — several browsers deliver only the keydown
      // (the keyup never comes), so deduping on "already pressed" would
      // swallow every following press. Forward each one.
      const isLockKey = code === "CapsLock" || code === "NumLock" || code === "ScrollLock";
      if (!code || (!isLockKey && pressedKeys.current.has(code))) {
        return;
      }

      // Windows AltGr: ControlLeft + AltRight arrive within ~10 ms — strip the Ctrl
      if (altGrState.current) {
        if (code === "ControlLeft") {
          altGrState.current.ctrlLeftTimestamp = event.timeStamp;
        } else if (code === "AltRight") {
          const timeDiff = event.timeStamp - altGrState.current.ctrlLeftTimestamp;
          if (timeDiff < ALTGR_THRESHOLD_MS && pressedKeys.current.has("ControlLeft")) {
            pressedKeys.current.delete("ControlLeft");
            await handleKeyEvent({ type: "keyup", code: "ControlLeft" }, keyboardRef.current);
            altGrState.current.active = true;
          }
        }
      }

      pressedKeys.current.add(code);
      await handleKeyEvent({ type: "keydown", code }, keyboardRef.current);
    }

    async function handleKeyUp(event: KeyboardEvent): Promise<void> {
      if (isComposing.current || event.isComposing) return;

      event.preventDefault();
      event.stopPropagation();

      const code = normalizeKeyCode(event, os);

      if (altGrState.current?.active) {
        if (code === "ControlLeft") return;
        if (code === "AltRight") {
          altGrState.current.active = false;
        }
      }

      // macOS swallows keyup for keys pressed with Cmd — release the world
      if (code === "MetaLeft" || code === "MetaRight") {
        const keysToRelease: string[] = [];
        pressedKeys.current.forEach((pressedCode) => {
          if (!isModifier(pressedCode)) {
            keysToRelease.push(pressedCode);
          }
        });
        for (const key of keysToRelease) {
          await handleKeyEvent({ type: "keyup", code: key }, keyboardRef.current);
          pressedKeys.current.delete(key);
        }
      }

      pressedKeys.current.delete(code);
      await handleKeyEvent({ type: "keyup", code }, keyboardRef.current);
    }

    function handleCompositionStart(): void {
      isComposing.current = true;
    }

    function handleCompositionEnd(): void {
      isComposing.current = false;
    }

    async function handleBlur(): Promise<void> {
      await releaseKeys();
    }

    async function handleVisibilityChange(): Promise<void> {
      if (document.hidden) {
        await releaseKeys();
      }
    }

    async function releaseKeys(): Promise<void> {
      for (const code of [...pressedKeys.current]) {
        await handleKeyEvent({ type: "keyup", code }, keyboardRef.current);
      }
      pressedKeys.current.clear();

      if (altGrState.current) {
        altGrState.current.active = false;
        altGrState.current.ctrlLeftTimestamp = 0;
      }

      try {
        await requireLink().sendKeyboardData(keyboardRef.current.reset());
      } catch {
        // link gone — nothing to release on
      }
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("compositionstart", handleCompositionStart);
      document.removeEventListener("compositionend", handleCompositionEnd);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void releaseKeys();
    };
  }, [active, os]);

  return null;
}

async function handleKeyEvent(event: { type: "keydown" | "keyup"; code: string }, keyboard: KeyboardReport) {
  const report = event.type === "keydown" ? keyboard.keyDown(event.code) : keyboard.keyUp(event.code);
  try {
    await requireLink().sendKeyboardData(report);
  } catch {
    // link dropped mid-stream — the disconnect handler takes over
  }
}

function normalizeKeyCode(event: KeyboardEvent, os: string): string {
  if (event.code) {
    return event.code;
  }

  // Legacy fallback: derive the code from key + location
  if (event.key === "Shift") {
    if (event.location === 0 && os === "Windows") {
      return "ShiftRight";
    }
    return event.location === 2 ? "ShiftRight" : "ShiftLeft";
  }
  if (event.key === "Control") {
    return event.location === 2 ? "ControlRight" : "ControlLeft";
  }
  if (event.key === "Alt") {
    return event.location === 2 ? "AltRight" : "AltLeft";
  }
  if (event.key === "Meta") {
    return event.location === 2 ? "MetaRight" : "MetaLeft";
  }
  return event.code;
}
