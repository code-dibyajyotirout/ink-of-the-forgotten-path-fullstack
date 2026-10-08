/**
 * InkParticleSystem — GPU-efficient particle system & advanced battle VFX for ink brush aesthetic.
 * Used for attack trails, qi shockwaves, ambient specks, hit impacts, ground splatters, and lightning arcs.
 */
import * as THREE from "three";

export interface InkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
  color: THREE.Color;
}

export interface InkBurstOptions {
  position: THREE.Vector3;
  count: number;
  speed: number;
  life: number;
  size: number;
  direction?: THREE.Vector3;
  spread?: number;
  color?: THREE.Color;
}

export interface ShockwaveOptions {
  position: THREE.Vector3;
  maxRadius: number;
  duration?: number;
  color?: THREE.Color;
  lineWidth?: number;
}

export interface QiLightningOptions {
  start: THREE.Vector3;
  end: THREE.Vector3;
  segments?: number;
  color?: THREE.Color;
  duration?: number;
}

export interface GroundSplatterOptions {
  position: THREE.Vector3;
  radius: number;
  color?: THREE.Color;
  duration?: number;
}

const MAX_PARTICLES = 3000;

export class InkParticleSystem {
  private particles: InkParticle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private sizes: Float32Array;
  private opacities: Float32Array;
  private colors: Float32Array;

