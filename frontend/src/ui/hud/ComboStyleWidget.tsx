"use client";

import { useGameStore } from "@/stores/gameStore";

export function ComboStyleWidget() {
  const comboStyle = useGameStore((s) => s.ui.comboStyle);
  if (!comboStyle || comboStyle.points <= 0) return null;
  return (
    <div className="hud-combo-widget">
      <div className={`hud-combo-rank rank-${comboStyle.rank.toLowerCase()}`}>
        {comboStyle.rank}
      </div>
      <div className="hud-combo-info">
        <div className="hud-combo-title">
          {comboStyle.rank === "SSS" ? "HEAVENLY DEMON" : comboStyle.rank === "S" ? "DIVINE STRIKE" : "COMBO STYLE"}
        </div>
        <div className="hud-combo-pts">{Math.floor(comboStyle.points)} PTS</div>
        <div className="hud-combo-bar-track">
          <div 
            className="hud-combo-bar-fill" 
            style={{ width: `${Math.min(100, (comboStyle.points / 500) * 100)}%` }} 
          />
        </div>
      </div>
    </div>
  );
}
