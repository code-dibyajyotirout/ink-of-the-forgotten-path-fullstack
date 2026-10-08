/**
 * GameAction — Enum defining all high-level gameplay action intents.
 * Decoupled from physical input sources (keyboard, mouse, touch, gamepad).
 */

export enum GameAction {
  MOVE_FORWARD = "MOVE_FORWARD",
  MOVE_BACK = "MOVE_BACK",
  MOVE_LEFT = "MOVE_LEFT",
  MOVE_RIGHT = "MOVE_RIGHT",
  ATTACK = "ATTACK",
  HEAVY_ATTACK = "HEAVY_ATTACK",
  BLOCK = "BLOCK",
  DODGE = "DODGE",
  JUMP = "JUMP",
  TECHNIQUE_1 = "TECHNIQUE_1",
  TECHNIQUE_2 = "TECHNIQUE_2",
  TECHNIQUE_3 = "TECHNIQUE_3",
  TECHNIQUE_4 = "TECHNIQUE_4",
  INTERACT = "INTERACT",
  PAUSE = "PAUSE",
  STANCE_NEXT = "STANCE_NEXT",
  STANCE_PREV = "STANCE_PREV",
  RAGE = "RAGE",
  EXECUTE = "EXECUTE", // God of War Brutal Execution / Glory Kill Finisher (G / R3)
  BLADE_THROW = "BLADE_THROW",
  // Where Winds Meet / Mythic Weapon Actions
  WEAPON_1 = "WEAPON_1", // Master Plum Blossom Sword
  WEAPON_AWAKEN = "WEAPON_AWAKEN", // Sword Qi Awaken
  AXE_THROW_RECALL = "AXE_THROW_RECALL", // Flying Axe Throw & Recall (Q / E)
  HYPERION_GRAPPLE = "HYPERION_GRAPPLE", // Floral Hook Pull (T)
  DRAGON_MOUNT = "DRAGON_MOUNT", // Summon / Dismount Flying Dragon Mount (F)
  DRAGON_FLAME = "DRAGON_FLAME", // Dragon Fire Breath (E while mounted)
  LOCK_ON = "LOCK_ON", // Lock-on target toggle (Tab)
  AIM = "AIM", // Precision Right-Click Aim Mode
  TOGGLE_VIEW = "TOGGLE_VIEW", // FPV / POV View Mode Toggle (V)
  SPRINT = "SPRINT", // Sprint on foot / Speed boost on mount
}
