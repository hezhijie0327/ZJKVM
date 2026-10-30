/** Relative mouse: Pointer Lock on the video stage, movement deltas forwarded
 *  with the ×2 slow-motion boost (sub-10px host moves double so slow precise
 *  work stays usable). Fixed vs the original: the "click to lock" hint lives
 *  in a proper state, not a render-time side effect. */

import { useEffect, useRef } from "react";
import { requireLink } from "@/lib/device/device";
import { MOUSE_MARKER, MouseReportRelative } from "@/lib/device/mouse";
import { useI18n } from "@/lib/i18n";
import { mouseJiggler } from "@/lib/mouse-jiggler";
import { pushToast } from "@/state/toast";

export function RelativeMouse() {
  const { t } = useI18n();
  const mouseRef = useRef(new MouseReportRelative());
  const hintShownRef = useRef(false);

  useEffect(() => {
    const screen = document.getElementById("video") as HTMLVideoElement | null;
    if (!screen) return;

    const handleClick = (event: MouseEvent) => {
      event.preventDefault();
      void screen.requestPointerLock();
      if (!hintShownRef.current) {
        hintShownRef.current = true;
        pushToast(t("mouse.relativeHint"));
      }
    };

    const handleMove = async (event: MouseEvent) => {
      if (document.pointerLockElement !== screen) return;
      event.preventDefault();

      const boost = Math.abs(event.movementX) < 10 && Math.abs(event.movementY) < 10 ? 2 : 1;
      const deltaX = event.movementX * boost;
      const deltaY = event.movementY * boost;
      const report = mouseRef.current.buildReport(deltaX, deltaY);

      try {
        await requireLink().sendMouseData([MOUSE_MARKER.relative, ...report]);
      } catch {
        // link dropped
      }
      mouseJiggler.notifyMovement();
    };

    const disable = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    screen.addEventListener("click", handleClick);
    screen.addEventListener("mousemove", handleMove);
    screen.addEventListener("wheel", disable, { passive: false });
    screen.addEventListener("contextmenu", disable);

    return () => {
      screen.removeEventListener("click", handleClick);
      screen.removeEventListener("mousemove", handleMove);
      screen.removeEventListener("wheel", disable);
      screen.removeEventListener("contextmenu", disable);
      if (document.pointerLockElement === screen) {
        document.exitPointerLock();
      }
    };
  }, [t]);

  return null;
}
