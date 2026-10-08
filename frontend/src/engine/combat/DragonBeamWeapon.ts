/**
 * DragonBeamWeapon — Instant hitscan energy beam / railgun combat system.
 *
 * Replaces old arcing fireball projectiles with instantaneous raycast weapons:
 * - LMB: Dragon Prismatic Railgun (instant hitscan, 0.12s beam visual)
 * - Hold E: Continuous Focused Laser (Kamehameha/Shin Godzilla style)
 * - Hold Q: Charged Hyper-Beam (Orbital Solar Lance, 1.5s charge)
 *
 * All scratch objects are pre-allocated — zero per-frame GC pressure.
 */
import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "../audio/AudioManager";
import { EnemyAI } from "./EnemyAI";
import { CameraController } from "../rendering/CameraController";

export class DragonBeamWeapon {
  // Pre-allocated scratch objects (zero per-frame allocations)
  private readonly raycaster = new THREE.Raycaster();
  private readonly beamStart = new THREE.Vector3();
  private readonly beamEnd = new THREE.Vector3();
  private readonly beamDir = new THREE.Vector3();
  private readonly scratchVec = new THREE.Vector3();

  // Beam visual mesh (pre-allocated, reused)
  private beamMesh: THREE.Mesh;
  private beamMaterial: THREE.MeshBasicMaterial;
  private beamLife: number = 0;

  // Continuous beam state
  private isContinuousBeam: boolean = false;
  private continuousTickTimer: number = 0;
  private continuousHoldDuration: number = 0;

  // Charged hyper-beam state
  private isCharging: boolean = false;
  private chargeTimer: number = 0;
  private readonly CHARGE_THRESHOLD = 1.5; // seconds to fully charge
  private chargeRingMeshes: THREE.Mesh[] = [];

  // Weapon constants
  private readonly BEAM_MAX_RANGE = 800;
  private readonly RAILGUN_DAMAGE = 85;
  private readonly CONTINUOUS_DPS_TICK = 18;    // per 0.08s tick = 225 DPS
  private readonly CONTINUOUS_TICK_INTERVAL = 0.08;
  private readonly HYPERBEAM_DAMAGE = 350;

  // Cooldowns
  private railgunCooldown: number = 0;
  private readonly RAILGUN_COOLDOWN = 0.25; // seconds between shots

  // Speed tier damage scaling
  private currentSpeedTier: 'normal' | 'swift' | 'supersonic' = 'normal';

  // Pre-allocated particle colors
  private readonly railgunColor = new THREE.Color(0x38bdf8);
  private readonly continuousColor = new THREE.Color(0xff6b35);
  private readonly hyperbeamColor = new THREE.Color(0xfbbf24);
  private readonly impactColor = new THREE.Color(0xffffff);
  private readonly chargeColor = new THREE.Color(0xa855f7);

  constructor(
    private scene: THREE.Scene,
    private particles: InkParticleSystem,
    private cameraController: CameraController
  ) {
    // Pre-allocated beam cylinder mesh (aligned with Z forward)
    const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, 1, 8, 1, true);
    beamGeo.rotateX(Math.PI / 2); // Align with Z forward
    this.beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.beamMesh = new THREE.Mesh(beamGeo, this.beamMaterial);
    this.beamMesh.frustumCulled = false;
    this.scene.add(this.beamMesh);

