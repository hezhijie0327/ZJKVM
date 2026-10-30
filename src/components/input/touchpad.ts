/** Touchpad gesture recognizer for the absolute mouse: single-finger tap =
 *  left click, drag = hold-left-and-move, long-press (800 ms) = right button
 *  with haptic tick, two-finger = wheel. Ported from the original. */

import type { MouseButtons } from "@/lib/device/mouse";

export type MouseButton = 0 | 1 | 2;

export type MouseTouchEvent =
  | { type: "mousedown"; button: MouseButton }
  | { type: "mouseup"; button: MouseButton }
  | { type: "move"; x: number; y: number }
  | { type: "wheel"; deltaY: number };

export const TOUCH_THRESHOLDS = {
  TAP: 8,
  DRAG: 10,
  VELOCITY: 0.3,
  LONG_PRESS: 800,
} as const;

export interface TouchHandlerOptions {
  wheelDirection: number;
  wheelInterval: number;
  getCoordinate: (event: { clientX: number; clientY: number }) => { x: number; y: number };
  handleMouseEvent: (event: MouseTouchEvent) => void;
  disableEvent: (event: Event) => void;
}

export interface TouchState {
  touchStartTime: number;
  lastTouchY: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  isLongPress: boolean;
  hasMove: boolean;
  isDragging: boolean;
  pressedButton: MouseButton | null;
  touchStartPos: { x: number; y: number };
  lastScrollTime: number;
}

export function createInitialTouchState(): TouchState {
  return {
    touchStartTime: 0,
    lastTouchY: 0,
    longPressTimer: null,
    isLongPress: false,
    hasMove: false,
    isDragging: false,
    pressedButton: null,
    touchStartPos: { x: 0, y: 0 },
    lastScrollTime: 0,
  };
}

export function createTouchHandlers(state: TouchState, options: TouchHandlerOptions) {
  const { wheelDirection, wheelInterval, getCoordinate, handleMouseEvent, disableEvent } = options;

  function handleTouchStart(e: TouchEvent): void {
    disableEvent(e);

    if (e.touches.length === 0) return;
    const touch = e.touches[0]!;

    state.touchStartTime = Date.now();
    state.lastTouchY = touch.clientY;
    state.isLongPress = false;
    state.hasMove = false;
    state.isDragging = false;
    state.pressedButton = null;
    state.touchStartPos = { x: touch.clientX, y: touch.clientY };

    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
    }

    const { x, y } = getCoordinate(touch);
    handleMouseEvent({ type: "move", x, y });

    if (e.touches.length > 1) return;

    state.longPressTimer = setTimeout(() => {
      state.isLongPress = true;
      state.pressedButton = 2 satisfies MouseButton;
      navigator.vibrate?.(50);
      handleMouseEvent({ type: "mousedown", button: 2 satisfies MouseButton });
    }, TOUCH_THRESHOLDS.LONG_PRESS);
  }

  function handleTouchMove(e: TouchEvent): void {
    disableEvent(e);

    if (e.touches.length === 0) return;
    const touch = e.touches[0]!;

    // Two-finger scroll first
    if (e.touches.length > 1) {
      const now = Date.now();
      if (now - state.lastScrollTime < wheelInterval) return;

      const deltaY = (touch.clientY - state.lastTouchY > 0 ? 1 : -1) * wheelDirection;
      handleMouseEvent({ type: "wheel", deltaY });

      state.lastTouchY = touch.clientY;
      state.lastScrollTime = now;
      return;
    }

    const deltaX = Math.abs(touch.clientX - state.touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - state.touchStartPos.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const timeDelta = Date.now() - state.touchStartTime;
    const velocity = timeDelta > 0 ? distance / timeDelta : 0;

    const shouldStartDrag =
      distance > TOUCH_THRESHOLDS.DRAG || (distance > TOUCH_THRESHOLDS.TAP && velocity > TOUCH_THRESHOLDS.VELOCITY);

    if (shouldStartDrag && !state.isDragging && !state.isLongPress) {
      state.hasMove = true;
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }
      if (state.pressedButton === null) {
        state.isDragging = true;
        state.pressedButton = 0 satisfies MouseButton;
        handleMouseEvent({ type: "mousedown", button: 0 satisfies MouseButton });
      }
    }

    if (distance > TOUCH_THRESHOLDS.TAP && !state.hasMove) {
      state.hasMove = true;
    }

    if (state.isDragging || state.isLongPress) {
      const { x, y } = getCoordinate(touch);
      handleMouseEvent({ type: "move", x, y });
    }
  }

  function handleTouchEnd(e: TouchEvent): void {
    disableEvent(e);

    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    if (!state.hasMove && !state.isLongPress) {
      handleMouseEvent({ type: "mousedown", button: 0 satisfies MouseButton });
      setTimeout(() => {
        handleMouseEvent({ type: "mouseup", button: 0 satisfies MouseButton });
      }, 50);
    } else if (state.pressedButton !== null) {
      handleMouseEvent({ type: "mouseup", button: state.pressedButton });
    }

    resetTouchState();
  }

  function handleTouchCancel(e: TouchEvent): void {
    disableEvent(e);

    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    if (state.pressedButton !== null) {
      handleMouseEvent({ type: "mouseup", button: state.pressedButton });
    }

    resetTouchState();
  }

  function resetTouchState(): void {
    state.isLongPress = false;
    state.hasMove = false;
    state.isDragging = false;
    state.pressedButton = null;
  }

  function cleanup(): void {
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
  }

  return { handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, cleanup };
}

// Keep the button bit names importable for consumers that care
export type { MouseButtons };
