/** HID mouse report builders.
 *  Relative: [buttons][dx][dy][wheel] — sent with a 0x01 marker byte in front.
 *  Absolute: [buttons][x_lo][x_hi][y_lo][y_hi][wheel] — 12-bit (0–4096)
 *  normalized coordinates, sent with a 0x02 marker byte in front. */

const MAX_ABS_COORD = 4096;

export const MouseButtons = {
  Left: 1 << 0,
  Right: 1 << 1,
  Middle: 1 << 2,
  Back: 1 << 3,
  Forward: 1 << 4,
} as const;

/** Browser button index → HID bit (browser: 0=left, 1=middle, 2=right). */
function getMouseButtonBit(button: number): number {
  switch (button) {
    case 0:
      return MouseButtons.Left;
    case 1:
      return MouseButtons.Middle;
    case 2:
      return MouseButtons.Right;
    case 3:
      return MouseButtons.Back;
    case 4:
      return MouseButtons.Forward;
    default:
      return 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class MouseReportRelative {
  private buttons = 0;

  buttonDown(button: number): void {
    this.buttons |= getMouseButtonBit(button);
  }

  buttonUp(button: number): void {
    this.buttons &= ~getMouseButtonBit(button);
  }

  buildReport(deltaX: number, deltaY: number, wheel = 0): number[] {
    const x = clamp(Math.round(deltaX), -127, 127) & 0xff;
    const y = clamp(Math.round(deltaY), -127, 127) & 0xff;
    const scroll = clamp(Math.round(wheel), -127, 127) & 0xff;
    return [this.buttons, x, y, scroll];
  }

  buildButtonReport(): number[] {
    return this.buildReport(0, 0, 0);
  }

  reset(): number[] {
    this.buttons = 0;
    return this.buildReport(0, 0, 0);
  }
}

export class MouseAbsoluteReport {
  private buttons = 0;

  buttonDown(button: number): void {
    this.buttons |= getMouseButtonBit(button);
  }

  buttonUp(button: number): void {
    this.buttons &= ~getMouseButtonBit(button);
  }

  /** x/y are normalized 0–1 and mapped onto the 12-bit absolute range. */
  buildReport(x: number, y: number, wheel = 0): number[] {
    const xAbs = Math.floor(clamp(x, 0, 1) * MAX_ABS_COORD);
    const yAbs = Math.floor(clamp(y, 0, 1) * MAX_ABS_COORD);
    const x1 = xAbs & 0xff;
    const x2 = (xAbs >> 8) & 0xff;
    const y1 = yAbs & 0xff;
    const y2 = (yAbs >> 8) & 0xff;
    const scroll = clamp(Math.round(wheel), -127, 127) & 0xff;
    return [this.buttons, x1, x2, y1, y2, scroll];
  }

  buildButtonReport(lastX: number, lastY: number): number[] {
    return this.buildReport(lastX, lastY, 0);
  }

  reset(): number[] {
    this.buttons = 0;
    return this.buildReport(0, 0, 0);
  }
}

/** Marker bytes prepended to DATA so the device picks the right HID command. */
export const MOUSE_MARKER = { relative: 0x01, absolute: 0x02 } as const;
