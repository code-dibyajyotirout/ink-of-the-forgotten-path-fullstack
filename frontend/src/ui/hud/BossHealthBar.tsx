"use client";

import { useGameStore } from "@/stores/gameStore";

export function BossHealthBar() {
  const activeBoss = useGameStore((s) => s.ui.activeBoss);
  if (!activeBoss) return null;
  return (
    <div className="hud-boss-healthbar">
      <div className="hud-boss-name">{activeBoss.name}</div>
      <div className="hud-boss-hp-track">
        <div 
          className="hud-boss-hp-fill" 
          style={{ width: `${(activeBoss.currentHP / activeBoss.maxHP) * 100}%` }} 
        />
      </div>
      <div className="hud-boss-hp-value">
        {Math.ceil(activeBoss.currentHP)} / {activeBoss.maxHP}
      </div>
    </div>
  );
}
