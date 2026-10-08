"use client";

import { useGameStore } from "@/stores/gameStore";

export function DamagePopupsLayer() {
  const damagePopups = useGameStore((s) => s.ui.damagePopups);
  if (!damagePopups || damagePopups.length === 0) return null;
  return (
    <div className="hud-damage-popups-layer">
      {damagePopups.map((popup) => (
        <div
          key={popup.id}
          className={`hud-damage-popup ${popup.isCrit ? "hud-crit-popup" : ""}`}
          style={{
            color: popup.color || (popup.isCrit ? "#ff1744" : "#ffffff"),
            opacity: popup.life / 0.8,
            left: `${50 + popup.screenOffset[0]}%`,
            top: `${45 + popup.screenOffset[1]}%`,
            transform: `translate(-50%, -50%) scale(${popup.isCrit ? 1.35 : 1.0}) translateY(-${(0.8 - popup.life) * 60}px)`,
          }}
        >
          {popup.isCrit ? `CRIT ${popup.amount}!` : popup.amount}
        </div>
      ))}
    </div>
  );
}
