"use client";

import { useGameStore } from "@/stores/gameStore";

export function ExecutionPromptOverlay() {
  const executionPrompt = useGameStore((s) => s.ui.executionPrompt);
  const targetCanExecute = useGameStore((s) => s.ui.targetEnemy?.canExecute);
  if (!executionPrompt && !targetCanExecute) return null;
  return (
    <div className="hud-execution-overlay">
      <div className="hud-execution-box r3-pulse-animation">
        <span className="hud-exec-key-pill">[G] / R3</span>
        <span className="hud-exec-label">GLORY KILL EXECUTION</span>
      </div>
    </div>
  );
}
