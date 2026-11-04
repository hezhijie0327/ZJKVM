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
    // Lissajous figure-8: x = r·sin(t), y = (r/2)·sin(2t). One half period
    // traces a loop and lands back at the origin, so the cursor never drifts;
    // random phase + radius keep the path from repeating identically.
    const r = 6 + Math.floor(Math.random() * 9); // 6..14 px
    const phase = Math.random() * Math.PI * 2;
    const steps = 4;
    void (async () => {
      for (let i = 1; i <= steps; i++) {
        const t0 = phase + ((i - 1) / steps) * Math.PI;
        const t1 = phase + (i / steps) * Math.PI;
        const dx = Math.round((r / 2) * (Math.sin(2 * t1) - Math.sin(2 * t0)));
        const dy = Math.round(r * (Math.sin(t1) - Math.sin(t0)));
        if (!dx && !dy) continue;
        const report = this.report.buildReport(dx, dy, 0);
        try {
          await link.sendMouseData([MOUSE_MARKER.relative, ...report]);
        } catch {
          return; // link dropped
        }
      }
    })();
  }
}

export const mouseJiggler = new MouseJiggler();
