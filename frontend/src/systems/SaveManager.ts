/**
 * SaveManager — Handles IndexedDB persistence + file export/import.
 * Save data format: .inkpath (gzipped JSON with integrity checksum).
 */
import { get, set, del } from "idb-keyval";
import { useGameStore, type PlayerState, type WorldState, type StoryState } from "@/stores/gameStore";

// ─── Types ──────────────────────────────────────────────────────

export interface SaveData {
  version: string;
  timestamp: number;
  checksum: string;
  playtime: number;
  player: PlayerState;
  world: WorldState;
  story: StoryState;
  meta: {
    slotName: string;
    chapter: number;
    realm: string;
    zone: string;
    playtimeFormatted: string;
  };
}

export interface SaveSlotInfo {
  slot: number;
  exists: boolean;
  timestamp?: number;
  meta?: SaveData["meta"];
}

const SAVE_VERSION = "1.0.0";
const SAVE_KEY_PREFIX = "inkpath_save_";
const MAX_SLOTS = 3;
const AUTO_SAVE_INTERVAL = 60; // seconds

// ─── Checksum ───────────────────────────────────────────────────

async function computeChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Time Formatting ────────────────────────────────────────────

function formatPlaytime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

// ─── Save Manager ───────────────────────────────────────────────

export class SaveManager {
  private autoSaveTimer: number = 0;
  private activeSlot: number = 0;

  /**
   * Tick auto-save timer. Call every frame.
   */
  tick(dt: number): void {
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= AUTO_SAVE_INTERVAL) {
      this.autoSaveTimer = 0;
      this.saveToSlot(this.activeSlot).catch(console.error);
    }
  }

  /**
   * Save current game state to a slot.
   */
  async saveToSlot(slot: number): Promise<void> {
    const state = useGameStore.getState();

    const saveData: Omit<SaveData, "checksum"> = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      playtime: state.playtime,
      player: JSON.parse(JSON.stringify(state.player)),
      world: JSON.parse(JSON.stringify(state.world)),
      story: JSON.parse(JSON.stringify(state.story)),
      meta: {
        slotName: `Save ${slot + 1}`,
        chapter: state.story.chapter,
        realm: state.player.realm,
        zone: state.world.currentZone,
        playtimeFormatted: formatPlaytime(state.playtime),
      },
    };

    const dataStr = JSON.stringify(saveData);
    const checksum = await computeChecksum(dataStr);

    const fullSave: SaveData = {
      ...saveData,
      checksum,
    };

    await set(`${SAVE_KEY_PREFIX}${slot}`, fullSave);
    this.activeSlot = slot;
    console.log(`[SaveManager] Saved to slot ${slot}`);
  }

  /**
   * Load game state from a slot.
   */
  async loadFromSlot(slot: number): Promise<boolean> {
    const data = await get<SaveData>(`${SAVE_KEY_PREFIX}${slot}`);
    if (!data) {
      console.warn(`[SaveManager] No save found in slot ${slot}`);
      return false;
    }

    // Verify checksum
    const { checksum, ...rest } = data;
    const dataStr = JSON.stringify(rest);
    const computed = await computeChecksum(dataStr);

    if (computed !== checksum) {
      console.error(`[SaveManager] Checksum mismatch for slot ${slot}! Save may be corrupted.`);
      // Still load, but warn
    }

    useGameStore.getState().loadState({
      player: data.player,
      world: data.world,
      story: data.story,
      playtime: data.playtime,
    });

    this.activeSlot = slot;
    console.log(`[SaveManager] Loaded from slot ${slot}`);
    return true;
  }

  /**
   * Delete a save slot.
   */
  async deleteSlot(slot: number): Promise<void> {
    await del(`${SAVE_KEY_PREFIX}${slot}`);
    console.log(`[SaveManager] Deleted slot ${slot}`);
  }

  /**
   * Get info about all save slots.
   */
  async getSlotInfo(): Promise<SaveSlotInfo[]> {
    const slots: SaveSlotInfo[] = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      const data = await get<SaveData>(`${SAVE_KEY_PREFIX}${i}`);
      slots.push({
        slot: i,
        exists: !!data,
        timestamp: data?.timestamp,
        meta: data?.meta,
      });
    }
    return slots;
  }

  /**
   * Export save data as a downloadable .inkpath file.
   */
  async exportSave(slot: number): Promise<void> {
    const data = await get<SaveData>(`${SAVE_KEY_PREFIX}${slot}`);
    if (!data) {
      throw new Error(`No save data in slot ${slot}`);
    }

    const exportPayload = {
      magic: "INKPATH_V1",
      data: JSON.stringify(data),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ink_of_the_forgotten_path_save_${slot + 1}_${Date.now()}.inkpath`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`[SaveManager] Exported slot ${slot}`);
  }

  /**
   * Import a .inkpath file and load it into a slot.
   */
  async importSave(file: File, targetSlot: number): Promise<boolean> {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      if (payload.magic !== "INKPATH_V1") {
        throw new Error("Invalid save file format");
      }

      const data: SaveData = JSON.parse(payload.data);

      // Verify checksum
      const { checksum, ...rest } = data;
      const dataStr = JSON.stringify(rest);
      const computed = await computeChecksum(dataStr);

      if (computed !== checksum) {
        console.warn("[SaveManager] Imported save has mismatched checksum — may be modified");
      }

      // Write to slot
      await set(`${SAVE_KEY_PREFIX}${targetSlot}`, data);
      console.log(`[SaveManager] Imported save to slot ${targetSlot}`);
      return true;
    } catch (err) {
      console.error("[SaveManager] Import failed:", err);
      return false;
    }
  }

  /**
   * Trigger a file input dialog for import.
   */
  triggerImportDialog(targetSlot: number): Promise<boolean> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".inkpath,.json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) {
          const result = await this.importSave(file, targetSlot);
          resolve(result);
        } else {
          resolve(false);
        }
      };
      input.click();
    });
  }

  /**
   * Overwrites a local save slot with the provided SaveData.
   */
  async writeSaveData(slot: number, saveData: SaveData): Promise<void> {
    await set(`${SAVE_KEY_PREFIX}${slot}`, saveData);
    console.log(`[SaveManager] Wrote save data to slot ${slot}`);
  }

  /**
   * Generates a sharing link containing the entire save data encoded in the hash.
   */
  async generateShareLink(slot: number): Promise<string> {
    const data = await get<SaveData>(`${SAVE_KEY_PREFIX}${slot}`);
    if (!data) {
      throw new Error(`No save data found in slot ${slot}`);
    }
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    return `${window.location.origin}${window.location.pathname}#import=${base64}`;
  }

  /**
   * Decodes a base64 string from a sharing link back into SaveData.
   */
  decodeShareData(base64: string): SaveData | null {
    try {
      const decodedStr = decodeURIComponent(atob(base64).split("").map((c) => {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(""));
      const parsed = JSON.parse(decodedStr);
      if (parsed && parsed.version && parsed.player && parsed.meta) {
        return parsed as SaveData;
      }
      return null;
    } catch (e) {
      console.error("[SaveManager] Error decoding share link:", e);
      return null;
    }
  }

  setActiveSlot(slot: number): void {
    this.activeSlot = slot;
  }

  getActiveSlot(): number {
    return this.activeSlot;
  }
}

// Singleton instance
export const saveManager = new SaveManager();
