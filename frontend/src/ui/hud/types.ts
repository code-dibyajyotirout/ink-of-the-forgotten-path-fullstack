export interface HUDProps {
  getFPS?: () => number;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export const STANCE_LABELS: Record<string, string> = {
  iron_body: "鉄 Iron Body",
  flowing_wind: "風 Flowing Wind",
  thunderclap: "雷 Thunderclap",
};

export const STANCE_ICONS: Record<string, string> = {
  iron_body: "鉄",
  flowing_wind: "風",
  thunderclap: "雷",
};

export const TECHNIQUE_DISPLAY: Record<string, { icon: string; name: string }> = {
  phantom_blade: { icon: "劍", name: "Phantom Blade" },
  unbreakable_stance: { icon: "盾", name: "Iron Wall" },
  meridian_strike: { icon: "拳", name: "Meridian Strike" },
  ink_arrow: { icon: "弓", name: "Ink Arrow" },
  ink_seal: { icon: "符", name: "Ink Seal" },
  soul_echo: { icon: "魂", name: "Soul Echo" },
  ink_walk: { icon: "步", name: "Ink Walk" },
  void_step: { icon: "空", name: "Void Step" },
  iron_meridian: { icon: "脈", name: "Iron Meridian" },
  thunder_palm: { icon: "掌", name: "Thunder Palm" },
  blood_lotus: { icon: "蓮", name: "Blood Lotus" },
  heavenly_brush: { icon: "筆", name: "Heavenly Brush" },
};
