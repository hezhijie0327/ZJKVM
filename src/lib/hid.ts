/** High-level HID actions built on the keyboard report: clipboard paste
 *  typing, chord/sequence macros, quick keys. All actions share a mutex so a
 *  macro can never interleave with paste typing mid-stream. */

import { CharCodes, ShiftChars } from "@/lib/device/charcodes";
import { requireLink } from "@/lib/device/device";
import { KeyboardReport } from "@/lib/device/keyboard-report";
import { getKeycode, KeycodeMap } from "@/lib/device/keymap";

// keycode → representative event.code (first match wins)
const CODE_FOR_KEYCODE = new Map<number, string>();
for (const [code, keycode] of Object.entries(KeycodeMap)) {
  if (!CODE_FOR_KEYCODE.has(keycode)) {
    CODE_FOR_KEYCODE.set(keycode, code);
  }
}

let mutex: Promise<unknown> = Promise.resolve();

/** Serialize HID sequences: each action runs to completion first. */
function enqueue<T>(action: () => Promise<T>): Promise<T> {
  const run = mutex.then(action);
  mutex = run.catch(() => {});
  return run;
}

const press = (report: KeyboardReport, code: string) => requireLink().sendKeyboardData(report.keyDown(code));
const release = (report: KeyboardReport, code: string) => requireLink().sendKeyboardData(report.keyUp(code));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface TypeResult {
  typed: number;
  skipped: number;
}

/** Type text key-by-key. \n → Enter, \t → Tab, non-ASCII counted and skipped
 *  (HID cannot map them — surfaced to the user instead of being silently
 *  dropped like the original did). */
export function typeText(text: string, intervalMs = 50): Promise<TypeResult> {
  return enqueue(async () => {
    const report = new KeyboardReport();
    let typed = 0;
    let skipped = 0;

    for (const char of text) {
      const ascii = char.charCodeAt(0);
      if (char === "\n" || char === "\r") {
        await press(report, "Enter");
        await sleep(intervalMs);
        await release(report, "Enter");
        typed += 1;
        continue;
      }
      const keycode = CharCodes[ascii];
      if (keycode === undefined) {
        skipped += 1;
        continue;
      }
      const needShift = (ascii >= 65 && ascii <= 90) || ShiftChars[ascii] === true;
      const code = CODE_FOR_KEYCODE.get(keycode);
      if (!code) {
        skipped += 1;
        continue;
      }
      if (needShift) await press(report, "ShiftLeft");
      await press(report, code);
      await sleep(intervalMs);
      await release(report, code);
      if (needShift) await release(report, "ShiftLeft");
      typed += 1;
      await sleep(intervalMs);
    }

    await requireLink().sendKeyboardData(report.reset());
    return { typed, skipped };
  });
}

/** Hold every key down at once, then release all (chord, ≤6 keys). */
export function sendChord(keys: string[]): Promise<void> {
  return enqueue(async () => {
    const report = new KeyboardReport();
    const valid = keys.filter((k) => getKeycode(k) !== undefined).slice(0, 6);
    for (const key of valid) {
      await requireLink().sendKeyboardData(report.keyDown(key));
    }
    await sleep(50);
    await requireLink().sendKeyboardData(report.reset());
  });
}

/** Press and release keys one at a time, optionally repeated — for BIOS boot
 *  keys and menus that poll the keyboard buffer. */
export function sendSequence(keys: string[], holdMs = 60, gapMs = 120, repeat = 1): Promise<void> {
  return enqueue(async () => {
    const report = new KeyboardReport();
    const valid = keys.filter((k) => getKeycode(k) !== undefined);
    for (let round = 0; round < Math.max(1, repeat); round++) {
      for (const key of valid) {
        await press(report, key);
        await sleep(holdMs);
        await release(report, key);
        await sleep(gapMs);
      }
    }
    await requireLink().sendKeyboardData(report.reset());
  });
}

/** One-off quick key (Esc, Ctrl+Alt+Del chips…). Chord when modifiers exist. */
export function sendQuick(keys: string[]): Promise<void> {
  if (keys.length <= 1) {
    return sendSequence(keys);
  }
  return sendChord(keys);
}
