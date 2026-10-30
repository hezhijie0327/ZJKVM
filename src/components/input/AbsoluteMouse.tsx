/** Mouse input entry: picks absolute / relative mode and gates on link state.
 *  Absolute mode maps pointer position through the video geometry (letterbox +
 *  rotation + zoom corrected); relative mode uses Pointer Lock with a speed
 *  boost; touch gestures (tap / drag / long-press-right / two-finger scroll)
 *  ride on absolute mode. */

import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { RelativeMouse } from "@/components/input/RelativeMouse";
import {
  createInitialTouchState,
  createTouchHandlers,
  type MouseButton,
  type MouseTouchEvent,
} from "@/components/input/touchpad";
import { clientToVideo, computeVideoRect } from "@/components/stage/videoRect";
import { requireLink } from "@/lib/device/device";
import { MOUSE_MARKER, MouseAbsoluteReport } from "@/lib/device/mouse";
import { mouseJiggler } from "@/lib/mouse-jiggler";
import {
  demoModeAtom,
  mouseModeAtom,
  rotationAtom,
  scaleModeAtom,
  serialStateAtom,
  wheelDirectionAtom,
  wheelIntervalAtom,
} from "@/state/atoms";

const TOUCH_MIN_WIDTH = 650;

export function MouseInput() {
  const mode = useAtomValue(mouseModeAtom);
  const serialConnected = useAtomValue(serialStateAtom) === "connected";
  const demoConnected = useAtomValue(demoModeAtom);
  const connected = serialConnected || demoConnected;

  if (!connected) return null;
  return mode === "relative" ? <RelativeMouse /> : <AbsoluteMouse />;
}

function AbsoluteMouse() {
  const rotation = useAtomValue(rotationAtom);
  const scale = useAtomValue(scaleModeAtom);
  const wheelDirection = useAtomValue(wheelDirectionAtom);
  const wheelInterval = useAtomValue(wheelIntervalAtom);

  const mouseRef = useRef(new MouseAbsoluteReport());
  const lastPosRef = useRef({ x: 0.5, y: 0.5 });
  const lastScrollTimeRef = useRef(0);
  const touchStateRef = useRef(createInitialTouchState());

  // biome-ignore lint/correctness/useExhaustiveDependencies: handlers are stable per-render closures
  useEffect(() => {
    const screen = document.getElementById("video") as HTMLVideoElement | null;
    if (!screen) return;

    screen.addEventListener("mousedown", handleMouseDown);
    screen.addEventListener("mouseup", handleMouseUp);
    screen.addEventListener("mousemove", handleMouseMove);
    screen.addEventListener("wheel", handleWheel, { passive: false });
    screen.addEventListener("click", disableEvent);
    screen.addEventListener("contextmenu", disableEvent);

    const touchHandlers =
      window.matchMedia(`(min-width: ${TOUCH_MIN_WIDTH}px)`).matches && "ontouchstart" in window
        ? createTouchHandlers(touchStateRef.current, {
            wheelDirection,
            wheelInterval,
            getCoordinate: (event) => coordinateOf(event.clientX, event.clientY) ?? { x: 0.5, y: 0.5 },
            handleMouseEvent: (event) => void handleMouseEvent(event),
            disableEvent,
          })
        : null;

    if (touchHandlers) {
      screen.addEventListener("touchstart", touchHandlers.handleTouchStart, { passive: false });
      screen.addEventListener("touchmove", touchHandlers.handleTouchMove, { passive: false });
      screen.addEventListener("touchend", touchHandlers.handleTouchEnd);
      screen.addEventListener("touchcancel", touchHandlers.handleTouchCancel);
    }

    function coordinateOf(clientX: number, clientY: number): { x: number; y: number } | null {
      const domRect = screen!.getBoundingClientRect();
      const rect = computeVideoRect(screen!, screen!, rotation, scale);
      return clientToVideo(clientX, clientY, domRect, rect, rotation);
    }

    function handleMouseDown(event: MouseEvent): void {
      disableEvent(event);
      void handleMouseEvent({ type: "mousedown", button: event.button as MouseButton });
    }

    function handleMouseUp(event: MouseEvent): void {
      disableEvent(event);
      void handleMouseEvent({ type: "mouseup", button: event.button as MouseButton });
    }

    function handleMouseMove(event: MouseEvent): void {
      disableEvent(event);
      const point = coordinateOf(event.clientX, event.clientY);
      if (!point) return;
      void handleMouseEvent({ type: "move", x: point.x, y: point.y });
    }

    function handleWheel(event: WheelEvent): void {
      disableEvent(event);
      if (Math.floor(event.deltaY) === 0) return;

      const now = Date.now();
      if (now - lastScrollTimeRef.current < wheelInterval) return;

      const deltaY = (event.deltaY > 0 ? 1 : -1) * wheelDirection;
      void handleMouseEvent({ type: "wheel", deltaY });
      lastScrollTimeRef.current = now;
    }

    return () => {
      screen.removeEventListener("mousedown", handleMouseDown);
      screen.removeEventListener("mouseup", handleMouseUp);
      screen.removeEventListener("mousemove", handleMouseMove);
      screen.removeEventListener("wheel", handleWheel);
      screen.removeEventListener("click", disableEvent);
      screen.removeEventListener("contextmenu", disableEvent);
      if (touchHandlers) {
        screen.removeEventListener("touchstart", touchHandlers.handleTouchStart);
        screen.removeEventListener("touchmove", touchHandlers.handleTouchMove);
        screen.removeEventListener("touchend", touchHandlers.handleTouchEnd);
        screen.removeEventListener("touchcancel", touchHandlers.handleTouchCancel);
        touchHandlers.cleanup();
      }
    };
  }, [rotation, scale, wheelDirection, wheelInterval]);

  async function handleMouseEvent(event: MouseTouchEvent): Promise<void> {
    const mouse = mouseRef.current;
    let report: number[];

    switch (event.type) {
      case "mousedown":
        mouse.buttonDown(event.button);
        report = mouse.buildButtonReport(lastPosRef.current.x, lastPosRef.current.y);
        break;
      case "mouseup":
        mouse.buttonUp(event.button);
        report = mouse.buildButtonReport(lastPosRef.current.x, lastPosRef.current.y);
        break;
      case "wheel":
        report = mouse.buildReport(lastPosRef.current.x, lastPosRef.current.y, event.deltaY);
        break;
      case "move":
        report = mouse.buildReport(event.x, event.y);
        lastPosRef.current = { x: event.x, y: event.y };
        break;
      default:
        report = mouse.buildReport(lastPosRef.current.x, lastPosRef.current.y);
        break;
    }

    try {
      await requireLink().sendMouseData([MOUSE_MARKER.absolute, ...report]);
    } catch {
      // link dropped — disconnect handler owns recovery
    }
    mouseJiggler.notifyMovement();
  }

  function disableEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  return null;
}
