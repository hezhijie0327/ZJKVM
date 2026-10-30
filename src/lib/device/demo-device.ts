/** Demo HID device: pairs with demo-video's test card. Keyboard reports update
 *  the echo panel; lockable keycodes (Caps/Num/Scroll) flip the virtual LEDs;
 *  mouse reports (absolute + relative) move the on-card cursor. */

import type { DemoVideoState } from "@/lib/device/demo-video";
import type { HidLink } from "@/lib/device/device";
import { InfoPacket } from "@/lib/device/proto";

const KEYCODE_CAPS = 0x39;
const KEYCODE_NUM = 0x53;
const KEYCODE_SCROLL = 0x47;

export class DemoDevice implements HidLink {
  readonly kind = "demo" as const;
  onDisconnected: (() => void) | null = null;
  readonly connected = true;

  private leds = { num: false, caps: false, scroll: false };
  private state: DemoVideoState;
  private lastButtons = 0;

  constructor(state: DemoVideoState) {
    this.state = state;
  }

  async getInfo(): Promise<InfoPacket> {
    // Synthesize the same 4-byte payload the real firmware returns:
    // [version '2'→V1.2, connected, LED bits, reserved]
    const ledByte = (this.leds.num ? 1 : 0) | (this.leds.caps ? 2 : 0) | (this.leds.scroll ? 4 : 0);
    return new InfoPacket([0x32, 1, ledByte, 0]);
  }

  async sendKeyboardData(report: number[]): Promise<void> {
    if (report.length < 8) return;
    this.state.keys = [...report];
    if (report.some((b) => b !== 0)) {
      this.state.keysEcho = [...report];
    }
    this.state.reportCount += 1;

    // Locking keys toggle on press (their keycode appears in the report)
    const pressed = new Set(report.slice(2).filter((k) => k !== 0));
    if (pressed.has(KEYCODE_CAPS)) this.leds.caps = !this.leds.caps;
    if (pressed.has(KEYCODE_NUM)) this.leds.num = !this.leds.num;
    if (pressed.has(KEYCODE_SCROLL)) this.leds.scroll = !this.leds.scroll;
  }

  async sendMouseData(report: number[]): Promise<void> {
    const marker = report[0];
    const body = report.slice(1);
    if (marker === 0x01 && body.length >= 4) {
      // Relative: dx/dy/wheel are two's-complement bytes
      const dx = toSigned(body[1] ?? 0);
      const dy = toSigned(body[2] ?? 0);
      const wheel = toSigned(body[3] ?? 0);
      this.state.mouseX = clamp01(this.state.mouseX + dx / 800);
      this.state.mouseY = clamp01(this.state.mouseY + dy / 800);
      this.state.wheel += wheel;
      this.state.buttons = body[0] ?? 0;
    } else if (marker === 0x02 && body.length >= 6) {
      const x = ((body[2] ?? 0) << 8) | (body[1] ?? 0);
      const y = ((body[4] ?? 0) << 8) | (body[3] ?? 0);
      const wheel = toSigned(body[5] ?? 0);
      this.state.mouseX = x / 4096;
      this.state.mouseY = y / 4096;
      this.state.wheel += wheel;
      this.state.buttons = body[0] ?? 0;
    }
    if (this.state.buttons !== this.lastButtons) {
      this.lastButtons = this.state.buttons;
    }
    this.state.reportCount += 1;
  }

  async close(): Promise<void> {
    this.onDisconnected = null;
  }
}

function toSigned(byte: number): number {
  return byte >= 128 ? byte - 256 : byte;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
