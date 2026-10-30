/** 8-byte HID boot-protocol keyboard report builder:
 *  [modifiers][reserved][keycode×6] (6-key rollover, extras ignored). */

import { getKeycode, getModifierBit, isModifier } from "@/lib/device/keymap";

const MAX_KEYS = 6;

export class KeyboardReport {
  private modifier = 0;
  private pressedKeys = new Map<string, number>();

  keyDown(code: string): number[] {
    if (isModifier(code)) {
      this.modifier |= getModifierBit(code);
    } else {
      const keycode = getKeycode(code);
      if (keycode !== undefined && this.pressedKeys.size < MAX_KEYS) {
        this.pressedKeys.set(code, keycode);
      }
    }
    return this.buildReport();
  }

  keyUp(code: string): number[] {
    if (isModifier(code)) {
      this.modifier &= ~getModifierBit(code);
    } else {
      this.pressedKeys.delete(code);
    }
    return this.buildReport();
  }

  reset(): number[] {
    this.modifier = 0;
    this.pressedKeys.clear();
    return this.buildReport();
  }

  getPressedKeyCodes(): string[] {
    return [...this.pressedKeys.keys()];
  }

  private buildReport(): number[] {
    const report = [this.modifier, 0, 0, 0, 0, 0, 0, 0];
    let i = 2;
    for (const keycode of this.pressedKeys.values()) {
      if (i >= 8) break;
      report[i++] = keycode;
    }
    return report;
  }
}
