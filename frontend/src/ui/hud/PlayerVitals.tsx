"use client";

import { useGameStore } from "@/stores/gameStore";

export function PlayerVitals() {
  const healthCurrent = useGameStore((s) => s.player.health.current);
  const healthMax = useGameStore((s) => s.player.health.max);
  const qiCurrent = useGameStore((s) => s.player.qi.current);
  const qiMax = useGameStore((s) => s.player.qi.max);
  const staminaCurrent = useGameStore((s) => s.player.stamina.current);
  const staminaMax = useGameStore((s) => s.player.stamina.max);
  const rage = useGameStore((s) => s.player.rage);

  const healthPct = Math.max(0, Math.min(100, (healthCurrent / healthMax) * 100));
  const qiPct = Math.max(0, Math.min(100, (qiCurrent / qiMax) * 100));
  const staminaPct = Math.max(0, Math.min(100, (staminaCurrent / staminaMax) * 100));
  const rageVal = rage?.current ?? 0;
  const isRageReady = rageVal >= 95;
  const isRageActive = !!rage?.isActive;

  return (
    <div className="hud-vitals-minimal">
      {/* Health Bar */}
      <div className="hud-min-bar-row">
        <span className="hud-min-label">HP</span>
        <div className="hud-min-track">
          <div className="hud-min-fill hud-min-hp" style={{ width: `${healthPct}%` }} />
        </div>
        <span className="hud-min-val">{Math.ceil(healthCurrent)}</span>
      </div>

      {/* Qi Bar */}
      <div className="hud-min-bar-row">
        <span className="hud-min-label">QI</span>
        <div className="hud-min-track">
          <div className="hud-min-fill hud-min-qi" style={{ width: `${qiPct}%` }} />
        </div>
        <span className="hud-min-val">{Math.ceil(qiCurrent)}</span>
      </div>

      {/* Stamina Bar */}
      <div className="hud-min-bar-row">
        <span className="hud-min-label">ST</span>
        <div className="hud-min-track">
          <div className="hud-min-fill hud-min-st" style={{ width: `${staminaPct}%` }} />
        </div>
      </div>

      {/* Rage / Awaken Indicator (Subtle, only shows when building or active) */}
      {(rageVal > 5 || isRageActive) && (
        <div className={`hud-min-bar-row hud-min-rage-row ${isRageActive ? "rage-blaze" : ""}`}>
          <span className="hud-min-label" style={{ color: isRageActive ? "#ef4444" : "#f59e0b" }}>
            {isRageActive ? "AWAKEN" : "RAGE"}
          </span>
          <div className="hud-min-track hud-min-track-rage">
            <div
              className={`hud-min-fill ${isRageActive ? "hud-min-rage-burning" : "hud-min-rage"}`}
              style={{ width: `${Math.min(100, rageVal)}%` }}
            />
          </div>
          {isRageReady && (
            <span className="hud-min-rage-badge">[R] READY</span>
          )}
        </div>
      )}
    </div>
  );
}
