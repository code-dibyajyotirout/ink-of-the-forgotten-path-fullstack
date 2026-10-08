"use client";

import { useGameStore } from "@/stores/gameStore";
import { useCallback } from "react";
import { AxeIcon, DragonIcon } from "./HudIcons";

export function CombatActionBar() {
  const isMounted = useGameStore((s) => s.dragon.isMounted);
  const isAxeThrown = useGameStore((s) => s.player.isAxeThrown);
  const executionPrompt = useGameStore((s) => s.ui.executionPrompt);
  const targetCanExecute = useGameStore((s) => s.ui.targetEnemy?.canExecute);
  const canExecute = !!executionPrompt || !!targetCanExecute;

  const triggerAction = useCallback((action: string, held: boolean) => {
    const event = new CustomEvent("gameVirtualAction", { detail: { action, held } });
    window.dispatchEvent(event);
  }, []);

  return (
    <div className="hud-action-dock-minimal">
      {/* Sleek Minimalist Weapon Capsule */}
      <div className="hud-min-weapon-badge">
        <span className="hud-min-weapon-icon">
          {isMounted ? (
            <DragonIcon size={14} color="#fbbf24" glow="#fbbf24" />
          ) : (
            <AxeIcon size={14} color="#38bdf8" glow="#38bdf8" />
          )}
        </span>
        <span className="hud-min-weapon-name">
          {isMounted ? "VEYROS" : "LEVIATHAN AXE"}
        </span>
        <span
          className="hud-min-element-dot"
          style={{ background: isMounted ? "#fbbf24" : "#38bdf8", boxShadow: `0 0 6px ${isMounted ? "#fbbf24" : "#38bdf8"}` }}
        />
      </div>

      {/* Minimalist Action Chips */}
      <div className="hud-min-chips-row">
        {isMounted ? (
          <>
            <button
              className="hud-min-chip"
              onClick={() => triggerAction("ATTACK", false)}
              title="Leviathan Axe Throw & Recall"
            >
              <span className="hud-chip-key">LMB</span>
              <span className="hud-chip-label">{isAxeThrown ? "Recall" : "Throw"}</span>
            </button>
            <button
              className={`hud-min-chip ${isAxeThrown ? "chip-axe-thrown" : ""}`}
              onClick={() => triggerAction("AXE_THROW_RECALL", false)}
              title="Axe Throw / Recall [Q]"
            >
              <span className="hud-chip-key">Q</span>
              <span className="hud-chip-label">{isAxeThrown ? "Recall" : "Axe"}</span>
            </button>
            <button className="hud-min-chip" title="Dragon Speed Boost [Shift]">
              <span className="hud-chip-key">Shift</span>
              <span className="hud-chip-label">Boost</span>
            </button>
            <button
              className="hud-min-chip chip-cyan"
              onClick={() => triggerAction("DODGE", false)}
              title="Dragon Barrel Roll Evade [Alt / Double-Tap A or D]"
            >
              <span className="hud-chip-key">Alt / A·D×2</span>
              <span className="hud-chip-label">Roll</span>
            </button>
            <button
              className="hud-min-chip"
              onClick={() => triggerAction("TOGGLE_VIEW", false)}
              title="FPV / POV Toggle [V]"
            >
              <span className="hud-chip-key">V</span>
              <span className="hud-chip-label">View</span>
            </button>
            <button
              className="hud-min-chip chip-gold"
              onClick={() => triggerAction("DRAGON_MOUNT", false)}
              title="Dismount Dragon [F]"
            >
              <span className="hud-chip-key">F</span>
              <span className="hud-chip-label">Dismount</span>
            </button>
          </>
        ) : (
          <>
            <button
              className="hud-min-chip"
              onClick={() => triggerAction("ATTACK", false)}
              title="Melee Combo / Attack [LMB]"
            >
              <span className="hud-chip-key">LMB</span>
              <span className="hud-chip-label">Attack</span>
            </button>
            <button className="hud-min-chip" title="Aim / Guard [RMB]">
              <span className="hud-chip-key">RMB</span>
              <span className="hud-chip-label">Aim</span>
            </button>
            <button
              className={`hud-min-chip ${isAxeThrown ? "chip-axe-thrown" : ""}`}
              onClick={() => triggerAction("AXE_THROW_RECALL", false)}
              title="Throw or Recall Leviathan Axe [Q]"
            >
              <span className="hud-chip-key">Q</span>
              <span className="hud-chip-label">{isAxeThrown ? "Recall" : "Throw"}</span>
            </button>
            <button className="hud-min-chip" title="Sky Step / Jump [Space]">
              <span className="hud-chip-key">Space</span>
              <span className="hud-chip-label">Jump</span>
            </button>
            <button className="hud-min-chip" title="Qinggong Sprint [Shift]">
              <span className="hud-chip-key">Shift</span>
              <span className="hud-chip-label">Sprint</span>
            </button>
            <button
              className="hud-min-chip"
              onClick={() => triggerAction("TOGGLE_VIEW", false)}
              title="FPV / POV Toggle [V]"
            >
              <span className="hud-chip-key">V</span>
              <span className="hud-chip-label">View</span>
            </button>
            <button
              className={`hud-min-chip chip-execute ${canExecute ? "chip-execute-active" : ""}`}
              onClick={() => triggerAction("EXECUTE", false)}
              title="Glory Kill Execution [G]"
            >
              <span className="hud-chip-key">G</span>
              <span className="hud-chip-label">Execute</span>
            </button>
            <button
              className="hud-min-chip chip-gold"
              onClick={() => triggerAction("DRAGON_MOUNT", false)}
              title="Summon Bonded Dragon [F]"
            >
              <span className="hud-chip-key">F</span>
              <span className="hud-chip-label">Dragon</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
