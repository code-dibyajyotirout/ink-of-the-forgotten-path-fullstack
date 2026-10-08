"use client";

import { useGameStore } from "@/stores/gameStore";

export function InteractionPrompt() {
  const prompt = useGameStore((s) => s.ui.interactionPrompt);
  const showDialogue = useGameStore((s) => s.ui.showDialogue);

  if (!prompt || showDialogue) return null;

  return (
    <div className="hud-prompt-box">
      {prompt}
    </div>
  );
}
