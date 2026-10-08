"use client";

import { useGameStore } from "@/stores/gameStore";
import { TECHNIQUE_DISPLAY } from "./types";

export function TechniqueBar() {
  const equippedTechniques = useGameStore((s) => s.player.equippedTechniques);

  return (
    <div className="hud-techniques">
      {equippedTechniques.map((tech, i) => {
        const display = tech ? TECHNIQUE_DISPLAY[tech] : null;
        return (
          <div key={i} className={`hud-tech-slot ${tech ? "hud-tech-active" : ""}`}>
            <span className="hud-tech-key">{i + 1}</span>
            {display ? (
              <>
                <span className="hud-tech-icon">{display.icon}</span>
                <span className="hud-tech-name">{display.name}</span>
              </>
            ) : (
              <span className="hud-tech-name">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