    // Pre-allocated charge ring meshes (3 orbiting rings)
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(0.6 + i * 0.3, 0.06, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.visible = false;
      this.scene.add(ring);
      this.chargeRingMeshes.push(ring);
    }
  }

  /**
   * Set speed tier for damage scaling.
   */
  public setSpeedTier(tier: 'normal' | 'swift' | 'supersonic'): void {
    this.currentSpeedTier = tier;
  }

  private getDamageMultiplier(): number {
    if (this.currentSpeedTier === 'supersonic') return 1.5;
    if (this.currentSpeedTier === 'swift') return 1.2;
    return 1.0;
  }

  /**
   * Fire an instant hitscan railgun beam along the camera crosshair (LMB).
   */
  public fireInstantRailgun(
    mawPos: THREE.Vector3,
    camAimDir: THREE.Vector3,
    enemies: EnemyAI[],
    boss?: any
  ): boolean {
    if (this.railgunCooldown > 0) return false;

    const store = useGameStore.getState();
    if (!store.useDragonFlame(8)) return false;

    this.railgunCooldown = this.RAILGUN_COOLDOWN;

    this.beamStart.copy(mawPos);
    this.beamDir.copy(camAimDir).normalize();
    this.beamEnd.copy(this.beamStart).addScaledVector(this.beamDir, this.BEAM_MAX_RANGE);

    // Raycast hitscan against targets
    const { hitPoint, hitTarget } = this.hitscanTargets(
      this.beamStart, this.beamDir, enemies, boss
    );

    const endPoint = hitPoint || this.beamEnd;
    const scaledDamage = Math.round(this.RAILGUN_DAMAGE * this.getDamageMultiplier());

    // Apply damage
    if (hitTarget) {
      if (typeof hitTarget.takeDamage === 'function') {
        hitTarget.takeDamage(scaledDamage);
      }
      store.addDamagePopup(
        scaledDamage, true,
        [endPoint.x, endPoint.y + 1.0, endPoint.z],
        '#38bdf8'
      );
      store.addComboPoint(20);

      // Impact sparks
      this.particles.emitBurst({
        position: endPoint.clone(),
        count: 24,
        speed: 12,
        life: 0.35,
        size: 0.3,
        color: this.impactColor,
      });
    }

    // Render beam visual
    this.renderBeamVisual(this.beamStart, endPoint, 0.35, 0x38bdf8, 0.12);

    // Screen shake kickback
    this.cameraController.addShake(0.5, 0.12);

    // Launch SFX
    audioManager.playSFX("parry");

    // Muzzle flash particles at dragon maw
    this.particles.emitBurst({
      position: mawPos.clone(),
      count: 12,
      speed: 8,
      life: 0.2,
      size: 0.4,
      color: this.railgunColor,
    });

    return true;
  }

  /**
   * Start continuous focused laser beam (Hold E).
   */
  public startContinuousBeam(): void {
    if (!this.isContinuousBeam) {
      this.isContinuousBeam = true;
      this.continuousTickTimer = 0;
      this.continuousHoldDuration = 0;
    }
  }

  /**
   * Stop continuous beam.
   */
  public stopContinuousBeam(): void {
    this.isContinuousBeam = false;
    this.continuousHoldDuration = 0;
  }

  /**
   * Update continuous beam (call each frame while active).
   */
  public updateContinuousBeam(
    dt: number,
    mawPos: THREE.Vector3,
    camAimDir: THREE.Vector3,
    enemies: EnemyAI[],
    boss?: any
  ): void {
    if (!this.isContinuousBeam) return;

    const store = useGameStore.getState();

    // Drain flame charge continuously
    const drainAmount = 12 * dt; // 12 charge/sec
    if (!store.useDragonFlame(drainAmount)) {
      this.stopContinuousBeam();
      return;
    }

    this.continuousHoldDuration += dt;

    this.beamStart.copy(mawPos);
    this.beamDir.copy(camAimDir).normalize();
    this.beamEnd.copy(this.beamStart).addScaledVector(this.beamDir, this.BEAM_MAX_RANGE);

    const { hitPoint, hitTarget } = this.hitscanTargets(
      this.beamStart, this.beamDir, enemies, boss
    );
    const endPoint = hitPoint || this.beamEnd;

    // Beam thickness grows with hold duration (0.35 → 0.6 over 1.5s)
    const beamRadius = Math.min(0.6, 0.35 + this.continuousHoldDuration * 0.17);
    this.renderBeamVisual(this.beamStart, endPoint, beamRadius, 0xff6b35, 0.05);

    // Tick damage
    this.continuousTickTimer += dt;
    if (this.continuousTickTimer >= this.CONTINUOUS_TICK_INTERVAL) {
      this.continuousTickTimer = 0;

      if (hitTarget) {
        const tickDmg = Math.round(this.CONTINUOUS_DPS_TICK * this.getDamageMultiplier());
        if (typeof hitTarget.takeDamage === 'function') {
          hitTarget.takeDamage(tickDmg);
        }
        store.addDamagePopup(
          tickDmg, false,
          [endPoint.x, endPoint.y + 0.8, endPoint.z],
          '#ff6b35'
        );
        store.addComboPoint(5);

        // Burn sparks
        this.particles.emitBurst({
          position: endPoint.clone(),
          count: 6,
          speed: 4,
          life: 0.2,
          size: 0.2,
          color: this.continuousColor,
        });

        // Set enemy on fire
        if (hitTarget.burnTimer !== undefined) {
          hitTarget.burnTimer = Math.max(hitTarget.burnTimer, 2.0);
        }
      }
    }

    // Subtle rumble scales with hold
    const rumbleIntensity = Math.min(0.15, this.continuousHoldDuration * 0.05);
    this.cameraController.addShake(rumbleIntensity, 0.05);

    // Heat shimmer particles along beam path
    if (Math.random() < 0.3) {
      const t = Math.random();
      this.scratchVec.lerpVectors(this.beamStart, endPoint, t);
      this.scratchVec.x += (Math.random() - 0.5) * 0.5;
      this.scratchVec.y += (Math.random() - 0.5) * 0.5;
      this.particles.emitAmbient(this.scratchVec.clone(), 1, 0.3);
    }
  }

  /**
   * Start charging hyper-beam (Hold Q).
   */
  public startHyperCharge(): void {
    if (!this.isCharging) {
      this.isCharging = true;
      this.chargeTimer = 0;
    }
  }

  /**
   * Update charge visuals (call each frame while Q held).
   */
  public updateHyperCharge(dt: number, chargeOrigin: THREE.Vector3): void {
    if (!this.isCharging) return;
    this.chargeTimer += dt;

    const chargeProgress = Math.min(1, this.chargeTimer / this.CHARGE_THRESHOLD);

    // Animate charge rings orbiting dragon horns
    for (let i = 0; i < this.chargeRingMeshes.length; i++) {
      const ring = this.chargeRingMeshes[i];
      ring.visible = chargeProgress > (i * 0.3);

      if (ring.visible) {
        const angle = performance.now() * 0.005 + i * (Math.PI * 2 / 3);
        ring.position.copy(chargeOrigin);
        ring.position.x += Math.cos(angle) * (1.0 + chargeProgress * 0.5);
        ring.position.y += Math.sin(angle * 1.3) * 0.5 + 0.5;
        ring.position.z += Math.sin(angle) * (1.0 + chargeProgress * 0.5);
        ring.rotation.x = angle;
        ring.rotation.y = angle * 0.7;

        const ringMat = ring.material as THREE.MeshBasicMaterial;
        ringMat.opacity = chargeProgress * 0.8;
        const scale = 0.5 + chargeProgress * 0.5;
        ring.scale.setScalar(scale);
      }
    }

    // Charge particles pulling inward
    if (chargeProgress > 0.15 && Math.random() < 0.5) {
      const randAngle = Math.random() * Math.PI * 2;
      const randDist = 1.5 + Math.random() * 2;
      this.particles.emitBurst({
        position: chargeOrigin.clone().add(
          new THREE.Vector3(
            Math.cos(randAngle) * randDist,
            (Math.random() - 0.5) * 1.5,
            Math.sin(randAngle) * randDist
          )
        ),
        count: 2,
        speed: 3,
        life: 0.3,
        size: 0.2 + chargeProgress * 0.3,
        color: this.chargeColor,
      });
    }

    // Camera micro-rumble during charge
    this.cameraController.addShake(0.04 * chargeProgress, 0.05);
  }

  /**
   * Release the hyper-beam. Returns true if fully charged shot was fired.
   */
  public releaseHyperBeam(
    mawPos: THREE.Vector3,
    camAimDir: THREE.Vector3,
    enemies: EnemyAI[],
    boss?: any
  ): boolean {
    if (!this.isCharging) return false;
    const wasFullyCharged = this.chargeTimer >= this.CHARGE_THRESHOLD;
    this.isCharging = false;
    this.chargeTimer = 0;

    // Hide charge rings
    for (const ring of this.chargeRingMeshes) {
      ring.visible = false;
    }

    if (!wasFullyCharged) return false;

    const store = useGameStore.getState();
    if (!store.useDragonFlame(60)) return false;

    this.beamStart.copy(mawPos);
    this.beamDir.copy(camAimDir).normalize();
    this.beamEnd.copy(this.beamStart).addScaledVector(this.beamDir, this.BEAM_MAX_RANGE);

    // PIERCE through ALL enemies in line
    const scaledDamage = Math.round(this.HYPERBEAM_DAMAGE * this.getDamageMultiplier());
    const hitTargets = this.hitscanAllTargets(this.beamStart, this.beamDir, enemies, boss);

    for (const { target, point } of hitTargets) {
      if (typeof target.takeDamage === 'function') {
        target.takeDamage(scaledDamage);
      }
      store.addDamagePopup(
        scaledDamage, true,
        [point.x, point.y + 1.0, point.z],
        '#fbbf24'
      );

      // Vaporize impact
      this.particles.emitBurst({
        position: point.clone(),
        count: 40,
        speed: 16,
        life: 0.6,
        size: 0.5,
        color: this.hyperbeamColor,
      });
    }

    store.addComboPoint(65);

    // Massive 3m-thick beam visual
    const endPoint = hitTargets.length > 0
      ? hitTargets[hitTargets.length - 1].point
      : this.beamEnd;
    this.renderBeamVisual(this.beamStart, endPoint, 1.5, 0xfbbf24, 0.5);

    // Massive screen shake + punch-in
    this.cameraController.addShake(1.5, 0.4);
    this.cameraController.addPunchIn(2.5, 0.3);
    store.triggerHitFreeze(0.08, 0.05);

    // Muzzle flash
    this.particles.emitBurst({
      position: mawPos.clone(),
      count: 50,
      speed: 15,
      life: 0.5,
      size: 0.6,
      color: this.hyperbeamColor,
    });

    audioManager.playSFX("boss_defeat_impact");
    store.setBattleBanner("ORBITAL SOLAR LANCE", 2.0);

    return true;
  }

  /**
   * Hitscan: find first target in beam path.
   */
  private hitscanTargets(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    enemies: EnemyAI[],
    boss?: any
  ): { hitPoint: THREE.Vector3 | null; hitTarget: any } {
    let closestDist = this.BEAM_MAX_RANGE;
    let hitPoint: THREE.Vector3 | null = null;
    let hitTarget: any = null;

    // Check boss
    if (boss && boss.state !== 'dead' && boss.mesh) {
      const bossPos = boss.mesh.position;
      this.scratchVec.subVectors(bossPos, origin);
      const projDist = this.scratchVec.dot(direction);
      if (projDist > 0 && projDist < closestDist) {
        // Perpendicular distance check (hit radius ~4m for boss)
        const perpDistSq = this.scratchVec.lengthSq() - projDist * projDist;
        if (perpDistSq < 16) { // 4m radius
          closestDist = projDist;
          hitPoint = origin.clone().addScaledVector(direction, projDist);
          hitTarget = boss;
        }
      }
    }

    // Check enemies
    for (const enemy of enemies) {
      if (enemy.state === 'dead') continue;
      this.scratchVec.subVectors(enemy.mesh.position, origin);
      const projDist = this.scratchVec.dot(direction);
      if (projDist > 0 && projDist < closestDist) {
        const perpDistSq = this.scratchVec.lengthSq() - projDist * projDist;
        if (perpDistSq < 4) { // 2m radius
          closestDist = projDist;
          hitPoint = origin.clone().addScaledVector(direction, projDist);
          hitTarget = enemy;
        }
      }
    }

    return { hitPoint, hitTarget };
  }

  /**
   * Hitscan: find ALL targets in beam path (for piercing hyper-beam).
   */
  private hitscanAllTargets(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    enemies: EnemyAI[],
    boss?: any
  ): { target: any; point: THREE.Vector3 }[] {
    const hits: { target: any; point: THREE.Vector3; dist: number }[] = [];

    // Check boss
    if (boss && boss.state !== 'dead' && boss.mesh) {
      this.scratchVec.subVectors(boss.mesh.position, origin);
      const projDist = this.scratchVec.dot(direction);
      if (projDist > 0 && projDist < this.BEAM_MAX_RANGE) {
        const perpDistSq = this.scratchVec.lengthSq() - projDist * projDist;
        if (perpDistSq < 25) { // 5m radius for hyper-beam
          hits.push({
            target: boss,
            point: origin.clone().addScaledVector(direction, projDist),
            dist: projDist,
          });
        }
      }
    }

    // Check enemies
    for (const enemy of enemies) {
      if (enemy.state === 'dead') continue;
      this.scratchVec.subVectors(enemy.mesh.position, origin);
      const projDist = this.scratchVec.dot(direction);
      if (projDist > 0 && projDist < this.BEAM_MAX_RANGE) {
        const perpDistSq = this.scratchVec.lengthSq() - projDist * projDist;
        if (perpDistSq < 9) { // 3m radius for hyper-beam
          hits.push({
            target: enemy,
            point: origin.clone().addScaledVector(direction, projDist),
            dist: projDist,
          });
        }
      }
    }

    // Sort by distance
    hits.sort((a, b) => a.dist - b.dist);
    return hits;
  }

  /**
   * Render the beam visual between two points.
   */
  private renderBeamVisual(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    colorHex: number,
    duration: number
  ): void {
    const dist = start.distanceTo(end);
    if (dist < 0.1) return;

    this.beamMesh.scale.set(radius, radius, dist);
    this.beamMesh.position.lerpVectors(start, end, 0.5);
    this.beamMesh.lookAt(end);

    this.beamMaterial.color.setHex(colorHex);
    this.beamMaterial.opacity = 1.0;
    this.beamLife = duration;
  }

  /**
   * Update beam fade and cooldowns (call every frame).
   */
  public update(dt: number): void {
    // Fade beam visual
    if (this.beamLife > 0) {
      this.beamLife -= dt;
      this.beamMaterial.opacity = Math.max(0, this.beamLife / 0.15);
      if (this.beamLife <= 0) {
        this.beamMaterial.opacity = 0;
      }
    }

    // Railgun cooldown
    if (this.railgunCooldown > 0) {
      this.railgunCooldown -= dt;
    }
  }

  /**
   * Cleanup resources.
   */
  public dispose(): void {
    this.scene.remove(this.beamMesh);
    this.beamMesh.geometry.dispose();
    this.beamMaterial.dispose();
    for (const ring of this.chargeRingMeshes) {
      this.scene.remove(ring);
      ring.geometry.dispose();
      (ring.material as THREE.MeshBasicMaterial).dispose();
    }
  }
}
