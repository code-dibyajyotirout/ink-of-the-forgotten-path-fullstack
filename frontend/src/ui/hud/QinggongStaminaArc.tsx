"use client";

import { useGameStore } from "@/stores/gameStore";

export function QinggongStaminaArc() {
  const staminaCurrent = useGameStore((s) => s.player.stamina.current);
  const staminaMax = useGameStore((s) => s.player.stamina.max);
  const staminaPct = (staminaCurrent / staminaMax) * 100;

  const isDepleted = staminaPct < 98;

  return (
    <div
      className="hud-curved-arc-container"
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 40,
        opacity: isDepleted ? 0.95 : 0,
        transition: "opacity 0.35s ease-out",
      }}
    >
      <div style={{ position: "relative", width: "340px", height: "64px" }}>
        <svg
          width="340"
          height="64"
          viewBox="0 0 340 64"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="staminaArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Faint Track */}
          <path
            d="M 30 58 A 200 200 0 0 1 310 58"
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Active Stamina Arc Fill */}
          <path
            d="M 30 58 A 200 200 0 0 1 310 58"
            fill="none"
            stroke="url(#staminaArcGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="310"
            strokeDashoffset={310 * (1 - Math.max(0, Math.min(100, staminaPct)) / 100)}
            style={{
              transition: "stroke-dashoffset 0.12s ease-out",
              filter: "url(#arcGlow)",
            }}
          />

          {/* 3 Subtle Notch Markers */}
          <circle cx="95" cy="30" r="2" fill="#ffffff" opacity="0.6" />
          <circle cx="170" cy="9" r="2.5" fill="#ffffff" opacity="0.8" />
          <circle cx="245" cy="30" r="2" fill="#ffffff" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
}
