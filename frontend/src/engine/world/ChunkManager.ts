import * as THREE from "three";
import { CollisionSystem } from "../physics/CollisionSystem";

export interface ChunkFeature {
  mesh: THREE.Object3D;
  colliderIds: string[];
}

export interface ChunkData {
  key: string;
  cx: number;
  cz: number;
  worldX: number;
  worldZ: number;
  group: THREE.Group;
  colliderIds: string[];
}

/**
 * ChunkManager — Procedural 600m × 600m chunk streaming for the 12,000m Drowned Epoch world.
 *
 * Dynamically streams zone-specific terrain, ruins, volcanic chimneys, and abyssal spires
 * around the player, maintaining high visual density with memory-safe disposal.
 *
 * Zones mapped:
 * - 0 - 500m: Tidewalker Remnant (Home island center, clear waters)
 * - 500 - 2,000m: Scattered Reefs (Coral shallows, submerged pagodas, fishing platforms)
 * - 2,000 - 4,500m: Sunken Archive & Chained Isles (Marble colonnades, massive iron chains, dragon ribcages)
 * - 4,500 - 7,500m: The Volcanic Foundry (Basalt stacks, smoldering magma chimneys, cage barges)
 * - 7,500m+: Abyssal Trench & The Black Spire (140m obsidian needles, abyssal violet crystals)
 */
export class ChunkManager {
  public static readonly CHUNK_SIZE = 600.0;
  public static readonly CHUNK_RADIUS = 1; // 3x3 grid = 9 active chunks (optimized for high FPS, 64% fewer chunks)

  private activeChunks: Map<string, ChunkData> = new Map();
  private pendingLoadQueue: { cx: number; cz: number; key: string; distSq: number }[] = [];
  private lastPlayerChunkX: number = 999999;
  private lastPlayerChunkZ: number = 999999;

  // Shared material pool for high performance
  private materials!: {
    coral: THREE.MeshStandardMaterial;
    driftwood: THREE.MeshStandardMaterial;
    marble: THREE.MeshStandardMaterial;
    ironChain: THREE.MeshStandardMaterial;
    dragonBone: THREE.MeshStandardMaterial;
    basalt: THREE.MeshStandardMaterial;
    magma: THREE.MeshStandardMaterial;
    obsidianNeedle: THREE.MeshStandardMaterial;
    abyssalCrystal: THREE.MeshStandardMaterial;
  };

  constructor(
    private scene: THREE.Scene,
    private collisions: CollisionSystem
  ) {
    this.initMaterialPool();
  }

