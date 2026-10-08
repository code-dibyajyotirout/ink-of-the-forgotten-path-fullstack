import * as THREE from "three";

export type ColliderType = "cylinder" | "box" | "sphere";

export interface Collider {
  id: string;
  type: ColliderType;
  position: THREE.Vector3;
  radius?: number;      // For cylinder and sphere
  height?: number;      // For cylinder
  halfSize?: THREE.Vector3; // For box (width/2, height/2, depth/2)
  walkable?: boolean;   // Whether the top surface is walkable
}

export interface WalkableSurface {
  id: string;
  type: "box" | "circle";
  surfaceY: number;
  // Box surface bounds
  minX?: number;
  maxX?: number;
  minZ?: number;
  maxZ?: number;
  // Circle surface bounds
  cx?: number;
  cz?: number;
  radius?: number;
}

export class CollisionSystem {
  private colliders: Collider[] = [];
  private walkableSurfaces: WalkableSurface[] = [];
  private raycastMeshes: THREE.Object3D[] = [];
  private static raycaster: THREE.Raycaster = new THREE.Raycaster();
  private static rayOrigin: THREE.Vector3 = new THREE.Vector3();
  private static rayDir: THREE.Vector3 = new THREE.Vector3(0, -1, 0);

  /**
   * Register a 3D model or mesh hierarchy for dynamic ground raycasting.
   */
  addRaycastMesh(object: THREE.Object3D): void {
    this.raycastMeshes.push(object);
  }

  /**
   * Clear raycast meshes.
   */
  clearRaycastMeshes(): void {
    this.raycastMeshes = [];
  }

  /**
   * Add a static collider to the system.
   */
  addCollider(collider: Collider): void {
    this.colliders.push(collider);

    // If collider is marked walkable, automatically register its top as a walkable surface
    if (collider.walkable) {
      if (collider.type === "box" && collider.halfSize) {
        this.addWalkableSurface({
          id: `${collider.id}_surface`,
          type: "box",
          surfaceY: collider.position.y + collider.halfSize.y,
          minX: collider.position.x - collider.halfSize.x,
          maxX: collider.position.x + collider.halfSize.x,
          minZ: collider.position.z - collider.halfSize.z,
          maxZ: collider.position.z + collider.halfSize.z,
        });
      } else if (collider.type === "cylinder" && collider.radius && collider.height) {
        this.addWalkableSurface({
          id: `${collider.id}_surface`,
          type: "circle",
          surfaceY: collider.position.y + collider.height,
          cx: collider.position.x,
          cz: collider.position.z,
          radius: collider.radius,
        });
      }
    }
  }

  /**
   * Add an explicit walkable platform/roof surface.
   */
  addWalkableSurface(surface: WalkableSurface): void {
    this.walkableSurfaces.push(surface);
  }

  /**
   * Remove a specific collider by its ID, and any associated walkable surface.
   */
  removeCollider(id: string): boolean {
    const colIdx = this.colliders.findIndex((c) => c.id === id);
    if (colIdx !== -1) {
      this.colliders.splice(colIdx, 1);
      const surfIdx = this.walkableSurfaces.findIndex((s) => s.id === `${id}_surface` || s.id === id);
      if (surfIdx !== -1) {
        this.walkableSurfaces.splice(surfIdx, 1);
      }
      return true;
    }
    return false;
  }

  /**
   * Remove all colliders and surfaces starting with the given prefix.
   * Useful for batch unloading chunk colliders (e.g. "chunk_3_-2_").
   */
  removeCollidersByPrefix(prefix: string): number {
    let removed = 0;
    for (let i = this.colliders.length - 1; i >= 0; i--) {
      if (this.colliders[i].id.startsWith(prefix)) {
        this.colliders.splice(i, 1);
        removed++;
      }
    }
    for (let i = this.walkableSurfaces.length - 1; i >= 0; i--) {
      if (this.walkableSurfaces[i].id.startsWith(prefix)) {
        this.walkableSurfaces.splice(i, 1);
      }
    }
    return removed;
  }

