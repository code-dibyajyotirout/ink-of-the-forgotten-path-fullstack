"use client";

import { useGameStore } from "@/stores/gameStore";

export function FlightReticle() {
  const isMounted = useGameStore((s) => s.dragon.isMounted);
  const isAiming = useGameStore((s) => s.isAiming);
  const aimAssistLocked = useGameStore((s) => s.aimAssistLocked);
  const aimAssistTargetName = useGameStore((s) => s.aimAssistTargetName);

  if (!isMounted && !isAiming) return null;

  return (
    <div className={`hud-flight-reticle ${isAiming ? "aiming-active" : ""} ${aimAssistLocked ? "target-locked" : ""}`}>
      <div className="reticle-dot" />
      <div className="reticle-circle" />
      <div className="reticle-bracket left" />
      <div className="reticle-bracket right" />
      <div className="reticle-bar top" />
      <div className="reticle-bar bottom" />
      {aimAssistLocked ? (
        <span className="aim-lock-text locked">LOCKED: {aimAssistTargetName || "ENEMY"} · [LMB / Q] LEVIATHAN AXE</span>
      ) : isAiming ? (
        <span className="aim-lock-text">[LMB / Q]: THROW & RECALL LEVIATHAN AXE</span>
      ) : isMounted ? (
        <span className="aim-lock-text flight-hint">[LMB / Q]: THROW & RECALL AXE · [RMB]: AIM</span>
      ) : null}
    </div>
  );
}
