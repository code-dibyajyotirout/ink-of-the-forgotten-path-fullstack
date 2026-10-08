"use client";

import { useGameStore } from "@/stores/gameStore";

export function BattleBannerWidget() {
  const bannerText = useGameStore((s) => s.ui.comboStyle?.bannerText);
  if (!bannerText) return null;
  return (
    <div className="hud-battle-banner">
      <div className="hud-banner-text">{bannerText}</div>
    </div>
  );
}
