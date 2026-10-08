import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CollisionSystem } from "../physics/CollisionSystem";

export interface LoadedWorldResult {
  rootGroup: THREE.Group;
  collisionWorld?: THREE.Group;
  dragonStatue?: THREE.Group;
  customWorld?: THREE.Group;
}

/**
 * GLTFWorldLoader
 * Loads open-source 3D models and environments (.glb / .gltf) directly into the game.
 * Automatically wires shadow maps, wuxia materials, and dynamic raycasting collision
 * so players can walk, jump, and Qinggong all over imported 3D structures.
 */
export class GLTFWorldLoader {
  private static loader: GLTFLoader = new GLTFLoader();

  /**
   * Load open-source 3D world assets and integrate them into the scene.
   */
  static async load(scene: THREE.Scene, collisions: CollisionSystem): Promise<LoadedWorldResult> {
    const rootGroup = new THREE.Group();
    rootGroup.name = "OpenSource3DWorldRoot";
    scene.add(rootGroup);

    const result: LoadedWorldResult = { rootGroup };

    // 1. Attempt to load official 3D Platforming Sector (collision-world.glb)
    try {
      const collisionWorld = await this.loadModel("/models/collision-world.glb");
      if (collisionWorld) {
        // Position on the Western Terraces plateau (x ≈ -58, z ≈ -58)
        collisionWorld.position.set(-56, 0.2, -56);
        collisionWorld.scale.set(3.2, 3.2, 3.2);

        // Enhance materials with dark ink stone and slate finish
        collisionWorld.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.material) {
              const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
              if (mat.isMeshStandardMaterial) {
                mat.roughness = 0.85;
                mat.metalness = 0.15;
              }
            }
            // Register mesh for instant ground snapping & platforming
            collisions.addRaycastMesh(mesh);
          }
        });

        // Add a decorative stone marker lantern arch at the entrance of the 3D sector
        const markerGeo = new THREE.CylinderGeometry(0.3, 0.4, 3.5, 8);
        const markerMat = new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.8 });
        const markerPillar = new THREE.Mesh(markerGeo, markerMat);
        markerPillar.position.set(-42, 1.75, -42);
        markerPillar.castShadow = true;
        rootGroup.add(markerPillar);

        rootGroup.add(collisionWorld);
        result.collisionWorld = collisionWorld;
      }
    } catch (e) {
      console.warn("Notice: collision-world.glb could not be loaded:", e);
    }

    // 2. Attempt to load Majestic Ancient 3D Dragon Statue (dragon.glb)
    try {
      const dragon = await this.loadModel("/models/dragon.glb");
      if (dragon) {
        // Place atop the Celestial Hermit's Cloud-Peak Altar at (-44, 10.5, -32)
        dragon.position.set(-44, 10.8, -32);
        dragon.scale.set(1.4, 1.4, 1.4);
        dragon.rotation.y = Math.PI * 0.25;

        // Apply authentic wuxia Imperial Jade & Antiqued Bronze finish
        dragon.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            mesh.material = new THREE.MeshStandardMaterial({
              color: 0x2d6a4f,        // Imperial Dark Jade Green
              roughness: 0.35,
              metalness: 0.4,
              emissive: 0x064e3b,     // Subtle inner jade glow
              emissiveIntensity: 0.25,
            });

            collisions.addRaycastMesh(mesh);
          }
        });

        // Dragon guardian aura light
        const dragonLight = new THREE.PointLight(0x34d399, 1.8, 14);
        dragonLight.position.set(-44, 13.0, -32);
        rootGroup.add(dragonLight);

        rootGroup.add(dragon);
        result.dragonStatue = dragon;
      }
    } catch (e) {
      console.warn("Notice: dragon.glb could not be loaded:", e);
    }

    // 3. Attempt to load any user-provided custom world at /models/world.glb
    try {
      const customWorld = await this.loadModel("/models/world.glb");
      if (customWorld) {
        customWorld.position.set(0, 0, 0);
        customWorld.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            collisions.addRaycastMesh(mesh);
          }
        });
        rootGroup.add(customWorld);
        result.customWorld = customWorld;
      }
    } catch {
      // world.glb is optional
    }

    return result;
  }

  /**
   * Helper promise wrapper for GLTFLoader.
   */
  private static loadModel(url: string): Promise<THREE.Group | null> {
    return new Promise((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          resolve(gltf.scene);
        },
        undefined,
        (err) => {
          resolve(null);
        }
      );
    });
  }
}
