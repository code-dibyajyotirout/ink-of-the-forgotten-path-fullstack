import * as THREE from "three";
import { EnemyAI, EnemyDef } from "./EnemyAI";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { PlayerController } from "./PlayerController";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "../audio/AudioManager";

export type WyvernTier = "scout" | "patrol" | "war" | "ancient";

export interface CorruptedDragonDef extends EnemyDef {
  wyvernTier?: WyvernTier;
  wingSpan?: number;
  flightAltitude?: number;
  diveSpeed?: number;
}

const _scratchWyvernDiveDir = new THREE.Vector3();
const _scratchWyvernTargetFlyPos = new THREE.Vector3();
const _scratchWyvernFlightDir = new THREE.Vector3();
const _scratchWyvernLookTarget = new THREE.Vector3();
const _scratchWyvernHeadPos = new THREE.Vector3();

export class CorruptedDragonEnemy extends EnemyAI {
  public isFlying: boolean = true;
  public wyvernTier: WyvernTier = "scout";
  private flightAltitude: number;
  private orbitRadius: number = 28.0;
  private orbitAngle: number = 0;
  private orbitSpeed: number = 0.6;
  private wingFlapPhase: number = 0;
  private wingFlapSpeed: number = 6.0;
  private diveTimer: number = 0;
  private isDiving: boolean = false;
  private fireballCooldown: number = 3.5;
  private lastFireballTime: number = 0;

  // Visual parts for animation
  private dragonGroup!: THREE.Group;
  private leftWingRoot!: THREE.Group;
  private rightWingRoot!: THREE.Group;
  private dragonHead!: THREE.Group;
  private dragonTail!: THREE.Group;
  private eyeGlowLeft!: THREE.Mesh;
  private eyeGlowRight!: THREE.Mesh;
  private mouthFireMesh!: THREE.Mesh;

  constructor(
    def: CorruptedDragonDef,
    scene: THREE.Scene,
    particles: InkParticleSystem,
    private targetGroup: THREE.Group,
    controller: PlayerController
  ) {
    super(def, scene, particles, targetGroup, controller);
    this.wyvernTier = def.wyvernTier || "scout";
    this.flightAltitude = def.flightAltitude || (this.wyvernTier === "ancient" ? 35.0 : this.wyvernTier === "war" ? 28.0 : 22.0);
    this.orbitAngle = Math.random() * Math.PI * 2;

    // Configure flight characteristics per tier
    if (this.wyvernTier === "scout") {
      this.orbitSpeed = 0.8 + Math.random() * 0.2;
      this.orbitRadius = 24.0;
      this.wingFlapSpeed = 7.5;
      this.fireballCooldown = 4.0;
    } else if (this.wyvernTier === "patrol") {
      this.orbitSpeed = 0.65 + Math.random() * 0.15;
      this.orbitRadius = 30.0;
      this.wingFlapSpeed = 6.2;
      this.fireballCooldown = 3.2;
    } else if (this.wyvernTier === "war") {
      this.orbitSpeed = 0.5 + Math.random() * 0.1;
      this.orbitRadius = 36.0;
      this.wingFlapSpeed = 5.0;
      this.fireballCooldown = 2.6;
    } else {
      // ancient
      this.orbitSpeed = 0.38 + Math.random() * 0.08;
      this.orbitRadius = 45.0;
      this.wingFlapSpeed = 4.0;
      this.fireballCooldown = 2.0;
    }

    // Replace the default humanoid model with our sculpted Corrupted Dragon model
    this.buildCorruptedDragonMesh();
  }