  /**
   * Clear all colliders and surfaces.
   */
  clear(): void {
    this.colliders = [];
    this.walkableSurfaces = [];
    this.raycastMeshes = [];
  }

  /**
   * Get all colliders.
   */
  getColliders(): Collider[] {
    return this.colliders;
  }

  /**
   * Query the highest walkable surface height at (x, z) that the entity can stand on.
   * @param x Entity X position
   * @param z Entity Z position
   * @param currentY Entity current Y position (feet level)
   * @param stepUpLimit Max upward tolerance for snapping onto a platform (default 0.85m)
   * @returns The highest ground/surface Y coordinate at or below currentY + stepUpLimit
   */
  getGroundHeight(x: number, z: number, currentY: number, stepUpLimit: number = 0.85): number {
    let highestY = 0; // Default ground plane elevation is 0

    for (const surface of this.walkableSurfaces) {
      let isInside = false;

      if (surface.type === "box") {
        if (
          surface.minX !== undefined &&
          surface.maxX !== undefined &&
          surface.minZ !== undefined &&
          surface.maxZ !== undefined
        ) {
          isInside =
            x >= surface.minX &&
            x <= surface.maxX &&
            z >= surface.minZ &&
            z <= surface.maxZ;
        }
      } else if (surface.type === "circle") {
        if (
          surface.cx !== undefined &&
          surface.cz !== undefined &&
          surface.radius !== undefined
        ) {
          const dx = x - surface.cx;
          const dz = z - surface.cz;
          isInside = dx * dx + dz * dz <= surface.radius * surface.radius;
        }
      }

      if (isInside) {
        // Player is horizontally within this solid walkable surface (e.g. island plateau or arena floor).
        // If entity is above the surface OR beneath it, treat this surface as solid ground so the entity is safely elevated rather than trapped underneath
        const recoveryTolerance = 150.0;
        if (currentY >= surface.surfaceY - Math.max(stepUpLimit, recoveryTolerance)) {
          if (surface.surfaceY > highestY) {
            highestY = surface.surfaceY;
          }
        }
      }
    }

    // Dynamic raycast across imported 3D world meshes
    if (this.raycastMeshes.length > 0) {
      CollisionSystem.rayOrigin.set(x, currentY + stepUpLimit + 1.5, z);
      CollisionSystem.raycaster.set(CollisionSystem.rayOrigin, CollisionSystem.rayDir);
      CollisionSystem.raycaster.far = stepUpLimit + 80.0;
      const hits = CollisionSystem.raycaster.intersectObjects(this.raycastMeshes, true);
      for (const hit of hits) {
        if (hit.point.y <= currentY + stepUpLimit && hit.point.y > highestY) {
          highestY = hit.point.y;
        }
      }
    }

    return highestY;
  }

  /**
   * Check if an entity is currently colliding with or directly next to a vertical wall
   * (used for Where Winds Meet Wall Kick / Rebound leaps).
   */
  isNearWall(position: THREE.Vector3, radius: number): { near: boolean; normal?: THREE.Vector3 } {
    for (const col of this.colliders) {
      if (col.type === "cylinder") {
        const colRadius = col.radius || 1;
        const dx = position.x - col.position.x;
        const dz = position.z - col.position.z;
        const distSq = dx * dx + dz * dz;
        const wallDist = colRadius + radius + 0.35;

        if (distSq < wallDist * wallDist) {
          const colHeight = col.height || 10;
          const yMin = col.position.y;
          const yMax = col.position.y + colHeight;
          if (position.y >= yMin && position.y <= yMax) {
            const dist = Math.sqrt(distSq);
            return {
              near: true,
              normal: new THREE.Vector3(dx / dist, 0, dz / dist),
            };
          }
        }
      } else if (col.type === "box") {
        const half = col.halfSize || new THREE.Vector3(1, 1, 1);
        const yMin = col.position.y - half.y;
        const yMax = col.position.y + half.y;

        // Only consider if vertically within wall height
        if (position.y >= yMin && position.y < yMax - 0.2) {
          const closestX = Math.max(col.position.x - half.x, Math.min(position.x, col.position.x + half.x));
          const closestZ = Math.max(col.position.z - half.z, Math.min(position.z, col.position.z + half.z));
          const dx = position.x - closestX;
          const dz = position.z - closestZ;
          const distSq = dx * dx + dz * dz;

          if (distSq < (radius + 0.35) * (radius + 0.35)) {
            const normal = new THREE.Vector3(dx, 0, dz);
            if (normal.lengthSq() > 0.0001) {
              normal.normalize();
              return { near: true, normal };
            }
          }
        }
      }
    }
    return { near: false };
  }

