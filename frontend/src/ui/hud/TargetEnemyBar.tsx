"use client";

import { useGameStore } from "@/stores/gameStore";

export function TargetEnemyBar() {
  const targetEnemy = useGameStore((s) => s.ui.targetEnemy);
  if (!targetEnemy) return null;
  return (
    <div className="hud-gow-target-container">
      <div className="hud-gow-target-header">
        <span className="hud-gow-target-name">{targetEnemy.name.toUpperCase()}</span>
        <div className="hud-gow-target-status">
          {targetEnemy.isFrozen && <span className="gow-status-badge badge-frost">FROZEN</span>}
          {targetEnemy.isBurning && <span className="gow-status-badge badge-burn">BURNING</span>}
          {targetEnemy.canExecute && <span className="gow-status-badge badge-execute">EXECUTE [G]</span>}
        </div>
      </div>
      <div className="hud-gow-bar-track hud-gow-hp-track">
        <div
          className="hud-gow-bar-fill hud-gow-hp-fill"
          style={{ width: `${Math.max(0, Math.min(100, (targetEnemy.hp / targetEnemy.maxHp) * 100))}%` }}
        />
      </div>
      <div className={`hud-gow-bar-track hud-gow-stun-track ${targetEnemy.stun >= targetEnemy.maxStun ? "stun-full-border" : ""}`}>
        <div
          className={`hud-gow-bar-fill hud-gow-stun-fill ${targetEnemy.stun >= targetEnemy.maxStun ? "stun-fill-pulse" : ""}`}
          style={{ width: `${Math.max(0, Math.min(100, (targetEnemy.stun / targetEnemy.maxStun) * 100))}%` }}
        />
      </div>
    </div>
  );
}
