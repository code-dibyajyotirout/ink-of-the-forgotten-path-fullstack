/**
 * KeybindingsManager — Manages player-customizable keyboard switches for PC.
 * Handles persistence, formatting, conflict resolution, and synchronization with InputManager.
 */

import { GameAction } from "@/engine/input/GameAction";

export const KEYBINDINGS_STORAGE_KEY = "drowned_epoch_keybindings";

export const DEFAULT_KEY_MAP: Record<string, GameAction> = {
  KeyW: GameAction.MOVE_FORWARD,
  KeyS: GameAction.MOVE_BACK,
  KeyA: GameAction.MOVE_LEFT,
  KeyD: GameAction.MOVE_RIGHT,
  ArrowUp: GameAction.MOVE_FORWARD,
  ArrowDown: GameAction.MOVE_BACK,
  ArrowLeft: GameAction.MOVE_LEFT,
  ArrowRight: GameAction.MOVE_RIGHT,
  Space: GameAction.JUMP,
  ShiftLeft: GameAction.SPRINT,
  ShiftRight: GameAction.SPRINT,
  AltLeft: GameAction.DODGE,
  KeyF: GameAction.DRAGON_MOUNT,
  KeyR: GameAction.RAGE,
  KeyT: GameAction.HYPERION_GRAPPLE,
  KeyQ: GameAction.AXE_THROW_RECALL,
  KeyE: GameAction.AXE_THROW_RECALL,
  KeyG: GameAction.EXECUTE,
  KeyV: GameAction.TOGGLE_VIEW,
  Escape: GameAction.PAUSE,
  KeyC: GameAction.STANCE_NEXT,
  Digit1: GameAction.WEAPON_1,
  Digit4: GameAction.TECHNIQUE_4,
  Tab: GameAction.LOCK_ON,
};

export type ActionCategory = "Movement" | "Combat" | "Flight & Mounting" | "Skills & View";

export interface ConfigurableActionMeta {
  action: GameAction;
  name: string;
  category: ActionCategory;
  description: string;
  defaultCode: string;
}

export const CONFIGURABLE_ACTIONS: ConfigurableActionMeta[] = [
  // Movement
  {
    action: GameAction.MOVE_FORWARD,
    name: "Move Forward",
    category: "Movement",
    description: "Step forward across coastal ruins & rooftops",
    defaultCode: "KeyW",
  },
  {
    action: GameAction.MOVE_BACK,
    name: "Move Backward",
    category: "Movement",
    description: "Step backward / tactical retreat",
    defaultCode: "KeyS",
  },
  {
    action: GameAction.MOVE_LEFT,
    name: "Move Left",
    category: "Movement",
    description: "Strafe left during exploration & combat",
    defaultCode: "KeyA",
  },
  {
    action: GameAction.MOVE_RIGHT,
    name: "Move Right",
    category: "Movement",
    description: "Strafe right during exploration & combat",
    defaultCode: "KeyD",
  },
  {
    action: GameAction.JUMP,
    name: "Jump / Celestial Step",
    category: "Movement",
    description: "Spring leap, double jump & airborne wind glide",
    defaultCode: "Space",
  },
  {
    action: GameAction.SPRINT,
    name: "Sprint / Qinggong Dash",
    category: "Movement",
    description: "High-velocity ground sprint & aerial dash",
    defaultCode: "ShiftLeft",
  },
  {
    action: GameAction.DODGE,
    name: "Dodge / Roll",
    category: "Movement",
    description: "Evasive tactical combat dodge roll",
    defaultCode: "AltLeft",
  },
  {
    action: GameAction.HYPERION_GRAPPLE,
    name: "Floral Hook / Grapple",
    category: "Movement",
    description: "Grapple & pull toward anchor points",
    defaultCode: "KeyT",
  },

  // Flight & Mount
  {
    action: GameAction.DRAGON_MOUNT,
    name: "Mount / Summon Dragon",
    category: "Flight & Mounting",
    description: "Summon & mount celestial dragon Veyros",
    defaultCode: "KeyF",
  },

  // Combat
  {
    action: GameAction.AXE_THROW_RECALL,
    name: "Leviathan Axe / Recall",
    category: "Combat",
    description: "Throw flying Leviathan Axe or 24-move bloom",
    defaultCode: "KeyQ",
  },
  {
    action: GameAction.EXECUTE,
    name: "Glory Kill Execution",
    category: "Combat",
    description: "Cinematic brutal execution on staggered foes",
    defaultCode: "KeyG",
  },
  {
    action: GameAction.STANCE_NEXT,
    name: "Switch Martial Stance",
    category: "Combat",
    description: "Cycle between Iron Body, Wind, and Thunderclap stances",
    defaultCode: "KeyC",
  },
  {
    action: GameAction.RAGE,
    name: "Dragon Wrath / Awakening",
    category: "Combat",
    description: "Trigger inner celestial dragon rage mode",
    defaultCode: "KeyR",
  },
  {
    action: GameAction.LOCK_ON,
    name: "Lock-On Target",
    category: "Combat",
    description: "Focus camera target tracking on nearest enemy",
    defaultCode: "Tab",
  },

  // Skills & View
  {
    action: GameAction.TOGGLE_VIEW,
    name: "Toggle FPV / POV View",
    category: "Skills & View",
    description: "Switch between First-Person and Third-Person view",
    defaultCode: "KeyV",
  },
  {
    action: GameAction.WEAPON_1,
    name: "Divine Technique 1",
    category: "Skills & View",
    description: "Cast first equipped active technique",
    defaultCode: "Digit1",
  },
  {
    action: GameAction.TECHNIQUE_4,
    name: "Divine Technique 4",
    category: "Skills & View",
    description: "Cast realm ultimate technique",
    defaultCode: "Digit4",
  },
  {
    action: GameAction.PAUSE,
    name: "Pause / Escape",
    category: "Skills & View",
    description: "Pause gameplay or release pointer lock",
    defaultCode: "Escape",
  },
];