  /**
   * Resolve collision for a moving entity (sphere/cylinder representation).
   * Modifies the input position vector directly if a collision occurs.
   * Preserves vertical freedom when standing on or jumping over walkable tops.
   * @param position Current position of the entity (e.g. player)
   * @param radius Radius of the entity
   * @returns True if a collision was resolved
   */
  resolveCollision(position: THREE.Vector3, radius: number): boolean {
    let resolved = false;

    for (const col of this.colliders) {
      if (col.type === "cylinder") {
        const colRadius = col.radius || 1;
        const colHeight = col.height || 10;
        const yMin = col.position.y;
        const yMax = col.position.y + colHeight;

        // If player is on top of or above this cylinder, do not push horizontally
        if (position.y >= yMax - 0.15) {
          continue;
        }

        // 2D distance on XZ plane
        const dx = position.x - col.position.x;
        const dz = position.z - col.position.z;
        const distSq = dx * dx + dz * dz;
        const minDist = colRadius + radius;
        const minDistSq = minDist * minDist;

        if (distSq < minDistSq) {
          if (position.y >= yMin - 1 && position.y < yMax) {
            // Collision on XZ plane
            const dist = Math.sqrt(distSq);
            if (dist > 0.001) {
              const overlap = minDist - dist;
              position.x += (dx / dist) * overlap;
              position.z += (dz / dist) * overlap;
              resolved = true;
            }
          }
        }
      } else if (col.type === "sphere") {
        const colRadius = col.radius || 1;
        const dist = position.distanceTo(col.position);
        const minDist = colRadius + radius;

        if (dist < minDist) {
          const overlap = minDist - dist;
          const dir = new THREE.Vector3().subVectors(position, col.position).normalize();
          position.addScaledVector(dir, overlap);
          resolved = true;
        }
      } else if (col.type === "box") {
        const half = col.halfSize || new THREE.Vector3(1, 1, 1);
        const boxTop = col.position.y + half.y;

        // If player's feet are at or above the top surface of the box, don't push horizontally
        if (position.y >= boxTop - 0.2) {
          continue;
        }

        // AABB vs Sphere collision resolution on XZ with vertical bounds
        const yMin = col.position.y - half.y;
        const yMax = col.position.y + half.y;

        if (position.y + 0.2 < yMin || position.y > yMax) {
          continue;
        }

        // Find closest point on AABB in XZ plane
        const closestX = Math.max(col.position.x - half.x, Math.min(position.x, col.position.x + half.x));
        const closestZ = Math.max(col.position.z - half.z, Math.min(position.z, col.position.z + half.z));

        const dx = position.x - closestX;
        const dz = position.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const overlap = radius - dist;
            position.x += (dx / dist) * overlap;
            position.z += (dz / dist) * overlap;
            resolved = true;
          } else {
            // Inside box, push out along smallest horizontal axis
            const ox = half.x - Math.abs(position.x - col.position.x);
            const oz = half.z - Math.abs(position.z - col.position.z);
            if (ox < oz) {
              position.x += position.x > col.position.x ? ox + radius : -ox - radius;
            } else {
              position.z += position.z > col.position.z ? oz + radius : -oz - radius;
            }
            resolved = true;
          }
        }
      }
    }

    return resolved;
  }
}
