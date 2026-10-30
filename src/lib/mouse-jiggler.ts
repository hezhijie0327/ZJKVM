/** Mouse jiggler: every 3 s, if no real movement for 15 s, send a ±(10,10)
 *  relative nudge pair. Fixed vs the original: reports go through
 *  sendMouseData (the original misused the keyboard command, silently
 *  dropping the jiggle on real hardware). */

import { requireLink } from "@/lib/device/device";
import { MOUSE_MARKER, MouseReportRelative } from "@/lib/device/mouse";

const IDLE_WINDOW = 15_000;
const CHECK_INTERVAL = IDLE_WINDOW / 5;

type JigglerMode = "enable" | "disable";

class MouseJiggler {
  private lastMoveTime = Date.now();
  private timer: number | null = null;
  private mode: JigglerMode = "disable";
  private report = new MouseReportRelative();

  setMode(mode: JigglerMode): void {
    this.mode = mode;
    if (mode === "disable" && this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    } else if (mode === "enable" && this.timer === null) {
      this.timer = window.setInterval(() => this.tick(), CHECK_INTERVAL);
    }
  }

  getMode(): JigglerMode {
    return this.mode;
  }

  /** Feed real user movement to reset the idle window. */
  notifyMovement(): void {
    if (this.mode === "enable") {
      this.lastMoveTime = Date.now();
    }
  }

  private tick(): void {
    if (Date.now() - this.lastMoveTime <= IDLE_WINDOW) return;
    this.lastMoveTime = Date.now() - 1000;

    const link = requireLink();
    const forward = this.report.buildReport(10, 10, 0);
    const back = this.report.buildReport(-10, -10, 0);
    link.sendMouseData([MOUSE_MARKER.relative, ...forward]).catch(() => {});
    link.sendMouseData([MOUSE_MARKER.relative, ...back]).catch(() => {});
  }
}

export const mouseJiggler = new MouseJiggler();
