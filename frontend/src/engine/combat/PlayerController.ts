import * as THREE from "three";
import { InputState, GameAction } from "../input/InputManager";
import { useGameStore, GowWeapon } from "@/stores/gameStore";
import { PROFESSIONS, ProfessionId, ProfessionDef } from "@/data/professions";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { InkSlashManager } from "../rendering/InkSlashMesh";
import { CameraController } from "../rendering/CameraController";
import { CollisionSystem } from "../physics/CollisionSystem";
import { audioManager } from "../audio/AudioManager";
import { MythicCharacterModel, MythicCharacterParts } from "../rendering/MythicCharacterModel";
import { MythicWeaponModels } from "../rendering/MythicWeaponModels";
import { DragonMount } from "../world/DragonMount";
import { WindSlipstreamSystem } from "../world/WindSlipstreamSystem";

export type PlayerAnimState =
  | "idle"
  | "run"
  | "attack_light_1"
  | "attack_light_2"
  | "attack_light_3"
  | "attack_light_4"
  | "attack_light_5"
  | "attack_heavy"
  | "attack_heavy_charge"
  | "attack_dash"
  | "attack_jump"
  | "dodge"
  | "block"
  | "parry"
  | "stagger"
  | "awakening"
  | "dead";

const _scratchCamDir = new THREE.Vector3();
const _scratchDragonFwd = new THREE.Vector3();
const _scratchDragonUp = new THREE.Vector3();
const _scratchDragonRight = new THREE.Vector3();
const _scratchRiderQuat = new THREE.Quaternion();
const _scratchRiderEuler = new THREE.Euler(0, 0, 0, "YXZ");
const _scratchUprightEuler = new THREE.Euler(0, 0, 0, "YXZ");
const _scratchAimAssistDir = new THREE.Vector3();

export class PlayerController {
  state: PlayerAnimState = "idle";
  stateTimer: number = 0;
  comboCount: number = 0;
  comboTimer: number = 0;
  public axeAimAssistTarget: any = null;

  // Stance & Weapon references
  private weaponMesh!: THREE.Mesh | THREE.Group;
  private offhandWeaponMesh: THREE.Mesh | THREE.Group | null = null;
  private floatingOrbs: THREE.Mesh[] = [];
  private rightArmMesh!: THREE.Object3D;
  private leftArmMesh!: THREE.Object3D;
  private rightLegMesh!: THREE.Object3D;
  private leftLegMesh!: THREE.Object3D;
  private bodyMesh!: THREE.Object3D;
  private capeSegments: THREE.Mesh[] = [];
  private weaponAnchor?: THREE.Group;
  private offhandAnchor?: THREE.Group;
  private mythicParts?: MythicCharacterParts;
  public isExecuting: boolean = false;
  private executionTimer: number = 0;
  private rageAuraMesh: THREE.Mesh | null = null;
  private storePosTimer: number = 0;

  // God of War Ragnarök Systems
  public activeGowWeapon: GowWeapon = "axe";
  private dauntlessShieldMesh: THREE.Group | null = null;
  private thrownAxeMesh: THREE.Group | null = null;
  public axeThrowState: "idle" | "thrown" | "embedded" | "recalling" = "idle";
  private axeFlightVelocity: THREE.Vector3 = new THREE.Vector3();
  private axeFlightTimer: number = 0;
  private axeRecallTimer: number = 0;
  private axeEmbedTarget: any = null;
  private axeEmbedLocalPos: THREE.Vector3 = new THREE.Vector3();

  // Travelling Sky Aura Slash Projectiles & Bleed Status System
  private auraSlashProjectiles: Array<{
    mesh: THREE.Group;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    damage: number;
    bleedDuration: number;
    bleedDps: number;
    color: THREE.Color;
    target?: any;
    hitRadius?: number;
    isMountedStrike?: boolean;
  }> = [];

  private activeBleeds: Array<{
    target: any;
    remainingTime: number;
    tickTimer: number;
    dps: number;
    name?: string;
  }> = [];

  // Combat properties
  private readonly dodgeDuration = 0.4;
  private readonly blockDuration = 0.25; // initial parry window
  private isInvulnerable: boolean = false;
  private invulnerableTimer: number = 0;
  private triggerBackflowPush: boolean = false;
  private attackDamage: number = 15;
  public hasHitInCurrentAttack: boolean = false;
  private currentWeaponType: string = "";

  // Charging heavy attack
  private chargeTimer: number = 0;
  private isFullyCharged: boolean = false;

  // Afterimages
  private afterimages: {
    group: THREE.Group;
    life: number;
    maxLife: number;
  }[] = [];

  // 3D Awakening Sequence fields
  public isAwakening: boolean = false;
  private awakeningTimer: number = 0;
  private awakeningPillarMesh: THREE.Mesh | null = null;
  private awakeningShockwaveRing: THREE.Mesh | null = null;

  // Dodge direction saved at start (prevents procedural spin from corrupting movement)
  private dodgeDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  // Saved facing direction for dodge (to restore after spin animation)
  private preDodgeRotationY: number = 0;

  // Technique cast timers/states
  private activeBubbleShield: THREE.Mesh | null = null;
  private bubbleShieldTimer: number = 0;
  private slowZoneIndicator: THREE.Mesh | null = null;
  private slowZoneTimer: number = 0;
  private activeSlashes: {
    mesh: THREE.Mesh;
    maxLife: number;
    life: number;
    velocity: THREE.Vector3;
    growScale: number;
    rotateSpeed: number;
  }[] = [];

  // Where Winds Meet Qinggong Traversal variables
  public velocityY: number = 0;
  private readonly gravity: number = -24.0;
  public isGrounded: boolean = true;
  public jumpCount: number = 0;
  public isGliding: boolean = false;
  public isAirDashing: boolean = false;
  private airDashTimer: number = 0;
  private airDashDir: THREE.Vector3 = new THREE.Vector3();
  public isDiveSlamming: boolean = false;
  public currentGroundHeight: number = 120.0;
  private wallKickCooldown: number = 0;
  public slashManager?: InkSlashManager;
  public dragonMount?: DragonMount;
  public windSlipstream?: WindSlipstreamSystem;

  // (Swimming/Diving removed — highland sky world)
  private readonly CLOUD_FLOOR_Y: number = -50.0; // Hard respawn floor below cloud sea
  private spawnGracePeriod: number = 2.5; // Prevent any landing sounds during initial spawn & level initialization

  public setFlightSystems(dragonMount: DragonMount, windSlipstream: WindSlipstreamSystem): void {
    this.dragonMount = dragonMount;
    this.windSlipstream = windSlipstream;
  }

  constructor(
    private playerGroup: THREE.Group,
    private particles: InkParticleSystem,
    private cameraController: CameraController,
    private collisions: CollisionSystem,
    slashManager?: InkSlashManager,
    mythicParts?: MythicCharacterParts
  ) {
    this.slashManager = slashManager;
    this.mythicParts = mythicParts;
    if (mythicParts) {
      this.rightArmMesh = mythicParts.rightArmMesh;
      this.leftArmMesh = mythicParts.leftArmMesh;
      this.rightLegMesh = mythicParts.rightLegMesh;
      this.leftLegMesh = mythicParts.leftLegMesh;
      this.bodyMesh = mythicParts.bodyMesh;
      this.capeSegments = mythicParts.capeSegments;
      this.weaponAnchor = mythicParts.weaponAnchor;
      this.offhandAnchor = mythicParts.offhandAnchor;
    } else {
      this.extractLimbs();
    }
    this.playerGroup.rotation.order = "YXZ";
    const store = useGameStore.getState();
    this.buildGowWeapon(store.player.gowWeapon || "axe");
    this.createRageAura();
  }

  public getStanceColor(): THREE.Color {
    const store = useGameStore.getState();
    if (store.player.stance === "iron_body") return new THREE.Color(0xffb300);
    if (store.player.stance === "thunderclap") return new THREE.Color(0x9c27b0);
    return new THREE.Color(0x00e5ff);
  }