  /**
   * Build sculpted Corrupted Wyvern / Ashscale Dragon mesh.
   */
  private buildCorruptedDragonMesh(): void {
    // Hide the base humanoid parts
    if (this.parts && this.parts.group) {
      this.parts.group.visible = false;
    }

    this.dragonGroup = new THREE.Group();
    this.dragonGroup.name = `CorruptedDragonBody_${this.wyvernTier}`;

    // ── Tier-Specific Materials ──
    let scaleColor = 0x1c1917;
    let scaleEmissive = 0x450a0a;
    let ridgeColor = 0xdc2626;
    let ridgeEmissive = 0xef4444;
    let eyeColor = 0xff1e00;
    let mouthLightColor = 0xff3300;
    let scaleFactor = 1.0;

    if (this.wyvernTier === "scout") {
      scaleColor = 0x262626;
      scaleEmissive = 0x3b0707;
      ridgeColor = 0xef4444;
      ridgeEmissive = 0xf87171;
      eyeColor = 0xff2200;
      mouthLightColor = 0xff4500;
      scaleFactor = 0.85;
    } else if (this.wyvernTier === "patrol") {
      scaleColor = 0x18181b;
      scaleEmissive = 0x7c2d12;
      ridgeColor = 0xf97316;
      ridgeEmissive = 0xfbbf24;
      eyeColor = 0xff5500;
      mouthLightColor = 0xf97316;
      scaleFactor = 1.15;
    } else if (this.wyvernTier === "war") {
      scaleColor = 0x1c1917;
      scaleEmissive = 0x991b1b;
      ridgeColor = 0xdc2626;
      ridgeEmissive = 0xff0000;
      eyeColor = 0xff0000;
      mouthLightColor = 0xff2200;
      scaleFactor = 1.6;
    } else {
      // ancient
      scaleColor = 0x090d16;
      scaleEmissive = 0x581c87;
      ridgeColor = 0x9333ea;
      ridgeEmissive = 0xc084fc;
      eyeColor = 0xe879f9;
      mouthLightColor = 0xa855f7;
      scaleFactor = 2.3;
    }

    const scaleMat = new THREE.MeshStandardMaterial({
      color: scaleColor,
      roughness: 0.5,
      metalness: 0.4,
      emissive: scaleEmissive,
      emissiveIntensity: 0.35,
    });

    const crimsonRidgeMat = new THREE.MeshStandardMaterial({
      color: ridgeColor,
      roughness: 0.3,
      metalness: 0.6,
      emissive: ridgeEmissive,
      emissiveIntensity: 0.7,
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: this.wyvernTier === "ancient" ? 0x1e102d : 0x271212,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      emissive: this.wyvernTier === "ancient" ? 0x6b21a8 : 0x7f1d1d,
      emissiveIntensity: 0.25,
    });

    const eyeMat = new THREE.MeshBasicMaterial({
      color: eyeColor,
    });

    this.dragonGroup.scale.setScalar(scaleFactor);

    // ── 1. Torso ──
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.5, 3.5, 8),
      scaleMat
    );
    torso.rotation.x = Math.PI / 2;
    this.dragonGroup.add(torso);

    // Spinal spikes
    for (let z = -1.4; z <= 1.4; z += 0.45) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.5, 4),
        crimsonRidgeMat
      );
      spike.position.set(0, 0.75, z);
      spike.rotation.x = 0.25;
      this.dragonGroup.add(spike);
    }

    // ── 2. Sculpted Curved Neck & Fierce Wyvern Skull ──
    const neckBase = new THREE.Group();
    neckBase.position.set(0, 0.45, -1.8);
    this.dragonGroup.add(neckBase);

    // 2-segment curved neck
    const neckLower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.62, 1.2, 8),
      scaleMat
    );
    neckLower.rotation.x = Math.PI / 3.0;
    neckLower.position.set(0, 0.35, -0.45);
    neckBase.add(neckLower);

    const neckLowerSpike = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.55, 4),
      crimsonRidgeMat
    );
    neckLowerSpike.position.set(0, 0.65, -0.45);
    neckLowerSpike.rotation.x = 0.6;
    neckBase.add(neckLowerSpike);

    const neckUpper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.48, 1.1, 7),
      scaleMat
    );
    neckUpper.rotation.x = Math.PI / 4.2;
    neckUpper.position.set(0, 0.85, -1.25);
    neckBase.add(neckUpper);

    const neckUpperSpike = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.48, 4),
      crimsonRidgeMat
    );
    neckUpperSpike.position.set(0, 1.15, -1.25);
    neckUpperSpike.rotation.x = 0.5;
    neckBase.add(neckUpperSpike);

    // Wyvern Head Root Group
    this.dragonHead = new THREE.Group();
    this.dragonHead.position.set(0, 1.2, -1.9);
    neckBase.add(this.dragonHead);

    // Main cranium (tapered prism)
    const craniumMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1.1, 6),
      scaleMat
    );
    craniumMesh.rotation.x = Math.PI / 2;
    craniumMesh.position.set(0, 0.05, -0.35);
    craniumMesh.scale.set(1.1, 0.75, 1.0);
    this.dragonHead.add(craniumMesh);

    // Tapered predatory muzzle / snout
    const snoutMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.35, 1.2, 5),
      scaleMat
    );
    snoutMesh.rotation.x = Math.PI / 2;
    snoutMesh.position.set(0, -0.02, -1.25);
    snoutMesh.scale.set(0.95, 0.65, 1.0);
    this.dragonHead.add(snoutMesh);

    // Rostral horn on nose tip
    const rostralSpike = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.4, 4),
      crimsonRidgeMat
    );
    rostralSpike.position.set(0, 0.1, -1.8);
    rostralSpike.rotation.x = 0.75;
    this.dragonHead.add(rostralSpike);

    // Armored brow plates
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.14, 0.7),
        scaleMat
      );
      brow.position.set(side * 0.32, 0.18, -0.65);
      brow.rotation.set(0.2, side * -0.25, side * -0.3);
      this.dragonHead.add(brow);

      // Cheek spikes
      const cheek = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.6, 4),
        crimsonRidgeMat
      );
      cheek.position.set(side * 0.42, -0.08, -0.2);
      cheek.rotation.set(1.1, side * 0.4, side * 0.6);
      this.dragonHead.add(cheek);
    }

    // Glowing corrupted eyes
    const eyeGeo = new THREE.SphereGeometry(0.09, 6, 6);
    this.eyeGlowLeft = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeGlowLeft.position.set(0.35, 0.1, -0.7);
    this.dragonHead.add(this.eyeGlowLeft);

    this.eyeGlowRight = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeGlowRight.position.set(-0.35, 0.1, -0.7);
    this.dragonHead.add(this.eyeGlowRight);

    // Volcanic mouth glow ember
    this.mouthFireMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      new THREE.MeshBasicMaterial({ color: mouthLightColor })
    );
    this.mouthFireMesh.position.set(0, -0.06, -1.0);
    this.dragonHead.add(this.mouthFireMesh);

    // Wyvern Fangs
    for (const side of [-1, 1]) {
      const fang = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.38, 4),
        crimsonRidgeMat
      );
      fang.position.set(side * 0.18, -0.2, -1.2);
      fang.rotation.set(-0.2, 0, side * -0.15);
      this.dragonHead.add(fang);
    }

    // Swept-back Jagged Crown Horns
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 1.25, 5),
        crimsonRidgeMat
      );
      horn.position.set(side * 0.32, 0.35, 0.1);
      horn.rotation.set(0.75, side * 0.28, side * 0.35);
      this.dragonHead.add(horn);

      const subHorn = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.7, 4),
        scaleMat
      );
      subHorn.position.set(side * 0.38, 0.18, 0.05);
      subHorn.rotation.set(1.1, side * 0.4, side * 0.5);
      this.dragonHead.add(subHorn);
    }

    // ── 3. Articulated Wings ──
    // Left Wing
    this.leftWingRoot = new THREE.Group();
    this.leftWingRoot.position.set(0.6, 0.4, -0.4);

    const leftWingArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 2.6, 6),
      scaleMat
    );
    leftWingArm.position.set(1.2, 0, 0);
    leftWingArm.rotation.z = -Math.PI / 3;
    this.leftWingRoot.add(leftWingArm);

    const leftMembrane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 2.2),
      wingMat
    );
    leftMembrane.position.set(1.8, -0.2, 0.5);
    leftMembrane.rotation.x = Math.PI / 2;
    this.leftWingRoot.add(leftMembrane);
    this.dragonGroup.add(this.leftWingRoot);

    // Right Wing
    this.rightWingRoot = new THREE.Group();
    this.rightWingRoot.position.set(-0.6, 0.4, -0.4);

    const rightWingArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 2.6, 6),
      scaleMat
    );
    rightWingArm.position.set(-1.2, 0, 0);
    rightWingArm.rotation.z = Math.PI / 3;
    this.rightWingRoot.add(rightWingArm);

    const rightMembrane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 2.2),
      wingMat
    );
    rightMembrane.position.set(-1.8, -0.2, 0.5);
    rightMembrane.rotation.x = Math.PI / 2;
    this.rightWingRoot.add(rightMembrane);
    this.dragonGroup.add(this.rightWingRoot);

    // ── 4. Tail with Segment Joint ──
    this.dragonTail = new THREE.Group();
    this.dragonTail.position.set(0, 0, 1.8);

    const tailMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 3.2, 6),
      scaleMat
    );
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.set(0, 0, 1.5);
    this.dragonTail.add(tailMesh);
    this.dragonGroup.add(this.dragonTail);

    this.mesh.add(this.dragonGroup);

    // Initial position at flight altitude
    this.mesh.position.y = Math.max(this.mesh.position.y, this.flightAltitude);
  }

  // Grounded crash state (brought down by Flying Sword, Sky Cleave, or Parry)
  public isGroundedCrash: boolean = false;
  private groundedTimer: number = 0;
  private isLowHovering: boolean = false;
  private lowHoverTimer: number = 0;
  private hasExplodedGround: boolean = false;

  /**
   * Override update with full 3D aerial dogfight & low-altitude combat loop.
   */
  public override update(dt: number, camera: THREE.Camera): void {
    if (this.state === "dead") {
      this.updateDead(dt);
      return;
    }

    // Process burn / frozen timers
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      if (Math.random() < 0.25) {
        useGameStore.getState().addDamagePopup(
          Math.ceil(18 * dt),
          false,
          this.mesh.position.toArray() as [number, number, number],
          "#ff5500"
        );
      }
    }

    // ── Grounded Crash State: Brought Down to Earth! ──
    if (this.isGroundedCrash) {
      this.groundedTimer -= dt;
      this.dragonGroup.rotation.set(0.2, 0, 0.45); // Collapsed on flank
      if (this.leftWingRoot) this.leftWingRoot.rotation.z = 0.8;
      if (this.rightWingRoot) this.rightWingRoot.rotation.z = -0.3;

      // Stun stars above head
      if (Math.random() < 0.4) {
        this.dragonHead.getWorldPosition(_scratchWyvernHeadPos);
        this.particles.emitBurst({
          position: _scratchWyvernHeadPos.add(new THREE.Vector3(0, 1.2, 0)),
          count: 3,
          speed: 1.5,
          life: 0.4,
          size: 0.25,
          color: new THREE.Color(0xfbbf24),
        });
      }

      if (this.groundedTimer <= 0) {
        // Recover from ground crash
        this.isGroundedCrash = false;
        audioManager.playSFX("dragon_roar");
        useGameStore.getState().setBattleBanner(`${this.wyvernTier.toUpperCase()} WYVERN RECOVERS AND TAKES FLIGHT!`, 2.0);
      }
      return;
    }

    // ── Wing Flapping Animation ──
    this.wingFlapPhase += dt * (this.isDiving ? this.wingFlapSpeed * 1.8 : this.wingFlapSpeed);
    const wingAngle = Math.sin(this.wingFlapPhase) * 0.45;
    if (this.leftWingRoot) this.leftWingRoot.rotation.z = -wingAngle;
    if (this.rightWingRoot) this.rightWingRoot.rotation.z = wingAngle;

    // Subtle tail sway
    if (this.dragonTail) {
      this.dragonTail.rotation.y = Math.sin(this.wingFlapPhase * 0.6) * 0.25;
    }

    // ── Aerial Flight AI ──
    const targetPos = this.targetGroup.position;
    const distToTarget = this.mesh.position.distanceTo(targetPos);

    if (this.isLowHovering) {
      // ── Low-Altitude Skimming Hover: Vulnerable to Jump, Dash, and Heavy Sword Attacks! ──
      this.lowHoverTimer -= dt;
      const desiredHoverY = targetPos.y + 3.2; // Chest/Head height for on-foot player
      this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, desiredHoverY, dt * 4.0);

      // Circle tightly near ground level
      this.orbitAngle += this.orbitSpeed * 1.2 * dt;
      const hoverX = targetPos.x + Math.cos(this.orbitAngle) * 9.0;
      const hoverZ = targetPos.z + Math.sin(this.orbitAngle) * 9.0;
      this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, hoverX, dt * 3.5);
      this.mesh.position.z = THREE.MathUtils.lerp(this.mesh.position.z, hoverZ, dt * 3.5);

      this.mesh.lookAt(targetPos.x, desiredHoverY, targetPos.z);
      this.dragonGroup.rotation.z = 0.2;

      if (this.lowHoverTimer <= 0) {
        this.isLowHovering = false;
        this.diveTimer = 0;
      }
    } else if (this.isDiving) {
      // ── Aggressive Swoop Dive: Plunges directly down to chest height (y = 1.6m) ──
      _scratchWyvernTargetFlyPos.copy(targetPos).add(new THREE.Vector3(0, 1.4, 0));
      _scratchWyvernDiveDir.subVectors(_scratchWyvernTargetFlyPos, this.mesh.position).normalize();
      this.mesh.position.addScaledVector(_scratchWyvernDiveDir, 36.0 * dt);

      // Banking dive angle
      this.dragonGroup.rotation.x = 0.65;
      this.dragonGroup.rotation.z = Math.sin(this.orbitAngle) * 0.35;
      this.mesh.lookAt(_scratchWyvernTargetFlyPos);

      // Close enough to hit or be counter-attacked?
      if (distToTarget < 4.8) {
        this.executeAerialStrike();
        this.isDiving = false;
        this.isLowHovering = true;
        this.lowHoverTimer = 2.0; // Stay low and vulnerable for 2 seconds!
        this.diveTimer = 0;
      } else if (this.mesh.position.y <= targetPos.y + 1.2) {
        // Skimmed ground surface, transition to low hover
        this.isDiving = false;
        this.isLowHovering = true;
        this.lowHoverTimer = 2.0;
        this.diveTimer = 0;
      }
    } else {
      // ── High Altitude Circling / Patrol (zero GC) ──
      this.orbitAngle += this.orbitSpeed * dt;
      const desiredX = targetPos.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      const desiredZ = targetPos.z + Math.sin(this.orbitAngle) * this.orbitRadius;
      const desiredY = Math.max(14.0, targetPos.y + this.flightAltitude);

      _scratchWyvernTargetFlyPos.set(desiredX, desiredY, desiredZ);
      this.mesh.position.lerp(_scratchWyvernTargetFlyPos, Math.min(1, 2.5 * dt));

      // Face in the direction of flight path
      _scratchWyvernFlightDir.set(
        -Math.sin(this.orbitAngle),
        0,
        Math.cos(this.orbitAngle)
      );
      _scratchWyvernLookTarget.copy(this.mesh.position).add(_scratchWyvernFlightDir);
      this.mesh.lookAt(_scratchWyvernLookTarget);

      // Bank into the turn
      this.dragonGroup.rotation.z = 0.35;
      this.dragonGroup.rotation.x = -0.08;

      // ── Fireball attack when facing roughly towards player ──
      this.diveTimer += dt;
      this.lastFireballTime += dt;

      if (this.lastFireballTime >= this.fireballCooldown && distToTarget < 60.0) {
        this.shootCorruptedFireball(targetPos);
        this.lastFireballTime = 0;
      }

      // Ready for low swoop dive bomb? Frequent attacks (every 3.2s)
      if (this.diveTimer >= 3.2 && distToTarget < 85.0) {
        this.isDiving = true;
        audioManager.playSFX("dragon_roar");
        useGameStore.getState().setBattleBanner(`${this.wyvernTier.toUpperCase()} WYVERN DIVING AT CHEST HEIGHT!`, 1.4);
      }
    }
  }

  /**
   * Drag wyvern out of the sky into a grounded crash landing.
   */
  public crashGround(duration: number = 4.5): void {
    if (this.state === "dead") return;
    this.isDiving = false;
    this.isLowHovering = false;
    this.isGroundedCrash = true;
    this.groundedTimer = duration;

    // Ground crash position
    const targetGroundY = Math.max(1.4, this.targetGroup.position.y);
    this.mesh.position.y = targetGroundY;

    // Impact VFX & SFX
    audioManager.playSFX("boss_defeat_impact");
    this.particles.emitBurst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
      count: 36,
      speed: 8.0,
      life: 0.6,
      size: 0.45,
      color: new THREE.Color(0xdc2626),
    });

    useGameStore.getState().setBattleBanner(`${this.wyvernTier.toUpperCase()} WYVERN BROUGHT DOWN TO EARTH — UNLEASH BLADE COMBOS!`, 3.0);
  }

  /**
   * Shoot a corrupted dark-flame fireball at the target.
   */
  private shootCorruptedFireball(targetPos: THREE.Vector3): void {
    this.dragonHead.getWorldPosition(_scratchWyvernHeadPos);

    // Spawn visual dark-fire burst from mouth (zero React re-render thrashing)
    this.particles.emitBurst({
      position: _scratchWyvernHeadPos,
      count: 14,
      speed: 6.5,
      life: 0.4,
      size: 0.32,
      color: new THREE.Color(0xdc2626),
    });

    // Play roar SFX
    audioManager.playSFX("fire_charge");
  }

  /**
   * Execute physical aerial strike if player doesn't dodge or parry.
   */
  private executeAerialStrike(): void {
    const store = useGameStore.getState();
    const dragonState = store.dragon;

    const tierDmg =
      this.wyvernTier === "ancient"
        ? 55
        : this.wyvernTier === "war"
        ? 38
        : this.wyvernTier === "patrol"
        ? 26
        : 18;

    if (dragonState.isMounted) {
      // Hits Veyros
      store.setDragonHP(Math.max(0, dragonState.hp - tierDmg));
      store.setBattleBanner(`VEYROS STRUCK BY ${this.wyvernTier.toUpperCase()} WYVERN!`, 1.8);
      audioManager.playSFX("blade_hit_flesh");
    } else {
      // Hits player on foot
      store.takeDamage(tierDmg);
      store.setBattleBanner(`${this.wyvernTier.toUpperCase()} WYVERN DIVE IMPACT!`, 1.5);
    }

    if (this.wyvernTier === "ancient" || this.wyvernTier === "war") {
      audioManager.playSFX("boss_defeat_impact");
    }
  }

  /**
   * Fiery death crash spiral when defeated: plummets with thick smoke and explodes into earth shockwave!
   */
  private updateDead(dt: number): void {
    // Accelerate downward rapidly (gravity plunge)
    this.mesh.position.y -= 36.0 * dt;
    this.dragonGroup.rotation.z += 6.5 * dt;
    this.dragonGroup.rotation.x += 4.2 * dt;

    // Trailing fiery black smoke plume
    if (Math.random() < 0.6) {
      this.particles.emitBurst({
        position: this.mesh.position,
        count: 5,
        speed: 3.5,
        life: 0.5,
        size: 0.4,
        color: new THREE.Color(0x18181b),
      });
    }

    // Earth impact threshold
    const groundLevel = Math.max(1.0, this.targetGroup.position.y - 0.5);
    if (this.mesh.position.y <= groundLevel && !this.hasExplodedGround) {
      this.hasExplodedGround = true;
      audioManager.playSFX("boss_defeat_impact");

      // Catastrophic earth shockwave & crater burst
      this.particles.emitBurst({
        position: this.mesh.position,
        count: 55,
        speed: 12.0,
        life: 0.9,
        size: 0.5,
        color: new THREE.Color(0xef4444),
      });

      useGameStore.getState().setBattleBanner(`${this.wyvernTier.toUpperCase()} WYVERN SHATTERED ON IMPACT!`, 2.5);

      setTimeout(() => {
        if (this.mesh.parent) {
          this.mesh.parent.remove(this.mesh);
        }
      }, 350);
    }
  }
}
