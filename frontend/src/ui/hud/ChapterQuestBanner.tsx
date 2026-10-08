"use client";

import { useGameStore } from "@/stores/gameStore";

export function ChapterQuestBanner() {
  const hasTargetEnemy = useGameStore((s) => s.ui.targetEnemy !== null);
  const zoneInfo = useGameStore((s) => s.zoneInfo);
  const prologuePhase = useGameStore((s) => s.prologuePhase);
  const storyChapter = useGameStore((s) => s.story.chapter);
  const isMounted = useGameStore((s) => s.dragon.isMounted);

  return (
    <div className={`hud-quest-minimal ${hasTargetEnemy ? "target-active" : ""}`}>
      {zoneInfo && prologuePhase === "free_roam" && (
        <div className="hud-min-zone-tag">
          <span>{zoneInfo.name}</span>
          <span className="hud-min-zone-dot">·</span>
          <span>{zoneInfo.distance}m</span>
        </div>
      )}
      <div className="hud-min-chapter-text">
        {storyChapter === 1 && (isMounted ? "PROLOGUE · FIRST FLIGHT" : "PROLOGUE · THE SLEEPER WAKES")}
        {storyChapter === 2 && "ACT I · HIGHLAND CRAGS"}
        {storyChapter === 3 && "ACT II · SKY SANCTUARY"}
        {storyChapter === 4 && "ACT III · CHAINED SPIRES"}
        {storyChapter === 5 && "ACT IV · ASHSCALE FOUNDRY"}
        {storyChapter === 6 && "ACT V · ORACLE'S ECHO"}
        {storyChapter === 7 && "ACT VI · THE BLACK SPIRE"}
      </div>
      <div className="hud-min-objective-text">
        {storyChapter === 1 && (
          prologuePhase === "sleeping" || prologuePhase === "awakened"
            ? "Draw The Dragon Sword from the altar [E]"
            : !isMounted
            ? "Approach Veyros to take flight [E / F]"
            : "Soar above the peaks [LMB / Q: Throw Axe]"
        )}
        {storyChapter === 2 && "Liberate Outpost & Defeat Korrath"}
        {storyChapter === 3 && "Ascend Sanctuary & Purify Sky Qilong"}
        {storyChapter === 4 && "Sever the Qi Chains on Spires"}
        {storyChapter === 5 && "Free Enslaved Dragons"}
        {storyChapter === 7 && "Challenge Sovereign Malakor"}
      </div>
    </div>
  );
}
