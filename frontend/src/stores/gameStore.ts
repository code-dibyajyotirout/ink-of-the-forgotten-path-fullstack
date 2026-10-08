/**
 * gameStore — Zustand store for all game state.
 * Single source of truth for player, world, and UI state.
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ProfessionId, ReincarnationPurpose } from "@/data/professions";
import { MERIDIAN_NODES } from "@/data/professions";

// ─── Types ──────────────────────────────────────────────────────

export type CultivationRealm =
  | "mortal"
  | "qi_sensing"
  | "qi_condensation"
  | "foundation"
  | "core_formation"
  | "nascent_soul";

export type Stance = "iron_body" | "flowing_wind" | "thunderclap";

export type AlignmentPath = "righteous" | "demonic" | "neutral";

export interface MeridianNode {
  id: string;
  name: string;
  unlocked: boolean;
  level: number;
  maxLevel: number;
  bonusType: string;
  bonusValue: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: "scroll" | "consumable" | "key_item" | "material";
  quantity: number;
  description: string;
}

export interface QuestState {
  id: string;
  name: string;
  description: string;
  objectives: { id: string; text: string; completed: boolean }[];
  completed: boolean;
}

export type GowWeapon = "axe" | "blades" | "spear";

export interface WeaponAwakenState {
  active: boolean;
  element: "frost" | "flame" | "force";
  chargesLeft: number;
  timer: number;
}

export interface TargetEnemyInfo {
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  stun: number;
  maxStun: number;
  isFrozen: boolean;
  isBurning: boolean;
  canExecute: boolean;
}

export interface PlayerState {
  position: [number, number, number];
  rotation: [number, number, number];
  profession: ProfessionId | null;
  reincarnationPurpose: ReincarnationPurpose | null;
  realm: CultivationRealm;
  health: { current: number; max: number };
  qi: { current: number; max: number };
  stamina: { current: number; max: number };
  stance: Stance;
  meridians: MeridianNode[];
  alignment: { righteous: number; demonic: number };
  inventory: InventoryItem[];
  equippedTechniques: (string | null)[];
  masteryLevels: Record<string, number>;
  qiEssence: number;
  meridianStones: number;
  memoriesCollected: string[];
  deathLocations: Record<string, number>; // zone_x_z → death count (for Ink Walk)
  consecutiveParries: number; // For Soul Echo
  secretPowersDiscovered: string[];
  rage?: { current: number; max: number; isActive: boolean; activeTimer: number };
  gowWeapon?: GowWeapon;
  isAxeThrown?: boolean;
  weaponAwaken?: WeaponAwakenState;
}

export interface WorldState {
  currentZone: string;
  unlockedZones: string[];
  defeatedBosses: string[];
  collectedScrolls: string[];
  npcStates: Record<string, { alive: boolean; disposition: number; dialogueIndex: number }>;
  interactedObjects: string[];
  completedDomains: string[];
  discoveredDomains: string[];
}

export interface DragonState {
  name: string;
  hp: number;
  maxHp: number;
  flameCharge: number;
  maxFlameCharge: number;
  bondLevel: number;
  isMounted: boolean;
}

export type ProloguePhase = "sleeping" | "awakened" | "flashback" | "first_flight" | "free_roam";

export type DangerLevel = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export interface ZoneInfo {
  name: string;
  danger: DangerLevel;
  distance: number;
  multiplier: number;
}

export interface StoryState {
  chapter: number;
  completedQuests: string[];
  activeQuests: QuestState[];
  dialogueFlags: Record<string, boolean>;
  pathChoices: { questId: string; choice: AlignmentPath }[];
}

export interface DamagePopup {
  id: string;
  amount: number;
  isCrit: boolean;
  position: [number, number, number];
  screenOffset: [number, number]; // Random x,y spread in % of viewport
  life: number;
  color?: string;
}

export interface ComboStyleState {
  points: number;
  rank: "E" | "D" | "C" | "B" | "A" | "S" | "SSS";
  decayTimer: number;
  bannerText: string | null;
  bannerTimer: number;
}

export interface GameUIState {
  isPaused: boolean;
  showInventory: boolean;
  showMeridians: boolean;
  showDialogue: boolean;
  dialogueText: string;
  dialogueSpeaker: string;
  dialogueChoices: { text: string; action: string }[];
  interactionPrompt: string | null;
  showDeathScreen: boolean;
  showSaveMenu: boolean;
  debugMode: boolean;
  activeBoss: { name: string; currentHP: number; maxHP: number } | null;
  hitFreeze: { duration: number; scale: number } | null;
  damagePopups: DamagePopup[];
  comboStyle: ComboStyleState;
  executionPrompt: { enemyId: string; position: [number, number, number] } | null;
  targetEnemy: TargetEnemyInfo | null;
}

export interface MobileHUDConfig {
  handedness: "right" | "left";
  sideOffset: number; // distance from horizontal edge in px (default 20)
  bottomOffset: number; // distance from bottom in px (default 22)
  scale: number; // 0.75 - 1.35 (default 1.0)
  spacing: number; // 4 - 24 px (default 10)
  opacity: number; // 0.4 - 1.0 (default 0.92)
  layoutStyle: "grid" | "arc" | "compact";
  joystickMode: "floating" | "fixed";
  joystickSideOffset: number; // default 40
  joystickBottomOffset: number; // default 40
  joystickScale: number; // default 1.0
  showKeyLabels: boolean; // default true
}

export const DEFAULT_MOBILE_HUD: MobileHUDConfig = {
  handedness: "right",
  sideOffset: 20,
  bottomOffset: 22,
  scale: 1.0,
  spacing: 10,
  opacity: 0.92,
  layoutStyle: "grid",
  joystickMode: "floating",
  joystickSideOffset: 40,
  joystickBottomOffset: 40,
  joystickScale: 1.0,
  showKeyLabels: true,
};

export interface SettingsState {
  pixelSize: number;
  ditherStrength: number;
  audioVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  timeOfDay: number;
  timeSpeed: number;
  mobileHUD: MobileHUDConfig;
}

export interface GameState {
  // Game status
  isLoaded: boolean;
  playtime: number; // seconds

  // Sub-states
  player: PlayerState;
  world: WorldState;
  story: StoryState;
  ui: GameUIState;
  settings: SettingsState;
  dragon: DragonState;
  prologuePhase: ProloguePhase;
  cinematicIntroActive: boolean;

  // (Swimming/Diving removed — highland sky world only)
  dragonMomentum: boolean;
  dragonMomentumTimer: number;
  isAiming: boolean;
  aimAssistLocked: boolean;
  aimAssistTargetName: string | null;

  // Actions
  setIsAiming: (aiming: boolean) => void;
  setAimAssistTarget: (locked: boolean, name?: string | null) => void;
  setPlayerPosition: (pos: [number, number, number]) => void;
  setPlayerRotation: (rot: [number, number, number]) => void;
  setProfession: (id: ProfessionId) => void;
  setReincarnationPurpose: (purpose: ReincarnationPurpose) => void;
  shiftAlignment: (righteous: number, demonic: number) => void;
  setAudioVolume: (volume: number) => void;
  setBgmVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setTimeOfDay: (hour: number) => void;
  setTimeSpeed: (speed: number) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  useQi: (amount: number) => boolean;
  regenQi: (amount: number) => void;
  useStamina: (amount: number) => boolean;
  regenStamina: (amount: number) => void;
  setStance: (stance: Stance) => void;
  cycleStance: (direction: 1 | -1) => void;
  addItem: (item: InventoryItem) => void;
  removeItem: (id: string, quantity?: number) => void;
  addMeridianStones: (amount: number) => void;
  collectMemory: (memoryId: string) => void;
  recordDeath: (locationKey: string) => void;
  discoverSecretPower: (powerId: string) => void;
  discoverDomain: (domainId: string) => void;
  completeDomain: (domainId: string) => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
  setMobileHUD: (config: Partial<MobileHUDConfig>) => void;
  resetMobileHUD: () => void;
  unlockMeridianNode: (nodeId: string) => boolean;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  toggleInventory: () => void;
  toggleMeridians: () => void;
  setDeathScreen: (show: boolean) => void;
  setInteractionPrompt: (prompt: string | null) => void;
  triggerDialogue: (speaker: string, text: string, choices?: { text: string; action: string }[]) => void;
  closeDialogue: () => void;
  incrementPlaytime: (dt: number) => void;
  setLoaded: (loaded: boolean) => void;
  resetPlayer: () => void;
  revivePlayer: () => void;
  resetGame: () => void;
  setActiveBoss: (boss: { name: string; currentHP: number; maxHP: number } | null) => void;
  updateBossHP: (hp: number) => void;
  triggerHitFreeze: (duration: number, scale?: number) => void;
  addDamagePopup: (amount: number, isCrit: boolean, position: [number, number, number], color?: string) => void;
  addComboPoint: (points: number) => void;
  setBattleBanner: (bannerText: string, duration?: number) => void;
  updateCombatUI: (dt: number) => void;
  addRage: (amount: number) => void;
  activateRage: () => boolean;
  setExecutionPrompt: (prompt: { enemyId: string; position: [number, number, number] } | null) => void;
  switchGowWeapon: (weapon: GowWeapon) => void;
  setAxeThrown: (thrown: boolean) => void;
  awakenWeapon: () => boolean;
  consumeAwakenCharge: () => boolean;
  setTargetEnemy: (target: TargetEnemyInfo | null) => void;
  loadState: (state: Partial<GameState>) => void;
  setDragonHP: (hp: number) => void;
  setDragonMounted: (mounted: boolean) => void;
  useDragonFlame: (amount: number) => boolean;
  regenDragonFlame: (amount: number) => void;
  setProloguePhase: (phase: ProloguePhase) => void;
  setCinematicIntroActive: (active: boolean) => void;
  setStoryChapter: (chapter: number) => void;
  setDragonMomentum: (active: boolean) => void;
  updateDragonMomentum: (dt: number) => void;
  zoneInfo: ZoneInfo;
  setZoneInfo: (zone: ZoneInfo) => void;
}

// ─── Initial State ──────────────────────────────────────────────

const INITIAL_PLAYER: PlayerState = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  profession: null,
  reincarnationPurpose: null,
  realm: "mortal",
  health: { current: 100, max: 100 },
  qi: { current: 50, max: 50 },
  stamina: { current: 100, max: 100 },
  stance: "flowing_wind",
  meridians: [],
  alignment: { righteous: 0, demonic: 0 },
  inventory: [],
  equippedTechniques: [null, null, null, null],
  masteryLevels: {},
  qiEssence: 0,
  meridianStones: 0,
  memoriesCollected: [],
  deathLocations: {},
  consecutiveParries: 0,
  secretPowersDiscovered: [],
  rage: { current: 0, max: 100, isActive: false, activeTimer: 0 },
  gowWeapon: "axe",
  isAxeThrown: false,
  weaponAwaken: { active: false, element: "frost", chargesLeft: 0, timer: 0 },
};

const INITIAL_WORLD: WorldState = {
  currentZone: "shattered_sect_ruins",
  unlockedZones: ["shattered_sect_ruins"],
  defeatedBosses: [],
  collectedScrolls: [],
  npcStates: {},
  interactedObjects: [],
  completedDomains: [],
  discoveredDomains: [],
};

const INITIAL_STORY: StoryState = {
  chapter: 0,
  completedQuests: [],
  activeQuests: [],
  dialogueFlags: {},
  pathChoices: [],
};

const INITIAL_UI: GameUIState = {
  isPaused: false,
  showInventory: false,
  showMeridians: false,
  showDialogue: false,
  dialogueText: "",
  dialogueSpeaker: "",
  dialogueChoices: [],
  interactionPrompt: null,
  targetEnemy: null,
  showDeathScreen: false,
  showSaveMenu: false,
  debugMode: false,
  activeBoss: null,
  hitFreeze: null,
  damagePopups: [],
  comboStyle: { points: 0, rank: "E", decayTimer: 0, bannerText: null, bannerTimer: 0 },
  executionPrompt: null,
};

const INITIAL_SETTINGS: SettingsState = {
  pixelSize: 1,
  ditherStrength: 0.12,
  audioVolume: 0.8,
  bgmVolume: 0.75,
  sfxVolume: 0.85,
  timeOfDay: 6.0,
  timeSpeed: 1.0,
  mobileHUD: { ...DEFAULT_MOBILE_HUD },
};

const INITIAL_DRAGON: DragonState = {
  name: "Veyros",
  hp: 500,
  maxHp: 500,
  flameCharge: 100,
  maxFlameCharge: 100,
  bondLevel: 1,
  isMounted: false,
};

// Load initial settings from localStorage on client-side
let initialSettings = { ...INITIAL_SETTINGS };
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("inkpath_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      initialSettings = {
        ...INITIAL_SETTINGS,
        ...parsed,
        mobileHUD: {
          ...DEFAULT_MOBILE_HUD,
          ...(parsed.mobileHUD || {}),
        },
      };
    }
  } catch (err) {
    console.warn("Failed to load settings from localStorage:", err);
  }
}

// ─── Store ──────────────────────────────────────────────────────

const STANCES: Stance[] = ["iron_body", "flowing_wind", "thunderclap"];

export const useGameStore = create<GameState>()(
  immer((set) => ({
    isLoaded: false,
    playtime: 0,
    player: { ...INITIAL_PLAYER },
    world: { ...INITIAL_WORLD },
    story: { ...INITIAL_STORY },
    ui: { ...INITIAL_UI },
    settings: initialSettings,
    dragon: { ...INITIAL_DRAGON },
    prologuePhase: "free_roam" as ProloguePhase,
    cinematicIntroActive: false,
    // (Swimming/Diving state removed)
    dragonMomentum: false,
    dragonMomentumTimer: 0,
    isAiming: false,
    aimAssistLocked: false,
    aimAssistTargetName: null as string | null,
    setIsAiming: (aiming) =>
      set((s) => {
        if (s.isAiming !== aiming) {
          s.isAiming = aiming;
        }
      }),
    setAimAssistTarget: (locked, name = null) =>
      set((s) => {
        if (s.aimAssistLocked !== locked || s.aimAssistTargetName !== name) {
          s.aimAssistLocked = locked;
          s.aimAssistTargetName = name;
        }
      }),
    zoneInfo: {
      name: "Tidewalker Remnant",
      danger: "SAFE" as DangerLevel,
      distance: 0,
      multiplier: 1.0,
    },

    setPlayerPosition: (pos) =>
      set((s) => {
        s.player.position = pos;
      }),

    setPlayerRotation: (rot) =>
      set((s) => {
        s.player.rotation = rot;
      }),

    setProfession: (id) =>
      set((s) => {
        s.player.profession = id;
      }),

    setReincarnationPurpose: (purpose) =>
      set((s) => {
        s.player.reincarnationPurpose = purpose;
      }),

    shiftAlignment: (righteous, demonic) =>
      set((s) => {
        s.player.alignment.righteous = Math.max(0, Math.min(100, s.player.alignment.righteous + righteous));
        s.player.alignment.demonic = Math.max(0, Math.min(100, s.player.alignment.demonic + demonic));
      }),

    takeDamage: (amount) =>
      set((s) => {
        s.player.health.current = Math.max(0, s.player.health.current - amount);
        if (s.player.health.current <= 0) {
          s.ui.showDeathScreen = true;
        }
      }),

    heal: (amount) =>
      set((s) => {
        s.player.health.current = Math.min(
          s.player.health.max,
          s.player.health.current + amount
        );
      }),

    useQi: (amount) => {
      let success = false;
      set((s) => {
        if (s.player.qi.current >= amount) {
          s.player.qi.current -= amount;
          success = true;
        }
      });
      return success;
    },

    regenQi: (amount) =>
      set((s) => {
        s.player.qi.current = Math.min(s.player.qi.max, s.player.qi.current + amount);
      }),

    useStamina: (amount) => {
      let success = false;
      set((s) => {
        if (s.player.stamina.current >= amount) {
          s.player.stamina.current -= amount;
          success = true;
        }
      });
      return success;
    },

    regenStamina: (amount) =>
      set((s) => {
        s.player.stamina.current = Math.min(
          s.player.stamina.max,
          s.player.stamina.current + amount
        );
      }),

    setStance: (stance) =>
      set((s) => {
        s.player.stance = stance;
      }),

    cycleStance: (direction) =>
      set((s) => {
        const idx = STANCES.indexOf(s.player.stance);
        const next = (idx + direction + STANCES.length) % STANCES.length;
        s.player.stance = STANCES[next];
      }),

    addItem: (item) =>
      set((s) => {
        const existing = s.player.inventory.find((i) => i.id === item.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          s.player.inventory.push({ ...item });
        }
      }),

    updateSettings: (settings) =>
      set((s) => {
        Object.assign(s.settings, settings);
        // Persist settings changes directly to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("inkpath_settings", JSON.stringify(s.settings));
        }
      }),

    setMobileHUD: (config) =>
      set((s) => {
        Object.assign(s.settings.mobileHUD, config);
        if (typeof window !== "undefined") {
          localStorage.setItem("inkpath_settings", JSON.stringify(s.settings));
        }
      }),

    resetMobileHUD: () =>
      set((s) => {
        s.settings.mobileHUD = { ...DEFAULT_MOBILE_HUD };
        if (typeof window !== "undefined") {
          localStorage.setItem("inkpath_settings", JSON.stringify(s.settings));
        }
      }),

    addMeridianStones: (amount) =>
      set((s) => {
        s.player.meridianStones += amount;
      }),

    unlockMeridianNode: (nodeId) => {
      let success = false;
      set((s) => {
        // Find matching definition
        const def = MERIDIAN_NODES.find((n) => n.id === nodeId);
        if (!def) return;

        // Check stones cost
        if (s.player.meridianStones < def.cost) return;

        // Check prerequisite
        if (def.prerequisite) {
          const preNode = s.player.meridians.find((n) => n.id === def.prerequisite);
          if (!preNode || !preNode.unlocked) return;
        }

        // Find existing unlocked node
        let node = s.player.meridians.find((n) => n.id === nodeId);
        if (!node) {
          node = {
            id: def.id,
            name: def.name,
            unlocked: true,
            level: 0,
            maxLevel: def.maxLevel,
            bonusType: def.bonusType,
            bonusValue: 0,
          };
          s.player.meridians.push(node);
        }

        if (node.level < node.maxLevel) {
          node.level += 1;
          node.bonusValue = def.bonusPerLevel * node.level;
          s.player.meridianStones -= def.cost;
          success = true;

          // Apply passive stat bonuses immediately
          if (def.bonusType === "max_hp") {
            const oldMax = s.player.health.max;
            s.player.health.max = 100 + node.bonusValue;
            s.player.health.current += s.player.health.max - oldMax;
          } else if (def.bonusType === "max_stamina") {
            const oldMax = s.player.stamina.max;
            s.player.stamina.max = 100 + node.bonusValue;
            s.player.stamina.current += s.player.stamina.max - oldMax;
          } else if (def.bonusType === "max_qi") {
            const oldMax = s.player.qi.max;
            s.player.qi.max = 50 + node.bonusValue;
            s.player.qi.current += s.player.qi.max - oldMax;
          }
        }
      });
      return success;
    },

    collectMemory: (memoryId) =>
      set((s) => {
        if (!s.player.memoriesCollected.includes(memoryId)) {
          s.player.memoriesCollected.push(memoryId);
        }
      }),

    recordDeath: (locationKey) =>
      set((s) => {
        s.player.deathLocations[locationKey] = (s.player.deathLocations[locationKey] || 0) + 1;
      }),

    discoverSecretPower: (powerId) =>
      set((s) => {
        if (!s.player.secretPowersDiscovered.includes(powerId)) {
          s.player.secretPowersDiscovered.push(powerId);
        }
      }),

    discoverDomain: (domainId) =>
      set((s) => {
        if (!s.world.discoveredDomains.includes(domainId)) {
          s.world.discoveredDomains.push(domainId);
        }
      }),

    completeDomain: (domainId) =>
      set((s) => {
        if (!s.world.completedDomains.includes(domainId)) {
          s.world.completedDomains.push(domainId);
        }
      }),

    removeItem: (id, quantity = 1) =>
      set((s) => {
        const idx = s.player.inventory.findIndex((i) => i.id === id);
        if (idx >= 0) {
          s.player.inventory[idx].quantity -= quantity;
          if (s.player.inventory[idx].quantity <= 0) {
            s.player.inventory.splice(idx, 1);
          }
        }
      }),

    togglePause: () =>
      set((s) => {
        s.ui.isPaused = !s.ui.isPaused;
      }),

    setPaused: (paused: boolean) =>
      set((s) => {
        s.ui.isPaused = paused;
      }),

    toggleInventory: () =>
      set((s) => {
        s.ui.showInventory = !s.ui.showInventory;
      }),

    toggleMeridians: () =>
      set((s) => {
        s.ui.showMeridians = !s.ui.showMeridians;
      }),

    setDeathScreen: (show) =>
      set((s) => {
        s.ui.showDeathScreen = show;
      }),

    setInteractionPrompt: (prompt) =>
      set((s) => {
        s.ui.interactionPrompt = prompt;
      }),

    triggerDialogue: (speaker, text, choices = []) =>
      set((s) => {
        s.ui.showDialogue = true;
        s.ui.dialogueSpeaker = speaker;
        s.ui.dialogueText = text;
        s.ui.dialogueChoices = choices;
      }),

    closeDialogue: () =>
      set((s) => {
        s.ui.showDialogue = false;
        s.ui.dialogueSpeaker = "";
        s.ui.dialogueText = "";
        s.ui.dialogueChoices = [];
      }),

    incrementPlaytime: (dt) =>
      set((s) => {
        s.playtime += dt;
      }),

    setLoaded: (loaded) =>
      set((s) => {
        s.isLoaded = loaded;
      }),

    resetPlayer: () =>
      set((s) => {
        s.player = { ...INITIAL_PLAYER };
        s.ui.showDeathScreen = false;
      }),

    revivePlayer: () =>
      set((s) => {
        s.player.health.current = s.player.health.max;
        s.player.stamina.current = s.player.stamina.max;
        s.player.qi.current = s.player.qi.max;
        s.player.position = [0, 0, 0];
        s.player.rotation = [0, 0, 0];
        s.player.consecutiveParries = 0;
        s.ui.showDeathScreen = false;
        s.ui.isPaused = false;
      }),

    resetGame: () =>
      set((s) => {
        s.player = { ...INITIAL_PLAYER };
        s.world = { ...INITIAL_WORLD };
        s.story = { ...INITIAL_STORY };
        s.ui = { ...INITIAL_UI };
        s.playtime = 0;
      }),

    setActiveBoss: (boss) =>
      set((s) => {
        s.ui.activeBoss = boss;
      }),

    updateBossHP: (hp) =>
      set((s) => {
        if (s.ui.activeBoss) {
          s.ui.activeBoss.currentHP = Math.max(0, hp);
        }
      }),

    triggerHitFreeze: (duration, scale = 0.05) =>
      set((s) => {
        s.ui.hitFreeze = { duration, scale };
      }),

    addDamagePopup: (amount, isCrit, position, color = "#ffffff") =>
      set((s) => {
        if (!s.ui.damagePopups) s.ui.damagePopups = [];
        s.ui.damagePopups.push({
          id: Math.random().toString(36).substring(2, 9),
          amount,
          isCrit,
          position,
          screenOffset: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20], // Random spread
          life: 0.8,
          color,
        });
        if (s.ui.damagePopups.length > 25) {
          s.ui.damagePopups.shift();
        }
      }),

    addComboPoint: (points) =>
      set((s) => {
        if (!s.ui.comboStyle) {
          s.ui.comboStyle = { points: 0, rank: "E", decayTimer: 0, bannerText: null, bannerTimer: 0 };
        }
        s.ui.comboStyle.points += points;
        s.ui.comboStyle.decayTimer = 2.5; // 2.5s before decay
        const p = s.ui.comboStyle.points;
        if (p >= 500) s.ui.comboStyle.rank = "SSS";
        else if (p >= 350) s.ui.comboStyle.rank = "S";
        else if (p >= 220) s.ui.comboStyle.rank = "A";
        else if (p >= 130) s.ui.comboStyle.rank = "B";
        else if (p >= 70) s.ui.comboStyle.rank = "C";
        else if (p >= 30) s.ui.comboStyle.rank = "D";
        else s.ui.comboStyle.rank = "E";
      }),

    setBattleBanner: (bannerText, duration = 1.2) =>
      set((s) => {
        if (!s.ui.comboStyle) {
          s.ui.comboStyle = { points: 0, rank: "E", decayTimer: 0, bannerText: null, bannerTimer: 0 };
        }
        s.ui.comboStyle.bannerText = bannerText;
        s.ui.comboStyle.bannerTimer = duration;
      }),

    updateCombatUI: (dt) =>
      set((s) => {
        let changed = false;

        if (s.ui.damagePopups && s.ui.damagePopups.length > 0) {
          for (let i = s.ui.damagePopups.length - 1; i >= 0; i--) {
            const popup = s.ui.damagePopups[i];
            popup.life -= dt;
            if (popup.life <= 0) {
              s.ui.damagePopups.splice(i, 1);
            }
          }
          changed = true;
        }

        if (s.ui.comboStyle) {
          if (s.ui.comboStyle.bannerTimer > 0) {
            s.ui.comboStyle.bannerTimer -= dt;
            if (s.ui.comboStyle.bannerTimer <= 0) {
              s.ui.comboStyle.bannerText = null;
            }
            changed = true;
          }

          if (s.ui.comboStyle.decayTimer > 0) {
            s.ui.comboStyle.decayTimer -= dt;
            changed = true;
          } else if (s.ui.comboStyle.points > 0) {
            s.ui.comboStyle.points = Math.max(0, s.ui.comboStyle.points - 100 * dt);
            if (s.ui.comboStyle.points <= 2) {
              s.ui.comboStyle.points = 0;
              s.ui.comboStyle.rank = "E";
            } else {
              const p = s.ui.comboStyle.points;
              if (p >= 500) s.ui.comboStyle.rank = "SSS";
              else if (p >= 350) s.ui.comboStyle.rank = "S";
              else if (p >= 220) s.ui.comboStyle.rank = "A";
              else if (p >= 130) s.ui.comboStyle.rank = "B";
              else if (p >= 70) s.ui.comboStyle.rank = "C";
              else if (p >= 30) s.ui.comboStyle.rank = "D";
              else s.ui.comboStyle.rank = "E";
            }
            changed = true;
          }
        }

        // Update Spartan / Asura Rage countdown
        if (s.player.rage && s.player.rage.isActive) {
          s.player.rage.activeTimer -= dt;
          s.player.rage.current = Math.max(0, (s.player.rage.activeTimer / 12.0) * s.player.rage.max);
          if (s.player.rage.activeTimer <= 0) {
            s.player.rage.isActive = false;
            s.player.rage.current = 0;
          }
          changed = true;
        }

        if (!changed) {
          return;
        }
      }),

    addRage: (amount) =>
      set((s) => {
        if (!s.player.rage) {
          s.player.rage = { current: 0, max: 100, isActive: false, activeTimer: 0 };
        }
        if (!s.player.rage.isActive) {
          s.player.rage.current = Math.min(s.player.rage.max, s.player.rage.current + amount);
        }
      }),

    activateRage: () => {
      let activated = false;
      set((s) => {
        if (!s.player.rage) {
          s.player.rage = { current: 0, max: 100, isActive: false, activeTimer: 0 };
        }
        if (!s.player.rage.isActive && s.player.rage.current >= s.player.rage.max * 0.95) {
          s.player.rage.isActive = true;
          s.player.rage.activeTimer = 12.0; // 12 seconds of God of War Spartan Rage
          s.player.health.current = Math.min(s.player.health.max, s.player.health.current + 35); // Heal on rage burst
          activated = true;
        }
      });
      return activated;
    },

    setExecutionPrompt: (prompt) =>
      set((s) => {
        s.ui.executionPrompt = prompt;
      }),

    switchGowWeapon: (_weapon) =>
      set((s) => {
        // Enforce single weapon: Master Plum Blossom Sword
        s.player.gowWeapon = "axe";
        s.player.weaponAwaken = { active: false, element: "frost", chargesLeft: 0, timer: 0 };
      }),

    setAxeThrown: (thrown) =>
      set((s) => {
        s.player.isAxeThrown = thrown;
      }),

    awakenWeapon: () => {
      let awakened = false;
      set((s) => {
        const weapon = s.player.gowWeapon || "axe";
        const element = weapon === "axe" ? "frost" : weapon === "blades" ? "flame" : "force";
        s.player.weaponAwaken = {
          active: true,
          element,
          chargesLeft: 3,
          timer: 10.0,
        };
        awakened = true;
      });
      return awakened;
    },

    consumeAwakenCharge: () => {
      let hadCharge = false;
      set((s) => {
        if (s.player.weaponAwaken && s.player.weaponAwaken.active && s.player.weaponAwaken.chargesLeft > 0) {
          s.player.weaponAwaken.chargesLeft -= 1;
          hadCharge = true;
          if (s.player.weaponAwaken.chargesLeft <= 0) {
            s.player.weaponAwaken.active = false;
          }
        }
      });
      return hadCharge;
    },

    setTargetEnemy: (target) =>
      set((s) => {
        s.ui.targetEnemy = target;
      }),

    loadState: (state) =>
      set((s) => {
        if (state.player) Object.assign(s.player, state.player);
        if (state.world) Object.assign(s.world, state.world);
        if (state.story) Object.assign(s.story, state.story);
        if (state.playtime !== undefined) s.playtime = state.playtime;
        if (state.dragon) Object.assign(s.dragon, state.dragon);
        if (state.prologuePhase) s.prologuePhase = state.prologuePhase;
        s.isLoaded = true;
      }),

    setDragonHP: (hp) =>
      set((s) => {
        s.dragon.hp = Math.max(0, Math.min(s.dragon.maxHp, hp));
      }),

    setDragonMounted: (mounted) =>
      set((s) => {
        s.dragon.isMounted = mounted;
      }),

    useDragonFlame: (amount) => {
      let canUse = false;
      set((s) => {
        if (s.dragon.flameCharge >= amount) {
          s.dragon.flameCharge -= amount;
          canUse = true;
        }
      });
      return canUse;
    },

    regenDragonFlame: (amount) =>
      set((s) => {
        if (s.dragon.flameCharge < s.dragon.maxFlameCharge) {
          s.dragon.flameCharge = Math.min(s.dragon.maxFlameCharge, s.dragon.flameCharge + amount);
        }
      }),

    setProloguePhase: (phase) =>
      set((s) => {
        s.prologuePhase = phase;
      }),

    setCinematicIntroActive: (active) =>
      set((s) => {
        s.cinematicIntroActive = active;
      }),

    setStoryChapter: (chapter) =>
      set((s) => {
        s.story.chapter = chapter;
      }),

    setDragonMomentum: (active) =>
      set((s) => {
        s.dragonMomentum = active;
        s.dragonMomentumTimer = active ? 2.0 : 0;
      }),

    updateDragonMomentum: (dt) =>
      set((s) => {
        if (s.dragonMomentum) {
          s.dragonMomentumTimer -= dt;
          if (s.dragonMomentumTimer <= 0) {
            s.dragonMomentum = false;
            s.dragonMomentumTimer = 0;
          }
        }
      }),

    setZoneInfo: (zone) =>
      set((s) => {
        s.zoneInfo = zone;
      }),

    setAudioVolume: (volume) =>
      set((s) => {
        s.settings.audioVolume = Math.max(0, Math.min(1, volume));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("inkpath_settings", JSON.stringify(s.settings));
          } catch {}
        }
      }),

    setBgmVolume: (volume) =>
      set((s) => {
        s.settings.bgmVolume = Math.max(0, Math.min(1, volume));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("inkpath_settings", JSON.stringify(s.settings));
          } catch {}
        }
      }),

    setSfxVolume: (volume) =>
      set((s) => {
        s.settings.sfxVolume = Math.max(0, Math.min(1, volume));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("inkpath_settings", JSON.stringify(s.settings));
          } catch {}
        }
      }),

    setTimeOfDay: (hour) =>
      set((s) => {
        s.settings.timeOfDay = ((hour % 24) + 24) % 24;
      }),

    setTimeSpeed: (speed) =>
      set((s) => {
        s.settings.timeSpeed = Math.max(0, speed);
      }),
  }))
);
