"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Disable service worker in development mode (localhost / 127.0.0.1)
      const isLocalhost = 
        window.location.hostname === "localhost" || 
        window.location.hostname === "127.0.0.1" || 
        window.location.hostname.startsWith("192.168.") ||
        window.location.hostname.startsWith("172.");

      if (isLocalhost) {
        // Active unregister for local development
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
            console.log("[PWA] Service Worker unregistered for local development");
          }
        });
        return;
      }

      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");
          console.log("[PWA] Service Worker registered successfully with scope:", registration.scope);
        } catch (error) {
          console.error("[PWA] Service Worker registration failed:", error);
        }
      };

      // Check if document is fully loaded
      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  return null;
}