  /**
   * Find limb meshes in the group for procedural animation.
   */
  private extractLimbs(): void {
    this.playerGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.position.x > 0.3 && child.position.y > 1.0) {
          this.rightArmMesh = child;
        } else if (child.position.x < -0.3 && child.position.y > 1.0) {
          this.leftArmMesh = child;
        } else if (child.position.x > 0.1 && child.position.y < 0.5) {
          this.rightLegMesh = child;
        } else if (child.position.x < -0.1 && child.position.y < 0.5) {
          this.leftLegMesh = child;
        } else if (child.position.y > 1.0 && child.position.y < 1.9) {
          this.bodyMesh = child;
        }
      }
    });
  }

  /**
   * Procedurally generate 3D weapon meshes based on the chosen Murim weapon path.
   */
  public buildWeaponForProfession(profId?: ProfessionId): void {
    const store = useGameStore.getState();
    const pid = profId || (store.player.profession as ProfessionId) || "sword_sage";
    const prof = PROFESSIONS[pid] || PROFESSIONS.sword_sage;
    this.currentWeaponType = pid;

    // Remove existing weapon meshes
    if (this.weaponMesh && this.weaponMesh.parent) {
      this.weaponMesh.parent.remove(this.weaponMesh);
    }
    if (this.offhandWeaponMesh && this.offhandWeaponMesh.parent) {
      this.offhandWeaponMesh.parent.remove(this.offhandWeaponMesh);
      this.offhandWeaponMesh = null;
    }
    this.floatingOrbs.forEach((orb) => {
      if (orb.parent) orb.parent.remove(orb);
    });
    this.floatingOrbs = [];

    const meshType = prof.weaponMeshType || "odachi";
    const weaponColorHex = new THREE.Color(prof.weaponColor || 0x22d3ee).getHex();

    if (meshType === "odachi") {
      // ─── Heaven-Cleaving Odachi ───
      // Massive curved greatsword: 1.7m blade, tsuba guard, long wrapped tsuka
      const group = new THREE.Group();
      
      const bladeGeo = new THREE.BoxGeometry(0.16, 1.7, 0.05);
      const pos = bladeGeo.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y > 0.5) {
          pos.setX(i, pos.getX(i) * 0.3);
          pos.setZ(i, pos.getZ(i) * 0.3);
        }
        pos.setZ(i, pos.getZ(i) + Math.pow(Math.max(0, y + 0.5), 1.5) * 0.06);
      }
      bladeGeo.computeVertexNormals();

      const bladeMat = new THREE.MeshLambertMaterial({ color: 0x111111, flatShading: true });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 0.85;
      group.add(blade);

      const edgeLine = new THREE.LineSegments(
        new THREE.EdgesGeometry(bladeGeo),
        new THREE.LineBasicMaterial({ color: weaponColorHex })
      );
      blade.add(edgeLine);

      const tsubaGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12);
      const tsuba = new THREE.Mesh(tsubaGeo, new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true }));
      tsuba.position.y = 0.02;
      group.add(tsuba);

      const hiltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8);
      const hilt = new THREE.Mesh(hiltGeo, new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true }));
      hilt.position.y = -0.27;
      group.add(hilt);

      group.position.set(0, 0, 0.05);
      group.rotation.set(-0.15, 0, 0);
      this.weaponMesh = group;

    } else if (meshType === "spear") {
      // ─── Abyssal Dragon Spear ───
      // Long 2.4m polearm with leaf spearhead and crimson silk tassel
      const group = new THREE.Group();

      const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.3, 8);
      const shaft = new THREE.Mesh(shaftGeo, new THREE.MeshLambertMaterial({ color: 0x2b1d0c, flatShading: true }));
      shaft.position.y = 0.6;
      group.add(shaft);

      const headGeo = new THREE.ConeGeometry(0.14, 0.7, 4);
      const head = new THREE.Mesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xdddddd, flatShading: true }));
      head.position.y = 1.95;
      group.add(head);

      const headLine = new THREE.LineSegments(
        new THREE.EdgesGeometry(headGeo),
        new THREE.LineBasicMaterial({ color: weaponColorHex })
      );
      head.add(headLine);

      const tasselGeo = new THREE.ConeGeometry(0.12, 0.4, 5);
      const tassel = new THREE.Mesh(tasselGeo, new THREE.MeshLambertMaterial({ color: 0xdc2626, flatShading: true }));
      tassel.position.y = 1.6;
      tassel.rotation.x = Math.PI;
      group.add(tassel);

      group.position.set(0, -0.4, 0.3);
      group.rotation.x = Math.PI / 2;
      this.weaponMesh = group;

    } else if (meshType === "dual_daggers") {
      // ─── Shadowfang Twin Blades ───
      const createDagger = () => {
        const group = new THREE.Group();
        const bladeGeo = new THREE.BoxGeometry(0.1, 0.85, 0.03);
        const pos = bladeGeo.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
          if (pos.getY(i) > 0.2) {
            pos.setX(i, pos.getX(i) * 0.2);
            pos.setZ(i, pos.getZ(i) * 0.2);
          }
        }
        bladeGeo.computeVertexNormals();

        const blade = new THREE.Mesh(bladeGeo, new THREE.MeshLambertMaterial({ color: 0x111111, flatShading: true }));
        blade.position.y = 0.4;
        group.add(blade);

        const edgeLine = new THREE.LineSegments(
          new THREE.EdgesGeometry(bladeGeo),
          new THREE.LineBasicMaterial({ color: weaponColorHex })
        );
        blade.add(edgeLine);

        const hiltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6);
        const hilt = new THREE.Mesh(hiltGeo, new THREE.MeshLambertMaterial({ color: 0x333333 }));
        hilt.position.y = -0.1;
        group.add(hilt);

        group.position.set(0, -0.4, 0.2);
        group.rotation.x = -Math.PI / 2; // reverse grip!
        return group;
      };

      this.weaponMesh = createDagger();
      this.offhandWeaponMesh = createDagger();

      if (this.leftArmMesh) {
        this.leftArmMesh.add(this.offhandWeaponMesh);
      }

    } else if (meshType === "gauntlets") {
      // ─── Asura Vajra Gauntlets ───
      const createGauntlet = () => {
        const group = new THREE.Group();
        const cuffGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.6, 8);
        const cuff = new THREE.Mesh(cuffGeo, new THREE.MeshLambertMaterial({ color: 0x262626, flatShading: true }));
        group.add(cuff);

        for (let i = -1; i <= 1; i++) {
          const spikeGeo = new THREE.ConeGeometry(0.04, 0.16, 4);
          const spike = new THREE.Mesh(spikeGeo, new THREE.MeshLambertMaterial({ color: weaponColorHex, flatShading: true }));
          spike.rotation.x = Math.PI / 2;
          spike.position.set(i * 0.08, -0.28, 0.16);
          group.add(spike);
        }
        group.position.set(0, -0.25, 0.1);
        return group;
      };

      this.weaponMesh = createGauntlet();
      this.offhandWeaponMesh = createGauntlet();

      if (this.leftArmMesh) {
        this.leftArmMesh.add(this.offhandWeaponMesh);
      }

    } else {
      // ─── Celestial Sovereign Brush ───
      const group = new THREE.Group();
      
      const rodGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8);
      const rod = new THREE.Mesh(rodGeo, new THREE.MeshLambertMaterial({ color: 0x2e1065, flatShading: true }));
      rod.position.y = 0.4;
      group.add(rod);

      const ferruleGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.1, 8);
      const ferrule = new THREE.Mesh(ferruleGeo, new THREE.MeshLambertMaterial({ color: 0xfbbf24, flatShading: true }));
      ferrule.position.y = 1.05;
      group.add(ferrule);

      const brushHeadGeo = new THREE.ConeGeometry(0.16, 0.55, 8);
      const brushHead = new THREE.Mesh(brushHeadGeo, new THREE.MeshLambertMaterial({ color: 0x050505, flatShading: true }));
      brushHead.position.y = 1.35;
      group.add(brushHead);

      const brushLine = new THREE.LineSegments(
        new THREE.EdgesGeometry(brushHeadGeo),
        new THREE.LineBasicMaterial({ color: weaponColorHex })
      );
      brushHead.add(brushLine);

      group.position.set(0, -0.35, 0.3);
      group.rotation.x = Math.PI / 2;
      this.weaponMesh = group;

      for (let i = 0; i < 2; i++) {
        const orbGeo = new THREE.BoxGeometry(0.22, 0.32, 0.02);
        const orb = new THREE.Mesh(orbGeo, new THREE.MeshLambertMaterial({
          color: 0x10b981,
          emissive: 0x064e3b,
          flatShading: true,
        }));
        this.playerGroup.add(orb);
        this.floatingOrbs.push(orb);
      }
    }

    if (this.weaponAnchor) {
      this.weaponAnchor.add(this.weaponMesh);
    } else if (this.rightArmMesh) {
      this.rightArmMesh.add(this.weaponMesh);
    }

    if (this.offhandWeaponMesh) {
      if (this.offhandAnchor) {
        this.offhandAnchor.add(this.offhandWeaponMesh);
      } else if (this.leftArmMesh) {
        this.leftArmMesh.add(this.offhandWeaponMesh);
      }
    }
  }

  /**
   * Procedurally generate God of War: Ragnarök weapon models:
   * [1] Leviathan Axe (Frost) + Dauntless Shield
   * [2] Blades of Chaos (Flame)
   * [3] Draupnir Spear (Force) + Dauntless Shield
   */
  public buildGowWeapon(weapon: GowWeapon = "axe"): void {
    // Strictly enforce single weapon: Leviathan Axe
    this.activeGowWeapon = "axe";
    this.currentWeaponType = "gow_axe";
    const store = useGameStore.getState();
    store.switchGowWeapon("axe");

    // Remove existing weapon meshes
    if (this.weaponMesh && this.weaponMesh.parent) {
      this.weaponMesh.parent.remove(this.weaponMesh);
    }
    if (this.offhandWeaponMesh && this.offhandWeaponMesh.parent) {
      this.offhandWeaponMesh.parent.remove(this.offhandWeaponMesh);
      this.offhandWeaponMesh = null;
    }
    if (this.dauntlessShieldMesh && this.dauntlessShieldMesh.parent) {
      this.dauntlessShieldMesh.parent.remove(this.dauntlessShieldMesh);
      this.dauntlessShieldMesh = null;
    }

    // Always build the masterwork Leviathan Axe
    this.weaponMesh = MythicWeaponModels.buildLeviathanAxe();

    if (this.weaponAnchor) {
      this.weaponAnchor.add(this.weaponMesh);
    } else if (this.rightArmMesh) {
      this.rightArmMesh.add(this.weaponMesh);
    }
  }

  public switchGowWeapon(_weapon: GowWeapon = "axe"): void {
    if (this.isExecuting || this.state === "dead") return;

    // If axe was thrown or recalling, cleanly catch it
    if (this.axeThrowState !== "idle") {
      this.catchAxe();
    }

    this.buildGowWeapon("axe");
    audioManager.playSFX("parry");
    this.cameraController.addShake(0.35, 0.12);
  }

  /**
   * Computes the true aim point and direction from player origin towards the center crosshair.
   * Completely eliminates third-person parallax error so projectiles hit exactly where the crosshair aims.
   */
  public getAimVector(maxDistance: number = 60.0, bestTarget?: any): { origin: THREE.Vector3; aimPoint: THREE.Vector3; direction: THREE.Vector3 } {
    const camPos = this.cameraController.camera.position;
    const camDir = new THREE.Vector3();
    this.cameraController.camera.getWorldDirection(camDir);

    let aimPoint: THREE.Vector3;
    if (bestTarget && bestTarget.mesh && bestTarget.state !== "dead") {
      aimPoint = bestTarget.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    } else {
      aimPoint = camPos.clone().addScaledVector(camDir, maxDistance);
    }

    const origin = this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    const direction = new THREE.Vector3().subVectors(aimPoint, origin).normalize();

    return { origin, aimPoint, direction };
  }

  public throwAxe(enemies?: any[], boss?: any): void {
    this.triggerAxeThrow(enemies, boss);
  }

  public triggerAxeThrow(enemies?: any[], boss?: any): void {
    if (this.axeThrowState !== "idle") return;
    if (this.activeGowWeapon !== "axe") {
      this.buildGowWeapon("axe");
    }
    const store = useGameStore.getState();
    audioManager.playSFX("attack");
    this.cameraController.addShake(0.55, 0.15);

    // Hide axe in hand while thrown
    this.weaponMesh.visible = false;
    this.axeThrowState = "thrown";
    store.setAxeThrown(true);

    // ── Dedicated Aim Assist Targeting System ──
    const targets = this.getTargets(enemies, boss);
    let bestTarget: any = null;
    let bestScore = -1;
    const camDir = new THREE.Vector3();
    this.cameraController.camera.getWorldDirection(camDir);
    const camPos = this.cameraController.camera.position;

    for (const t of targets) {
      if (t.state === "dead" || !t.mesh) continue;
      const toTarget = new THREE.Vector3().subVectors(t.mesh.position, camPos);
      const dist = toTarget.length();
      if (dist > 220 || dist < 1.0) continue;
      toTarget.normalize();
      const dot = camDir.dot(toTarget);
      // Generous ~45-degree aim assist cone for forgiving, satisfying axe throws
      if (dot > 0.70) {
        const score = dot * 0.7 + (1.0 - dist / 220) * 0.3;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = t;
        }
      }
    }

    this.axeAimAssistTarget = bestTarget;

    // True aim vector from weapon to crosshair aim point (eliminating parallax)
    const { origin, direction: throwDir } = this.getAimVector(55.0, bestTarget);

    // Spawn physical thrown Leviathan Axe projectile in world
    this.thrownAxeMesh = MythicWeaponModels.buildThrownAxeMesh();
    this.thrownAxeMesh.position.copy(origin).addScaledVector(throwDir, 0.6);
    this.thrownAxeMesh.rotation.set(0, this.playerGroup.rotation.y, 0);

    if (this.playerGroup.parent) {
      this.playerGroup.parent.add(this.thrownAxeMesh);
    }

    this.axeFlightVelocity.copy(throwDir).multiplyScalar(75.0); // 75 m/s supersonic flight!
    if (this.dragonMount?.isMounted) {
      // Add dragon forward velocity so projectile launches relative to speeding mount
      this.axeFlightVelocity.add(this.dragonMount.velocity);
    }
    this.axeFlightTimer = 2.6; // 195m range to easily reach high altitude wyverns!
    this.axeRecallTimer = 0;
    this.axeEmbedTarget = null;
    store.setBattleBanner("LEVIATHAN AXE THROWN — PRESS [Q] OR LMB TO RECALL!", 1.8);
  }

  public triggerAxeRecall(): void {
    if (this.axeThrowState === "embedded" || this.axeThrowState === "thrown") {
      this.axeThrowState = "recalling";
      this.axeRecallTimer = 0;
      audioManager.playSFX("dodge");
      this.cameraController.addShake(0.3, 0.1);
    } else if (this.axeThrowState === "recalling") {
      // If recalled again while in flight, trigger instant snap catch
      this.catchAxe();
    }
  }

  public catchAxe(catchPos?: THREE.Vector3): void {
    const store = useGameStore.getState();
    this.axeThrowState = "idle";
    this.axeRecallTimer = 0;
    store.setAxeThrown(false);

    if (this.thrownAxeMesh) {
      if (this.thrownAxeMesh.parent) {
        this.thrownAxeMesh.parent.remove(this.thrownAxeMesh);
      }
      this.thrownAxeMesh = null;
    }
    this.axeEmbedTarget = null;
    if (this.weaponMesh) {
      this.weaponMesh.visible = true;
    }

    const pos = catchPos || this.getAxeRecallTargetPos();

    // Violent catch thud & camera shake
    this.cameraController.addShake(0.85, 0.22);
    audioManager.playSFX("parry");
    this.particles.burst({
      position: pos,
      count: 22,
      speed: 5.5,
      life: 0.45,
      size: 0.28,
      color: new THREE.Color(0x38bdf8),
    });

    store.addComboPoint(25);
  }

  public getAxeRecallTargetPos(): THREE.Vector3 {
    const targetPos = new THREE.Vector3();
    if (this.dragonMount?.isMounted) {
      // Calculate rider's right hand position directly from dragon mount saddle
      const saddlePos = this.dragonMount.getSaddlePosition();
      _scratchDragonUp.set(0, 1, 0).applyQuaternion(this.dragonMount.mesh.quaternion).normalize();
      _scratchDragonRight.set(1, 0, 0).applyQuaternion(this.dragonMount.mesh.quaternion).normalize();
      _scratchDragonFwd.set(0, 0, -1).applyQuaternion(this.dragonMount.mesh.quaternion).normalize();
      targetPos.copy(saddlePos)
        .addScaledVector(_scratchDragonUp, -0.15)
        .addScaledVector(_scratchDragonRight, 0.32)
        .addScaledVector(_scratchDragonFwd, 0.25);
      return targetPos;
    }

    if (this.rightArmMesh) {
      this.rightArmMesh.getWorldPosition(targetPos);
      return targetPos;
    }

    const localOffset = new THREE.Vector3(0.35, 1.15, 0.2).applyQuaternion(this.playerGroup.quaternion);
    targetPos.copy(this.playerGroup.position).add(localOffset);
    return targetPos;
  }

  private updateAxeProjectile(dt: number, enemies?: any[], boss?: any): void {
    if (!this.thrownAxeMesh) return;
    const store = useGameStore.getState();

    if (this.axeThrowState === "thrown") {
      // In-flight aim assist homing: aggressively steer axe toward locked target
      if (this.axeAimAssistTarget && this.axeAimAssistTarget.state !== "dead" && this.axeAimAssistTarget.mesh) {
        const toTarget = new THREE.Vector3().subVectors(this.axeAimAssistTarget.mesh.position, this.thrownAxeMesh.position);
        const distToTarget = toTarget.length();
        if (distToTarget > 1.0 && distToTarget < 260.0) {
          toTarget.normalize().multiplyScalar(this.axeFlightVelocity.length());
          this.axeFlightVelocity.lerp(toTarget, Math.min(1.0, dt * 9.5));
        }
      }

      // Spin axe rapidly in air
      this.thrownAxeMesh.rotation.z += dt * 32.0;
      this.thrownAxeMesh.position.addScaledVector(this.axeFlightVelocity, dt);
      this.axeFlightTimer -= dt;

      // Spawn sub-zero trail particles
      if (Math.random() < 0.6) {
        this.particles.burst({
          position: this.thrownAxeMesh.position.clone(),
          count: 3,
          speed: 1.5,
          life: 0.3,
          size: 0.2,
          color: new THREE.Color(0x38bdf8),
        });
      }

      // Check collision with enemies (generous hitbox for aerial wyverns)
      const targets = this.getTargets(enemies, boss);
      let hitTarget: any = null;
      for (const t of targets) {
        if (t.state !== "dead") {
          const isAerial = !!(t as any).isFlying || t.mesh.position.y > 6.0;
          const hitRadius = isAerial ? 7.5 : 2.5;
          if (this.thrownAxeMesh.position.distanceTo(t.mesh.position) <= hitRadius) {
            hitTarget = t;
            break;
          }
        }
      }

      if (hitTarget || this.axeFlightTimer <= 0) {
        // Embed the axe!
        this.axeThrowState = "embedded";
        this.cameraController.addShake(0.65, 0.18);
        audioManager.playSFX("boss_ripple");

        if (hitTarget) {
          this.axeEmbedTarget = hitTarget;
          this.axeEmbedLocalPos.copy(this.thrownAxeMesh.position).sub(hitTarget.mesh.position);

          const isAwakened = store.player.weaponAwaken?.active;
          const damage = isAwakened ? 220 : 140;
          if (typeof hitTarget.takeDamage === "function") hitTarget.takeDamage(damage);
          if (typeof hitTarget.takeStun === "function") {
            hitTarget.takeStun(60);
          }
          if (typeof hitTarget.applyFrost === "function") {
            hitTarget.applyFrost(3.5); // Freeze target solid!
          }

          // If aerial wyvern, bring it crashing down to earth!
          if (typeof (hitTarget as any).crashGround === "function") {
            (hitTarget as any).crashGround(4.5);
          }

          store.addDamagePopup(damage, true, [hitTarget.mesh.position.x, hitTarget.mesh.position.y + 1.8, hitTarget.mesh.position.z], "#38bdf8");
          store.setBattleBanner("FLYING SWORD IMPALED AERIAL TARGET — BROUGHT DOWN!", 2.2);
          store.addComboPoint(45);
        }

        // Frost impact burst
        this.particles.burst({
          position: this.thrownAxeMesh.position.clone(),
          count: 25,
          speed: 6.0,
          life: 0.55,
          size: 0.3,
          color: new THREE.Color(0x38bdf8),
        });
      }
    } else if (this.axeThrowState === "embedded") {
      // Stick to target position if embedded in moving enemy
      if (this.axeEmbedTarget && this.axeEmbedTarget.state !== "dead") {
        this.thrownAxeMesh.position.copy(this.axeEmbedTarget.mesh.position).add(this.axeEmbedLocalPos);
      }
      this.thrownAxeMesh.rotation.y += dt * 2.0;
    } else if (this.axeThrowState === "recalling") {
      this.axeRecallTimer += dt;

      // Accurate hand target position in world space (handles foot & mounted rider poses)
      const targetPos = this.getAxeRecallTargetPos();
      const toPlayer = new THREE.Vector3().subVectors(targetPos, this.thrownAxeMesh.position);
      const dist = toPlayer.length();

      // Rapid reverse spin
      this.thrownAxeMesh.rotation.z -= dt * 38.0;

      // Ensure recall velocity always outruns player and dragon even at supersonic boost speeds
      const currentTargetSpeed = this.dragonMount?.isMounted
        ? Math.max(this.dragonMount.currentSpeed, this.dragonMount.velocity.length())
        : 20.0;
      const minRecallSpeed = Math.max(95.0, currentTargetSpeed + 55.0);
      const recallSpeed = Math.min(280.0, Math.max(minRecallSpeed, dist * 18.0));

      // Strictly clamp movement step so it never overshoots the target hand
      const maxStep = recallSpeed * dt;
      const stepDist = Math.min(dist, maxStep);
      if (dist > 0.001) {
        const moveStep = toPlayer.clone().normalize().multiplyScalar(stepDist);
        this.thrownAxeMesh.position.add(moveStep);
      }

      // Damage any enemy in return path
      const targets = this.getTargets(enemies, boss);
      for (const t of targets) {
        if (t.state !== "dead" && this.thrownAxeMesh.position.distanceTo(t.mesh.position) <= 2.8) {
          if (typeof t.takeDamage === "function") t.takeDamage(75);
          if (typeof t.takeStun === "function") t.takeStun(30);
          store.addDamagePopup(75, false, [t.mesh.position.x, t.mesh.position.y + 1.6, t.mesh.position.z], "#67e8f9");
        }
      }

      // Spark trail on return
      if (Math.random() < 0.6) {
        this.particles.burst({
          position: this.thrownAxeMesh.position.clone(),
          count: 3,
          speed: 2.5,
          life: 0.25,
          size: 0.18,
          color: new THREE.Color(0x00f2ff),
        });
      }

      // Reached player hand: check catch radius (2.2m), completed step, or timeout failsafe (1.6s)
      const remainingDist = this.thrownAxeMesh.position.distanceTo(targetPos);
      if (remainingDist <= 2.2 || maxStep >= dist || this.axeRecallTimer >= 1.6) {
        this.catchAxe(targetPos);
      }
    }
  }

  public scanAimAssistTarget(enemies?: any[], boss?: any): any {
    const targets = this.getTargets(enemies, boss);
    let bestTarget: any = null;
    let bestScore = -1;
    const camDir = new THREE.Vector3();
    this.cameraController.camera.getWorldDirection(camDir);
    const camPos = this.cameraController.camera.position;

    const isMounted = !!this.dragonMount?.isMounted;
    // Extra-generous aim cones for comfortable Minecraft-feel targeting
    // Mounted: ~45° cone, Aiming on foot: ~38°, Hip-fire: ~33°
    const minDot = isMounted ? 0.71 : (this.cameraController.isAiming ? 0.78 : 0.84);
    const maxRange = isMounted ? 300.0 : 200.0;

    for (const t of targets) {
      if (t.state === "dead" || !t.mesh) continue;
      const toTarget = new THREE.Vector3().subVectors(t.mesh.position, camPos);
      const dist = toTarget.length();
      if (dist > maxRange || dist < 1.0) continue;
      toTarget.normalize();
      const dot = camDir.dot(toTarget);
      if (dot > minDot) {
        const score = dot * 0.75 + (1.0 - dist / maxRange) * 0.25;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = t;
        }
      }
    }
    this.axeAimAssistTarget = bestTarget;

    // Sync to store for HUD target lock indication
    const store = useGameStore.getState();
    const targetName = bestTarget
      ? (bestTarget === boss ? "ANCIENT SOVEREIGN BOSS" : (bestTarget.def?.name || "WYVERN / CORRUPTED ELITE"))
      : null;
    store.setAimAssistTarget(!!bestTarget, targetName);

    return bestTarget;
  }

  public getAimAssistTarget(): any {
    return this.axeAimAssistTarget;
  }

  public triggerWeaponAwaken(enemies?: any[], boss?: any): void {
    if (this.state === "dead" || this.isExecuting) return;
    const store = useGameStore.getState();
    const weapon = this.activeGowWeapon;

    if (weapon === "axe") {
      // Frost Awaken -> 24-Movement Plum Blossom Bloom & Sky Piercer Column
      store.awakenWeapon();
      audioManager.playSFX("boss_ripple");
      this.cameraController.addShake(0.85, 0.25);

      // Towering Vertical Plum Blossom Qi Pillar (reaching 80m into the sky!)
      for (let y = 0; y <= 75; y += 7.5) {
        this.particles.burst({
          position: this.playerGroup.position.clone().add(new THREE.Vector3(0, y, 0)),
          count: 14,
          speed: 6.5,
          life: 0.85,
          size: 0.42,
          color: new THREE.Color(0xf43f5e), // Plum blossom pink!
        });
      }

      // Detonate and strike overhead aerial wyverns and nearby ground enemies
      const targets = this.getTargets(enemies, boss);
      targets.forEach((t) => {
        if (t.state === "dead") return;
        const horizDist = Math.hypot(this.playerGroup.position.x - t.mesh.position.x, this.playerGroup.position.z - t.mesh.position.z);
        const vertDist = t.mesh.position.y - this.playerGroup.position.y;
        if (horizDist <= 28.0 && vertDist >= -2.0 && vertDist <= 85.0) {
          if (typeof t.takeDamage === "function") t.takeDamage(210);
          if (typeof (t as any).crashGround === "function") (t as any).crashGround(4.5);
          store.addDamagePopup(210, true, [t.mesh.position.x, t.mesh.position.y + 1.8, t.mesh.position.z], "#f43f5e");
        }
      });

      store.setBattleBanner("CELESTIAL DRAGON AWAKEN · SKY PIERCER", 2.5);
      store.addComboPoint(45);

    } else if (weapon === "blades") {
      // Flame Whiplash -> Celestial Blades Awaken
      store.awakenWeapon();
      audioManager.playSFX("attack");
      this.cameraController.addShake(0.6, 0.2);
      this.particles.burst({
        position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0)),
        count: 55,
        speed: 8.5,
        life: 0.75,
        size: 0.32,
        color: new THREE.Color(0xf472b6), // Floral Petals
      });
      store.setBattleBanner("CELESTIAL WHIPLASH BLADE CASCADE", 2.2);
      store.addComboPoint(30);

    } else if (weapon === "spear") {
      // Celestial Spear Shockwave Detonation
      audioManager.playSFX("parry");
      this.cameraController.addShake(1.1, 0.3);
      this.particles.burst({
        position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 0.2, 0)),
        count: 60,
        speed: 11.0,
        life: 0.9,
        size: 0.4,
        color: new THREE.Color(0xf43f5e),
      });

      // Detonate all nearby enemies within 10m
      const targets = this.getTargets(enemies, boss);
      targets.forEach((t) => {
        const d = this.playerGroup.position.distanceTo(t.mesh.position);
        if (d <= 10.0 && t.state !== "dead") {
          t.takeDamage(130);
          if (typeof t.takeStun === "function") t.takeStun(60);
          store.addDamagePopup(130, true, [t.mesh.position.x, t.mesh.position.y + 1.8, t.mesh.position.z], "#f43f5e");
        }
      });
      store.setBattleBanner("CELESTIAL DRACONIC HEAVEN CUT", 2.0);
      store.addComboPoint(65);
    }
  }

  /**
   * Spawn a ghostly ink afterimage silhouette that fades over time.
   */
  public spawnAfterimage(colorHex: number = 0x22d3ee): void {
    const ghost = new THREE.Group();
    ghost.position.copy(this.playerGroup.position);
    ghost.rotation.copy(this.playerGroup.rotation);

    const ghostMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    this.playerGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const clone = new THREE.Mesh(child.geometry, ghostMat);
        clone.position.copy(child.position);
        clone.rotation.copy(child.rotation);
        clone.scale.copy(child.scale);
        ghost.add(clone);
      }
    });

    if (this.playerGroup.parent) {
      this.playerGroup.parent.add(ghost);
      this.afterimages.push({
        group: ghost,
        life: 0.25,
        maxLife: 0.25,
      });
    }
  }

  /**
   * Immediately halts all horizontal/vertical movement velocity and dragon momentum.
   */
  public stopMovement(): void {
    this.velocityY = 0;
    this.isGliding = false;
    this.isAirDashing = false;
    if (this.state === "run") {
      this.transitionTo("idle");
    }
    if (this.dragonMount) {
      this.dragonMount.pauseFlight();
    }
  }

  /**
   * Resumes movement capabilities when unpausing.
   */
  public resumeMovement(): void {
    if (this.dragonMount) {
      this.dragonMount.resumeFlight();
    }
  }

  /**
   * Main player update loop. Updates states, handles input, performs physics and animations.
   */
  update(dt: number, input: InputState, enemies?: any[], boss?: any): void {
    const store = useGameStore.getState();

    // When paused (e.g. settings open or ESC pressed), freeze movement completely
    if (store.ui.isPaused) {
      this.stopMovement();
      return;
    }

    if (this.spawnGracePeriod > 0) {
      this.spawnGracePeriod -= dt;
    }

    // Cinematic execution lock & animation
    if (this.isExecuting) {
      this.executionTimer -= dt;
      this.isInvulnerable = true;
      if (this.rightArmMesh) {
        this.rightArmMesh.rotation.x = Math.PI / 2 - Math.sin(this.executionTimer * 10) * 0.8;
      }
      if (this.executionTimer <= 0) {
        this.isExecuting = false;
        this.transitionTo("idle");
      }
      return;
    }

    // Always update sky aura slash wave, and bleed DOTs
    this.updateAuraSlashProjectiles(dt, enemies, boss);
    this.updateBleeds(dt, enemies, boss);

    // ── Universal Dragon Flight & Mount / Dismount System ──
    if (this.dragonMount?.isMounted) {
      // 1. Intentional Dismount with [F]
      const dismountTriggered = input.justPressed.has(GameAction.DRAGON_MOUNT);

      if (dismountTriggered) {
        const { launchVelocity } = this.dragonMount.dismount();
        this.cameraController.setFlightSpeedFov(0);
        this.cameraController.setAiming(false, false);
        this.velocityY = Math.max(8.0, launchVelocity.y);
        this.isGrounded = false;
        this.isGliding = true;
        this.isAirDashing = true;
        this.airDashDir.set(launchVelocity.x, 0, launchVelocity.z).normalize();
        this.airDashTimer = 0.55;
        this.transitionTo("idle");
        // Strictly restore upright player orientation!
        this.playerGroup.rotation.set(0, this.playerGroup.rotation.y, 0);
        _scratchUprightEuler.set(0, this.playerGroup.rotation.y, 0, "YXZ");
        this.playerGroup.quaternion.setFromEuler(_scratchUprightEuler);
        if (this.bodyMesh) {
          this.bodyMesh.rotation.set(0, 0, 0);
          this.bodyMesh.position.set(0, 1.25, 0);
        }
        store.setBattleBanner("DISMOUNTED INTO SKY STEP GLIDE", 1.5);
        return;
      }

      // 2. Dragon flight controls
      const streamInfo = this.windSlipstream?.update(dt, this.dragonMount.position, true);
      const isAscending = input.held.has(GameAction.JUMP); // [Space]
      const isDescending = input.held.has(GameAction.STANCE_NEXT); // [C]
      const isBoosting = input.held.has(GameAction.SPRINT); // [Shift] Boost
      this.cameraController.camera.getWorldDirection(_scratchCamDir);

      this.dragonMount.update(
        dt,
        input.moveAxis,
        _scratchCamDir,
        isAscending,
        isDescending,
        isBoosting,
        streamInfo?.boostForce ?? null
      );

      // Dynamic Speed Glide FOV kick
      this.cameraController.setFlightSpeedFov(this.dragonMount.currentSpeed);

      // ── Ergonomic Rider Alignment with Dragon Saddle ──
      const saddlePos = this.dragonMount.getSaddlePosition();
      _scratchDragonFwd.set(0, 0, -1).applyQuaternion(this.dragonMount.mesh.quaternion).normalize();
      _scratchDragonUp.set(0, 1, 0).applyQuaternion(this.dragonMount.mesh.quaternion).normalize();

      // 1. Position: Seat the player down firmly into the saddle (hips seated on dragon back)
      this.playerGroup.position.copy(saddlePos)
        .addScaledVector(_scratchDragonUp, -0.78)
        .addScaledVector(_scratchDragonFwd, 0.15);

      // 2. Rotation: Lock rider orientation 1:1 with dragon in pitch, roll, and yaw
      // Model and dragon both natively face -Z
      // Aerodynamic forward lean (~14 deg) over the dragon crest
      _scratchRiderEuler.set(0.24, 0, 0, "YXZ");
      _scratchRiderQuat.setFromEuler(_scratchRiderEuler);
      this.playerGroup.quaternion.copy(this.dragonMount.mesh.quaternion).multiply(_scratchRiderQuat);

      // 3. Ergonomic riding pose: hands gripping dragon crest, legs gripping flanks
      if (this.rightArmMesh) this.rightArmMesh.rotation.set(-0.75, 0.18, 0.22);
      if (this.leftArmMesh) this.leftArmMesh.rotation.set(-0.75, -0.18, -0.22);
      if (this.rightLegMesh) this.rightLegMesh.rotation.set(0.68, 0.32, -0.08);
      if (this.leftLegMesh) this.leftLegMesh.rotation.set(0.68, -0.32, 0.08);

      this.storePosTimer += dt;
      if (this.storePosTimer >= 0.2) {
        this.storePosTimer = 0;
        store.setPlayerPosition([
          this.playerGroup.position.x,
          this.playerGroup.position.y,
          this.playerGroup.position.z,
        ]);
      }

      // Real-time rider matrix sync & axe projectile update matching current frame dragon speed
      this.playerGroup.updateMatrixWorld(true);
      this.updateAxeProjectile(dt, enemies, boss);

      // ── Flight Combat Aiming State ──
      const isAimingFlight = this.cameraController.isAiming || input.held.has(GameAction.AIM);
      this.cameraController.setAiming(isAimingFlight, true);
      store.setIsAiming(isAimingFlight);
      return;
    } else {
      // 3. On Foot / In Water: Summon & Mount Dragon with [F] from anywhere on the map
      if (input.justPressed.has(GameAction.DRAGON_MOUNT) && this.dragonMount) {
        this.dragonMount.isAwake = true;
        this.dragonMount.mount(this.playerGroup.position, this.playerGroup.rotation.y);
        this.isGrounded = false;
        this.isGliding = false;
        this.velocityY = 0;
        store.setBattleBanner("VEYROS SUMMONED — SOAR INTO THE HEAVENS! [SHIFT] JET BOOST", 3.0);
        return;
      }
    }

    // On foot: update thrown axe projectile
    this.updateAxeProjectile(dt, enemies, boss);

    // On foot: strictly enforce upright pitch (0) and roll (0) so the character stands and walks upright!
    if (!this.dragonMount?.isMounted) {
      this.playerGroup.rotation.x = 0;
      this.playerGroup.rotation.z = 0;
      _scratchUprightEuler.set(0, this.playerGroup.rotation.y, 0, "YXZ");
      this.playerGroup.quaternion.setFromEuler(_scratchUprightEuler);
    }

    // Canyon Wind Slipstream check for player gliding / airborne
    if (this.windSlipstream && (!this.isGrounded || this.isGliding)) {
      const streamInfo = this.windSlipstream.update(dt, this.playerGroup.position, true);
      if (streamInfo.boostForce) {
        this.playerGroup.position.addScaledVector(streamInfo.boostForce, dt);
        if (streamInfo.boosted) {
          this.particles.emitBurst({
            position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
            count: 24,
            speed: 10,
            life: 0.5,
            size: 0.3,
            color: new THREE.Color(0x38bdf8),
          });
        }
      }
    }

    // Procedural cape physics wave animation
    if (this.capeSegments && this.capeSegments.length > 0) {
      const speed = (input.moveAxis.x !== 0 || input.moveAxis.y !== 0) ? 5.5 : 0;
      MythicCharacterModel.animateCape(this.capeSegments, speed, performance.now() * 0.001);
    }

    // Dauntless Shield procedural deployment on block/parry
    const isShieldActive = this.state === "block" || this.state === "parry";
    if (this.dauntlessShieldMesh) {
      const targetScale = isShieldActive ? 1.0 : 0.01;
      this.dauntlessShieldMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), dt * 18.0);
    }

    // Spartan / Asura Rage Aura update
    const isRage = store.player.rage?.isActive;
    if (this.rageAuraMesh) {
      this.rageAuraMesh.visible = !!isRage;
      if (isRage) {
        this.rageAuraMesh.rotation.y += 4.0 * dt;
        const pulse = 1.1 + Math.sin(performance.now() * 0.015) * 0.12;
        this.rageAuraMesh.scale.set(pulse, pulse, pulse);
      }
    }

    // Handle pushback trigger for Meridian Core Backflow
    if (this.triggerBackflowPush) {
      this.triggerBackflowPush = false;
      const pushRadius = 8.0;
      if (enemies) {
        enemies.forEach((enemy) => {
          const dist = this.playerGroup.position.distanceTo(enemy.mesh.position);
          if (dist < pushRadius && enemy.state !== "dead") {
            const pushDir = new THREE.Vector3().subVectors(enemy.mesh.position, this.playerGroup.position).setY(0).normalize();
            enemy.mesh.position.addScaledVector(pushDir, 5.0); // push 5 units away
            if (typeof enemy.takeDamage === "function") enemy.takeDamage(15);
            if (typeof enemy.transitionTo === "function") {
              enemy.transitionTo("stagger");
            }
          }
        });
      }
      if (boss && boss.state !== "dead") {
        const dist = this.playerGroup.position.distanceTo(boss.mesh.position);
        if (dist < pushRadius) {
          const pushDir = new THREE.Vector3().subVectors(boss.mesh.position, this.playerGroup.position).setY(0).normalize();
          boss.mesh.position.addScaledVector(pushDir, 4.0); // push boss away slightly
          if (typeof boss.takeDamage === "function") boss.takeDamage(30);
          if (typeof boss.transitionTo === "function") {
            boss.stunTimer = 1.8;
            boss.transitionTo("stagger");
          }
        }
      }
    }

    const profId = (store.player.profession || "sword_sage") as ProfessionId;
    const prof = PROFESSIONS[profId] || PROFESSIONS.sword_sage;

    // Dynamically rebuild 3D weapon model if player changed profession (and not in God of War mode)
    if (!this.activeGowWeapon && this.currentWeaponType !== profId) {
      this.buildWeaponForProfession(profId);
    }

    // Animate orbiting talismans if Reality Scribe brush
    if (this.floatingOrbs.length > 0) {
      const time = performance.now() * 0.003;
      this.floatingOrbs.forEach((orb, i) => {
        const angle = time + (i * Math.PI);
        orb.position.set(Math.cos(angle) * 1.1, 1.4 + Math.sin(time * 2 + i) * 0.2, Math.sin(angle) * 1.1);
        orb.rotation.y = time * 2;
      });
    }

    // Update & fade afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const img = this.afterimages[i];
      img.life -= dt;
      const alpha = Math.max(0, img.life / img.maxLife);
      img.group.traverse((c) => {
        if (c instanceof THREE.Mesh && c.material && "opacity" in c.material) {
          (c.material as any).opacity = alpha * 0.45;
        }
      });
      if (img.life <= 0) {
        if (img.group.parent) img.group.parent.remove(img.group);
        img.group.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.geometry.dispose();
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
            else c.material.dispose();
          }
        });
        this.afterimages.splice(i, 1);
      }
    }

    // Tick active technique visual/logical timers
    if (this.activeBubbleShield) {
      this.bubbleShieldTimer -= dt;
      this.isInvulnerable = true;
      const pulse = 1.0 + Math.sin(performance.now() * 0.01) * 0.05;
      this.activeBubbleShield.scale.set(pulse, pulse, pulse);
      if (this.bubbleShieldTimer <= 0) {
        this.removeBubbleShield();
        this.isInvulnerable = false;
      }
    }

    if (this.slowZoneIndicator) {
      this.slowZoneTimer -= dt;
      if (enemies) {
        enemies.forEach((enemy) => {
          if (enemy.state !== "dead") {
            const dist = enemy.mesh.position.distanceTo(this.slowZoneIndicator!.position);
            if (dist <= 8.0) {
              enemy.speedModifier = 0.4; // slow by 60%
            }
          }
        });
      }
      if (this.slowZoneTimer <= 0) {
        this.removeSlowZone();
      }
    }

    // ─── Celestial Qinggong Traversal Engine ───
    if (this.wallKickCooldown > 0) {
      this.wallKickCooldown -= dt;
    }

    // Active aim assist scanning whenever mounted on dragon or aiming
    if (this.cameraController.isAiming || this.dragonMount?.isMounted) {
      this.scanAimAssistTarget(enemies, boss);
    } else if (this.axeAimAssistTarget) {
      this.axeAimAssistTarget = null;
      useGameStore.getState().setAimAssistTarget(false, null);
    }

    if (!this.dragonMount?.isMounted) {
      // Query highest ground/platform surface beneath player's feet
      this.currentGroundHeight = this.collisions.getGroundHeight(
        this.playerGroup.position.x,
        this.playerGroup.position.z,
        this.playerGroup.position.y
      );

      // Surface height: platform ground height or Celestial Water Skim elevation (0.85m)
      const minSurfaceHeight = Math.max(0.85, this.currentGroundHeight);

      // Detect walking off an elevated roof/platform into freefall
      if (this.isGrounded && this.playerGroup.position.y > minSurfaceHeight + 0.35) {
        this.isGrounded = false;
        this.jumpCount = 1; // Already left ground surface
      }

      // Apply Vertical Physics (Falling, Gliding, Air Dashing)
      if (!this.isGrounded && this.state !== "attack_jump") {
        // Wind Gliding: Holding Space in mid-air reduces gravity by 80% for slow, graceful drifting
        if (this.velocityY < 0.5 && input.held.has(GameAction.JUMP)) {
          this.isGliding = true;
          this.velocityY += this.gravity * 0.18 * dt;
          this.velocityY = Math.max(-3.5, this.velocityY); // Cap descent speed

          // Swirling plum blossom and wind wisps while gliding
          if (Math.random() < 0.25) {
            this.particles.emitBurst({
              position: this.playerGroup.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.8, (Math.random() - 0.5) * 1.2)),
              count: 2,
              speed: 1.5,
              life: 0.45,
              size: 0.2,
              color: new THREE.Color(0xfbcfe8),
            });
          }
        } else {
          this.isGliding = false;
          this.velocityY += this.gravity * dt;
        }

        this.playerGroup.position.y += this.velocityY * dt;

        // ── Hard Cloud Floor: Emergency respawn if fallen through abyss ──
        if (this.playerGroup.position.y <= this.CLOUD_FLOOR_Y) {
          this.playerGroup.position.y = this.CLOUD_FLOOR_Y;
          this.velocityY = 0;
          this.isGrounded = true;
          this.jumpCount = 0;
          this.isGliding = false;
          this.isAirDashing = false;
        }

        // Landing on ground or Celestial Water Skim surface (水上漂)
        if (this.velocityY <= 0 && this.playerGroup.position.y <= minSurfaceHeight) {
          const wasFalling = !this.isGrounded && this.velocityY < -5.0;
          this.playerGroup.position.y = minSurfaceHeight;
          this.velocityY = 0;
          this.isGrounded = true;
          this.jumpCount = 0;
          this.isGliding = false;
          this.isAirDashing = false;

          if (wasFalling && this.spawnGracePeriod <= 0) {
            audioManager.playSFX("soft_landing");
          }

          // If skimming across water surface, emit ripples and lotus blossoms underfoot
          if (this.currentGroundHeight <= 0.2 && Math.random() < 0.3) {
            this.particles.emitBurst({
              position: this.playerGroup.position.clone(),
              count: 3,
              speed: 1.2,
              life: 0.35,
              size: 0.25,
              color: new THREE.Color(0x38bdf8),
            });
          }
        }
      }

      // Air Dash execution
      if (this.isAirDashing) {
        this.airDashTimer -= dt;
        this.playerGroup.position.addScaledVector(this.airDashDir, 18.5 * dt);
        if (this.airDashTimer <= 0) {
          this.isAirDashing = false;
        }
      }

      // Mid-Air WASD Steering (smooth flight control onto roofs, balconies, and platforms)
      if (!this.isGrounded && !this.isAirDashing && this.state !== "attack_jump") {
        const { moveAxis } = input;
        if (moveAxis.x !== 0 || moveAxis.y !== 0) {
          const forward = this.cameraController.getForwardDirection();
          const right = this.cameraController.getRightDirection();
          const airDir = new THREE.Vector3()
            .addScaledVector(right, moveAxis.x)
            .addScaledVector(forward, -moveAxis.y)
            .normalize();
          const airSpeed = this.isGliding ? 8.5 : 6.2;
          this.playerGroup.position.addScaledVector(airDir, airSpeed * dt);

          const isAimingOrFPV = this.cameraController.isAiming || this.cameraController.isFirstPerson;
          const targetAngle = isAimingOrFPV
            ? Math.atan2(-forward.x, -forward.z)
            : Math.atan2(-airDir.x, -airDir.z);
          const currentAngle = this.playerGroup.rotation.y;
          let diff = targetAngle - currentAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.playerGroup.rotation.y += diff * Math.min(1, 14 * dt);
        }
      }

      // ─── Qinggong Traversal Input Handling ───
      // 1. Wall Kick / Rebound Leap (kicking off vertical walls & pillars)
      if (!this.isGrounded && input.justPressed.has(GameAction.JUMP) && this.wallKickCooldown <= 0) {
        const wallCheck = this.collisions.isNearWall(this.playerGroup.position, 0.65);
        if (wallCheck.near && wallCheck.normal) {
          this.velocityY = 12.5;
          this.jumpCount = 1; // Allows another mid-air step
          this.wallKickCooldown = 0.35;
          this.playerGroup.position.addScaledVector(wallCheck.normal, 0.7);
          audioManager.playSFX("airstep");
          this.particles.createShockwave({
            position: this.playerGroup.position.clone(),
            maxRadius: 3.2,
            duration: 0.25,
            color: new THREE.Color(0xfacc15),
          });
          this.spawnAfterimage(0xfacc15);
        }
      }

      // 2. Stage 1: Martial Spring Jump from Ground
      const minSurface = Math.max(0.85, this.currentGroundHeight);
      const isNearGround = (this.isGrounded || Math.abs(this.playerGroup.position.y - minSurface) <= 1.2) && this.jumpCount === 0;
      const canJump = this.state !== "dead" && this.state !== "awakening" && !this.dragonMount?.isMounted && !this.state.startsWith("attack");

      if (canJump && isNearGround && input.justPressed.has(GameAction.JUMP)) {
        this.velocityY = 15.0; // High athletic spring leap
        this.isGrounded = false;
        this.jumpCount = 1;
        this.transitionTo("run");
        audioManager.playSFX("jump");
        this.particles.createShockwave({
          position: this.playerGroup.position.clone(),
          maxRadius: 3.8,
          duration: 0.35,
          color: new THREE.Color(0xf43f5e),
        });
        this.particles.emitBurst({
          position: this.playerGroup.position.clone(),
          count: 14,
          speed: 3.5,
          life: 0.35,
          size: 0.25,
          color: new THREE.Color(0xfff1f2),
        });
      }
      // 3. Stage 2: Sky Step / Double Jump (踏空 / mid-air step)
      else if (canJump && (!this.isGrounded || !isNearGround) && input.justPressed.has(GameAction.JUMP) && this.jumpCount < 3) {
        this.velocityY = 13.5; // Mid-air jump boost
        this.jumpCount = Math.max(2, this.jumpCount + 1);
        this.isGliding = false;
        audioManager.playSFX("airstep");
        const footPos = this.playerGroup.position.clone();
        this.particles.createShockwave({
          position: footPos,
          maxRadius: 4.5,
          duration: 0.3,
          color: new THREE.Color(0x38bdf8),
        });
        this.particles.emitBurst({
          position: footPos,
          count: 20,
          speed: 5.0,
          life: 0.4,
          size: 0.3,
          color: new THREE.Color(0xfbcfe8),
        });
        this.spawnAfterimage(0x38bdf8);
      }

      // 4. Qinggong Air Dash (Shift while airborne)
      if (!this.isGrounded && !this.isAirDashing && input.justPressed.has(GameAction.DODGE)) {
        this.isAirDashing = true;
        this.airDashTimer = 0.28;
        this.velocityY = Math.max(2.5, this.velocityY * 0.4);
        const fwd = new THREE.Vector3(-Math.sin(this.playerGroup.rotation.y), 0, -Math.cos(this.playerGroup.rotation.y));
        this.airDashDir.copy(fwd);
        audioManager.playSFX("dash");
        this.cameraController.triggerRadialBlur(0.25);
        this.particles.emitBurst({
          position: this.playerGroup.position.clone(),
          count: 24,
          speed: 6.5,
          life: 0.45,
          size: 0.3,
          color: new THREE.Color(0xf43f5e),
        });
        this.spawnAfterimage(0xf43f5e);
      }

      // 5. Airborne Combat: [LMB] Airborne Weapon Slash, or [Middle Click] Meteor Dive Slam
      if (!this.isGrounded && !this.isDiveSlamming) {
        if (input.justPressed.has(GameAction.ATTACK)) {
          this.transitionTo("attack_light_1");
          this.triggerCombo(prof, enemies, boss);
        } else if (input.justPressed.has(GameAction.HEAVY_ATTACK)) {
          this.triggerJumpAttack(enemies, boss);
        }
      }
    }

    // Master Weapon [1]: Switch / Reset Weapon
    if (input.justPressed.has(GameAction.WEAPON_1)) {
      this.switchGowWeapon("axe");
    }

    // Flying Leviathan Axe Throw & Recall [Q] (works on foot, in air, or while mounted!)
    if (input.justPressed.has(GameAction.AXE_THROW_RECALL)) {
      if (this.axeThrowState === "idle") {
        this.triggerAxeThrow(enemies, boss);
      } else {
        this.triggerAxeRecall();
      }
    }

    // God of War Spartan Rage [R]
    if (input.justPressed.has(GameAction.RAGE)) {
      this.triggerSpartanRage();
    }

    // God of War Brutal Execution / Glory Kill [G]
    if (input.justPressed.has(GameAction.EXECUTE)) {
      this.triggerBrutalExecution(enemies, boss);
    }

    // God of War Chaos Pull / Hyperion Grapple [T]
    if (input.justPressed.has(GameAction.HYPERION_GRAPPLE) || input.justPressed.has(GameAction.BLADE_THROW)) {
      this.triggerChainedBladeThrow(enemies, boss);
    }

    // Check death state
    if (store.player.health.current <= 0) {
      if (this.state !== "dead") {
        this.transitionTo("dead");
      }
    } else if (this.state === "dead") {
      // Just resurrected!
      this.playerGroup.position.set(0, 4.3, 0);
      this.playerGroup.rotation.set(0, 0, 0);
      this.velocityY = 0;
      this.isGrounded = true;
      this.transitionTo("idle");
    }

    // Tick timers
    this.stateTimer += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // ─── 3D Awakening Sequence Processing ───
    if (this.isAwakening) {
      this.awakeningTimer -= dt;

      // Animate Celestial Qi Pillar
      if (this.awakeningPillarMesh) {
        this.awakeningPillarMesh.rotation.y += dt * 3.5;
        this.awakeningPillarMesh.position.x = this.playerGroup.position.x;
        this.awakeningPillarMesh.position.z = this.playerGroup.position.z;
        const fade = Math.min(1.0, this.awakeningTimer / 1.5);
        (this.awakeningPillarMesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.75;
      }

      // Compute actual surface height so player lands right on top of the island/platform
      const targetGround = Math.max(
        this.collisions.getGroundHeight(this.playerGroup.position.x, this.playerGroup.position.z, this.playerGroup.position.y),
        120.0
      );

      // At timer > 1.4s, hover majestically above the ground
      if (this.awakeningTimer > 1.4) {
        this.playerGroup.position.y = targetGround + 3.2 + Math.sin(this.awakeningTimer * 6) * 0.12;
      } else if (this.awakeningTimer <= 1.4 && this.playerGroup.position.y > targetGround) {
        // Accelerate downward ground strike
        this.playerGroup.position.y -= dt * 16.0;
        if (this.playerGroup.position.y <= targetGround) {
          this.playerGroup.position.y = targetGround;
          this.isGrounded = true;

          // Ground Touchdown shockwave & afterimages!
          const pColor = new THREE.Color(prof.weaponColor || 0xf59e0b).getHex();
          this.spawnAfterimage(pColor);

          // Spawn ground shockwave expanding ring
          if (this.playerGroup.parent && !this.awakeningShockwaveRing) {
            const ringGeo = new THREE.RingGeometry(0.3, 0.7, 32);
            const ringMat = new THREE.MeshBasicMaterial({
              color: pColor,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.9,
              blending: THREE.AdditiveBlending,
            });
            this.awakeningShockwaveRing = new THREE.Mesh(ringGeo, ringMat);
            this.awakeningShockwaveRing.rotation.x = -Math.PI / 2;
            this.awakeningShockwaveRing.position.set(this.playerGroup.position.x, targetGround + 0.08, this.playerGroup.position.z);
            this.playerGroup.parent.add(this.awakeningShockwaveRing);
          }
        }
      }

      // Animate shockwave ring expansion
      if (this.awakeningShockwaveRing) {
        this.awakeningShockwaveRing.scale.addScalar(dt * 12.0);
        const ringMat = this.awakeningShockwaveRing.material as THREE.MeshBasicMaterial;
        ringMat.opacity -= dt * 0.9;
        if (ringMat.opacity <= 0) {
          if (this.awakeningShockwaveRing.parent) this.awakeningShockwaveRing.parent.remove(this.awakeningShockwaveRing);
          this.awakeningShockwaveRing = null;
        }
      }

      // Sequence Complete
      if (this.awakeningTimer <= 0) {
        this.isAwakening = false;
        const groundY = Math.max(
          this.collisions.getGroundHeight(this.playerGroup.position.x, this.playerGroup.position.z, this.playerGroup.position.y),
          120.0
        );
        this.playerGroup.position.y = groundY;
        this.isGrounded = true;
        this.transitionTo("idle");
        if (this.awakeningPillarMesh && this.awakeningPillarMesh.parent) {
          this.awakeningPillarMesh.parent.remove(this.awakeningPillarMesh);
          this.awakeningPillarMesh = null;
        }
        if (this.awakeningShockwaveRing && this.awakeningShockwaveRing.parent) {
          this.awakeningShockwaveRing.parent.remove(this.awakeningShockwaveRing);
          this.awakeningShockwaveRing = null;
        }
      }

      this.animateProcedurally(dt);
      return;
    }

    // State machine updates
    switch (this.state) {
      case "idle":
      case "run":
        this.handleMovementInput(dt, input, prof);
        this.handleCombatInput(input, prof, enemies, boss);
        break;

      case "attack_light_1":
      case "attack_light_2":
      case "attack_light_3":
      case "attack_light_4":
      case "attack_light_5": {
        // God of War: Forward Attack Lunge — player DRIVES into enemies
        const facing = new THREE.Vector3(
          -Math.sin(this.playerGroup.rotation.y),
          0,
          -Math.cos(this.playerGroup.rotation.y)
        );

        // Automatic forward lunge on every attack (the GoW predator feel)
        const isFinisherHit = this.comboCount >= 4;
        const lungeSpeed = isFinisherHit ? 7.0 : 3.5;
        const lungeWindow = isFinisherHit ? 0.15 : 0.12;
        if (this.stateTimer < lungeWindow) {
          this.playerGroup.position.addScaledVector(facing, lungeSpeed * dt);
        }

        // Player can ALSO steer with WASD if desired
        const { moveAxis } = input;
        const isMoving = moveAxis.x !== 0 || moveAxis.y !== 0;
        if (isMoving && this.stateTimer < 0.12) {
          const forward = this.cameraController.getForwardDirection();
          const right = this.cameraController.getRightDirection();
          const steerDir = new THREE.Vector3()
            .addScaledVector(right, moveAxis.x)
            .addScaledVector(forward, -moveAxis.y)
            .normalize();
          const targetRotY = Math.atan2(-steerDir.x, -steerDir.z);
          this.playerGroup.rotation.y = THREE.MathUtils.lerp(this.playerGroup.rotation.y, targetRotY, dt * 14);
        }

        // Spawn afterimage on high combo hits or finisher
        if (this.stateTimer < 0.04 && this.comboCount >= 3) {
          this.spawnAfterimage(new THREE.Color(prof.weaponColor || 0x22d3ee).getHex());
        }

        // Buffer combos!
        if (input.justPressed.has(GameAction.ATTACK)) {
          (this as any).comboBuffer = true;
        }

        // Instant dodge cancel out of attacks (anime flash-step evasions after just 0.05s)
        if (this.stateTimer > 0.05) {
          if (this.handleDodgeInput(input) || this.handleBlockInput(input)) {
            (this as any).comboBuffer = false;
            break;
          }
        }

        // Blistering combo chain speed
        const comboAdvanceTime = 0.09;
        const comboEndTime = 0.22;
        if (this.stateTimer >= comboAdvanceTime) {
          if ((this as any).comboBuffer) {
            (this as any).comboBuffer = false;
            this.triggerCombo(prof, enemies, boss);
          } else if (this.stateTimer >= comboEndTime) {
            this.transitionTo("idle");
          }
        }
        break;
      }

      case "attack_heavy_charge":
        this.chargeTimer += dt;
        // Suction particle swirl into the weapon
        if (Math.random() < 0.4) {
          const randOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            0.5 + Math.random(),
            (Math.random() - 0.5) * 2
          );
          this.particles.burst({
            position: this.playerGroup.position.clone().add(randOffset),
            count: 3,
            speed: -3,
            life: 0.3,
            size: 0.15,
            direction: randOffset.clone().negate().normalize(),
            color: new THREE.Color(prof.weaponColor || 0x22d3ee),
          });
        }

        // Camera micro-rumble
        this.cameraController.addShake(0.04 * (this.chargeTimer / 0.8), 0.05);

        // Allow dodge cancel during charge
        if (this.handleDodgeInput(input)) {
          this.chargeTimer = 0;
          break;
        }

        // When button is released or charge hits max (0.8s), release charged super move!
        if (!input.held.has(GameAction.HEAVY_ATTACK) || this.chargeTimer >= 0.8) {
          this.isFullyCharged = this.chargeTimer >= 0.6;
          this.triggerHeavyAttack(enemies, boss, this.isFullyCharged);
          this.chargeTimer = 0;
        }
        break;

      case "attack_heavy": {
        // God of War: Heavy attack forward surge — 1m+ lunge
        const heavyFacing = new THREE.Vector3(
          -Math.sin(this.playerGroup.rotation.y),
          0,
          -Math.cos(this.playerGroup.rotation.y)
        );
        if (this.stateTimer < 0.18) {
          this.playerGroup.position.addScaledVector(heavyFacing, 5.5 * dt);
        }

        // Also allow WASD steering
        const { moveAxis } = input;
        if (moveAxis.x !== 0 || moveAxis.y !== 0) {
          const forward = this.cameraController.getForwardDirection();
          const right = this.cameraController.getRightDirection();
          const steerDir = new THREE.Vector3()
            .addScaledVector(right, moveAxis.x)
            .addScaledVector(forward, -moveAxis.y)
            .normalize();
          if (this.stateTimer < 0.15) {
            this.playerGroup.position.addScaledVector(steerDir, 2.0 * dt);
          }
        }

        if (this.stateTimer > 0.15) {
          if (this.handleDodgeInput(input) || this.handleBlockInput(input)) {
            break;
          }
        }

        if (this.stateTimer >= 0.42) {
          this.transitionTo("idle");
        }
        break;
      }

      case "attack_dash": {
        // High-velocity dash strike
        const dashAtkSpeed = Math.max(4.0, 32.0 * Math.pow(1.0 - Math.min(1.0, this.stateTimer / 0.25), 2));
        this.playerGroup.position.addScaledVector(this.dodgeDirection, dashAtkSpeed * dt);

        if (this.stateTimer % 0.04 < dt) {
          this.spawnAfterimage(new THREE.Color(prof.weaponColor || 0x22d3ee).getHex());
        }

        if (this.stateTimer > 0.08) {
          if (this.handleDodgeInput(input)) break;
        }

        if (this.stateTimer >= 0.26) {
          this.transitionTo("idle");
        }
        break;
      }

      case "attack_jump":
        // Rapid helm-breaker descent
        this.velocityY = -30.0;
        this.playerGroup.position.y += this.velocityY * dt;

        if (this.playerGroup.position.y <= this.currentGroundHeight) {
          this.playerGroup.position.y = this.currentGroundHeight;
          this.velocityY = 0;
          this.isGrounded = true;
          this.isDiveSlamming = false;
          this.jumpCount = 0;

          // Impact shockwave & screen punch!
          this.cameraController.addShake(1.2, 0.35);
          this.cameraController.addPunchIn(2.0, 0.22);
          const stanceColor = this.getStanceColor();
          this.particles.createShockwave({
            position: this.playerGroup.position.clone(),
            maxRadius: 7.5,
            duration: 0.45,
            color: new THREE.Color(0xf43f5e),
          });
          this.particles.spawnInkSplatter({
            position: this.playerGroup.position.clone(),
            radius: 3.2,
            duration: 2.5,
            color: new THREE.Color(0x18181b),
          });
          this.particles.emitBurst({
            position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
            count: 36,
            speed: 8.5,
            life: 0.55,
            size: 0.35,
            color: stanceColor,
          });
          audioManager.playSFX("dive_impact");

          // AoE dive damage to nearby enemies and boss
          if (enemies) {
            enemies.forEach((enemy) => {
              if (enemy && (enemy as any).state !== "dead" && (enemy as any).mesh?.position) {
                const dist = this.playerGroup.position.distanceTo((enemy as any).mesh.position);
                if (dist <= 6.5) {
                  const kbDir = new THREE.Vector3().subVectors((enemy as any).mesh.position, this.playerGroup.position).normalize();
                  if (typeof (enemy as any).takeDamage === "function") {
                    (enemy as any).takeDamage(110, kbDir, 4.5);
                  } else if (typeof (enemy as any).takeHit === "function") {
                    (enemy as any).takeHit(110, this.playerGroup.position);
                  }
                }
              }
            });
          }
          if (boss && (boss as any).state !== "dead" && (boss as any).mesh?.position) {
            const bd = this.playerGroup.position.distanceTo((boss as any).mesh.position);
            if (bd <= 7.0) {
              const kbDir = new THREE.Vector3().subVectors((boss as any).mesh.position, this.playerGroup.position).normalize();
              if (typeof (boss as any).takeDamage === "function") {
                (boss as any).takeDamage(130, kbDir, 3.5);
              } else if (typeof (boss as any).takeHit === "function") {
                (boss as any).takeHit(130, this.playerGroup.position);
              }
            }
          }

          this.transitionTo("idle");
        }
        break;

      case "dodge":
        // Exponential decay dodge using SAVED direction (not current rotation, which is spinning)
        const dodgeSpeed = Math.max(2.0, 35.0 * Math.pow(1.0 - (this.stateTimer / this.dodgeDuration), 2));
        this.playerGroup.position.addScaledVector(this.dodgeDirection, dodgeSpeed * dt);
        
        // Spawn ink shadow trail every few frames
        if (this.stateTimer % 0.08 < dt) {
          this.particles.emitAmbient(this.playerGroup.position, 1, 0.4);
        }

        // Emit dodge wind ink particles
        if (Math.random() < 0.3) {
          this.particles.burst({
            position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
            count: 3,
            speed: 1,
            life: 0.3,
            size: 0.1,
          });
        }

        if (this.stateTimer >= this.dodgeDuration) {
          this.isInvulnerable = false;
          // Restore the pre-dodge facing direction (the spin was cosmetic only)
          this.playerGroup.rotation.y = this.preDodgeRotationY;
          this.transitionTo("idle");
        }
        break;

      case "block":
        // Keep blocking if input is held
        if (!input.held.has(GameAction.BLOCK)) {
          this.transitionTo("idle");
        }
        break;

      case "parry":
        if (this.stateTimer >= 0.3) {
          this.transitionTo("block");
        }
        break;

      case "stagger":
        // Push backward
        const backDir = new THREE.Vector3(
          Math.sin(this.playerGroup.rotation.y),
          0,
          Math.cos(this.playerGroup.rotation.y)
        );
        this.playerGroup.position.addScaledVector(backDir, 5 * dt);

        if (this.stateTimer >= 0.4) {
          this.transitionTo("idle");
        }
        break;

      case "dead":
        // Keep dead
        break;
    }

    // ── Passive regeneration ──
    // Stamina regenerates faster when idle/blocking, slower during combat
    const isResting = this.state === "idle" || this.state === "block";
    const staminaRegenRate = (isResting ? 35 : 15) * prof.stats.staminaRegenMod;
    store.regenStamina(staminaRegenRate * dt);

    // Qi regenerates slowly over time
    const qiRegenRate = (isResting ? 4.0 : 1.5) * prof.stats.qiRegenMod;
    store.regenQi(qiRegenRate * dt);

    // Health regenerates faster out of combat when resting
    if (isResting && this.stateTimer > 3.0) {
      store.heal(8.0 * dt);
    }

    // Resolve physics & collisions (Only on foot / dismounted)
    if (!this.dragonMount?.isMounted) {
      this.collisions.resolveCollision(this.playerGroup.position, 0.6);
      if (this.isGrounded) {
        this.playerGroup.position.y = this.currentGroundHeight; // Stick to ground / elevated platform level
      }
    }

    // Keep player within world bounds (Drowned Epoch: 100× expanded ocean world)
    const mapLimit = 11500;
    this.playerGroup.position.x = Math.max(-mapLimit, Math.min(mapLimit, this.playerGroup.position.x));
    this.playerGroup.position.z = Math.max(-mapLimit, Math.min(mapLimit, this.playerGroup.position.z));

    // Update store position (throttled to 5Hz to avoid per-frame Zustand React re-renders)
    this.storePosTimer += dt;
    if (this.storePosTimer >= 0.2) {
      this.storePosTimer = 0;
      store.setPlayerPosition([
        this.playerGroup.position.x,
        this.playerGroup.position.y,
        this.playerGroup.position.z,
      ]);
    }

    // Update active slash auras
    for (let i = this.activeSlashes.length - 1; i >= 0; i--) {
      const slash = this.activeSlashes[i];
      slash.life -= dt;
      if (slash.life <= 0) {
        if (slash.mesh.parent) {
          slash.mesh.parent.remove(slash.mesh);
        }
        slash.mesh.geometry.dispose();
        if (Array.isArray(slash.mesh.material)) {
          slash.mesh.material.forEach((m) => m.dispose());
        } else {
          slash.mesh.material.dispose();
        }
        this.activeSlashes.splice(i, 1);
      } else {
        const t = 1.0 - slash.life / slash.maxLife;
        // Move forward
        slash.mesh.position.addScaledVector(slash.velocity, dt);
        // Scale up
        const scale = 1.0 + t * slash.growScale;
        slash.mesh.scale.set(scale, scale, scale);
        // Rotate slightly
        slash.mesh.rotation.z += slash.rotateSpeed * dt;
        // Fade out
        if (slash.mesh.material && "opacity" in slash.mesh.material) {
          (slash.mesh.material as any).opacity = 0.9 * (1.0 - t);
        }
      }
    }

    // Animate meshes procedurally based on state
    this.animateProcedurally(dt);
  }

  private lastMoveAxisY: number = 0;

  /**
   * Handle moving and turning inputs.
   */
  private handleMovementInput(dt: number, input: InputState, prof: ProfessionDef): void {
    if (this.dragonMount?.isMounted) return;
    const { moveAxis } = input;
    this.lastMoveAxisY = moveAxis.y;

    // Souls-like / Where Winds Meet Free Camera System:
    // - Mouse orbits camera freely 360° around player without forcing character to rotate.
    // - In normal traversal, character smoothly turns to face movement direction (W away from camera, S towards camera, A left, D right).
    // - In Aim Mode (Right Click ADS) or FPV [V], character locks to crosshair for precision strafing.
    // - When idle, character maintains orientation so player can orbit 360° and admire character from all angles.
    const camFwd = this.cameraController.getForwardDirection();
    const right = this.cameraController.getRightDirection();
    const isAimingOrFPV = this.cameraController.isAiming || this.cameraController.isFirstPerson;

    if (moveAxis.x !== 0 || moveAxis.y !== 0) {
      const moveDir = new THREE.Vector3()
        .addScaledVector(right, moveAxis.x)
        .addScaledVector(camFwd, -moveAxis.y)
        .normalize();

      const targetAngle = isAimingOrFPV
        ? Math.atan2(-camFwd.x, -camFwd.z)
        : Math.atan2(-moveDir.x, -moveDir.z);

      const currentAngle = this.playerGroup.rotation.y;
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerGroup.rotation.y += diff * Math.min(1, 16 * dt);

      // [Shift] for running / sprint, normal jog otherwise
      const isSprinting = input.held.has(GameAction.SPRINT) || input.held.has(GameAction.DODGE);
      const speed = isSprinting ? 9.8 : 5.2;
      this.playerGroup.position.addScaledVector(moveDir, speed * dt);
      this.transitionTo("run");
    } else {
      if (isAimingOrFPV) {
        const targetAngle = Math.atan2(-camFwd.x, -camFwd.z);
        const currentAngle = this.playerGroup.rotation.y;
        let diff = targetAngle - currentAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerGroup.rotation.y += diff * Math.min(1, 16 * dt);
      }
      this.transitionTo("idle");
    }
  }

  /**
   * Handle core combat trigger buttons with rich attack variations.
   */
  private handleCombatInput(input: InputState, prof: ProfessionDef, enemies?: any[], boss?: any): void {
    if (this.dragonMount?.isMounted) return;
    if (this.handleDodgeInput(input)) return;
    if (this.handleBlockInput(input)) return;

    const store = useGameStore.getState();

    // 1. Aim Mode Actions:
    if (this.cameraController.isAiming) {
      // LMB throws or recalls Flying Axe!
      if (input.justPressed.has(GameAction.ATTACK)) {
        if (this.axeThrowState === "idle") {
          this.triggerAxeThrow(enemies, boss);
        } else {
          this.triggerAxeRecall();
        }
        return;
      }
    }

    // 2. Aerial / Sky Attack: Heavy axe leap slam!
    if (!this.isGrounded && input.justPressed.has(GameAction.ATTACK)) {
      if (store.useStamina(15)) {
        this.transitionTo("attack_jump");
        return;
      }
    }

    // 3. Dash Attack Variation
    if (this.state === "dodge" && input.justPressed.has(GameAction.ATTACK)) {
      if (store.useStamina(14)) {
        this.triggerDashAttack(prof, enemies, boss);
        return;
      }
    }

    // 4. Hold-to-Charge Heavy Attack (Weapon Art)
    if (input.justPressed.has(GameAction.HEAVY_ATTACK)) {
      const heavyCost = 25;
      if (store.useStamina(heavyCost)) {
        this.chargeTimer = 0;
        this.isFullyCharged = false;
        this.transitionTo("attack_heavy_charge");
        audioManager.playSFX("parry");
        return;
      }
    }

    // 5. Normal Light Attack Combos
    if (input.justPressed.has(GameAction.ATTACK)) {
      const attackCost = 12;
      if (store.useStamina(attackCost)) {
        this.triggerCombo(prof, enemies, boss);
      } else {
        // Play out-of-stamina cue
        this.particles.emitAmbient(this.playerGroup.position, 1, 1);
      }
    }
  }

  private handleDodgeInput(input: InputState): boolean {
    // Only dodge if explicitly triggered by DODGE action, NEVER while holding Shift to sprint!
    if (input.justPressed.has(GameAction.DODGE) && !input.held.has(GameAction.SPRINT)) {
      const store = useGameStore.getState();
      const dodgeCost = 20;
      if (store.useStamina(dodgeCost)) {
        this.isInvulnerable = true;

        // Save the dodge direction: use movement input direction if available,
        // otherwise dodge in the facing direction
        const { moveAxis } = input;
        if (moveAxis.x !== 0 || moveAxis.y !== 0) {
          const forward = this.cameraController.getForwardDirection();
          const right = this.cameraController.getRightDirection();
          this.dodgeDirection = new THREE.Vector3()
            .addScaledVector(right, moveAxis.x)
            .addScaledVector(forward, -moveAxis.y)
            .normalize();
        } else {
          this.dodgeDirection = new THREE.Vector3(
            -Math.sin(this.playerGroup.rotation.y),
            0,
            -Math.cos(this.playerGroup.rotation.y)
          );
        }

        // Save pre-dodge rotation so we can restore after cosmetic spin
        this.preDodgeRotationY = this.playerGroup.rotation.y;

        this.transitionTo("dodge");

        // Spawn dash dust cloud
        this.particles.burst({
          position: this.playerGroup.position.clone(),
          count: 10,
          speed: 3,
          life: 0.4,
          size: 0.12,
        });
        audioManager.playSFX("dodge");
        // God of War: Radial blur on dodge roll
        this.cameraController.triggerRadialBlur(0.25);
        return true;
      }
    }
    return false;
  }

  private handleBlockInput(input: InputState): boolean {
    // Only enter stationary block if not actively aiming (Aiming allows aiming & strafing!)
    if (input.held.has(GameAction.BLOCK) && !input.held.has(GameAction.AIM)) {
      this.transitionTo("block");
      return true;
    }
    return false;
  }

  private applyTargetAssist(enemies?: any[], boss?: any): void {
    let targetMesh: THREE.Object3D | null = null;
    let minDist = 3.6; // only assist for enemies within immediate melee range
    const camFwd = this.cameraController.getForwardDirection();

    // Check boss
    if (boss && boss.state !== "dead") {
      const dist = this.playerGroup.position.distanceTo(boss.mesh.position);
      const toBoss = new THREE.Vector3().subVectors(boss.mesh.position, this.playerGroup.position).normalize();
      if (dist < minDist && camFwd.dot(toBoss) > 0.3) {
        minDist = dist;
        targetMesh = boss.mesh;
      }
    }

    // Check grunts / elites
    if (enemies) {
      enemies.forEach((enemy) => {
        if (enemy.state !== "dead") {
          const dist = this.playerGroup.position.distanceTo(enemy.mesh.position);
          const toEnemy = new THREE.Vector3().subVectors(enemy.mesh.position, this.playerGroup.position).normalize();
          if (dist < minDist && camFwd.dot(toEnemy) > 0.3) {
            minDist = dist;
            targetMesh = enemy.mesh;
          }
        }
      });
    }

    if (targetMesh) {
      const dir = new THREE.Vector3().subVectors(targetMesh.position, this.playerGroup.position);
      const angle = Math.atan2(-dir.x, -dir.z);
      this.playerGroup.rotation.y = angle;
    }
  }

  private spawnSlashAura(type: "light_1" | "light_2" | "light_3" | "heavy"): void {
    const store = useGameStore.getState();
    const parent = this.playerGroup.parent;
    if (!parent) return;

    // Stance & Weapon colors: Plum Blossom Pink for default/axe, pink petals for blades
    let colorHex = 0xf43f5e; // Blossom Pink
    if (this.activeGowWeapon === "blades") {
      colorHex = 0xf472b6;
    } else if (this.activeGowWeapon === "spear") {
      colorHex = 0x38bdf8;
    } else if (store.player.stance === "thunderclap") {
      colorHex = 0x88ccff; // electric cyan
    } else if (store.player.stance === "iron_body") {
      colorHex = 0xffa500; // orange/gold aura
    }

    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    let maxLife = 0.22;
    let growScale = 0.8;
    let rotateSpeed = 0.0;

    const velocity = new THREE.Vector3(
      -Math.sin(this.playerGroup.rotation.y),
      0,
      -Math.cos(this.playerGroup.rotation.y)
    ).normalize().multiplyScalar(5.5); // forward surge velocity

    const rotation = new THREE.Euler(0, this.playerGroup.rotation.y, 0);
    const position = this.playerGroup.position.clone().add(
      new THREE.Vector3(
        -Math.sin(this.playerGroup.rotation.y) * 0.7,
        1.1,
        -Math.cos(this.playerGroup.rotation.y) * 0.7
      )
    );

    if (type === "heavy") {
      // Circular expanding shockwave ring Flat on horizontal plane
      geometry = new THREE.RingGeometry(0.3, 1.2, 24);
      material = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      maxLife = 0.3;
      growScale = 2.0;
      velocity.multiplyScalar(1.5);
      rotation.x = Math.PI / 2; // Flat horizontal plane orientation
    } else {
      // Crescent slash segment
      let thetaStart = 0;
      let thetaLength = Math.PI * 0.75;

      if (type === "light_1") {
        thetaStart = -Math.PI / 3;
        rotateSpeed = 2.5;
        rotation.x = Math.PI / 6;
        rotation.z = -Math.PI / 6;
      } else if (type === "light_2") {
        thetaStart = Math.PI / 3;
        rotateSpeed = -2.5;
        rotation.x = -Math.PI / 6;
        rotation.z = Math.PI / 6;
      } else {
        // light_3 overhead smash: vertical crescent slash
        thetaStart = -Math.PI * 0.35;
        thetaLength = Math.PI * 0.7;
        rotateSpeed = 0.0;
        rotation.x = 0;
        rotation.y = this.playerGroup.rotation.y + Math.PI / 2;
        rotation.z = Math.PI / 2;
      }

      geometry = new THREE.RingGeometry(0.9, 1.5, 20, 1, thetaStart, thetaLength);
      material = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    parent.add(mesh);

    this.activeSlashes.push({
      mesh,
      maxLife,
      life: maxLife,
      velocity,
      growScale,
      rotateSpeed
    });
  }

  /**
   * Launch a travelling physical 3D Crescent Sky Aura Wave projectile toward aim direction or locked target.
   * Supersonic flight, homing aim assist, strikes aerial wyverns down, and inflicts severe bleeding damage over time!
   */
  public launchSkyAuraSlash(aimDirOverride?: THREE.Vector3, enemies?: any[], boss?: any): void {
    // Disabled: Long-range aura wave removed per user specification
    const store = useGameStore.getState();
    const profId = (store.player.profession || "sword_sage") as ProfessionId;
    const prof = PROFESSIONS[profId] || PROFESSIONS.sword_sage;
    this.triggerCombo(prof, enemies, boss);
    return;
  }

  public triggerAimSkySlash(prof: ProfessionDef, enemies?: any[], boss?: any): void {
    this.launchSkyAuraSlash(undefined, enemies, boss);
  }

  private updateAuraSlashProjectiles(dt: number, enemies?: any[], boss?: any): void {
    if (this.auraSlashProjectiles.length === 0) return;
    const store = useGameStore.getState();
    const targets = this.getTargets(enemies, boss);

    for (let i = this.auraSlashProjectiles.length - 1; i >= 0; i--) {
      const proj = this.auraSlashProjectiles[i];
      proj.life -= dt;

      // In-flight homing toward targeted enemy
      if (proj.target && proj.target.state !== "dead" && proj.target.mesh) {
        const toTarget = new THREE.Vector3().subVectors(proj.target.mesh.position, proj.mesh.position);
        if (toTarget.length() > 1.0 && toTarget.length() < 240.0) {
          toTarget.normalize().multiplyScalar(proj.velocity.length());
          proj.velocity.lerp(toTarget, Math.min(1.0, dt * 7.5));
          proj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), proj.velocity.clone().normalize());
          proj.mesh.rotateZ(0.65);
        }
      }

      // Move forward
      proj.mesh.position.addScaledVector(proj.velocity, dt);

      // Trailing aura wisps
      if (Math.random() < 0.65) {
        this.particles.emitBurst({
          position: proj.mesh.position.clone(),
          count: 3,
          speed: 2.0,
          life: 0.3,
          size: 0.28,
          color: proj.color,
        });
        // Blood sparks
        this.particles.emitBurst({
          position: proj.mesh.position.clone(),
          count: 2,
          speed: 1.5,
          life: 0.35,
          size: 0.2,
          color: new THREE.Color(0xef4444),
        });
      }

      // Hit detection
      let hitTarget: any = null;
      for (const t of targets) {
        if (t.state === "dead" || !t.mesh) continue;
        const isAerial = !!(t as any).isFlying || t.mesh.position.y > 6.0;
        const radius = proj.hitRadius || (isAerial ? 8.5 : 3.8);
        if (proj.mesh.position.distanceTo(t.mesh.position) <= radius) {
          hitTarget = t;
          break;
        }
      }

      if (hitTarget || proj.life <= 0) {
        if (hitTarget) {
          // Impact sound & shake
          audioManager.playSFX("slash");
          audioManager.playSFX("boss_ripple");
          this.cameraController.addShake(0.85, 0.2);

          const dmg = proj.damage + Math.floor(Math.random() * 35);
          if (typeof hitTarget.takeDamage === "function") {
            hitTarget.takeDamage(dmg, proj.velocity.clone().normalize(), 5.0);
          } else if (typeof hitTarget.takeHit === "function") {
            hitTarget.takeHit(dmg, proj.mesh.position);
          }

          // If wyvern: bring crashing down!
          if (typeof (hitTarget as any).crashGround === "function") {
            (hitTarget as any).crashGround(4.5);
          }

          // Damage popup
          store.addDamagePopup(dmg, true, [hitTarget.mesh.position.x, hitTarget.mesh.position.y + 1.8, hitTarget.mesh.position.z], "#f43f5e");
          store.addComboPoint(35);

          // Impact burst particles
          this.particles.emitBurst({
            position: proj.mesh.position.clone(),
            count: 32,
            speed: 8.5,
            life: 0.55,
            size: 0.38,
            color: proj.color,
          });

          // Blood burst particles
          this.particles.emitBurst({
            position: hitTarget.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
            count: 24,
            speed: 6.0,
            life: 0.6,
            size: 0.32,
            color: new THREE.Color(0xb91c1c),
          });

          // APPLY BLEED EFFECT!
          this.applyBleedToTarget(hitTarget, proj.bleedDuration, proj.bleedDps);
          store.setBattleBanner("ENEMY HIT BY SKY AURA SLASH — BLEEDING PROFUSELY!", 2.2);
        }

        // Cleanup mesh
        if (proj.mesh.parent) {
          proj.mesh.parent.remove(proj.mesh);
        }
        this.auraSlashProjectiles.splice(i, 1);
      }
    }
  }

  public applyBleedToTarget(target: any, duration: number = 4.0, dps: number = 18): void {
    if (!target || target.state === "dead") return;

    // Check if target is already bleeding
    const existing = this.activeBleeds.find((b) => b.target === target);
    if (existing) {
      existing.remainingTime = Math.max(existing.remainingTime, duration);
      existing.dps = Math.max(existing.dps, dps);
      return;
    }

    this.activeBleeds.push({
      target,
      remainingTime: duration,
      tickTimer: 0.5,
      dps,
      name: target.name || "Enemy",
    });

    // If target has native applyBleed, call it too
    if (typeof (target as any).applyBleed === "function") {
      (target as any).applyBleed(duration, dps);
    }
  }

  private updateBleeds(dt: number, _enemies?: any[], _boss?: any): void {
    if (this.activeBleeds.length === 0) return;
    const store = useGameStore.getState();

    for (let i = this.activeBleeds.length - 1; i >= 0; i--) {
      const bleed = this.activeBleeds[i];
      bleed.remainingTime -= dt;
      bleed.tickTimer -= dt;

      const target = bleed.target;
      if (!target || target.state === "dead" || !target.mesh) {
        this.activeBleeds.splice(i, 1);
        continue;
      }

      if (bleed.tickTimer <= 0) {
        bleed.tickTimer = 0.5; // tick every 0.5s
        const tickDamage = bleed.dps;

        if (typeof target.takeDamage === "function") {
          target.takeDamage(tickDamage);
        } else if (typeof target.takeHit === "function") {
          target.takeHit(tickDamage);
        }

        // Floating bleed damage popup
        store.addDamagePopup(
          tickDamage,
          false,
          [
            target.mesh.position.x + (Math.random() - 0.5) * 0.6,
            target.mesh.position.y + 1.2 + Math.random() * 0.5,
            target.mesh.position.z + (Math.random() - 0.5) * 0.6,
          ],
          "#ef4444"
        );

        // Dripping crimson blood / ink particles
        this.particles.emitBurst({
          position: target.mesh.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            1.2 + Math.random() * 0.4,
            (Math.random() - 0.5) * 0.5
          )),
          count: 5,
          speed: 1.2,
          life: 0.45,
          size: 0.18,
          color: new THREE.Color(0xb91c1c),
        });
      }

      if (bleed.remainingTime <= 0) {
        this.activeBleeds.splice(i, 1);
      }
    }
  }

  private triggerCombo(prof: ProfessionDef, enemies?: any[], boss?: any): void {
    this.comboTimer = 1.2; // combo window
    this.comboCount = (this.comboCount % prof.maxComboChain) + 1;

    // Apply auto-target alignment before launching the strike
    this.applyTargetAssist(enemies, boss);

    let animState: PlayerAnimState = "attack_light_1";
    if (this.comboCount === 2) animState = "attack_light_2";
    else if (this.comboCount === 3) animState = "attack_light_3";
    else if (this.comboCount === 4) animState = "attack_light_4";
    else if (this.comboCount === 5) animState = "attack_light_5";

    this.transitionTo(animState);

    const isFinisher = this.comboCount === prof.maxComboChain;
    const store = useGameStore.getState();

    // Spawn slash aura mesh
    const typeStr = isFinisher ? "light_3" : this.comboCount === 2 ? "light_2" : "light_1";
    this.spawnSlashAura(typeStr);

    const facing = new THREE.Vector3();
    if (this.cameraController.isAiming) {
      this.cameraController.camera.getWorldDirection(facing);
    } else {
      facing.set(
        -Math.sin(this.playerGroup.rotation.y),
        0.15,
        -Math.cos(this.playerGroup.rotation.y)
      ).normalize();
    }

    const weaponColor = new THREE.Color(prof.weaponColor || 0x22d3ee);
    const rangeMod = prof.stats.rangeMod || 1.0;

    if (this.slashManager) {
      this.slashManager.spawnSlash({
        position: this.playerGroup.position.clone(),
        direction: facing,
        radius: (isFinisher ? 4.2 : this.comboCount === 3 ? 3.8 : 3.2) * rangeMod,
        width: isFinisher ? 1.2 : 0.85,
        color: weaponColor,
        isHeavy: isFinisher,
        verticalCurve: this.comboCount % 2 === 0 ? -0.4 : 0.3,
      });
    }

    if (isFinisher) {
      this.cameraController.addShake(0.65, 0.16);
      this.spawnAfterimage(weaponColor.getHex());
      const comboName = prof.comboNames?.[this.comboCount - 1] || "CRITICAL FINISHER";
      store.setBattleBanner(`${comboName.toUpperCase()} — DEVASTATING FINISHER!`, 1.2);
      this.particles.spawnShockwaveRing?.({
        position: this.playerGroup.position.clone(),
        maxRadius: 3.8,
        duration: 0.38,
        color: weaponColor,
      });
    }

    this.particles.burst({
      position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      count: 14 + this.comboCount * 4,
      speed: 4 + this.comboCount * 1.2,
      life: 0.45,
      size: 0.28,
      direction: facing,
      spread: 0.7,
      color: weaponColor,
    });

    audioManager.playSFX("attack");
  }

  private triggerHeavyAttack(enemies?: any[], boss?: any, isCharged: boolean = false): void {
    const store = useGameStore.getState();
    const profId = (store.player.profession || "sword_sage") as ProfessionId;
    const prof = PROFESSIONS[profId] || PROFESSIONS.sword_sage;

    this.applyTargetAssist(enemies, boss);
    this.transitionTo("attack_heavy");
    this.isFullyCharged = isCharged;

    this.spawnSlashAura("heavy");

    const facing = new THREE.Vector3(
      -Math.sin(this.playerGroup.rotation.y),
      0.1,
      -Math.cos(this.playerGroup.rotation.y)
    );

    const weaponColor = new THREE.Color(prof.weaponColor || 0x22d3ee);
    const rangeMod = prof.stats.rangeMod || 1.0;

    if (this.slashManager) {
      this.slashManager.spawnSlash({
        position: this.playerGroup.position.clone(),
        direction: facing,
        radius: (isCharged ? 3.6 : 2.5) * rangeMod,
        width: isCharged ? 1.4 : 0.9,
        color: weaponColor,
        isHeavy: true,
        verticalCurve: 0.0,
      });
    }

    const shockwaveRadius = isCharged ? 5.5 : 3.5;
    this.particles.spawnShockwaveRing?.({
      position: this.playerGroup.position.clone(),
      maxRadius: shockwaveRadius,
      duration: isCharged ? 0.6 : 0.4,
      color: weaponColor,
    });

    this.particles.burst({
      position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0)),
      count: isCharged ? 36 : 22,
      speed: isCharged ? 9 : 6,
      life: isCharged ? 0.75 : 0.6,
      size: isCharged ? 0.5 : 0.4,
      direction: facing,
      spread: 0.5,
      color: weaponColor,
    });

    this.spawnAfterimage(weaponColor.getHex());

    if (isCharged) {
      this.cameraController.addShake(1.1, 0.28);
      store.setBattleBanner(`${prof.chargedSkillName.toUpperCase()}!`, 1.2);
    } else {
      this.cameraController.addShake(0.5, 0.15);
      store.setBattleBanner("HEAVY STRIKE!", 0.6);
    }

    audioManager.playSFX("attack");
  }

  private triggerDashAttack(prof: ProfessionDef, enemies?: any[], boss?: any): void {
    const store = useGameStore.getState();
    this.applyTargetAssist(enemies, boss);
    this.transitionTo("attack_dash");

    const facing = new THREE.Vector3(
      -Math.sin(this.playerGroup.rotation.y),
      0.1,
      -Math.cos(this.playerGroup.rotation.y)
    );

    const weaponColor = new THREE.Color(prof.weaponColor || 0x22d3ee);

    if (this.slashManager) {
      this.slashManager.spawnSlash({
        position: this.playerGroup.position.clone(),
        direction: facing,
        radius: 2.2 * (prof.stats.rangeMod || 1.0),
        width: 0.8,
        color: weaponColor,
        isHeavy: false,
        verticalCurve: -0.2,
      });
    }

    this.spawnAfterimage(weaponColor.getHex());
    this.cameraController.addShake(0.4, 0.12);
    store.setBattleBanner("FLASH STEP CLEAVE", 0.6);

    this.particles.burst({
      position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
      count: 18,
      speed: 6,
      life: 0.4,
      size: 0.25,
      direction: facing,
      spread: 0.6,
      color: weaponColor,
    });

    audioManager.playSFX("attack");
  }

  private triggerJumpAttack(enemies?: any[], boss?: any): void {
    const store = useGameStore.getState();
    const profId = (store.player.profession || "sword_sage") as ProfessionId;
    const prof = PROFESSIONS[profId] || PROFESSIONS.sword_sage;

    this.isDiveSlamming = true;
    this.isGliding = false;
    this.isAirDashing = false;

    this.applyTargetAssist(enemies, boss);
    this.transitionTo("attack_jump");

    store.setBattleBanner("METEOR DIVE SLAM · 千斤坠", 0.6);
    this.spawnAfterimage(new THREE.Color(prof.weaponColor || 0x22d3ee).getHex());
    audioManager.playSFX("slash");
  }

  /**
   * Take hit from an enemy. Computes blocks, parries, and damage.
   * @param damage Raw incoming damage
   * @param attackerPos Location of the attacker (for parry direction)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  receiveHit(damage: number, attackerPos: THREE.Vector3): boolean {
    if (this.state === "dead" || this.isInvulnerable) return false;

    // Barrel roll i-frames: immune to all damage while dragon is barrel rolling
    if (this.dragonMount?.isMounted && this.dragonMount.invulnerable) {
      useGameStore.getState().setBattleBanner("BARREL ROLL DODGE!", 0.8);
      return false;
    }

    const store = useGameStore.getState();
    const profId = store.player.profession || "flowing_wind";
    const prof = PROFESSIONS[profId as ProfessionId] || PROFESSIONS.sword_sage;

    // 0. Murim Hyper-Armor / Strike-Through (No Recoil, No Self-Stagger!)
    // When player is actively attacking, their blade cuts forward with absolute unstoppable priority!
    if (this.state.startsWith("attack_")) {
      audioManager.playSFX("parry");
      this.cameraController.addShake(0.4, 0.1);
      store.addComboPoint(25);
      store.setBattleBanner("STRIKE THROUGH · 破陣", 0.6);

      // Spawn fiery white clashing ink sparks at impact
      const clashPos = this.playerGroup.position.clone().lerp(attackerPos, 0.5).add(new THREE.Vector3(0, 1.2, 0));
      this.particles.spawnParryBurst?.(clashPos, new THREE.Color(0xffffff));
      this.particles.burst({
        position: clashPos,
        count: 22,
        speed: 7,
        life: 0.4,
        size: 0.22,
        color: new THREE.Color(0xffffff),
      });

      // NO RECOIL, NO PUSHBACK, NO PLAYER STAGGER!
      // Return true to stun/stagger the incoming enemy while player cleanly finishes their lethal slash!
      return true;
    }

    // 1. Dauntless Shield Perfect Parry
    if (this.state === "block" && this.stateTimer <= 0.25) {
      // Perfect Parry!
      this.transitionTo("parry");
      store.regenQi(25); // Large qi gain on parry
      store.regenStamina(35); // Reward stamina for parry
      store.heal(Math.round(store.player.health.max * 0.12)); // Restore 12% health on perfect parry!
      store.addRage(15);
      store.triggerHitFreeze(0.14, 0.03); // 140ms freeze for massive impact
      store.addComboPoint(45);
      store.setBattleBanner("DAUNTLESS PARRY - 60 STUN DEFLECT!", 1.2);

      // Full parry golden radial burst VFX: shockwave + golden sunburst sparks
      const parryPos = this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0.4));
      this.particles.spawnParryBurst?.(parryPos, new THREE.Color(0xfbbf24));
      this.particles.burst({
        position: parryPos,
        count: 30,
        speed: 9,
        life: 0.5,
        size: 0.28,
        color: new THREE.Color(0xfbbf24),
      });

      audioManager.playSFX("parry");

      // Soul Echo shortcut check
      const nextParries = store.player.consecutiveParries + 1;
      useGameStore.setState((s) => {
        s.player.consecutiveParries = nextParries;
      });
      if (nextParries >= 3) {
        store.discoverSecretPower("soul_echo");
      }
      
      this.cameraController.addShake(0.9, 0.2); // Screen shake on perfect parry!
      return true; // Indicates parry success
    }

    // 2. Block Check
    if (this.state === "block") {
      const blockEfficiency = 0.7 * prof.stats.blockPowerMod;
      const finalDamage = Math.max(0, damage * (1 - blockEfficiency));
      const blockCost = damage * 0.4;

      if (store.useStamina(blockCost)) {
        store.takeDamage(finalDamage);
        store.regenQi(damage * 0.3); // Block builds qi
        // Block spark sparks
        this.particles.burst({
          position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0.3)),
          count: 6,
          speed: 3,
          life: 0.3,
          size: 0.12,
        });
        audioManager.playSFX("block");
        return false;
      } else {
        // Stamina guard broken fallback:
        // Set stamina to 0, take 50% damage, and stagger player
        useGameStore.setState((s) => {
          s.player.stamina.current = 0;
        });
        store.takeDamage(damage * 0.5);
        this.transitionTo("stagger");
        this.particles.burst({
          position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0.3)),
          count: 10,
          speed: 4,
          life: 0.35,
          size: 0.15,
        });
        audioManager.playSFX("block");
        return false;
      }
    }

    // 3. Raw Hit Taken & Cheat Death Check
    const currentHP = store.player.health.current;
    const finalHealth = currentHP - damage;

    if (finalHealth <= 0 && store.player.qi.current >= 50) {
      // Trigger Meridian Core Backflow (Cheat Death second chance!)
      useGameStore.setState((s) => {
        s.player.qi.current = 0; // Consume all Qi
        s.player.health.current = Math.round(s.player.health.max * 0.4); // Restore 40% health
      });

      this.isInvulnerable = true;
      this.invulnerableTimer = 1.8; // 1.8s of total safety i-frames
      this.transitionTo("idle");
      this.triggerBackflowPush = true; // Flag to push enemies next frame

      // Epic ink explosion VFX
      this.particles.burst({
        position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0)),
        count: 50,
        speed: 12,
        life: 0.8,
        size: 0.35,
      });

      audioManager.playSFX("boss_ripple");
      this.cameraController.addShake(1.5, 0.35); // Huge screen shake
      store.triggerHitFreeze(0.35, 0.04); // 350ms slow motion freeze!
      return false; // Dodged death!
    }

    store.takeDamage(damage);
    useGameStore.setState((s) => {
      s.player.consecutiveParries = 0; // reset combo chain
    });

    if (store.player.health.current > 0) {
      // Only stagger on significant hits (>=8 damage). Light chip damage shouldn't interrupt player.
      // This prevents stunlock hell where every tiny hit locks you in stagger animation.
      if (damage >= 8.0) {
        this.transitionTo("stagger");
        // Blood ink splash
        this.particles.burst({
          position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
          count: 14,
          speed: 4,
          life: 0.5,
          size: 0.16,
        });

        audioManager.playSFX("stagger");

        // Trigger brief i-frames to prevent multi-hit instadeaths
        this.isInvulnerable = true;
        this.invulnerableTimer = 0.45;
      } else {
        // Minor hit: still show visual feedback but don't interrupt player action
        this.particles.burst({
          position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
          count: 6,
          speed: 2,
          life: 0.3,
          size: 0.1,
        });
        audioManager.playSFX("block");
        // Brief i-frames even for minor hits
        this.isInvulnerable = true;
        this.invulnerableTimer = 0.2;
      }
    } else {
      this.transitionTo("dead");
    }
    return false;
  }

  /**
   * Helper to perform clean state transitions.
   */
  transitionTo(nextState: PlayerAnimState): void {
    if (this.state === nextState) return;
    if (nextState === "dead" && this.axeThrowState !== "idle") {
      this.catchAxe();
    }
    this.state = nextState;
    this.stateTimer = 0;
    (this as any).comboBuffer = false;
    (this as any).hasHitInCurrentAttack = false;
  }

  /**
   * Procedural animation helper. Rotates player limbs based on state.
   */
  private animateProcedurally(dt: number): void {
    // Set weapon highlight based on attack or parry state
    if (this.weaponMesh) {
      const isAttacking = this.state.startsWith("attack_");
      this.weaponMesh.traverse((child: any) => {
        if (child.isMesh && child.material && "emissive" in child.material) {
          if (isAttacking) {
            child.material.emissive.setHex(0x332211);
          } else if (this.state === "parry") {
            child.material.emissive.setHex(0x554400);
          } else {
            child.material.emissive.setHex(0x000000);
          }
        }
      });
    }

    // Update player mesh color dynamically (only for legacy fallback mesh, preserving mythic character materials)
    if (!this.mythicParts) {
      if (this.state === "stagger") {
        this.setPlayerMeshColor(0xff3333);
      } else if (this.isInvulnerable) {
        this.setPlayerMeshColor(0x888888);
      } else {
        this.setPlayerMeshColor(0x111111);
      }
    }

    const elapsed = this.stateTimer;

    // Reset default orientations
    if (this.bodyMesh) {
      this.bodyMesh.rotation.set(0, 0, 0);
      this.bodyMesh.position.y = 1.2;
    }

    // If mounted on dragon, retain ergonomic riding pose without resetting to standing
    if (this.dragonMount?.isMounted) {
      if (this.rightArmMesh) this.rightArmMesh.rotation.set(-0.75, 0.18, 0.22);
      if (this.leftArmMesh) this.leftArmMesh.rotation.set(-0.75, -0.18, -0.22);
      if (this.rightLegMesh) this.rightLegMesh.rotation.set(0.68, 0.32, -0.08);
      if (this.leftLegMesh) this.leftLegMesh.rotation.set(0.68, -0.32, 0.08);
      return;
    }

    // Default right/left positions
    if (this.rightArmMesh && this.leftArmMesh && this.rightLegMesh && this.leftLegMesh) {
      this.rightArmMesh.rotation.set(0, 0, 0);
      this.leftArmMesh.rotation.set(0, 0, 0);
      this.rightLegMesh.rotation.set(0, 0, 0);
      this.leftLegMesh.rotation.set(0, 0, 0);

      const isDual = this.activeGowWeapon === "blades" || this.currentWeaponType === "shadow_archer";
      const isFist = (this.activeGowWeapon === "axe" && this.axeThrowState !== "idle") || this.currentWeaponType === "fist_cultivator";
      const isSpear = this.activeGowWeapon === "spear" || this.currentWeaponType === "iron_guardian";

      // Airborne Where Winds Meet Qinggong Postures
      if (!this.isGrounded && (this.state === "idle" || this.state === "run")) {
        if (this.isGliding) {
          // Graceful wuxia wind-gliding posture: arms spread like wings, legs trailing back, torso angled forward
          this.rightArmMesh.rotation.z = Math.PI / 3;
          this.rightArmMesh.rotation.x = -Math.PI / 6;
          this.leftArmMesh.rotation.z = -Math.PI / 3;
          this.leftArmMesh.rotation.x = -Math.PI / 6;
          this.rightLegMesh.rotation.x = 0.35;
          this.leftLegMesh.rotation.x = 0.45;
          if (this.bodyMesh) {
            this.bodyMesh.position.y = 1.15;
            this.bodyMesh.rotation.x = 0.3;
          }
          return;
        } else if (this.isAirDashing) {
          // Aerodynamic forward thrust pose
          this.rightArmMesh.rotation.x = Math.PI * 0.8;
          this.leftArmMesh.rotation.x = Math.PI * 0.8;
          this.rightLegMesh.rotation.x = 0.5;
          this.leftLegMesh.rotation.x = 0.5;
          if (this.bodyMesh) {
            this.bodyMesh.position.y = 1.0;
            this.bodyMesh.rotation.x = 0.45;
          }
          return;
        } else if (this.jumpCount === 2) {
          // Sky step: aerial tuck / spin kick
          this.rightArmMesh.rotation.x = -Math.PI / 2;
          this.leftArmMesh.rotation.x = Math.PI / 3;
          this.rightLegMesh.rotation.x = -0.5;
          this.leftLegMesh.rotation.x = 0.5;
          if (this.bodyMesh) {
            this.bodyMesh.position.y = 1.25;
            this.bodyMesh.rotation.x = -0.15;
          }
          return;
        } else {
          // First spring jump: athletic tuck
          this.rightArmMesh.rotation.x = -Math.PI / 4;
          this.leftArmMesh.rotation.x = -Math.PI / 4;
          this.rightLegMesh.rotation.x = -0.3;
          this.leftLegMesh.rotation.x = -0.3;
          if (this.bodyMesh) {
            this.bodyMesh.position.y = 1.2;
          }
          return;
        }
      }

      switch (this.state) {
        case "idle":
          // Breathing motion
          const breath = Math.sin(performance.now() * 0.002) * 0.04;
          if (this.bodyMesh) this.bodyMesh.position.y = 1.2 + breath;
          this.rightArmMesh.rotation.x = breath * 0.5;
          this.leftArmMesh.rotation.x = -breath * 0.5;
          break;

        case "awakening":
          if (this.awakeningTimer > 1.6) {
            // Weapon held skyward, divine celestial communion
            this.rightArmMesh.rotation.x = -Math.PI * 0.85;
            this.leftArmMesh.rotation.x = -Math.PI * 0.85;
            this.rightLegMesh.rotation.x = 0.3;
            this.leftLegMesh.rotation.x = -0.3;
          } else {
            // Downward earth slam posture
            this.rightArmMesh.rotation.x = Math.PI * 0.45;
            this.leftArmMesh.rotation.x = Math.PI * 0.45;
            if (this.bodyMesh) this.bodyMesh.rotation.x = 0.35;
          }
          break;

        case "run":
          // Swing legs and arms in counter-cycles
          // Reverse cycle when backpedaling (S key held) for natural moonwalk/backpedal
          const isBackpedal = this.lastMoveAxisY > 0;
          const cycleDir = isBackpedal ? -1 : 1;
          const cycle = Math.sin(performance.now() * 0.012) * cycleDir;
          this.rightLegMesh.rotation.x = cycle * 0.6;
          this.leftLegMesh.rotation.x = -cycle * 0.6;
          this.rightArmMesh.rotation.x = -cycle * 0.4;
          this.leftArmMesh.rotation.x = cycle * 0.4;
          if (this.bodyMesh) this.bodyMesh.position.y = 1.2 + Math.abs(cycle) * 0.08;
          break;

        case "attack_light_1": {
          if (isDual) {
            // Scissor cross strike
            this.rightArmMesh.rotation.x = -Math.PI / 4 + elapsed * Math.PI * 3.0;
            this.rightArmMesh.rotation.y = -Math.PI / 4;
            this.leftArmMesh.rotation.x = Math.PI / 4 - elapsed * Math.PI * 3.0;
            this.leftArmMesh.rotation.y = Math.PI / 4;
          } else if (isFist) {
            // Left fast jab
            this.leftArmMesh.rotation.x = Math.PI / 2;
            this.leftArmMesh.position.z = Math.sin(elapsed * Math.PI * 3) * 0.3;
            this.rightArmMesh.rotation.x = -Math.PI / 6;
          } else if (isSpear) {
            // Straight dragon thrust
            this.rightArmMesh.rotation.x = Math.PI / 2;
            this.leftArmMesh.rotation.x = Math.PI / 2 - 0.2;
            this.rightArmMesh.position.z = Math.sin(elapsed * Math.PI * 3.2) * 0.45;
          } else {
            // Horizontal Odachi / Brush crescent sweep
            this.rightArmMesh.rotation.x = -Math.PI / 3 + elapsed * Math.PI * 2.8;
            this.rightArmMesh.rotation.y = -Math.PI / 3 + elapsed * Math.PI * 2.2;
            this.leftArmMesh.rotation.x = Math.PI / 5;
            if (this.bodyMesh) this.bodyMesh.rotation.y = -0.3 + elapsed * 0.6;
          }
          break;
        }

        case "attack_light_2": {
          if (isDual) {
            // Rapid double stabbing flurry
            this.rightArmMesh.rotation.x = Math.PI / 2;
            this.leftArmMesh.rotation.x = Math.PI / 2;
            this.rightArmMesh.position.z = Math.sin(elapsed * Math.PI * 6) * 0.25;
            this.leftArmMesh.position.z = -Math.sin(elapsed * Math.PI * 6) * 0.25;
          } else if (isFist) {
            // Heavy right cross punch
            this.rightArmMesh.rotation.x = Math.PI / 2;
            this.rightArmMesh.position.z = Math.sin(elapsed * Math.PI * 3.2) * 0.4;
            this.leftArmMesh.rotation.x = -Math.PI / 3;
            if (this.bodyMesh) this.bodyMesh.rotation.y = -0.4;
          } else if (isSpear) {
            // Upward sweeping arc
            this.rightArmMesh.rotation.x = Math.PI / 2 - elapsed * Math.PI * 2.5;
            this.leftArmMesh.rotation.x = Math.PI / 2 - elapsed * Math.PI * 2.5;
          } else {
            // Rising diagonal slash
            this.rightArmMesh.rotation.x = Math.PI / 4 - elapsed * Math.PI * 3.0;
            this.rightArmMesh.rotation.y = Math.PI / 3 - elapsed * Math.PI * 2.5;
            this.leftArmMesh.rotation.x = Math.PI / 4;
            if (this.bodyMesh) this.bodyMesh.rotation.y = 0.4 - elapsed * 0.8;
          }
          break;
        }

        case "attack_light_3": {
          if (isDual) {
            // 360 shadow cross whirl
            this.rightArmMesh.rotation.z = Math.PI / 2;
            this.leftArmMesh.rotation.z = -Math.PI / 2;
            if (this.bodyMesh) this.bodyMesh.rotation.y = elapsed * Math.PI * 5;
          } else if (isFist) {
            // Rapid left hook
            this.leftArmMesh.rotation.x = Math.PI / 2;
            this.leftArmMesh.rotation.y = -Math.PI / 4 + elapsed * Math.PI * 2.5;
          } else if (isSpear) {
            // 360 helicopter staff spin
            this.rightArmMesh.rotation.x = Math.PI / 2;
            this.rightArmMesh.rotation.z = elapsed * Math.PI * 6;
          } else {
            // Full body cleaving whirlwind
            this.rightArmMesh.rotation.x = -Math.PI / 4;
            this.rightArmMesh.rotation.y = -Math.PI + elapsed * Math.PI * 4;
            this.leftArmMesh.rotation.x = -Math.PI / 4;
            if (this.bodyMesh) this.bodyMesh.rotation.y = elapsed * Math.PI * 3;
          }
          break;
        }

        case "attack_light_4":
        case "attack_light_5": {
          if (isDual) {
            // Shadow-step cross decapitation
            this.rightArmMesh.rotation.x = -Math.PI / 2 + elapsed * Math.PI * 3;
            this.leftArmMesh.rotation.x = -Math.PI / 2 + elapsed * Math.PI * 3;
            if (this.bodyMesh) this.bodyMesh.rotation.x = 0.3;
          } else if (isFist) {
            // Roaring rising dragon uppercut
            this.rightArmMesh.rotation.x = -Math.PI * 0.9 + elapsed * Math.PI * 4;
            if (this.bodyMesh) {
              this.bodyMesh.position.y = 1.2 + Math.sin(elapsed * Math.PI) * 0.3;
              this.bodyMesh.rotation.x = -0.3;
            }
          } else if (isSpear) {
            // Vaulting skyward dive
            this.rightArmMesh.rotation.x = -Math.PI * 0.8 + elapsed * Math.PI * 3.5;
            this.leftArmMesh.rotation.x = -Math.PI * 0.8 + elapsed * Math.PI * 3.5;
            if (this.bodyMesh) this.bodyMesh.rotation.x = elapsed * 0.5;
          } else {
            // Colossal two-handed downward guillotine
            this.rightArmMesh.rotation.x = -Math.PI * 0.8 + elapsed * Math.PI * 3.8;
            this.leftArmMesh.rotation.x = -Math.PI * 0.8 + elapsed * Math.PI * 3.8;
            if (this.bodyMesh) this.bodyMesh.rotation.x = elapsed * 0.5;
          }
          break;
        }

        case "attack_heavy_charge": {
          // Low tension charge posture
          if (this.bodyMesh) {
            this.bodyMesh.position.y = 1.05;
            this.bodyMesh.rotation.y = -0.3;
          }
          this.rightArmMesh.rotation.x = -Math.PI / 3;
          this.rightArmMesh.rotation.y = -Math.PI / 4;
          this.leftArmMesh.rotation.x = Math.PI / 3;
          this.rightLegMesh.rotation.x = 0.2;
          this.leftLegMesh.rotation.x = -0.2;
          break;
        }

        case "attack_heavy": {
          // Explosive super stroke release
          this.rightArmMesh.rotation.x = -Math.PI / 2 + elapsed * Math.PI * 3.0;
          this.rightArmMesh.rotation.y = Math.PI / 2 - elapsed * Math.PI * 2.0;
          this.leftArmMesh.rotation.x = Math.PI / 3;
          if (this.bodyMesh) {
            this.bodyMesh.rotation.y = 0.5 - elapsed * 1.0;
            this.bodyMesh.position.y = 1.15;
          }
          break;
        }

        case "attack_dash": {
          // Low aerodynamic lunging cut
          this.rightArmMesh.rotation.x = Math.PI / 2;
          this.rightArmMesh.rotation.y = -Math.PI / 4;
          this.leftArmMesh.rotation.x = -Math.PI / 3;
          if (this.bodyMesh) {
            this.bodyMesh.position.y = 1.0;
            this.bodyMesh.rotation.x = 0.4;
          }
          break;
        }

        case "attack_jump": {
          // Downward diving meteor strike
          this.rightArmMesh.rotation.x = Math.PI;
          this.leftArmMesh.rotation.x = Math.PI;
          if (this.bodyMesh) {
            this.bodyMesh.rotation.x = 0.8;
          }
          this.rightLegMesh.rotation.x = -0.4;
          this.leftLegMesh.rotation.x = -0.4;
          break;
        }

        case "dodge":
          // Spin body around Y axis (procedural tumble)
          this.playerGroup.rotation.y += dt * Math.PI * 5;
          if (this.bodyMesh) this.bodyMesh.position.y = 0.8 + Math.sin((elapsed / this.dodgeDuration) * Math.PI) * 0.5;
          this.rightArmMesh.rotation.z = Math.PI / 3;
          this.leftArmMesh.rotation.z = -Math.PI / 3;
          break;

        case "block":
          // Arm held across chest protecting body
          this.rightArmMesh.rotation.x = -Math.PI / 2;
          this.rightArmMesh.rotation.y = Math.PI / 6;
          this.leftArmMesh.rotation.x = -Math.PI / 2;
          this.leftArmMesh.rotation.y = -Math.PI / 6;
          if (this.bodyMesh) this.bodyMesh.position.y = 1.05; // lower stance
          break;

        case "parry":
          // Instant deflect sweep outwards
          this.rightArmMesh.rotation.x = -Math.PI / 2 + elapsed * Math.PI;
          this.rightArmMesh.rotation.y = -Math.PI / 3;
          break;

        case "stagger":
          // Flail limbs backwards
          this.rightArmMesh.rotation.x = -Math.PI / 2;
          this.leftArmMesh.rotation.x = -Math.PI / 2;
          this.rightLegMesh.rotation.x = -0.3;
          this.leftLegMesh.rotation.x = 0.3;
          if (this.bodyMesh) this.bodyMesh.rotation.x = -0.25;
          break;

        case "dead":
          // Collapse onto ground
          this.playerGroup.rotation.z = Math.PI / 2;
          if (this.bodyMesh) this.bodyMesh.position.y = 0.2;
          this.rightArmMesh.rotation.x = 0;
          this.leftArmMesh.rotation.x = 0;
          break;
      }
    }
  }

  private setPlayerMeshColor(hex: number): void {
    this.playerGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== this.weaponMesh && child.material && "color" in child.material) {
        (child.material as any).color.setHex(hex);
      }
    });
  }

  private castTechnique(techId: string, enemies?: any[], boss?: any): void {
    if (this.state === "dead") return;

    const store = useGameStore.getState();
    const cost = 20; // flat cost for simplicity

    if (!store.useQi(cost)) {
      // Out of Qi! Play a dull fail tone
      audioManager.playSFX("parry");
      return;
    }

    // Play casting audio and visual effects
    audioManager.playSFX("boss_ripple");
    this.particles.burst({
      position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
      count: 25,
      speed: 5,
      life: 0.6,
      size: 0.18,
    });

    const playerPos = this.playerGroup.position;
    const playerRotY = this.playerGroup.rotation.y;
    const forwardDir = new THREE.Vector3(-Math.sin(playerRotY), 0, -Math.cos(playerRotY));

    // Resolve technique behavior
    if (techId === "phantom_blade") {
      this.transitionTo("attack_light_3"); // spin slash animation
      
      // Damage all nearby targets in a 6.5 radius
      const targets = this.getTargets(enemies, boss);
      targets.forEach((target) => {
        const dist = playerPos.distanceTo(target.mesh.position);
        if (dist <= 6.5) {
          if (typeof target.takeDamage === "function") target.takeDamage(55);
          // Splatter extra particles at enemy
          this.particles.burst({
            position: target.mesh.position.clone(),
            count: 10,
            speed: 4,
            life: 0.4,
            size: 0.12,
          });
        }
      });
    } else if (techId === "unbreakable_stance") {
      // Grant bubble shield + temporary invulnerability
      this.createBubbleShield();
      this.bubbleShieldTimer = 3.0; // 3 seconds shield duration
    } else if (techId === "meridian_strike") {
      // Stun and damage nearby enemies
      const targets = this.getTargets(enemies, boss);
      targets.forEach((target) => {
        const dist = playerPos.distanceTo(target.mesh.position);
        if (dist <= 5.5) {
          if (typeof target.takeDamage === "function") target.takeDamage(20);
          if (typeof target.stunFor === "function") {
            target.stunFor(2.5); // Stun for 2.5s!
          }
        }
      });
    } else if (techId === "ink_arrow") {
      // Homing precision shot forward
      const targets = this.getTargets(enemies, boss);
      let closestTarget: any = null;
      let closestDot = 0.82; // threshold angle

      targets.forEach((target) => {
        const toTarget = new THREE.Vector3().subVectors(target.mesh.position, playerPos).normalize();
        const dot = forwardDir.dot(toTarget);
        if (dot > closestDot) {
          closestTarget = target;
          closestDot = dot;
        }
      });

      if (closestTarget) {
        if (typeof closestTarget.takeDamage === "function") closestTarget.takeDamage(60);
        // Spurt line of ink particles from player to target
        const start = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
        const end = closestTarget.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const p = new THREE.Vector3().lerpVectors(start, end, t);
          this.particles.burst({
            position: p,
            count: 3,
            speed: 1.5,
            life: 0.35,
            size: 0.08,
          });
        }
      }
    } else if (techId === "ink_seal") {
      // Place static slow zone
      this.createSlowZone();
      this.slowZoneTimer = 6.0; // 6 seconds duration
    }
  }

  private getTargets(enemies?: any[], boss?: any): any[] {
    const targets: any[] = [];
    if (enemies) {
      enemies.forEach((e) => {
        if (e.state !== "dead") targets.push(e);
      });
    }
    if (boss && boss.state !== "dead") {
      targets.push(boss);
    }
    return targets;
  }

  private createBubbleShield(): void {
    this.removeBubbleShield();
    const geo = new THREE.IcosahedronGeometry(1.6, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xddaa44,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    this.activeBubbleShield = new THREE.Mesh(geo, mat);
    this.activeBubbleShield.position.set(0, 1.0, 0);
    this.playerGroup.add(this.activeBubbleShield);
  }

  private removeBubbleShield(): void {
    if (this.activeBubbleShield) {
      this.playerGroup.remove(this.activeBubbleShield);
      this.activeBubbleShield.geometry.dispose();
      (this.activeBubbleShield.material as THREE.Material).dispose();
      this.activeBubbleShield = null;
    }
  }

  private createSlowZone(): void {
    this.removeSlowZone();
    const geo = new THREE.RingGeometry(0.1, 8.0, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4444aa,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    this.slowZoneIndicator = new THREE.Mesh(geo, mat);
    this.slowZoneIndicator.rotation.x = Math.PI / 2;
    // Anchor slow zone to current player coordinates on floor
    this.slowZoneIndicator.position.copy(this.playerGroup.position);
    this.slowZoneIndicator.position.y = 0.05;
    this.playerGroup.parent?.add(this.slowZoneIndicator);
  }

  private removeSlowZone(): void {
    if (this.slowZoneIndicator) {
      this.playerGroup.parent?.remove(this.slowZoneIndicator);
      this.slowZoneIndicator.geometry.dispose();
      (this.slowZoneIndicator.material as THREE.Material).dispose();
      this.slowZoneIndicator = null;
    }
  }

  /**
   * Triggers the 3D Awakening Descent Sequence
   */
  public triggerAwakeningSequence(): void {
    // Keep player in idle state on the summit with full control
    this.state = "idle";
    this.isAwakening = false;
    this.awakeningTimer = 0;
    const targetGround = Math.max(
      this.collisions.getGroundHeight(this.playerGroup.position.x, this.playerGroup.position.z, this.playerGroup.position.y),
      120.0
    );
    this.playerGroup.position.y = targetGround;
    this.velocityY = 0;
    this.isGrounded = true;

    // Spawn massive pillar of celestial Qi
    if (this.playerGroup.parent) {
      if (this.awakeningPillarMesh && this.awakeningPillarMesh.parent) {
        this.awakeningPillarMesh.parent.remove(this.awakeningPillarMesh);
      }
      const colGeo = new THREE.CylinderGeometry(1.4, 1.4, 16, 16, 1, true);
      const colMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      this.awakeningPillarMesh = new THREE.Mesh(colGeo, colMat);
      this.awakeningPillarMesh.position.set(this.playerGroup.position.x, 8, this.playerGroup.position.z);
      this.playerGroup.parent.add(this.awakeningPillarMesh);
    }
  }

  private createRageAura(): void {
    const auraGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    this.rageAuraMesh = new THREE.Mesh(auraGeo, auraMat);
    this.rageAuraMesh.position.y = 1.0;
    this.rageAuraMesh.visible = false;
    this.playerGroup.add(this.rageAuraMesh);
  }

  public triggerSpartanRage(): void {
    const store = useGameStore.getState();
    if (store.activateRage()) {
      audioManager.playSFX("boss_ripple");
      this.cameraController.addShake(1.2, 0.4);
      this.particles.burst({
        position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0)),
        count: 70,
        speed: 10,
        life: 1.2,
        size: 0.4,
        color: new THREE.Color(0xf59e0b),
      });
      this.particles.burst({
        position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
        count: 50,
        speed: 8,
        life: 1.0,
        size: 0.35,
        color: new THREE.Color(0xf43f5e),
      });
      store.setBattleBanner("SWORD SAINT AWAKENING · ANCESTRAL DRAGON BLADE", 2.2);
      store.addComboPoint(60);
    }
  }

  public triggerBrutalExecution(enemies?: any[], boss?: any): void {
    if (this.state === "dead" || this.isExecuting) return;
    const store = useGameStore.getState();
    const targets = this.getTargets(enemies, boss);
    const playerPos = this.playerGroup.position;

    // Find closest executable target within 6.5m
    let closestTarget: any = null;
    let closestDist = 6.5;

    for (const target of targets) {
      const dist = playerPos.distanceTo(target.mesh.position);
      if (dist < closestDist && (target.canBeExecuted || target.getHealth() <= target.def?.maxHealth * 0.4 || target.state === "stagger")) {
        closestDist = dist;
        closestTarget = target;
      }
    }

    if (!closestTarget) return;

    // Initiate God of War Cinematic Glory Kill
    this.isExecuting = true;
    this.executionTimer = 0.75;
    this.isInvulnerable = true;

    // Snap player directly in front of enemy
    const toTarget = new THREE.Vector3().subVectors(closestTarget.mesh.position, playerPos);
    toTarget.y = 0;
    toTarget.normalize();

    this.playerGroup.position.copy(closestTarget.mesh.position).sub(toTarget.clone().multiplyScalar(1.2));
    this.playerGroup.position.y = 0;
    this.playerGroup.rotation.y = Math.atan2(-toTarget.x, -toTarget.z);

    // Matrix Hit Freeze & Violent Camera Shake
    store.triggerHitFreeze(0.65, 0.12);
    this.cameraController.addShake(1.5, 0.35);

    // Distinct Weapon-Specific Finishers
    const isAxe = this.activeGowWeapon === "axe" && this.axeThrowState === "idle";
    const isBlades = this.activeGowWeapon === "blades";
    const slashColor = isAxe ? new THREE.Color(0xf43f5e) : isBlades ? new THREE.Color(0xf472b6) : new THREE.Color(0x38bdf8);

    if (this.slashManager) {
      this.slashManager.spawnSlash({
        position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
        direction: toTarget,
        color: slashColor,
        radius: 3.2,
        isHeavy: true,
      });
    }

    // Weapon-specific particle detonations
    if (isAxe) {
      this.particles.burst({
        position: closestTarget.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
        count: 60,
        speed: 9.0,
        life: 0.9,
        size: 0.35,
        color: new THREE.Color(0xf43f5e),
      });
      store.setBattleBanner("24-BLOOM EXECUTION · CELESTIAL DRAGON SEVER", 2.2);
    } else if (isBlades) {
      this.particles.burst({
        position: closestTarget.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
        count: 65,
        speed: 9.5,
        life: 1.0,
        size: 0.38,
        color: new THREE.Color(0xf472b6),
      });
      store.setBattleBanner("TWIN SABER EXECUTION · CRIMSON RIP", 2.2);
    } else {
      this.particles.burst({
        position: closestTarget.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
        count: 55,
        speed: 10.0,
        life: 0.9,
        size: 0.4,
        color: new THREE.Color(0x38bdf8),
      });
      store.setBattleBanner("GLORY KILL · DRAGON-PIERCING THRUST", 2.2);
    }

    // Kill enemy with execution death
    if (typeof closestTarget.playExecutionDeath === "function") {
      closestTarget.playExecutionDeath();
    } else {
      if (typeof closestTarget.takeDamage === "function") closestTarget.takeDamage(9999);
    }

    store.addComboPoint(220);
    store.heal(40); // Blood siphon heal
    store.regenQi(30);
    store.addRage(35); // Big rage bonus on glory kill
  }

  public triggerChainedBladeThrow(enemies?: any[], boss?: any): void {
    if (this.state === "dead" || this.isExecuting) return;
    const store = useGameStore.getState();
    const playerPos = this.playerGroup.position;
    const playerRotY = this.playerGroup.rotation.y;
    const forwardDir = new THREE.Vector3(-Math.sin(playerRotY), 0, -Math.cos(playerRotY)).normalize();

    audioManager.playSFX("dodge");
    this.cameraController.addShake(0.4, 0.1);

    // Create flying chain link line and strike all enemies along forward ray
    const targets = this.getTargets(enemies, boss);
    let hitAny = false;

    targets.forEach((target) => {
      const toTarget = new THREE.Vector3().subVectors(target.mesh.position, playerPos);
      const dist = toTarget.length();
      if (dist <= 14.0) {
        toTarget.normalize();
        const dot = forwardDir.dot(toTarget);
        if (dot >= 0.75) {
          hitAny = true;
          const isRage = store.player.rage?.isActive;
          const dmg = isRage ? 180 : 80;
          if (typeof target.takeDamage === "function") target.takeDamage(dmg);
          if (typeof target.stunFor === "function") {
            target.stunFor(1.2);
          }
          // Yank target toward player slightly
          target.mesh.position.sub(toTarget.clone().multiplyScalar(2.0));
          store.addDamagePopup(dmg, true, [target.mesh.position.x, target.mesh.position.y + 1.6, target.mesh.position.z], "#ff0055");
        }
      }
    });

    // Trail particles along chain throw
    for (let i = 1; i <= 10; i++) {
      const p = playerPos.clone().add(forwardDir.clone().multiplyScalar(i * 1.2)).add(new THREE.Vector3(0, 1.2, 0));
      this.particles.burst({
        position: p,
        count: 4,
        speed: 2,
        life: 0.35,
        size: 0.15,
        color: new THREE.Color(0xd97706),
      });
    }

    if (hitAny) {
      store.setBattleBanner("CHAIN RIP", 0.9);
      store.addComboPoint(45);
    }
  }

  /**
   * Check if Dragon Momentum buff is active (3× damage on first hit after dismount).
   */
  public consumeDragonMomentum(): boolean {
    const store = useGameStore.getState();
    if (store.dragonMomentum) {
      store.setDragonMomentum(false);
      return true;
    }
    return false;
  }
}