/**
 * Format physical event code into a concise human-readable label.
 */
export function formatKeyDisplay(code: string | undefined): string {
  if (!code) return "—";

  if (code.startsWith("Key")) {
    return code.slice(3).toUpperCase();
  }
  if (code.startsWith("Digit")) {
    return code.slice(5);
  }
  if (code.startsWith("Numpad")) {
    return `NUM ${code.slice(6)}`;
  }

  switch (code) {
    case "Space":
      return "SPACE";
    case "ShiftLeft":
      return "L-SHIFT";
    case "ShiftRight":
      return "R-SHIFT";
    case "ControlLeft":
      return "L-CTRL";
    case "ControlRight":
      return "R-CTRL";
    case "AltLeft":
      return "L-ALT";
    case "AltRight":
      return "R-ALT";
    case "ArrowUp":
      return "↑ UP";
    case "ArrowDown":
      return "↓ DOWN";
    case "ArrowLeft":
      return "← LEFT";
    case "ArrowRight":
      return "→ RIGHT";
    case "Escape":
      return "ESC";
    case "Tab":
      return "TAB";
    case "Enter":
      return "ENTER";
    case "Backspace":
      return "BACKSPACE";
    case "CapsLock":
      return "CAPS";
    default:
      return code.toUpperCase();
  }
}

/**
 * Load keybindings from localStorage, merging with defaults.
 */
export function loadSavedKeyMap(): Record<string, GameAction> {
  if (typeof window === "undefined") return { ...DEFAULT_KEY_MAP };

  try {
    const raw = localStorage.getItem(KEYBINDINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEY_MAP };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_KEY_MAP, ...parsed };
  } catch (err) {
    console.warn("[KeybindingsManager] Failed to read from localStorage:", err);
    return { ...DEFAULT_KEY_MAP };
  }
}

/**
 * Save keybindings to localStorage and notify InputManager in real time.
 */
export function saveKeyMap(keyMap: Record<string, GameAction>): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(KEYBINDINGS_STORAGE_KEY, JSON.stringify(keyMap));
  } catch (err) {
    console.warn("[KeybindingsManager] Failed to save to localStorage:", err);
  }

  broadcastKeybindingsUpdate(keyMap);
}

/**
 * Reset keybindings to factory defaults and broadcast.
 */
export function resetKeyMap(): Record<string, GameAction> {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(KEYBINDINGS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  const fresh = { ...DEFAULT_KEY_MAP };
  broadcastKeybindingsUpdate(fresh);
  return fresh;
}

/**
 * Broadcast update event so InputManager applies changes immediately.
 */
export function broadcastKeybindingsUpdate(keyMap: Record<string, GameAction>): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("gameKeybindingsUpdated", { detail: keyMap })
  );
}

/**
 * Find the primary key code currently bound to a given GameAction.
 */
export function getKeyCodeForAction(
  keyMap: Record<string, GameAction>,
  action: GameAction
): string | undefined {
  // First prefer standard alphanumeric / space / shift keys over arrow keys if multiple
  const matches = Object.entries(keyMap).filter(([_, act]) => act === action);
  if (matches.length === 0) return undefined;

  const nonArrow = matches.find(([code]) => !code.startsWith("Arrow"));
  return nonArrow ? nonArrow[0] : matches[0][0];
}

/**
 * Rebind an action to a new key code, removing previous bindings for that action
 * and reassigning any conflicts cleanly.
 */
export function updateActionKey(
  currentMap: Record<string, GameAction>,
  targetAction: GameAction,
  newCode: string
): { updatedMap: Record<string, GameAction>; conflictAction: GameAction | null } {
  const next = { ...currentMap };

  // Check if newCode was already bound to another action
  const conflictAction = next[newCode] && next[newCode] !== targetAction ? next[newCode] : null;

  // Remove old primary binding for targetAction
  for (const [code, act] of Object.entries(next)) {
    if (act === targetAction && code !== newCode && !code.startsWith("Arrow")) {
      delete next[code];
    }
  }

  // Assign target action to new code
  next[newCode] = targetAction;

  return { updatedMap: next, conflictAction };
}
