import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { PlayerController } from "./PlayerController";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "../audio/AudioManager";

export type KorrathPhase = "aerial" | "crash_transition" | "ground" | "defeated";

export class KorrathBoss {
  public mesh: THREE.Group;
  public state: "intro" | "fight" | "windup" | "attack" | "stagger" | "dead" = "fight";
  public phase: KorrathPhase = "aerial";

  public health: number = 800;
  public maxHealth: number = 800;
  public damage: number = 26;
  public staggerPoise: number = 100;
  public maxStaggerPoise: number = 100;

  private stateTimer: number = 0;
  private actionCooldown: number = 2.5;
  private attackTimer: number = 0;
  private isDiving: boolean = false;

  // Arena anchor (Reef Sanctuary Outpost at 750, 4, 450)
  public arenaCenter = new THREE.Vector3(750, 4.0, 450);

  // Aerial tracking
  private orbitAngle: number = 0;
  private orbitRadius: number = 48.0;
  private flightAltitude: number = 45.0;
  private wingFlapPhase: number = 0;

  // Mesh components
  private wyvernGroup!: THREE.Group;
  private leftWing!: THREE.Group;
  private rightWing!: THREE.Group;
  private korrathRiderMesh!: THREE.Group;
  private groundKorrathMesh!: THREE.Group;
  private staggerStarsGroup!: THREE.Group;
  private dualBlades: THREE.Mesh[] = [];
  private flameLight!: THREE.PointLight;
  private staggerTimer: number = 0;
  private isWindup: boolean = false;
  private windupTimer: number = 0;

  // Enhanced Aerial Attack State
  private aerialAttackState: 'idle' | 'flame_wall' | 'corkscrew' | 'volley' | 'diving' = 'idle';
  private aerialAttackTimer: number = 0;
  private corkscrewAngle: number = 0;
  private corkscrewStartPos: THREE.Vector3 = new THREE.Vector3();
  private volleyShotsFired: number = 0;
  private volleyInterval: number = 0;
  private flameWallAngle: number = 0;
  private flameWallDuration: number = 0;

  constructor(
    private scene: THREE.Scene,
    private particles: InkParticleSystem,
    private playerGroup: THREE.Group,
    private playerController: PlayerController
  ) {
    this.mesh = new THREE.Group();
    this.mesh.name = "KorrathTheBranded";
    this.mesh.position.copy(this.arenaCenter).add(new THREE.Vector3(0, this.flightAltitude, 0));

    this.buildMeshes();
    this.scene.add(this.mesh);

    // Announce boss in store
    useGameStore.getState().setActiveBoss({
      name: "KORRATH THE BRANDED · ASHSCALE SCOUT CAPTAIN",
      currentHP: this.health,
      maxHP: this.maxHealth,
    });
  }

