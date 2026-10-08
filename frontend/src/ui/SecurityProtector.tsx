/**
 * SecurityProtector — Disables context menus, keyboard shortcuts (F12, Ctrl+Shift+I, etc.),
 * and runs anti-debugging breakpoints to prevent reverse-engineering of the client code.
 */
"use client";

import { useEffect } from "react";

export function SecurityProtector() {
  useEffect(() => {
    const isLocalhost = 
      window.location.hostname === "localhost" || 
      window.location.hostname === "127.0.0.1" || 
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.startsWith("172.") ||
      window.location.hostname.startsWith("10.");

    if (isLocalhost) {
      return;
    }

    // 1. Disable Right Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable Common Inspect Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      // Ctrl + Shift + I (Inspect)
      // Ctrl + Shift + J (Console)
      // Ctrl + Shift + C (Element selector)
      // Ctrl + U (View Source)
      // Ctrl + S (Save Page)
      if (
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "i" || e.key === "j" || e.key === "c")) ||
        (e.ctrlKey && (e.key === "U" || e.key === "u" || e.key === "S" || e.key === "s"))
      ) {
        e.preventDefault();
        return;
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    // 3. Anti-Debugger Loop
    // If DevTools is open, this background loop will trigger an active breakpoint,
    // freezing the inspector and preventing easy code reading/variable injection.
    const debuggerInterval = setInterval(() => {
      const startTime = performance.now();
      debugger;
      const endTime = performance.now();
      // If DevTools is open, the debugger statement will halt execution,
      // causing a large time difference between startTime and endTime.
      if (endTime - startTime > 100) {
        console.clear();
        console.log("Ink Flow secured. Access denied.");
      }
    }, 1000);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(debuggerInterval);
    };
  }, []);

  return null;
}
