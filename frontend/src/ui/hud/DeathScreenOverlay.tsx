"use client";

import { useGameStore } from "@/stores/gameStore";

interface DeathScreenOverlayProps {
  revivePlayer: () => void;
  handleSaveAndQuit: () => void;
}

export function DeathScreenOverlay({ revivePlayer, handleSaveAndQuit }: DeathScreenOverlayProps) {
  const showDeathScreen = useGameStore((s) => s.ui.showDeathScreen);
  if (!showDeathScreen) return null;
  return (
    <div className="hud-death-overlay">
      <div className="hud-death-content">
        <div className="hud-death-title">身敗名裂</div>
        <div className="hud-death-subtitle">DEFEAT & REINCARNATION</div>
        <p className="hud-death-description">
          Your mortal form has succumbed to the ink, but your martial soul remains unbroken.
        </p>
        <div className="hud-death-buttons">
          <button className="hud-death-btn revive-btn" onClick={() => revivePlayer()}>
            重生 Resurrect at Sect Gate
          </button>
          <button className="hud-death-btn quit-btn" onClick={handleSaveAndQuit}>
            Save & Quit to Title
          </button>
        </div>
      </div>
    </div>
  );
}