  private initMaterialPool(): void {
    this.materials = {
      coral: new THREE.MeshStandardMaterial({
        color: 0x0d9488,
        roughness: 0.7,
        metalness: 0.15,
        emissive: 0x115e59,
        emissiveIntensity: 0.1,
      }),
      driftwood: new THREE.MeshStandardMaterial({
        color: 0x5c4033,
        roughness: 0.85,
        metalness: 0.05,
      }),
      marble: new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.45,
        metalness: 0.25,
      }),
      ironChain: new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.6,
        metalness: 0.85,
      }),
      dragonBone: new THREE.MeshStandardMaterial({
        color: 0xf5f5f4,
        roughness: 0.35,
        metalness: 0.1,
      }),
      basalt: new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        roughness: 0.9,
        metalness: 0.1,
      }),
      magma: new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.3,
        metalness: 0.6,
        emissive: 0xf97316,
        emissiveIntensity: 0.85,
      }),
      obsidianNeedle: new THREE.MeshStandardMaterial({
        color: 0x09090b,
        roughness: 0.2,
        metalness: 0.9,
      }),
      abyssalCrystal: new THREE.MeshStandardMaterial({
        color: 0x7c3aed,
        roughness: 0.25,
        metalness: 0.5,
        emissive: 0xa855f7,
        emissiveIntensity: 0.6,
      }),
    };
  }

  /**
   * Update chunk streaming based on player position.
   * Staggers chunk generation (max 2 per frame) to maintain a rock-solid 60 FPS.
   */
  public update(playerPos: THREE.Vector3): void {
    const pcx = Math.floor((playerPos.x + ChunkManager.CHUNK_SIZE / 2) / ChunkManager.CHUNK_SIZE);
    const pcz = Math.floor((playerPos.z + ChunkManager.CHUNK_SIZE / 2) / ChunkManager.CHUNK_SIZE);

    if (pcx !== this.lastPlayerChunkX || pcz !== this.lastPlayerChunkZ) {
      this.lastPlayerChunkX = pcx;
      this.lastPlayerChunkZ = pcz;

      const neededKeys = new Set<string>();

      for (let dx = -ChunkManager.CHUNK_RADIUS; dx <= ChunkManager.CHUNK_RADIUS; dx++) {
        for (let dz = -ChunkManager.CHUNK_RADIUS; dz <= ChunkManager.CHUNK_RADIUS; dz++) {
          const cx = pcx + dx;
          const cz = pcz + dz;
          const key = `${cx}_${cz}`;
          neededKeys.add(key);

          if (!this.activeChunks.has(key) && !this.pendingLoadQueue.some((item) => item.key === key)) {
            const distSq = dx * dx + dz * dz;
            this.pendingLoadQueue.push({ cx, cz, key, distSq });
          }
        }
      }

      // Sort pending queue by distance: closest chunks load first
      this.pendingLoadQueue.sort((a, b) => a.distSq - b.distSq);

      // Unload distant chunks
      for (const [key, chunk] of this.activeChunks.entries()) {
        if (!neededKeys.has(key)) {
          this.unloadChunk(chunk);
          this.activeChunks.delete(key);
        }
      }

      // Filter out any pending chunks no longer needed
      this.pendingLoadQueue = this.pendingLoadQueue.filter((item) => neededKeys.has(item.key));
    }

    // Progressively load up to 2 queued chunks per tick
    let processed = 0;
    while (this.pendingLoadQueue.length > 0 && processed < 2) {
      const next = this.pendingLoadQueue.shift()!;
      if (!this.activeChunks.has(next.key)) {
        this.loadChunk(next.cx, next.cz, next.key);
        processed++;
      }
    }
  }

  /**
   * Generate and mount a new chunk.
   */
  private loadChunk(cx: number, cz: number, key: string): void {
    const worldX = cx * ChunkManager.CHUNK_SIZE;
    const worldZ = cz * ChunkManager.CHUNK_SIZE;
    const distFromOrigin = Math.hypot(worldX, worldZ);

    const group = new THREE.Group();
    group.name = `Chunk_${key}`;
    group.position.set(worldX, 0, worldZ);

    const colliderIds: string[] = [];

    // Skip home island chunk center (cx=0, cz=0) and fishing village outpost area to preserve static models
    const isHomeChunk = cx === 0 && cz === 0;
    const isOutpostChunk = Math.abs(worldX - 750) < 350 && Math.abs(worldZ - 450) < 350;

    if (!isHomeChunk && !isOutpostChunk) {
      // Deterministic seed for reproducible procedural generation
      const seed = this.hashCoord(cx, cz);

      if (distFromOrigin >= 500 && distFromOrigin < 2000) {
        // ── Zone 1: Scattered Reefs ──
        this.buildReefFeatures(group, seed, cx, cz, colliderIds);
      } else if (distFromOrigin >= 2000 && distFromOrigin < 4500) {
        // ── Zone 2: Sunken Archive & Chained Isles ──
        this.buildArchiveFeatures(group, seed, cx, cz, colliderIds);
      } else if (distFromOrigin >= 4500 && distFromOrigin < 7500) {
        // ── Zone 3: The Volcanic Foundry ──
        this.buildFoundryFeatures(group, seed, cx, cz, colliderIds);
      } else if (distFromOrigin >= 7500) {
        // ── Zone 4: Abyssal Trench & The Black Spire ──
        this.buildAbyssalFeatures(group, seed, cx, cz, colliderIds);
      }
    }

    this.scene.add(group);

    this.activeChunks.set(key, {
      key,
      cx,
      cz,
      worldX,
      worldZ,
      group,
      colliderIds,
    });
  }

  /**
   * Unload chunk: remove colliders, dispose geometries, and detach from scene.
   */
  private unloadChunk(chunk: ChunkData): void {
    // Remove colliders registered by this chunk
    this.collisions.removeCollidersByPrefix(`chunk_${chunk.cx}_${chunk.cz}_`);

    // Detach and clean up meshes
    this.scene.remove(chunk.group);

    chunk.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
      } else if (obj instanceof THREE.PointLight) {
        obj.dispose?.();
      }
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // ZONE-SPECIFIC PROCEDURAL FEATURE BUILDERS
  // ═════════════════════════════════════════════════════════════════

  /** Zone 1: Scattered Reefs — Coral atolls, sea arches, and stilted platforms */
  private buildReefFeatures(
    group: THREE.Group,
    seed: number,
    cx: number,
    cz: number,
    colliderIds: string[]
  ): void {
    const numReefs = 2 + (seed % 3);

    for (let i = 0; i < numReefs; i++) {
      const rx = ((seed * (i + 1) * 37) % 400) - 200;
      const rz = ((seed * (i + 2) * 59) % 400) - 200;
      const reefType = (seed + i) % 3;

      if (reefType === 0) {
        // Soaring Karst Mountain Pinnacle (Towering mountain crag)
        const peakHeight = 28 + (seed % 18);
        const peakRadius = 12 + (seed % 6);
        const peak = new THREE.Mesh(
          new THREE.CylinderGeometry(peakRadius * 0.7, peakRadius * 1.2, peakHeight, 8),
          this.materials.basalt
        );
        peak.position.set(rx, peakHeight / 2 - 2.0, rz);
        group.add(peak);

        // Walkable peak summit plateau
        const colId = `chunk_${cx}_${cz}_peak_${i}`;
        this.collisions.addCollider({
          id: colId,
          type: "cylinder",
          position: new THREE.Vector3(cx * ChunkManager.CHUNK_SIZE + rx, peakHeight - 2.0, cz * ChunkManager.CHUNK_SIZE + rz),
          radius: peakRadius * 0.7,
          height: 2.0,
          walkable: true,
        });
        colliderIds.push(colId);
      } else if (reefType === 1) {
        // Natural Sea Archway
        const archGroup = new THREE.Group();
        archGroup.position.set(rx, -1.0, rz);

        const pillar1 = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 16, 8), this.materials.coral);
        pillar1.position.set(-8, 7, 0);
        archGroup.add(pillar1);

        const pillar2 = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 16, 8), this.materials.coral);
        pillar2.position.set(8, 7, 0);
        archGroup.add(pillar2);

        const topSpan = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 5), this.materials.coral);
        topSpan.position.set(0, 15, 0);
        archGroup.add(topSpan);

        group.add(archGroup);

        const colId = `chunk_${cx}_${cz}_arch_${i}`;
        this.collisions.addCollider({
          id: colId,
          type: "box",
          position: new THREE.Vector3(cx * ChunkManager.CHUNK_SIZE + rx, 15.0, cz * ChunkManager.CHUNK_SIZE + rz),
          halfSize: new THREE.Vector3(10, 1.5, 2.5),
          walkable: true,
        });
        colliderIds.push(colId);
      } else {
        // Stilted Fishing Outpost Raft
        const raft = new THREE.Mesh(
          new THREE.BoxGeometry(10, 0.6, 10),
          this.materials.driftwood
        );
        raft.position.set(rx, 1.5, rz);
        group.add(raft);

        // Stilts into water
        for (const [sx, sz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
          const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 5), this.materials.driftwood);
          stilt.position.set(rx + sx, -1.0, rz + sz);
          group.add(stilt);
        }

        const colId = `chunk_${cx}_${cz}_raft_${i}`;
        this.collisions.addCollider({
          id: colId,
          type: "box",
          position: new THREE.Vector3(cx * ChunkManager.CHUNK_SIZE + rx, 1.8, cz * ChunkManager.CHUNK_SIZE + rz),
          halfSize: new THREE.Vector3(5, 0.3, 5),
          walkable: true,
        });
        colliderIds.push(colId);
      }
    }
  }

  /** Zone 2: Sunken Archive & Chained Isles — Marble pillars, massive chains, dragon skeletons */
  private buildArchiveFeatures(
    group: THREE.Group,
    seed: number,
    cx: number,
    cz: number,
    colliderIds: string[]
  ): void {
    const numStructures = 2 + (seed % 3);

    for (let i = 0; i < numStructures; i++) {
      const sx = ((seed * (i + 1) * 43) % 400) - 200;
      const sz = ((seed * (i + 2) * 67) % 400) - 200;
      const type = (seed + i) % 3;

      if (type === 0) {
        // High Mountain Sanctuary Colonnade atop Cliff Ridge
        const colGroup = new THREE.Group();
        const hillBaseHeight = 24.0;
        
        // Mountain rock base
        const hillBase = new THREE.Mesh(
          new THREE.CylinderGeometry(18, 22, hillBaseHeight, 8),
          this.materials.basalt
        );
        hillBase.position.set(0, hillBaseHeight / 2 - 2, 0);
        colGroup.add(hillBase);

        for (let p = 0; p < 4; p++) {
          const px = (p - 1.5) * 8;
          const pillarHeight = 16 + (seed % 6);
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(1.0, 1.2, pillarHeight, 8),
            this.materials.marble
          );
          pillar.position.set(px, hillBaseHeight + pillarHeight / 2 - 2, 0);
          colGroup.add(pillar);
        }

        // Architrave roof lintel
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(32, 2.0, 5), this.materials.marble);
        lintel.position.set(0, hillBaseHeight + 16, 0);
        colGroup.add(lintel);

        colGroup.position.set(sx, 0, sz);
        group.add(colGroup);

        const colId = `chunk_${cx}_${cz}_sanctuary_${i}`;
        this.collisions.addCollider({
          id: colId,
          type: "box",
          position: new THREE.Vector3(cx * ChunkManager.CHUNK_SIZE + sx, hillBaseHeight + 17.0, cz * ChunkManager.CHUNK_SIZE + sz),
          halfSize: new THREE.Vector3(16, 1.0, 2.5),
          walkable: true,
        });
        colliderIds.push(colId);
      } else if (type === 1) {
        // Massive Iron Chain Links draped across water
        const chainGroup = new THREE.Group();
        chainGroup.position.set(sx, 0, sz);

        for (let c = 0; c < 5; c++) {
          const link = new THREE.Mesh(
            new THREE.TorusGeometry(3.5, 0.9, 8, 16),
            this.materials.ironChain
          );
          link.position.set((c - 2) * 6.5, 4 + Math.sin(c) * 2, 0);
          link.rotation.x = c % 2 === 0 ? 0 : Math.PI / 2;
          chainGroup.add(link);
        }

        group.add(chainGroup);
      } else {
        // Ancient Wyrm Skeletal Ribcage breaching surface
        const ribGroup = new THREE.Group();
        ribGroup.position.set(sx, -2, sz);

        for (let r = 0; r < 5; r++) {
          const rib = new THREE.Mesh(
            new THREE.TorusGeometry(12, 0.8, 6, 16, Math.PI),
            this.materials.dragonBone
          );
          rib.rotation.z = Math.PI / 2;
          rib.position.set((r - 2) * 8, 4, 0);
          ribGroup.add(rib);
        }

        group.add(ribGroup);
      }
    }
  }

  /** Zone 3: Volcanic Foundry — Basalt stacks, smoking magma vents, cage barges */
  private buildFoundryFeatures(
    group: THREE.Group,
    seed: number,
    cx: number,
    cz: number,
    colliderIds: string[]
  ): void {
    const numFeatures = 3 + (seed % 3);

    for (let i = 0; i < numFeatures; i++) {
      const fx = ((seed * (i + 1) * 53) % 400) - 200;
      const fz = ((seed * (i + 2) * 71) % 400) - 200;
      const fType = (seed + i) % 2;

      if (fType === 0) {
        // Smoldering Volcanic Basalt Stack with Magma Vent
        const stackHeight = 35 + (seed % 25);
        const stack = new THREE.Mesh(
          new THREE.CylinderGeometry(8, 14, stackHeight, 7),
          this.materials.basalt
        );
        stack.position.set(fx, stackHeight / 2 - 4, fz);
        group.add(stack);

        // Magma crater on top
        const crater = new THREE.Mesh(
          new THREE.CylinderGeometry(6.5, 2, 2, 7),
          this.materials.magma
        );
        // Top rim
        crater.position.set(fx, stackHeight - 3.8, fz);
        group.add(crater);

        const colId = `chunk_${cx}_${cz}_basalt_${i}`;
        this.collisions.addCollider({
          id: colId,
          type: "cylinder",
          position: new THREE.Vector3(cx * ChunkManager.CHUNK_SIZE + fx, stackHeight - 4, cz * ChunkManager.CHUNK_SIZE + fz),
          radius: 8,
          height: 2.0,
          walkable: true,
        });
        colliderIds.push(colId);
      } else {
        // Industrial Ashscale Cage Barge
        const barge = new THREE.Mesh(
          new THREE.BoxGeometry(16, 2.5, 24),
          this.materials.basalt
        );
        barge.position.set(fx, 1.2, fz);
        group.add(barge);

        // Iron bars cage
        const cage = new THREE.Mesh(
          new THREE.BoxGeometry(14, 8, 20),
          new THREE.MeshBasicMaterial({ wireframe: true, color: 0x475569 })
        );
        cage.position.set(fx, 6.2, fz);
        group.add(cage);

        const colId = `chunk_${cx}_${cz}_barge_${i}`;
        this.collisions.addCollider({
          id: colId,
          type: "box",
          position: new THREE.Vector3(cx * ChunkManager.CHUNK_SIZE + fx, 2.5, cz * ChunkManager.CHUNK_SIZE + fz),
          halfSize: new THREE.Vector3(8, 1.25, 12),
          walkable: true,
        });
        colliderIds.push(colId);
      }
    }
  }

  /** Zone 4: Abyssal Trench & The Black Spire — Towering 140m obsidian needles, abyssal crystals */
  private buildAbyssalFeatures(
    group: THREE.Group,
    seed: number,
    cx: number,
    cz: number,
    colliderIds: string[]
  ): void {
    const numNeedles = 2 + (seed % 3);

    for (let i = 0; i < numNeedles; i++) {
      const nx = ((seed * (i + 1) * 61) % 400) - 200;
      const nz = ((seed * (i + 2) * 83) % 400) - 200;

      // Towering 100-140m Obsidian Needle
      const needleHeight = 100 + (seed % 45);
      const needle = new THREE.Mesh(
        new THREE.ConeGeometry(9, needleHeight, 5),
        this.materials.obsidianNeedle
      );
      needle.position.set(nx, needleHeight / 2 - 6, nz);
      needle.rotation.y = i * 1.2;
      group.add(needle);

      // Abyssal Violet Crystal cluster along the needle
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(4, 1),
        this.materials.abyssalCrystal
      );
      crystal.position.set(nx + 4, needleHeight * 0.45, nz + 4);
      crystal.scale.set(0.8, 2.5, 0.8);
      group.add(crystal);

      const colId = `chunk_${cx}_${cz}_needle_${i}`;
      this.collisions.addCollider({
        id: colId,
        type: "cylinder",
        position: new THREE.Vector3(cx * ChunkManager.CHUNK_SIZE + nx, 10.0, cz * ChunkManager.CHUNK_SIZE + nz),
        radius: 8.5,
        height: 12.0,
        walkable: true,
      });
      colliderIds.push(colId);
    }
  }

  /**
   * Deterministic pseudo-random 32-bit hash for coordinate.
   */
  private hashCoord(x: number, z: number): number {
    let h = (x * 374761393) ^ (z * 668265263);
    h = (h ^ (h >> 13)) * 1274126177;
    return Math.abs(h ^ (h >> 16));
  }

  /**
   * Dispose all active chunks on engine teardown.
   */
  public dispose(): void {
    this.pendingLoadQueue = [];
    for (const chunk of this.activeChunks.values()) {
      this.unloadChunk(chunk);
    }
    this.activeChunks.clear();

    for (const mat of Object.values(this.materials)) {
      mat.dispose();
    }
  }
}