  // Active 3D Visual Mesh Objects (Shockwaves, Splatters, Lightning)
  private shockwaves: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; geo: THREE.BufferGeometry; life: number; maxLife: number; maxRadius: number }[] = [];
  private splatters: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; geo: THREE.BufferGeometry; life: number; maxLife: number }[] = [];
  private lightnings: { mesh: THREE.Line; mat: THREE.LineBasicMaterial; geo: THREE.BufferGeometry; life: number; maxLife: number }[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.opacities = new Float32Array(MAX_PARTICLES);
    this.colors = new Float32Array(MAX_PARTICLES * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute("opacity", new THREE.BufferAttribute(this.opacities, 1));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      vertexColors: true,
      map: this.createParticleTexture(),
      size: 0.15,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  private createParticleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
      grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
      grad.addColorStop(0.6, "rgba(240, 240, 240, 0.85)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, 16, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Emit a burst of ink particles.
   * Supports both options object and legacy (position, count, color) signatures.
   */
  emitBurst(optionsOrPos: InkBurstOptions | THREE.Vector3, count?: number, color?: THREE.Color): void {
    this.burst(optionsOrPos as any, count, color);
  }

  createShockwave(options: ShockwaveOptions): void {
    this.spawnShockwaveRing(options);
  }

  burst(optionsOrPos: InkBurstOptions | THREE.Vector3, maybeCount?: number, maybeColor?: THREE.Color): void {
    let options: InkBurstOptions;
    if (optionsOrPos instanceof THREE.Vector3 || (optionsOrPos && ('x' in (optionsOrPos as any)) && !('position' in (optionsOrPos as any)))) {
      options = {
        position: optionsOrPos as THREE.Vector3,
        count: maybeCount ?? 20,
        speed: 5,
        life: 0.4,
        size: 0.22,
        color: maybeColor ?? new THREE.Color(0x111111),
      };
    } else {
      options = optionsOrPos as InkBurstOptions;
    }

    if (!options || !options.position) return;
    const { position, count = 20, speed = 5, life = 0.4, size = 0.22, direction, spread = Math.PI, color = new THREE.Color(0x111111) } = options;

    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      let vel: THREE.Vector3;
      if (direction) {
        const theta = Math.random() * spread;
        const phi = Math.random() * Math.PI * 2;
        const randomDir = new THREE.Vector3(
          Math.sin(theta) * Math.cos(phi),
          Math.sin(theta) * Math.sin(phi),
          Math.cos(theta)
        );
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          direction.clone().normalize()
        );
        vel = randomDir.applyQuaternion(quat).multiplyScalar(speed * (0.5 + Math.random() * 0.5));
      } else {
        vel = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(speed * (0.3 + Math.random() * 0.7));
      }

      this.particles.push({
        position: position.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
          )
        ),
        velocity: vel,
        life: life * (0.7 + Math.random() * 0.3),
        maxLife: life,
        size: size * (0.5 + Math.random() * 0.5),
        opacity: 1.0,
        color: color.clone(),
      });
    }
  }

  /**
   * Emit ambient floating ink specks.
   */
  emitAmbient(center: THREE.Vector3, radiusOrCount: number = 1.0, countOrRadius: number = 1): void {
    let radius = radiusOrCount;
    let count = countOrRadius;
    if (radiusOrCount < 1.0 && countOrRadius >= 1.0) {
      radius = radiusOrCount;
      count = Math.max(1, Math.round(countOrRadius));
    } else if (countOrRadius < 1.0 && radiusOrCount >= 1.0) {
      radius = countOrRadius;
      count = Math.max(1, Math.round(radiusOrCount));
    } else {
      count = Math.max(1, Math.round(countOrRadius));
    }

    for (let i = 0; i < count; i++) {
      const pos = center.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * radius * 2,
          Math.random() * radius,
          (Math.random() - 0.5) * radius * 2
        )
      );

      this.burst({
        position: pos,
        count: 1,
        speed: 0.2,
        life: 3 + Math.random() * 2,
        size: 0.05 + Math.random() * 0.1,
        direction: new THREE.Vector3(0, 1, 0),
        spread: Math.PI * 0.5,
        color: new THREE.Color(0x222222),
      });
    }
  }

  /**
   * Spawn a expanding 3D ring shockwave.
   */
  spawnShockwaveRing(options: ShockwaveOptions): void {
    const { position, maxRadius, duration = 0.4, color = new THREE.Color(0x111111) } = options;
    
    const geo = new THREE.RingGeometry(0.01, 0.05, 32);
    geo.rotateX(-Math.PI / 2); // Flat on ground XZ

    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.05; // Slightly above ground
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      mat,
      geo,
      life: duration,
      maxLife: duration,
      maxRadius,
    });
  }

  /**
   * Spawn a flat calligraphic ground splatter stain.
   */
  spawnInkSplatter(options: GroundSplatterOptions): void {
    const { position, radius, color = new THREE.Color(0x0a0a0a), duration = 2.0 } = options;

    const geo = new THREE.CircleGeometry(radius, 16);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.02; // Ground height
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(mesh);

    this.splatters.push({
      mesh,
      mat,
      geo,
      life: duration,
      maxLife: duration,
    });
  }

  /**
   * Spawn dynamic calligraphic qi lightning between two points.
   */
  spawnQiLightning(options: QiLightningOptions): void {
    const { start, end, segments = 5, color = new THREE.Color(0x33ffff), duration = 0.15 } = options;

    const points: THREE.Vector3[] = [];
    const dir = end.clone().sub(start);
    const len = dir.length();

    points.push(start.clone());
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const mid = start.clone().add(dir.clone().multiplyScalar(t));
      mid.add(new THREE.Vector3(
        (Math.random() - 0.5) * len * 0.25,
        (Math.random() - 0.5) * len * 0.25,
        (Math.random() - 0.5) * len * 0.25
      ));
      points.push(mid);
    }
    points.push(end.clone());

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 1.0,
    });

    const mesh = new THREE.Line(geo, mat);
    this.scene.add(mesh);

    this.lightnings.push({
      mesh,
      mat,
      geo,
      life: duration,
      maxLife: duration,
    });
  }

  /**
   * Spawn a spectacular Perfect Parry burst (Shockwave + Radial Ink Sparks + Metallic Sparkle).
   */
  spawnParryBurst(position: THREE.Vector3, color: THREE.Color = new THREE.Color(0x00ffff)): void {
    // 1. High speed expanding shockwave ring
    this.spawnShockwaveRing({
      position,
      maxRadius: 4.5,
      duration: 0.35,
      color,
    });

    // 2. Multi-directional calligraphic ink burst
    this.burst({
      position,
      count: 35,
      speed: 6.0,
      life: 0.5,
      size: 0.25,
      color,
    });

    // 3. Bright metallic white sparks
    this.burst({
      position,
      count: 20,
      speed: 9.0,
      life: 0.3,
      size: 0.15,
      color: new THREE.Color(0xffffff),
    });

    // 4. Ground splatter
    this.spawnInkSplatter({
      position,
      radius: 1.2,
      color: new THREE.Color(0x050505),
      duration: 1.5,
    });
  }

  /**
   * Spawn Ultimate Qi Vortex (Concentric spinning ink particles).
   */
  spawnUltimateVortex(center: THREE.Vector3, color: THREE.Color): void {
    const count = 60;
    const radius = 3.5;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const pos = center.clone().add(new THREE.Vector3(Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius));
      const tangent = new THREE.Vector3(-Math.sin(angle), 0.5, Math.cos(angle)).multiplyScalar(4.0);

      this.burst({
        position: pos,
        count: 1,
        speed: 4.0,
        life: 0.6,
        size: 0.3,
        direction: tangent,
        color,
      });
    }

    this.spawnShockwaveRing({
      position: center,
      maxRadius: 6.0,
      duration: 0.5,
      color,
    });
  }

  /**
   * Update all active particles and 3D visual elements — call every frame.
   */
  update(dt: number): void {
    // 1. Update Point Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics (zero GC)
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.multiplyScalar(0.96); // Drag
      p.velocity.y -= 0.5 * dt; // Gravity

      // Fade out
      const lifeRatio = p.life / p.maxLife;
      p.opacity = lifeRatio * lifeRatio;
    }

    // Write active particles to GPU buffers (zero redundant iterations)
    const activeCount = Math.min(this.particles.length, MAX_PARTICLES);
    for (let i = 0; i < activeCount; i++) {
      const p = this.particles[i];
      const i3 = i * 3;
      this.positions[i3] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;
      this.sizes[i] = p.size * p.opacity;
      this.opacities[i] = p.opacity;

      this.colors[i3] = p.color.r;
      this.colors[i3 + 1] = p.color.g;
      this.colors[i3 + 2] = p.color.b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.opacity.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, activeCount);

    // 2. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        sw.geo.dispose();
        sw.mat.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = 1.0 - sw.life / sw.maxLife; // 0 to 1
      const currentRadius = progress * sw.maxRadius;
      sw.mesh.scale.set(currentRadius, currentRadius, 1);
      sw.mat.opacity = (1.0 - progress) * (1.0 - progress);
    }

    // 3. Update Ground Splatters
    for (let i = this.splatters.length - 1; i >= 0; i--) {
      const sp = this.splatters[i];
      sp.life -= dt;
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.geo.dispose();
        sp.mat.dispose();
        this.splatters.splice(i, 1);
        continue;
      }
      const progress = sp.life / sp.maxLife;
      sp.mat.opacity = progress * 0.8;
    }

    // 4. Update Lightnings
    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      const lt = this.lightnings[i];
      lt.life -= dt;
      if (lt.life <= 0) {
        this.scene.remove(lt.mesh);
        lt.geo.dispose();
        lt.mat.dispose();
        this.lightnings.splice(i, 1);
        continue;
      }
      const progress = lt.life / lt.maxLife;
      lt.mat.opacity = progress;
    }
  }

  get particleCount(): number {
    return this.particles.length;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    for (const sw of this.shockwaves) {
      this.scene.remove(sw.mesh);
      sw.geo.dispose();
      sw.mat.dispose();
    }
    for (const sp of this.splatters) {
      this.scene.remove(sp.mesh);
      sp.geo.dispose();
      sp.mat.dispose();
    }
    for (const lt of this.lightnings) {
      this.scene.remove(lt.mesh);
      lt.geo.dispose();
      lt.mat.dispose();
    }
    this.shockwaves = [];
    this.splatters = [];
    this.lightnings = [];
  }
}
