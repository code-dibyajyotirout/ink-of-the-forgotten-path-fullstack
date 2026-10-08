/**
 * InkSlashMesh — Dynamic 3D Calligraphic Blade Arc & Ribbon System.
 * Spawns sweeping brush stroke meshes following weapon arcs and stance techniques.
 */
import * as THREE from "three";

export interface SlashOptions {
  position: THREE.Vector3;
  direction: THREE.Vector3; // Facing vector of player
  radius?: number;          // Arc sweep radius (default ~1.8m)
  arcAngle?: number;        // Total arc sweep in radians (default ~2.2 rad)
  startAngle?: number;      // Initial angle offset (default ~-1.1 rad)
  heightOffset?: number;    // Vertical offset relative to position
  width?: number;           // Ribbon thickness (default ~0.6m)
  duration?: number;        // Fade out duration in seconds (default ~0.3s)
  color?: THREE.Color;      // Stance / Skill slash color
  verticalCurve?: number;   // Upward/downward slash slant (-1 to 1)
  isHeavy?: boolean;        // Thicker, multi-layered heavy slash
}

export class InkSlashInstance {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  geometry: THREE.BufferGeometry;
  life: number;
  maxLife: number;
  isDead: boolean = false;

  constructor(options: SlashOptions) {
    const {
      position,
      direction,
      radius = 1.8,
      arcAngle = Math.PI * 0.7,
      startAngle = -Math.PI * 0.35,
      heightOffset = 1.0,
      width = 0.6,
      duration = 0.35,
      color = new THREE.Color(0x111111),
      verticalCurve = 0,
      isHeavy = false,
    } = options;

    this.life = duration;
    this.maxLife = duration;

    // Calculate facing angle in XZ plane
    const baseAngle = Math.atan2(direction.x, direction.z);

    // Build curved ribbon geometry
    const segments = 16;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const effectiveWidth = isHeavy ? width * 1.5 : width;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 to 1 along arc
      const currentAngle = baseAngle + startAngle + t * arcAngle;

      // Calligraphic tapering: zero width at ends, maximum in middle
      const taper = Math.sin(t * Math.PI); 
      const currentWidth = effectiveWidth * (0.1 + taper * 0.9);

      // Radial vector
      const sinA = Math.sin(currentAngle);
      const cosA = Math.cos(currentAngle);

      const rInner = radius - currentWidth * 0.5;
      const rOuter = radius + currentWidth * 0.5;

      const vHeight = (t - 0.5) * verticalCurve;

      // Inner point
      const xIn = position.x + sinA * rInner;
      const yIn = position.y + heightOffset - currentWidth * 0.3 + vHeight;
      const zIn = position.z + cosA * rInner;

      // Outer point
      const xOut = position.x + sinA * rOuter;
      const yOut = position.y + heightOffset + currentWidth * 0.3 + vHeight;
      const zOut = position.z + cosA * rOuter;

      vertices.push(xIn, yIn, zIn);
      vertices.push(xOut, yOut, zOut);

      uvs.push(t, 0);
      uvs.push(t, 1);

      // Calligraphic opacity taper
      const alpha = taper;
      colors.push(color.r, color.g, color.b, alpha);
      colors.push(color.r, color.g, color.b, alpha);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    this.geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    this.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
    this.geometry.setIndex(indices);

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  update(dt: number): void {
    if (this.isDead) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.life = 0;
      this.isDead = true;
      return;
    }

    const progress = this.life / this.maxLife; // 1 down to 0
    this.material.opacity = Math.pow(progress, 1.5);

    // Expand ribbon slightly outwards as it fades
    const scale = 1.0 + (1.0 - progress) * 0.15;
    this.mesh.scale.set(scale, scale, scale);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class InkSlashManager {
  private slashes: InkSlashInstance[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawnSlash(options: SlashOptions): InkSlashInstance {
    const slash = new InkSlashInstance(options);
    this.scene.add(slash.mesh);
    this.slashes.push(slash);

    // If heavy, spawn a slightly larger lingering shadow trail behind it
    if (options.isHeavy) {
      const shadowOptions = {
        ...options,
        radius: (options.radius ?? 1.8) * 1.1,
        width: (options.width ?? 0.6) * 1.3,
        duration: (options.duration ?? 0.35) * 1.3,
        color: new THREE.Color(0x050505),
      };
      const shadowSlash = new InkSlashInstance(shadowOptions);
      this.scene.add(shadowSlash.mesh);
      this.slashes.push(shadowSlash);
    }

    return slash;
  }

  update(dt: number): void {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const slash = this.slashes[i];
      slash.update(dt);
      if (slash.isDead) {
        this.scene.remove(slash.mesh);
        slash.dispose();
        this.slashes.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const slash of this.slashes) {
      this.scene.remove(slash.mesh);
      slash.dispose();
    }
    this.slashes = [];
  }

  get count(): number {
    return this.slashes.length;
  }
}
