import * as THREE from "three";
import { EnemyAI } from "../combat/EnemyAI";
import { CorruptedDragonEnemy, WyvernTier } from "../combat/CorruptedDragonEnemy";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { PlayerController } from "../combat/PlayerController";
import { useGameStore, ZoneInfo, DangerLevel } from "@/stores/gameStore";

export interface ZoneDefinition {
  id: string;
  name: string;
  minDist: number;
  maxDist: number;
  danger: DangerLevel;
  statMultiplier: number;
  wyvernSpawnRate: number; // probability / max count
  ambientColor: number;
}

export const ZONES: ZoneDefinition[] = [
  {
    id: "home",
    name: "Verdant Foothills & Tidewalker Sanctuary",
    minDist: 0,
    maxDist: 500,
    danger: "SAFE",
    statMultiplier: 1.0,
    wyvernSpawnRate: 0,
    ambientColor: 0x87ceeb,
  },
  {
    id: "reefs",
    name: "Highland Crags & Outpost Ridges",
    minDist: 500,
    maxDist: 2000,
    danger: "LOW",
    statMultiplier: 1.5,
    wyvernSpawnRate: 2,
    ambientColor: 0x2dd4bf,
  },
  {
    id: "archive",
    name: "Cloud-Piercing Spires & Sky Sanctuary",
    minDist: 2000,
    maxDist: 4500,
    danger: "MEDIUM",
    statMultiplier: 2.5,
    wyvernSpawnRate: 4,
    ambientColor: 0x3b82f6,
  },
  {
    id: "foundry",
    name: "The Volcanic Peaks & Ashen Cliffs",
    minDist: 4500,
    maxDist: 7500,
    danger: "HIGH",
    statMultiplier: 4.0,
    wyvernSpawnRate: 6,
    ambientColor: 0xf97316,
  },
  {
    id: "black_spire",
    name: "The Dragon Sovereign's Aerie & Heavensward Spire",
    minDist: 7500,
    maxDist: 15000,
    danger: "EXTREME",
    statMultiplier: 7.0,
    wyvernSpawnRate: 8,
    ambientColor: 0xdc2626,
  },
];

export class ZoneManager {
  private currentZone: ZoneDefinition = ZONES[0];
  private lastUpdateDist: number = -1;
  private spawnCheckTimer: number = 0;
  private maxActiveEnemies: number = 12;

  constructor(
    private scene: THREE.Scene,
    private particles: InkParticleSystem,
    private playerGroup: THREE.Group,
    private playerController: PlayerController,
    private enemiesRef: EnemyAI[]
  ) {}

  /**
   * Update zone tracking and ecosystem every frame.
   */
  public update(dt: number, activeEnemies: EnemyAI[]): void {
    const playerPos = this.playerGroup.position;
    const distance = Math.hypot(playerPos.x, playerPos.z);

    // ── 1. Determine Current Zone ──
    const matchedZone = ZONES.find(
      (z) => distance >= z.minDist && distance < z.maxDist
    ) || ZONES[ZONES.length - 1];

    if (matchedZone.id !== this.currentZone.id) {
      const prevZone = this.currentZone;
      this.currentZone = matchedZone;

      // Broadcast zone change in store & banner
      useGameStore.getState().setZoneInfo({
        name: matchedZone.name,
        danger: matchedZone.danger,
        distance: Math.round(distance),
        multiplier: matchedZone.statMultiplier,
      });

      // Announce zone arrival
      useGameStore.getState().setBattleBanner(
        `ENTERING: ${matchedZone.name.toUpperCase()} · DANGER: ${matchedZone.danger}`,
        3.5
      );
    } else if (Math.abs(distance - this.lastUpdateDist) > 25) {
      this.lastUpdateDist = distance;
      useGameStore.getState().setZoneInfo({
        name: this.currentZone.name,
        danger: this.currentZone.danger,
        distance: Math.round(distance),
        multiplier: this.currentZone.statMultiplier,
      });
    }

    // ── 2. Ecosystem Spawning Loop ──
    this.spawnCheckTimer += dt;
    if (this.spawnCheckTimer >= 3.0) {
      this.spawnCheckTimer = 0;
      this.maintainEcosystem(playerPos, distance, activeEnemies);
    }
  }

  /**
   * Maintain enemy population around the player.
   */
  private maintainEcosystem(
    playerPos: THREE.Vector3,
    distance: number,
    activeEnemies: EnemyAI[]
  ): void {
    // 1. Despawn enemies that are too far away (> 350m)
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
      const e = activeEnemies[i];
      const dist = e.mesh.position.distanceTo(playerPos);
      if (dist > 350.0) {
        this.scene.remove(e.mesh);
        activeEnemies.splice(i, 1);
      }
    }

    // 2. If in safe zone, do not spawn hostile dragons
    if (this.currentZone.danger === "SAFE") return;

    // 3. Check if we need more enemies
    const needed = Math.min(
      this.currentZone.wyvernSpawnRate,
      this.maxActiveEnemies - activeEnemies.length
    );

    if (needed > 0) {
      this.spawnCorruptedWyvern(playerPos, activeEnemies);
    }
  }

  /**
   * Spawn a Corrupted Wyvern scaled to current zone.
   */
  private spawnCorruptedWyvern(playerPos: THREE.Vector3, activeEnemies: EnemyAI[]): void {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 65.0 + Math.random() * 45.0;
    const spawnX = playerPos.x + Math.cos(angle) * spawnDist;
    const spawnZ = playerPos.z + Math.sin(angle) * spawnDist;
    const spawnY = Math.max(18.0, playerPos.y + 15.0 + Math.random() * 15.0);

    const mult = this.currentZone.statMultiplier;
    const hp = Math.round(120 * mult);
    const damage = Math.round(14 * mult);

    let tier: WyvernTier = "scout";
    if (this.currentZone.id === "black_spire") {
      tier = "ancient";
    } else if (this.currentZone.id === "foundry") {
      tier = "war";
    } else if (this.currentZone.id === "archive") {
      tier = "patrol";
    } else {
      tier = "scout";
    }

    const wyvern = new CorruptedDragonEnemy(
      {
        id: `corrupted_wyvern_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: mult > 3 ? "elite" : "grunt",
        wyvernTier: tier,
        position: new THREE.Vector3(spawnX, spawnY, spawnZ),
        health: hp,
        maxHealth: hp,
        damage: damage,
        speed: 8.0 * Math.min(1.4, 0.9 + mult * 0.1),
        patrolPoints: [],
        flightAltitude: spawnY,
      },
      this.scene,
      this.particles,
      this.playerGroup,
      this.playerController
    );

    activeEnemies.push(wyvern);
  }

  /** Get current zone */
  public getCurrentZone(): ZoneDefinition {
    return this.currentZone;
  }
}
