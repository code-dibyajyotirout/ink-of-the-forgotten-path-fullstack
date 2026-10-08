/**
 * Ink of the Forgotten Path - Production Package Root.
 * Comprehensive 3D martial arts action engine, hooks, components, and signal processing utilities.
 */

// Core Subsystems
export * from "./utils";
export * from "./hooks";
export * from "./components";

// Store & State
export { useGameStore } from "./stores/gameStore";
export type { GameState } from "./stores/gameStore";

// Engine & Systems
export { GameEngine } from "./engine/GameEngine";
export { SaveManager } from "./systems/SaveManager";
export * as KeybindingsManager from "./systems/KeybindingsManager";

// Data Definitions
export { PROFESSIONS } from "./data/professions";
export type { ProfessionDef, ProfessionId } from "./data/professions";