  /**
   * Build both the mounted aerial wyvern model and the ground duel model.
   */
  private buildMeshes(): void {
    // ─── 1. Armored Corrupted Wyvern (Ignis-Bane) ───
    this.wyvernGroup = new THREE.Group();
    this.wyvernGroup.name = "IgnisBaneWyvern";

    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x450a0a,
      emissiveIntensity: 0.3,
    });

    const ashscaleFlameMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.25,
      metalness: 0.7,
      emissive: 0xf97316,
      emissiveIntensity: 0.7,
    });

    const membraneMat = new THREE.MeshStandardMaterial({
      color: 0x271212,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    // Body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 0.8, 5.0, 8),
      obsidianMat
    );
    body.rotation.x = Math.PI / 2;
    this.wyvernGroup.add(body);

    // Spines
    for (let z = -2.0; z <= 2.0; z += 0.6) {
      const spine = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.75, 4),
        ashscaleFlameMat
      );
      spine.position.set(0, 1.1, z);
      spine.rotation.x = 0.2;
      this.wyvernGroup.add(spine);
    }

    // Wings
    this.leftWing = new THREE.Group();
    this.leftWing.position.set(0.9, 0.5, -0.5);
    const lWing = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.2), membraneMat);
    lWing.position.set(2.6, 0, 0);
    lWing.rotation.x = Math.PI / 2;
    this.leftWing.add(lWing);
    this.wyvernGroup.add(this.leftWing);

    this.rightWing = new THREE.Group();
    this.rightWing.position.set(-0.9, 0.5, -0.5);
    const rWing = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.2), membraneMat);
    rWing.position.set(-2.6, 0, 0);
    rWing.rotation.x = Math.PI / 2;
    this.rightWing.add(rWing);
    this.wyvernGroup.add(this.rightWing);

    // Wyvern Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 2.0), obsidianMat);
    head.position.set(0, 1.5, -4.0);
    this.wyvernGroup.add(head);

    // ─── 2. Korrath Rider (mounted atop the wyvern) ───
    this.korrathRiderMesh = new THREE.Group();
    this.korrathRiderMesh.position.set(0, 1.2, 0.2);

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x3b0764, // Dark imperial purple & spiked steel
      roughness: 0.35,
      metalness: 0.7,
      emissive: 0x9333ea,
      emissiveIntensity: 0.2,
    });

    const riderTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 1.2, 6), armorMat);
    this.korrathRiderMesh.add(riderTorso);

    const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), armorMat);
    riderHead.position.y = 0.85;
    this.korrathRiderMesh.add(riderHead);
    this.wyvernGroup.add(this.korrathRiderMesh);

    this.mesh.add(this.wyvernGroup);

    // ─── 3. Ground Korrath Model (for Phase 2 ground duel) ───
    this.groundKorrathMesh = new THREE.Group();
    this.groundKorrathMesh.name = "GroundKorrath";
    this.groundKorrathMesh.visible = false;

    const groundTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 1.5, 6), armorMat);
    groundTorso.position.y = 1.3;
    this.groundKorrathMesh.add(groundTorso);

    const groundHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), armorMat);
    groundHead.position.y = 2.25;
    this.groundKorrathMesh.add(groundHead);

    // Dual Dao Blades with flaming trail
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.4, 0.22),
        ashscaleFlameMat
      );
      blade.position.set(side * 0.65, 1.2, 0.4);
      blade.rotation.x = 0.4;
      this.groundKorrathMesh.add(blade);
      this.dualBlades.push(blade);
    }

    // Golden Stagger Stars (visible during poise-broken stagger window)
    this.staggerStarsGroup = new THREE.Group();
    this.staggerStarsGroup.position.set(0, 2.7, 0);
    this.staggerStarsGroup.visible = false;
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    for (let s = 0; s < 3; s++) {
      const angle = (s * Math.PI * 2) / 3;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), starMat);
      star.position.set(Math.cos(angle) * 0.55, 0, Math.sin(angle) * 0.55);
      this.staggerStarsGroup.add(star);
    }
    this.groundKorrathMesh.add(this.staggerStarsGroup);

    this.mesh.add(this.groundKorrathMesh);

    // Boss Ambient Fire Light
    this.flameLight = new THREE.PointLight(0xff4500, 2.5, 25);
    this.flameLight.position.set(0, 2, 0);
    this.mesh.add(this.flameLight);
  }

  /**
   * Main update loop called every frame.
   */
  public update(dt: number): void {
    if (this.state === "dead") return;

    this.stateTimer += dt;
    this.attackTimer += dt;

    if (this.phase === "aerial") {
      this.updateAerialPhase(dt);
    } else if (this.phase === "crash_transition") {
      this.updateCrashTransition(dt);
    } else if (this.phase === "ground") {
      this.updateGroundPhase(dt);
    }
  }

  /**
   * Phase 1: High-flying wyvern combat — Enhanced with varied attack patterns.
   */
  private updateAerialPhase(dt: number): void {
    // Wing flap
    this.wingFlapPhase += dt * (this.aerialAttackState === 'diving' || this.aerialAttackState === 'corkscrew' ? 12.0 : 6.0);
    const flap = Math.sin(this.wingFlapPhase) * 0.4;
    this.leftWing.rotation.z = -flap;
    this.rightWing.rotation.z = flap;

    const playerPos = this.playerGroup.position;
    const distToPlayer = this.mesh.position.distanceTo(playerPos);

    // ── Execute active aerial attack ──
    switch (this.aerialAttackState) {
      case 'diving':
        this.updateDiveAttack(dt, playerPos, distToPlayer);
        return;
      case 'flame_wall':
        this.updateFlameWall(dt, playerPos);
        return;
      case 'corkscrew':
        this.updateCorkscrewPursuit(dt, playerPos, distToPlayer);
        return;
      case 'volley':
        this.updateFireballVolley(dt, playerPos);
        return;
    }

    // ── Idle orbiting — choose next attack ──
    this.orbitAngle += 0.55 * dt;
    const targetPos = new THREE.Vector3(
      this.arenaCenter.x + Math.cos(this.orbitAngle) * this.orbitRadius,
      this.arenaCenter.y + this.flightAltitude,
      this.arenaCenter.z + Math.sin(this.orbitAngle) * this.orbitRadius
    );
    this.mesh.position.lerp(targetPos, Math.min(1, 3.0 * dt));

    const forward = new THREE.Vector3(
      -Math.sin(this.orbitAngle),
      0,
      Math.cos(this.orbitAngle)
    );
    this.mesh.lookAt(this.mesh.position.clone().add(forward));
    this.wyvernGroup.rotation.z = 0.35;

    // Weighted random attack selection
    if (this.attackTimer >= this.actionCooldown && distToPlayer < 80.0) {
      this.selectAerialAttack(distToPlayer);
      this.attackTimer = 0;
      this.stateTimer = 0;
    }
  }

  /**
   * Select a random aerial attack based on weighted probabilities.
   */
  private selectAerialAttack(distToPlayer: number): void {
    const roll = Math.random();
    const store = useGameStore.getState();

    if (roll < 0.25) {
      // Dive attack (25%)
      this.aerialAttackState = 'diving';
      this.isDiving = true;
      store.setBattleBanner("KORRATH: WYVERN DIVE INCOMING!", 1.0);
      audioManager.playSFX("dragon_roar");
    } else if (roll < 0.50) {
      // Flame Wall Sweep (25%)
      this.aerialAttackState = 'flame_wall';
      this.flameWallAngle = 0;
      this.flameWallDuration = 0;
      store.setBattleBanner("KORRATH: FLAME WALL SWEEP — BARREL ROLL!", 1.5);
      audioManager.playSFX("fire_charge");
    } else if (roll < 0.75) {
      // Fireball Volley (25%)
      this.aerialAttackState = 'volley';
      this.volleyShotsFired = 0;
      this.volleyInterval = 0;
      store.setBattleBanner("KORRATH: CORRUPTED FIREBALL VOLLEY!", 1.5);
      audioManager.playSFX("fire_charge");
    } else {
      // Corkscrew Pursuit (25%)
      this.aerialAttackState = 'corkscrew';
      this.corkscrewAngle = 0;
      this.corkscrewStartPos.copy(this.mesh.position);
      store.setBattleBanner("KORRATH: CORKSCREW PURSUIT — EVADE!", 1.5);
      audioManager.playSFX("dragon_roar");
    }
  }

  /**
   * Dive attack (existing, refactored into its own method).
   */
  private updateDiveAttack(dt: number, playerPos: THREE.Vector3, distToPlayer: number): void {
    const dir = playerPos.clone().sub(this.mesh.position).normalize();
    this.mesh.position.addScaledVector(dir, 32.0 * dt);
    this.wyvernGroup.rotation.x = 0.55;

    if (distToPlayer < 6.0) {
      this.playerController.receiveHit(this.damage, this.mesh.position);
      useGameStore.getState().setBattleBanner("KORRATH: WYVERN DIVE TALON STRIKE!", 1.5);
      this.aerialAttackState = 'idle';
      this.isDiving = false;
      this.attackTimer = 0;
    } else if (this.mesh.position.y <= 6.0) {
      this.aerialAttackState = 'idle';
      this.isDiving = false;
      this.attackTimer = 0;
    }
  }

  /**
   * Flame Wall Sweep — Wyvern breathes a sweeping arc of fire across the player's flight path.
   * Player must barrel roll through it or climb over.
   */
  private updateFlameWall(dt: number, playerPos: THREE.Vector3): void {
    this.flameWallDuration += dt;
    this.flameWallAngle += dt * 2.0; // Sweeping speed

    // Face the player during sweep
    const toPlayer = playerPos.clone().sub(this.mesh.position);
    toPlayer.y = 0;
    toPlayer.normalize();
    const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, dt * 3.0);

    // Emit sweeping fire particle wall
    const sweepWidth = 30;
    const sweepOffset = Math.sin(this.flameWallAngle) * sweepWidth;
    const wallCenter = this.mesh.position.clone().add(
      toPlayer.multiplyScalar(20).add(new THREE.Vector3(sweepOffset * 0.5, 0, sweepOffset * 0.5))
    );

    // Spawn flame wall particles
    for (let i = 0; i < 5; i++) {
      const spread = (i - 2) * 3;
      this.particles.burst({
        position: wallCenter.clone().add(new THREE.Vector3(spread, Math.random() * 3 - 1, spread * 0.5)),
        count: 4,
        speed: 8,
        life: 0.8,
        size: 0.6,
        color: new THREE.Color(0xf97316),
      });
    }

    // Damage check — player in the fire wall zone
    const distToWall = playerPos.distanceTo(wallCenter);
    if (distToWall < 8.0) {
      this.playerController.receiveHit(Math.round(this.damage * 0.6), this.mesh.position);
    }

    // End after 2.5 seconds
    if (this.flameWallDuration >= 2.5) {
      this.aerialAttackState = 'idle';
      this.attackTimer = 0;
    }
  }

  /**
   * Corkscrew Pursuit — Korrath spirals toward the player in a helix pattern.
   * Contact deals damage. Player must outmaneuver with sharp banking.
   */
  private updateCorkscrewPursuit(dt: number, playerPos: THREE.Vector3, distToPlayer: number): void {
    this.corkscrewAngle += dt * 8.0;
    this.aerialAttackTimer += dt;

    // Helical approach toward player
    const toPlayer = playerPos.clone().sub(this.mesh.position).normalize();
    const helixRadius = 6.0;
    const helixOffset = new THREE.Vector3(
      Math.cos(this.corkscrewAngle) * helixRadius,
      Math.sin(this.corkscrewAngle) * helixRadius * 0.5,
      0
    );

    // Rotate helix offset to face player
    const right = new THREE.Vector3().crossVectors(toPlayer, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, toPlayer).normalize();
    const worldOffset = right.multiplyScalar(helixOffset.x).add(up.multiplyScalar(helixOffset.y));

    const targetPos = playerPos.clone().add(worldOffset);
    this.mesh.position.lerp(targetPos, Math.min(1, 5.0 * dt));
    this.mesh.lookAt(playerPos);

    // Banking roll visual
    this.wyvernGroup.rotation.z = Math.sin(this.corkscrewAngle) * 0.8;

    // Smoke trail
    if (Math.random() < 0.4) {
      this.particles.burst({
        position: this.mesh.position.clone(),
        count: 3,
        speed: 5,
        life: 0.4,
        size: 0.4,
        color: new THREE.Color(0xdc2626),
      });
    }

    // Contact damage
    if (distToPlayer < 5.0) {
      this.playerController.receiveHit(Math.round(this.damage * 1.2), this.mesh.position);
      useGameStore.getState().setBattleBanner("KORRATH: CORKSCREW STRIKE!", 1.5);
      this.aerialAttackState = 'idle';
      this.attackTimer = 0;
    }

    // Time out after 4 seconds
    if (this.aerialAttackTimer >= 4.0) {
      this.aerialAttackState = 'idle';
      this.aerialAttackTimer = 0;
      this.attackTimer = 0;
      this.wyvernGroup.rotation.z = 0.35;
    }
  }

  /**
   * Corrupted Fireball Volley — 5-shot spread pattern with red tracers.
   */
  private updateFireballVolley(dt: number, playerPos: THREE.Vector3): void {
    this.volleyInterval += dt;

    // Face player
    const toPlayer = playerPos.clone().sub(this.mesh.position);
    toPlayer.y = 0;
    toPlayer.normalize();
    const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, dt * 5.0);

    // Fire one shot every 0.35 seconds
    if (this.volleyInterval >= 0.35 && this.volleyShotsFired < 5) {
      this.volleyInterval = 0;
      this.volleyShotsFired++;

      // Spread angle for each shot
      const spreadAngles = [-0.3, -0.15, 0, 0.15, 0.3];
      const spreadAngle = spreadAngles[this.volleyShotsFired - 1];

      const fireDir = playerPos.clone().sub(this.mesh.position).normalize();
      // Apply horizontal spread
      const cos = Math.cos(spreadAngle);
      const sin = Math.sin(spreadAngle);
      const rotX = fireDir.x * cos - fireDir.z * sin;
      const rotZ = fireDir.x * sin + fireDir.z * cos;
      fireDir.x = rotX;
      fireDir.z = rotZ;

      // Red tracer VFX per shot
      this.particles.burst({
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 0, -3)),
        count: 12,
        speed: 20,
        life: 0.6,
        size: 0.4,
        color: new THREE.Color(0xef4444),
      });

      // Damage check (simplified projectile — instant raycast-style)
      const distToPlayer = this.mesh.position.distanceTo(playerPos);
      if (distToPlayer < 50) {
        // Accuracy decreases with spread
        const hitChance = 0.5 - Math.abs(spreadAngle) * 0.5;
        if (Math.random() < hitChance) {
          this.playerController.receiveHit(Math.round(this.damage * 0.5), this.mesh.position);
        }
      }

      audioManager.playSFX("fire_charge");
    }

    // End after all 5 shots
    if (this.volleyShotsFired >= 5 && this.volleyInterval >= 0.3) {
      this.aerialAttackState = 'idle';
      this.attackTimer = 0;
    }
  }

  /**
   * Transition from aerial wyvern to ground duel.
   */
  private updateCrashTransition(dt: number): void {
    // Crash wyvern into platform
    this.mesh.position.lerp(this.arenaCenter, Math.min(1, 4.0 * dt));
    this.wyvernGroup.rotation.x += 2.0 * dt;
    this.wyvernGroup.rotation.z += 1.5 * dt;

    if (this.mesh.position.distanceTo(this.arenaCenter) < 1.0) {
      this.phase = "ground";
      this.wyvernGroup.visible = false;
      this.groundKorrathMesh.visible = true;
      this.mesh.position.copy(this.arenaCenter);

      // Huge dust and ash explosion
      this.particles.burst({
        position: this.arenaCenter.clone(),
        count: 50,
        speed: 18,
        life: 1.0,
        size: 0.6,
        color: new THREE.Color(0xdc2626),
      });

      useGameStore.getState().setBattleBanner("WYVERN DOWN! GROUND DUEL WITH KORRATH!", 3.0);
      audioManager.playSFX("dive_impact");
    }
  }

  /**
   * Phase 2: Intense ground sword duel on reef outpost.
   */
  private updateGroundPhase(dt: number): void {
    const playerPos = this.playerGroup.position;
    const distToPlayer = this.mesh.position.distanceTo(playerPos);

    // Look at player
    const dir = playerPos.clone().sub(this.mesh.position);
    dir.y = 0;
    dir.normalize();
    const targetAngle = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y = targetAngle;

    // Check if currently staggered
    if (this.state === "stagger") {
      this.staggerStarsGroup.rotation.y += 6.0 * dt;
      this.staggerTimer -= dt;

      if (this.staggerTimer <= 0) {
        // Recover poise
        this.staggerPoise = this.maxStaggerPoise;
        this.state = "fight";
        this.staggerStarsGroup.visible = false;
        this.groundKorrathMesh.rotation.x = 0;
        this.dualBlades[0].rotation.x = 0.4;
        this.dualBlades[1].rotation.x = 0.4;
        this.attackTimer = 0;

        useGameStore.getState().setBattleBanner("KORRATH RECOVERS HIS GUARD!", 2.0);
        audioManager.playSFX("boss_defeat_impact");

        this.particles.burst({
          position: this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)),
          count: 30,
          speed: 12,
          life: 0.6,
          size: 0.5,
          color: new THREE.Color(0xf97316),
        });
      }
      return;
    }

    // Check if poise was broken
    if (this.staggerPoise <= 0) {
      this.state = "stagger";
      this.staggerTimer = 3.5;
      this.staggerStarsGroup.visible = true;
      this.groundKorrathMesh.rotation.x = -0.45; // kneel
      this.dualBlades[0].rotation.x = 1.2;      // dropped blades
      this.dualBlades[1].rotation.x = 1.2;
      this.isWindup = false;

      useGameStore.getState().setBattleBanner("KORRATH POISE BROKEN! UNLEASH PUNISH (2.0x CRITICAL)!", 3.2);
      audioManager.playSFX("boss_defeat_impact");
      useGameStore.getState().triggerHitFreeze(0.12, 0.05);
      return;
    }

    if (distToPlayer > 3.0 && !this.isWindup) {
      // Dash toward player
      this.mesh.position.addScaledVector(dir, 9.0 * dt);
    } else {
      // In melee range: attack combos with telegraph windup
      if (this.attackTimer >= 1.6 && !this.isWindup) {
        this.isWindup = true;
        this.windupTimer = 0.35;
        this.flameLight.intensity = 5.0;
        useGameStore.getState().setBattleBanner("KORRATH: ASHSCALE FURY — PREPARE PARRY [Q]!", 0.8);
      }

      if (this.isWindup) {
        this.windupTimer -= dt;
        if (this.windupTimer <= 0) {
          this.isWindup = false;
          this.flameLight.intensity = 2.5;
          this.executeGroundCombo();
          this.attackTimer = 0;
        }
      }
    }
  }

  /**
   * Execute ground dual-blade combo.
   */
  private executeGroundCombo(): void {
    const wasParried = this.playerController.receiveHit(this.damage, this.mesh.position);

    if (wasParried) {
      this.staggerPoise = Math.max(0, this.staggerPoise - 45);
      useGameStore.getState().setBattleBanner("KORRATH PARRIED!", 1.2);
      audioManager.playSFX("parry_spark");
    } else {
      useGameStore.getState().setBattleBanner("KORRATH: ASHSCALE DUAL-SLASH!", 1.2);
      audioManager.playSFX("blade_hit_flesh");
    }

    // Flame slash particles
    this.particles.burst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
      count: 20,
      speed: 12,
      life: 0.4,
      size: 0.4,
      color: new THREE.Color(0xef4444),
    });
  }

  /**
   * Take damage from player or dragon.
   */
  public takeDamage(amount: number): void {
    if (this.state === "dead") return;

    // Critical punish multiplier during poise stagger
    if (this.state === "stagger") {
      amount = Math.round(amount * 2.0);
      useGameStore.getState().triggerHitFreeze(0.08, 0.05);
      this.particles.burst({
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0)),
        count: 25,
        speed: 14,
        life: 0.5,
        size: 0.45,
        color: new THREE.Color(0xfbbf24), // Golden critical sparks
      });
      useGameStore.getState().setBattleBanner("CRITICAL PUNISH! 2.0x DAMAGE!", 0.8);
    }

    this.health = Math.max(0, this.health - amount);
    useGameStore.getState().updateBossHP(this.health);

    // Transition to phase 2 at 50% HP
    if (this.phase === "aerial" && this.health <= 400) {
      this.phase = "crash_transition";
      useGameStore.getState().setBattleBanner("IGNIS-BANE'S WING SHATTERS! CRASH LANDING!", 3.0);
      audioManager.playSFX("boss_defeat_impact");
    }

    // Defeated at 0 HP
    if (this.health <= 0) {
      this.onDefeated();
    }
  }

  /**
   * Boss defeat handler & First Moral Choice.
   */
  private onDefeated(): void {
    this.state = "dead";
    this.phase = "defeated";
    this.staggerStarsGroup.visible = false;
    this.groundKorrathMesh.rotation.x = -1.3; // fallen flat
    this.dualBlades[0].position.set(1.1, 0.1, 0.8);
    this.dualBlades[1].position.set(-1.1, 0.1, 0.8);
    this.flameLight.intensity = 0.4;

    useGameStore.getState().setActiveBoss(null);

    // Announce defeat
    useGameStore.getState().setBattleBanner(
      "KORRATH THE BRANDED DEFEATED — THE FIRST DEFIANCE",
      4.0
    );
    audioManager.playSFX("boss_defeat_impact");

    // Trigger First Moral Choice dialogue modal
    setTimeout(() => {
      useGameStore.getState().triggerDialogue(
        "Elder Min (Fisherfolk Elder)",
        "The Ashscale raider is felled... but his wyvern still breathes black flames in agony. What will you do with them, Sword Saint?",
        [
          {
            text: "[Righteous] Purify the Corrupted Wyvern with the Dragon Sword & spare Korrath",
            action: "moral_choice_purify_korrath",
          },
          {
            text: "[Demonic] Slay Korrath and consume the dragon's burning core for raw power",
            action: "moral_choice_execute_korrath",
          },
          {
            text: "[Neutral] Interrogate Korrath for Ashscale war plans to the Sky Sanctuary",
            action: "moral_choice_interrogate_korrath",
          },
        ]
      );
    }, 2000);
  }
}
