/** High-level HID actions built on the keyboard report: clipboard paste
 *  typing, key-by-key. Actions share a mutex so a long stream can never
 *  interleave with another mid-flight. */

import { CharCodes, ShiftChars } from "@/lib/device/charcodes";
import { requireLink } from "@/lib/device/device";
import { KeyboardReport } from "@/lib/device/keyboard-report";
import { KeycodeMap } from "@/lib/device/keymap";

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

export interface TypeOptions {
  /** Progress callback after each typed key. */
  onProgress?: (typed: number) => void;
  /** Poll between keys — returning true stops the stream (paste cancelled). */
  isCancelled?: () => boolean;
}

/** Type text key-by-key. \n → Enter, \t → Tab, non-ASCII counted and skipped
 *  (HID cannot map them — surfaced to the user instead of being silently
 *  dropped like the original did). */
export function typeText(text: string, intervalMs = 50, options?: TypeOptions): Promise<TypeResult> {
  return enqueue(async () => {
    const report = new KeyboardReport();
    let typed = 0;
    let skipped = 0;

    for (const char of text) {
      if (options?.isCancelled?.()) {
        break;
      }
      const ascii = char.charCodeAt(0);
      if (char === "\n" || char === "\r") {
        await press(report, "Enter");
        await sleep(intervalMs);
        await release(report, "Enter");
        typed += 1;
        options?.onProgress?.(typed);
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
      options?.onProgress?.(typed);
      await sleep(intervalMs);
    }

    await requireLink().sendKeyboardData(report.reset());
    return { typed, skipped };
  });
}
