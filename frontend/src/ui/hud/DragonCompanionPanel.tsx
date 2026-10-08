"use client";

import { useGameStore } from "@/stores/gameStore";
import { DragonIcon } from "./HudIcons";

export function DragonCompanionPanel() {
  const isMounted = useGameStore((s) => s.dragon.isMounted);
  const dragonHp = useGameStore((s) => s.dragon.hp);
  const dragonMaxHp = useGameStore((s) => s.dragon.maxHp);
  const dragonFlameCharge = useGameStore((s) => s.dragon.flameCharge);
  const dragonMaxFlameCharge = useGameStore((s) => s.dragon.maxFlameCharge);
  const dragonName = useGameStore((s) => s.dragon.name);

  if (!isMounted) return null;

  const flamePct = Math.max(0, Math.min(100, (dragonFlameCharge / dragonMaxFlameCharge) * 100));
  const dragonHpPct = Math.max(0, Math.min(100, (dragonHp / dragonMaxHp) * 100));

  return (
    <div className="hud-dragon-minimal">
      <div className="hud-min-dragon-header">
        <span className="hud-min-dragon-icon">
          <DragonIcon size={14} color="#fbbf24" glow="#fbbf24" />
        </span>
        <span className="hud-min-dragon-name">{dragonName}</span>
      </div>
      {/* Veyros HP */}
      <div className="hud-min-bar-row">
        <span className="hud-min-label">HP</span>
        <div className="hud-min-track">
          <div
            className="hud-min-fill"
            style={{
              width: `${dragonHpPct}%`,
              background: "linear-gradient(90deg, #b91c1c, #ef4444)",
            }}
          />
        </div>
        <span className="hud-min-val">{Math.ceil(dragonHp)}</span>
      </div>
      {/* Flame Charge */}
      <div className="hud-min-bar-row">
        <span className="hud-min-label" style={{ color: "#f59e0b" }}>FLM</span>
        <div className="hud-min-track">
          <div
            className="hud-min-fill"
            style={{
              width: `${flamePct}%`,
              background: "linear-gradient(90deg, #d97706, #f59e0b, #fef08a)",
            }}
          />
        </div>
        <span className="hud-min-val">{Math.ceil(dragonFlameCharge)}%</span>
      </div>
    </div>
  );
}
