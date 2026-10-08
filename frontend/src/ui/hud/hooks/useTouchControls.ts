"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface JoystickState {
  startX: number;
  startY: number;
  currX: number;
  currY: number;
}

export function useTouchControls() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [moveJoystick, setMoveJoystick] = useState<JoystickState | null>(null);
  const [lookJoystick, setLookJoystick] = useState<JoystickState | null>(null);

  const moveTouchIdRef = useRef<number | null>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const isMobileScreen = typeof window !== "undefined" && window.innerWidth <= 1024;
    const hasTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window ||
        (navigator.maxTouchPoints > 0 && window.matchMedia("(pointer: coarse)").matches));
    if (isMobileScreen || hasTouch) {
      setTimeout(() => setIsTouchDevice(true), 0);
    }
  }, []);

  useEffect(() => {
    if (!isTouchDevice) return;

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const target = touch.target as HTMLElement | null;

        // Skip if touching an interactive action button
        if (target && target.closest(".hud-mobile-buttons, button, a")) {
          continue;
        }

        // Left 48% of screen = Movement Joystick (WASD)
        if (touch.clientX < window.innerWidth * 0.48) {
          if (moveTouchIdRef.current === null) {
            moveTouchIdRef.current = touch.identifier;
            setMoveJoystick({
              startX: touch.clientX,
              startY: touch.clientY,
              currX: touch.clientX,
              currY: touch.clientY,
            });
          }
        } else {
          // Right half of screen = Camera View Controller (Look / Orbit)
          if (lookTouchIdRef.current === null) {
            lookTouchIdRef.current = touch.identifier;
            lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
            setLookJoystick({
              startX: touch.clientX,
              startY: touch.clientY,
              currX: touch.clientX,
              currY: touch.clientY,
            });
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === moveTouchIdRef.current) {
          setMoveJoystick((prev) =>
            prev
              ? {
                  ...prev,
                  currX: touch.clientX,
                  currY: touch.clientY,
                }
              : null
          );
        } else if (touch.identifier === lookTouchIdRef.current) {
          if (lastLookPosRef.current) {
            const dx = touch.clientX - lastLookPosRef.current.x;
            const dy = touch.clientY - lastLookPosRef.current.y;
            // Dispatch look delta to input engine
            window.dispatchEvent(
              new CustomEvent("gameVirtualLook", { detail: { dx, dy } })
            );
          }
          lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
          setLookJoystick((prev) =>
            prev
              ? {
                  ...prev,
                  currX: touch.clientX,
                  currY: touch.clientY,
                }
              : null
          );
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === moveTouchIdRef.current) {
          moveTouchIdRef.current = null;
          setMoveJoystick(null);
        }
        if (touch.identifier === lookTouchIdRef.current) {
          lookTouchIdRef.current = null;
          lastLookPosRef.current = null;
          setLookJoystick(null);
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isTouchDevice]);

  const triggerAction = useCallback((action: string, held: boolean) => {
    const event = new CustomEvent("gameVirtualAction", { detail: { action, held } });
    window.dispatchEvent(event);
  }, []);

  return {
    isTouchDevice,
    moveJoystick,
    lookJoystick,
    joystick: moveJoystick, // Backward-compat alias
    triggerAction,
  };
}
