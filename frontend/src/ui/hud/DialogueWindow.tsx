"use client";

import { useGameStore } from "@/stores/gameStore";

export function DialogueWindow() {
  const showDialogue = useGameStore((s) => s.ui.showDialogue);
  const speaker = useGameStore((s) => s.ui.dialogueSpeaker);
  const text = useGameStore((s) => s.ui.dialogueText);
  const choices = useGameStore((s) => s.ui.dialogueChoices);
  const close = useGameStore((s) => s.closeDialogue);
  
  if (!showDialogue) return null;

  const handleChoiceClick = (action: string) => {
    const event = new CustomEvent("gameDialogueChoice", { detail: { action } });
    window.dispatchEvent(event);
  };

  return (
    <div className="hud-dialogue-overlay" onClick={choices.length === 0 ? () => close() : undefined}>
      <div className="hud-dialogue-box" onClick={(e) => e.stopPropagation()}>
        <div className="hud-dialogue-speaker">{speaker}</div>
        <div className="hud-dialogue-text">{text}</div>
        
        {choices.length > 0 ? (
          <div className="hud-dialogue-choices">
            {choices.map((choice, i) => (
              <button
                key={i}
                className="hud-dialogue-choice-btn"
                onClick={() => handleChoiceClick(choice.action)}
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "right", fontSize: "10px", color: "#555" }}>
            Click anywhere to continue
          </div>
        )}
      </div>
    </div>
  );
}
