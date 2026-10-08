/**
 * DragonCombat — Dragon-mounted offensive combat system.
 *
 * Manages all combat capabilities while riding Veyros:
 * - Flame Breath (Hold Right Click): Continuous fire cone from dragon's mouth
 * - Fireball Projectile (Press Q): Arcing incendiary sphere
 * - Tail Swipe (passive close-range AoE)
 *
 * Flame charge is consumed by breath and fireballs, regenerates passively.
 */
import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "../audio/AudioManager";
import { EnemyAI } from "./EnemyAI";

// ── Fire particle shader ──
const FIRE_VERTEX = `
  attribute float aLife;
  attribute float aSize;
  varying float vLife;
  void main() {
    vLife = aLife;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (250.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FIRE_FRAGMENT = `
  varying float vLife;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, dist) * vLife;
    // Fire gradient: white-hot core → orange → red edge
    vec3 color = mix(
      vec3(1.0, 0.2, 0.05),  // Red
      vec3(1.0, 0.85, 0.3),  // Orange-yellow
      vLife * vLife
    );
    color = mix(color, vec3(1.0, 1.0, 0.9), smoothstep(0.3, 0.0, dist) * vLife); // White-hot core
    gl_FragColor = vec4(color, alpha * 0.85);
  }
`;

interface FireParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

interface Fireball {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  position: THREE.Vector3;
  life: number;
  trailTimer: number;
  isCharged: boolean;
}

export class DragonCombat {
  private scene: THREE.Scene;
  private particles: InkParticleSystem;

  // Flame breath system
  private isBreathing: boolean = false;
  private fireParticles: FireParticle[] = [];
  private fireGeometry: THREE.BufferGeometry;
  private fireMaterial: THREE.ShaderMaterial;
  private firePoints: THREE.Points;
  private readonly MAX_FIRE_PARTICLES = 400;

  // Flame charge management
  private readonly FLAME_DRAIN_RATE = 20; // per second while breathing
  private readonly FLAME_REGEN_RATE = 5;  // per second passive regen
  private readonly FIREBALL_COST = 12;

  // Fireball projectiles
  private fireballs: Fireball[] = [];
  private readonly FIREBALL_SPEED = 35;
  private readonly FIREBALL_GRAVITY = -8;
  private readonly FIREBALL_EXPLOSION_RADIUS = 5;
  private readonly FIREBALL_DAMAGE = 45;

  // Flame breath damage
  private readonly BREATH_DPS = 30;       // damage per second to enemies in cone
  private readonly BREATH_RANGE = 15;     // meters
  private readonly BREATH_ARC = Math.PI / 4; // 45° half-angle
  private breathDamageTimer: number = 0;

  // Charged Dive Bomb System
  private chargeTimer: number = 0;
  private isCharging: boolean = false;
  private readonly CHARGE_THRESHOLD = 1.0;   // seconds to fully charge
  private readonly CHARGED_FIREBALL_COST = 60;
  private readonly CHARGED_FIREBALL_DAMAGE = 112; // 2.5× normal
  private readonly CHARGED_EXPLOSION_RADIUS = 15; // 3× normal
  private chargeParticles: FireParticle[] = [];

  // Lock-on targeting
  private lockOnTarget: THREE.Object3D | null = null;

  // Speed-based damage scaling
  private currentSpeedTier: 'normal' | 'swift' | 'supersonic' = 'normal';

  // Static pre-allocated combat lights (no dynamic add/remove to prevent WebGL shader recompile stutter)
  private breathLight: THREE.PointLight;
  private explosionLight: THREE.PointLight;

  // Pooled geometries and materials (zero GC thrashing during rapid shooting)
  private normalFireballGeo: THREE.SphereGeometry;
  private normalFireballMat: THREE.MeshBasicMaterial;
  private chargedFireballGeo: THREE.SphereGeometry;
  private chargedFireballMat: THREE.MeshBasicMaterial;

  // Pre-allocated particle colors
  private readonly trailColorNormal = new THREE.Color(0xff6600);
  private readonly trailColorCharged = new THREE.Color(0xff2200);
  private readonly burstColorNormal = new THREE.Color(0xff4400);
  private readonly burstColorCharged = new THREE.Color(0xff1100);
  private readonly emberColor = new THREE.Color(0xffaa00);

  constructor(scene: THREE.Scene, particles: InkParticleSystem) {
    this.scene = scene;
    this.particles = particles;

    // ── Fire particle system (GPU points) ──
    const positions = new Float32Array(this.MAX_FIRE_PARTICLES * 3);
    const lives = new Float32Array(this.MAX_FIRE_PARTICLES);
    const sizes = new Float32Array(this.MAX_FIRE_PARTICLES);

    this.fireGeometry = new THREE.BufferGeometry();
    this.fireGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.fireGeometry.setAttribute("aLife", new THREE.BufferAttribute(lives, 1));
    this.fireGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    this.fireMaterial = new THREE.ShaderMaterial({
      vertexShader: FIRE_VERTEX,
      fragmentShader: FIRE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.firePoints = new THREE.Points(this.fireGeometry, this.fireMaterial);
    this.firePoints.frustumCulled = false;
    this.scene.add(this.firePoints);

    // Breath fire light (dynamic orange glow, static in scene graph)
    this.breathLight = new THREE.PointLight(0xff6600, 0, 20);
    this.breathLight.castShadow = false;
    this.scene.add(this.breathLight);

    // Pre-allocated explosion flash light (reused on impacts, never added/removed during game)
    this.explosionLight = new THREE.PointLight(0xff4400, 0, 30);
    this.explosionLight.castShadow = false;
    this.scene.add(this.explosionLight);

    // Pre-allocated shared fireball meshes
    this.normalFireballGeo = new THREE.SphereGeometry(0.65, 12, 10);
    this.normalFireballMat = new THREE.MeshBasicMaterial({
      color: 0xff8c00,
      transparent: true,
      opacity: 0.95,
    });
    this.chargedFireballGeo = new THREE.SphereGeometry(1.6, 16, 12);
    this.chargedFireballMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.98,
    });
  }

  /**
   * Start or stop flame breath.
   */
  public setBreathing(active: boolean): void {
    this.isBreathing = active;
    if (!active) {
      this.breathLight.intensity = 0;
    }
  }

  /**
   * Set the lock-on target for homing fireballs.
   */
  public setLockOnTarget(target: THREE.Object3D | null): void {
    this.lockOnTarget = target;
  }

  /**
   * Set the current speed tier for damage scaling.
   */
  public setSpeedTier(tier: 'normal' | 'swift' | 'supersonic'): void {
    this.currentSpeedTier = tier;
  }

  /**
   * Start charging a fireball (called when Q is held).
   */
  public startCharging(): void {
    if (!this.isCharging) {
      this.isCharging = true;
      this.chargeTimer = 0;
    }
  }

  /**
   * Update charge timer (call each frame while Q is held).
   */
  public updateCharge(dt: number, chargeOrigin: THREE.Vector3): void {
    if (!this.isCharging) return;
    this.chargeTimer += dt;

    // Charge VFX: growing fire ring around dragon's mouth
    if (this.chargeTimer > 0.15) {
      const chargeProgress = Math.min(1, this.chargeTimer / this.CHARGE_THRESHOLD);
      const ringRadius = 0.5 + chargeProgress * 1.5;
      const particleCount = Math.ceil(3 * chargeProgress);

      for (let i = 0; i < particleCount && this.fireParticles.length < this.MAX_FIRE_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const pos = chargeOrigin.clone().add(
          new THREE.Vector3(Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius, 0)
        );
        this.fireParticles.push({
          position: pos,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 2
          ),
          life: 0.25 + chargeProgress * 0.2,
          maxLife: 0.45,
          size: 1.0 + chargeProgress * 2.0,
        });
      }
    }
  }

  /**
   * Release the charged fireball. Returns true if a charged shot was fired.
   */
  public releaseCharge(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): boolean {
    if (!this.isCharging) return false;
    const wasFullyCharged = this.chargeTimer >= this.CHARGE_THRESHOLD;
    this.isCharging = false;
    this.chargeTimer = 0;

    if (!wasFullyCharged) return false;

    return this.launchChargedFireball(origin, direction);
  }

  /**
   * Launch a massive charged fireball — Dragonfire Dive Bomb.
   */
  private launchChargedFireball(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): boolean {
    const store = useGameStore.getState();
    if (!store.useDragonFlame(this.CHARGED_FIREBALL_COST)) return false;

    // Oversized glowing fireball using pre-allocated shared geometry & material
    const fireballMesh = new THREE.Mesh(this.chargedFireballGeo, this.chargedFireballMat);
    fireballMesh.position.copy(origin);
    this.scene.add(fireballMesh);

    const velocity = direction.clone().normalize().multiplyScalar(this.FIREBALL_SPEED * 1.5);

    // Apply homing if lock-on target exists
    if (this.lockOnTarget) {
      const toTarget = this.lockOnTarget.position.clone().sub(origin).normalize();
      velocity.lerp(toTarget.multiplyScalar(this.FIREBALL_SPEED * 1.5), 0.7);
    }

    this.fireballs.push({
      mesh: fireballMesh,
      velocity,
      position: origin.clone(),
      life: 6.0,
      trailTimer: 0,
      isCharged: true,
    });

    audioManager.playSFX("boss_defeat_impact");
    store.setBattleBanner("DRAGONFIRE DIVE BOMB", 2.0);

    return true;
  }

  /**
   * Launch a fireball from the dragon's mouth position.
   */
  public launchFireball(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): boolean {
    const store = useGameStore.getState();
    if (!store.useDragonFlame(this.FIREBALL_COST)) return false;

    // Create fireball mesh using pre-allocated shared geometry & material
    const fireballMesh = new THREE.Mesh(this.normalFireballGeo, this.normalFireballMat);
    fireballMesh.position.copy(origin);
    this.scene.add(fireballMesh);

    // True straight aim along crosshair / camera forward vector
    const velocity = direction.clone().normalize().multiplyScalar(this.FIREBALL_SPEED * 1.4);

    // Apply homing if lock-on target exists
    if (this.lockOnTarget) {
      const toTarget = this.lockOnTarget.position.clone().sub(origin).normalize();
      // Blend toward target direction (soft homing)
      velocity.lerp(toTarget.multiplyScalar(this.FIREBALL_SPEED * 1.4), 0.6);
    }

    this.fireballs.push({
      mesh: fireballMesh,
      velocity,
      position: origin.clone(),
      life: 5.0,
      trailTimer: 0,
      isCharged: false,
    });

    audioManager.playSFX("parry"); // Reuse as launch SFX

    // Special speed-based banner only
    if (this.currentSpeedTier === 'supersonic') {
      store.setBattleBanner("SUPERSONIC FIREBALL (+50% DMG)", 1.5);
    }

    return true;
  }

  /**
   * Check for Sonic Boom — high-speed barrel roll pass through enemies.
   */
  public checkSonicBoom(
    dragonPos: THREE.Vector3,
    isBarrelRolling: boolean,
    speedTier: 'normal' | 'swift' | 'supersonic',
    enemies: EnemyAI[],
    boss?: any
  ): void {
    if (!isBarrelRolling || speedTier !== 'supersonic') return;

    const store = useGameStore.getState();
    const SONIC_BOOM_RADIUS = 8.0;
    const SONIC_BOOM_DAMAGE = 25;
    let triggered = false;

    // Check boss
    if (boss && boss.state !== 'dead' && boss.mesh) {
      const dist = dragonPos.distanceTo(boss.mesh.position);
      if (dist < SONIC_BOOM_RADIUS) {
        if (typeof boss.takeDamage === 'function') {
          boss.takeDamage(SONIC_BOOM_DAMAGE);
        }
        store.addDamagePopup(
          SONIC_BOOM_DAMAGE, true,
          boss.mesh.position.toArray() as [number, number, number],
          '#5eead4'
        );
        triggered = true;
      }
    }

    // Check enemies
    for (const enemy of enemies) {
      if (enemy.state === 'dead') continue;
      const dist = dragonPos.distanceTo(enemy.mesh.position);
      if (dist < SONIC_BOOM_RADIUS) {
        const kbDir = enemy.mesh.position.clone().sub(dragonPos).normalize();
        enemy.takeDamage(SONIC_BOOM_DAMAGE, kbDir, 6.0);
        store.addDamagePopup(
          SONIC_BOOM_DAMAGE, true,
          enemy.mesh.position.toArray() as [number, number, number],
          '#5eead4'
        );
        triggered = true;
      }
    }

    if (triggered) {
      // Sonic boom VFX — expanding teal shockwave ring
      this.particles.emitBurst({
        position: dragonPos.clone(),
        count: 40,
        speed: 18,
        life: 0.5,
        size: 0.6,
        color: new THREE.Color(0x5eead4),
      });
      store.setBattleBanner("SONIC BOOM SHOCKWAVE!", 1.5);
      store.triggerHitFreeze(0.06, 0.05);
      audioManager.playSFX("dive_impact");
    }
  }

  /**
   * Update the entire dragon combat system.
   */
  public update(
    dt: number,
    dragonHeadPos: THREE.Vector3,
    dragonForward: THREE.Vector3,
    dragonRotation: THREE.Euler,
    enemies: EnemyAI[],
    boss?: any
  ): void {
    const store = useGameStore.getState();

    // ── Flame Breath ──
    if (this.isBreathing) {
      // Consume flame charge
      const drainAmount = this.FLAME_DRAIN_RATE * dt;
      if (!store.useDragonFlame(drainAmount)) {
        this.isBreathing = false;
        this.breathLight.intensity = 0;
      } else {
        this.emitFlameBreath(dt, dragonHeadPos, dragonForward);
        this.breathLight.position.copy(dragonHeadPos).addScaledVector(dragonForward, 3);
        this.breathLight.intensity = 2.5 + Math.sin(performance.now() * 0.02) * 1.0;

        // Damage enemies and boss in breath cone
        this.breathDamageTimer += dt;
        if (this.breathDamageTimer >= 0.2) {
          this.breathDamageTimer = 0;
          this.applyBreathDamage(dragonHeadPos, dragonForward, enemies, boss);
        }
      }
    } else {
      // Passive flame regen
      store.regenDragonFlame(this.FLAME_REGEN_RATE * dt);
    }

    // ── Update fire particles ──
    this.updateFireParticles(dt);

    // ── Update fireballs ──
    this.updateFireballs(dt, enemies, boss);

    // ── Smoothly fade explosion light ──
    if (this.explosionLight.intensity > 0) {
      this.explosionLight.intensity = Math.max(0, this.explosionLight.intensity - dt * 25);
    }
  }

  /**
   * Emit flame breath cone particles from dragon head.
   */
  private emitFlameBreath(
    dt: number,
    origin: THREE.Vector3,
    forward: THREE.Vector3
  ): void {
    const particlesToEmit = Math.ceil(120 * dt);

    for (let i = 0; i < particlesToEmit && this.fireParticles.length < this.MAX_FIRE_PARTICLES; i++) {
      // Cone spread: randomize within the breath arc
      const spreadAngle = (Math.random() - 0.5) * this.BREATH_ARC * 2;
      const vertSpread = (Math.random() - 0.5) * this.BREATH_ARC;

      const dir = forward.clone();
      // Rotate around Y for horizontal spread
      const cos = Math.cos(spreadAngle);
      const sin = Math.sin(spreadAngle);
      const newX = dir.x * cos - dir.z * sin;
      const newZ = dir.x * sin + dir.z * cos;
      dir.x = newX;
      dir.z = newZ;
      dir.y += vertSpread;
      dir.normalize();

      const speed = 12 + Math.random() * 18;
      const life = 0.3 + Math.random() * 0.5;

      this.fireParticles.push({
        position: origin.clone().addScaledVector(forward, 1.5 + Math.random() * 0.5),
        velocity: dir.multiplyScalar(speed).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 3,
            (Math.random() - 0.5) * 2
          )
        ),
        life,
        maxLife: life,
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  /**
   * Update and render fire particles.
   */
  private updateFireParticles(dt: number): void {
    const posArr = this.fireGeometry.attributes.position.array as Float32Array;
    const lifeArr = this.fireGeometry.attributes.aLife.array as Float32Array;
    const sizeArr = this.fireGeometry.attributes.aSize.array as Float32Array;

    // Update existing particles
    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const p = this.fireParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.fireParticles.splice(i, 1);
        continue;
      }
      // Fire rises and decelerates
      p.velocity.y += 4 * dt;
      p.velocity.multiplyScalar(1 - 1.5 * dt);
      p.position.addScaledVector(p.velocity, dt);
    }

    // Write to GPU buffer
    for (let i = 0; i < this.MAX_FIRE_PARTICLES; i++) {
      if (i < this.fireParticles.length) {
        const p = this.fireParticles[i];
        const lifeFrac = p.life / p.maxLife;
        posArr[i * 3] = p.position.x;
        posArr[i * 3 + 1] = p.position.y;
        posArr[i * 3 + 2] = p.position.z;
        lifeArr[i] = lifeFrac;
        sizeArr[i] = p.size * lifeFrac;
      } else {
        posArr[i * 3] = 0;
        posArr[i * 3 + 1] = -1000;
        posArr[i * 3 + 2] = 0;
        lifeArr[i] = 0;
        sizeArr[i] = 0;
      }
    }

    this.fireGeometry.attributes.position.needsUpdate = true;
    this.fireGeometry.attributes.aLife.needsUpdate = true;
    this.fireGeometry.attributes.aSize.needsUpdate = true;
  }

  /**
   * Update fireball projectiles — move, check collisions, explode.
   */
  private updateFireballs(dt: number, enemies: EnemyAI[], boss?: any): void {
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.life -= dt;

      if (fb.life <= 0 || fb.position.y < -5) {
        this.removeFireball(i);
        continue;
      }

      // Apply gravity
      fb.velocity.y += this.FIREBALL_GRAVITY * dt;

      // Move
      fb.position.addScaledVector(fb.velocity, dt);
      fb.mesh.position.copy(fb.position);

      // Pulsating glow
      const pulseScale = fb.isCharged
        ? 1.2 + Math.sin(performance.now() * 0.02) * 0.4
        : 0.8 + Math.sin(performance.now() * 0.015) * 0.2;
      fb.mesh.scale.setScalar(pulseScale);

      // Trail particles (throttled to 20Hz with cached colors to prevent particle buffer overflow)
      fb.trailTimer += dt;
      const trailInterval = 0.05;
      if (fb.trailTimer > trailInterval) {
        fb.trailTimer = 0;
        this.particles.emitBurst({
          position: fb.position.clone(),
          count: fb.isCharged ? 4 : 2,
          speed: fb.isCharged ? 3 : 1.5,
          life: fb.isCharged ? 0.35 : 0.25,
          size: fb.isCharged ? 0.45 : 0.3,
          color: fb.isCharged ? this.trailColorCharged : this.trailColorNormal,
        });
      }

      // Homing: gently steer toward lock-on target
      if (this.lockOnTarget && !fb.isCharged) {
        const toTarget = this.lockOnTarget.position.clone().sub(fb.position).normalize();
        const currentDir = fb.velocity.clone().normalize();
        const maxTurnRate = 15 * (Math.PI / 180) * dt; // 15°/sec
        currentDir.lerp(toTarget, Math.min(1, maxTurnRate * 3));
        fb.velocity.copy(currentDir.normalize().multiplyScalar(fb.velocity.length()));
      }

      // Check collision with ground (y < 0)
      if (fb.position.y < 0.5) {
        this.explodeFireball(fb, enemies, boss);
        this.removeFireball(i);
        continue;
      }

      // Check collision with boss (higher priority target in arena)
      if (boss && boss.state !== "dead" && boss.mesh) {
        const distToBoss = fb.position.distanceTo(boss.mesh.position);
        if (distToBoss < 4.5) {
          this.explodeFireball(fb, enemies, boss);
          this.removeFireball(i);
          continue;
        }
      }

      // Check collision with enemies
      for (const enemy of enemies) {
        if (enemy.state === "dead") continue;
        const dist = fb.position.distanceTo(enemy.mesh.position);
        if (dist < 2.0) {
          this.explodeFireball(fb, enemies, boss);
          this.removeFireball(i);
          break;
        }
      }
    }
  }

  /**
   * Explode a fireball with AoE damage and VFX.
   */
  private explodeFireball(fb: Fireball, enemies: EnemyAI[], boss?: any): void {
    const store = useGameStore.getState();

    // Base damage, scaled by speed tier
    let damageMultiplier = 1.0;
    if (this.currentSpeedTier === 'supersonic') damageMultiplier = 1.5;
    else if (this.currentSpeedTier === 'swift') damageMultiplier = 1.2;

    const baseDamage = fb.isCharged ? this.CHARGED_FIREBALL_DAMAGE : this.FIREBALL_DAMAGE;
    const blastRadius = fb.isCharged ? this.CHARGED_EXPLOSION_RADIUS : this.FIREBALL_EXPLOSION_RADIUS;
    const scaledDamage = Math.round(baseDamage * damageMultiplier);

    // Explosion VFX — high impact particle burst using pre-allocated color
    this.particles.emitBurst({
      position: fb.position.clone(),
      count: fb.isCharged ? 50 : 30,
      speed: fb.isCharged ? 16 : 10,
      life: fb.isCharged ? 0.7 : 0.5,
      size: fb.isCharged ? 0.6 : 0.45,
      color: fb.isCharged ? this.burstColorCharged : this.burstColorNormal,
    });

    // Secondary ember burst
    this.particles.emitBurst({
      position: fb.position.clone(),
      count: fb.isCharged ? 24 : 14,
      speed: fb.isCharged ? 8 : 5,
      life: fb.isCharged ? 1.0 : 0.7,
      size: fb.isCharged ? 0.35 : 0.25,
      color: this.emberColor,
    });

    // Reuse static explosion light for immediate flash without shader recompilation
    this.explosionLight.position.copy(fb.position);
    this.explosionLight.intensity = fb.isCharged ? 8 : 4.5;

    // Damage boss if within blast radius
    if (boss && boss.state !== "dead" && boss.mesh) {
      const distToBoss = fb.position.distanceTo(boss.mesh.position);
      if (distToBoss < blastRadius) {
        const falloff = 1 - (distToBoss / blastRadius);
        const damage = Math.round(scaledDamage * falloff);
        if (typeof boss.takeDamage === "function") {
          boss.takeDamage(damage);
        }
        store.addDamagePopup(damage, true, boss.mesh.position.toArray() as [number, number, number], fb.isCharged ? "#ff2200" : "#ff3300");
      }
    }

    // AoE damage to enemies
    for (const enemy of enemies) {
      if (enemy.state === "dead") continue;
      const dist = fb.position.distanceTo(enemy.mesh.position);
      if (dist < blastRadius) {
        const falloff = 1 - (dist / blastRadius);
        const damage = Math.round(scaledDamage * falloff);
        const kbDir = enemy.mesh.position.clone().sub(fb.position).normalize();
        enemy.takeDamage(damage, kbDir, fb.isCharged ? 8.0 : 4.0);

        store.addDamagePopup(damage, falloff > 0.7, enemy.mesh.position.toArray() as [number, number, number], fb.isCharged ? "#ff2200" : "#ff6600");
      }
    }

    audioManager.playSFX("dive_impact");
  }

  /**
   * Remove a fireball from the scene and array.
   */
  private removeFireball(index: number): void {
    const fb = this.fireballs[index];
    this.scene.remove(fb.mesh);
    // Shared geometry and materials are retained in pool (not disposed)
    this.fireballs.splice(index, 1);
  }

  /**
   * Apply flame breath damage to enemies and boss within the cone.
   */
  private applyBreathDamage(
    origin: THREE.Vector3,
    forward: THREE.Vector3,
    enemies: EnemyAI[],
    boss?: any
  ): void {
    const store = useGameStore.getState();
    const effectiveRange = this.getEffectiveBreathRange();

    // Check boss in breath cone
    if (boss && boss.state !== "dead" && boss.mesh) {
      const toBoss = boss.mesh.position.clone().sub(origin);
      const dist = toBoss.length();
      if (dist <= effectiveRange) {
        toBoss.normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, toBoss.dot(forward))));
        if (angle <= this.BREATH_ARC) {
          const falloff = 1 - (dist / effectiveRange) * 0.5;
          const damage = Math.round(this.BREATH_DPS * 0.2 * falloff);
          if (typeof boss.takeDamage === "function") {
            boss.takeDamage(damage);
          }
          store.addDamagePopup(damage, false, boss.mesh.position.toArray() as [number, number, number], "#ff8c00");
        }
      }
    }

    // Check enemies in breath cone
    for (const enemy of enemies) {
      if (enemy.state === "dead") continue;

      const toEnemy = enemy.mesh.position.clone().sub(origin);
      const dist = toEnemy.length();
      if (dist > effectiveRange) continue;

      // Check angle
      toEnemy.normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, toEnemy.dot(forward))));
      if (angle > this.BREATH_ARC) continue;

      // Apply damage with distance falloff
      const falloff = 1 - (dist / effectiveRange) * 0.5;
      const damage = Math.round(this.BREATH_DPS * 0.2 * falloff); // 0.2s tick

      enemy.takeDamage(damage, forward.clone(), 0.5);
      store.addDamagePopup(damage, false, enemy.mesh.position.toArray() as [number, number, number], "#ff8c00");

      // Set enemy on fire (burn effect)
      enemy.burnTimer = Math.max(enemy.burnTimer, 2.0);
    }
  }

  /**
   * Apply speed-based breath range extension.
   * At supersonic speed, breath extends 30% further.
   */
  private getEffectiveBreathRange(): number {
    if (this.currentSpeedTier === 'supersonic') return this.BREATH_RANGE * 1.3;
    if (this.currentSpeedTier === 'swift') return this.BREATH_RANGE * 1.15;
    return this.BREATH_RANGE;
  }

  // Pre-allocated scratch vectors for static helper methods (zero GC)
  private static readonly _scratchHeadOffset = new THREE.Vector3();
  private static readonly _scratchForward = new THREE.Vector3();
  private static readonly _scratchResult = new THREE.Vector3();

  /**
   * Get the dragon head world position (offset from dragon mesh).
   * Uses pre-allocated vectors to avoid per-frame allocations.
   */
  public static getDragonHeadPosition(
    dragonPosition: THREE.Vector3,
    dragonRotation: THREE.Euler
  ): THREE.Vector3 {
    DragonCombat._scratchHeadOffset.set(0, 0.8, -3.5);
    DragonCombat._scratchHeadOffset.applyEuler(dragonRotation);
    DragonCombat._scratchResult.copy(dragonPosition).add(DragonCombat._scratchHeadOffset);
    return DragonCombat._scratchResult;
  }

  /**
   * Get dragon forward direction from rotation.
   * Uses pre-allocated vector to avoid per-frame allocations.
   */
  public static getDragonForward(dragonRotation: THREE.Euler): THREE.Vector3 {
    return DragonCombat._scratchForward.set(0, 0, -1).applyEuler(dragonRotation).normalize();
  }

  /**
   * Cleanup resources.
   */
  public dispose(): void {
    this.scene.remove(this.firePoints);
    this.scene.remove(this.breathLight);
    this.scene.remove(this.explosionLight);
    this.fireGeometry.dispose();
    this.fireMaterial.dispose();
    this.normalFireballGeo.dispose();
    this.normalFireballMat.dispose();
    this.chargedFireballGeo.dispose();
    this.chargedFireballMat.dispose();

    for (const fb of this.fireballs) {
      this.scene.remove(fb.mesh);
    }
    this.fireballs = [];
  }
}
