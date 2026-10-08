/**
 * CinematicIntro — Orchestrates the "Reel-style" opening intro sequence.
 *
 * Flow:
 * 1. SUNRISE_WAKE  — MC wakes on a massive cliff edge. Camera slowly pans sunrise over the vast ocean.
 * 2. AXE_RECALL    — The weapon (axe) spins from the distance and flies back into MC's hand.
 * 3. CLIFF_LEAP    — MC springs off the cliff edge into freefall. Camera tracks the plummet.
 * 4. DRAGON_SUMMON  — Just before impact, MC summons Veyros; the dragon swoops under and catches him.
 * 5. SOAR_AWAY     — The dragon pulls up sharply and the camera transitions to normal gameplay.
 *
 * The intro is fully in-engine (no video files) and uses orchestrated camera keyframes,
 * procedural particle effects, and synthesised audio cues.
 */
import * as THREE from "three";
import { CameraController } from "../rendering/CameraController";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { DragonMount } from "./DragonMount";
import { PlayerController } from "../combat/PlayerController";
import { MythicWeaponModels } from "../rendering/MythicWeaponModels";
import { audioManager } from "../audio/AudioManager";
import { useGameStore } from "@/stores/gameStore";

// ── Scratch vectors (zero GC) ──
const _scratchLookDir = new THREE.Vector3();
const _scratchSunDir = new THREE.Vector3();
const _scratchAxeTarget = new THREE.Vector3();

export type IntroPhase =
  | "inactive"
  | "sunrise_wake"
  | "axe_recall"
  | "cliff_leap"
  | "dragon_summon"
  | "soar_away"
  | "complete";

export interface CinematicIntroConfig {
  /** The massive cliff spawn point where MC wakes up */
  cliffTopPosition: THREE.Vector3;
  /** The direction MC faces (toward ocean/sunrise) */
  lookDirection: THREE.Vector3;
  /** Height of the cliff above ocean level */
  cliffHeight: number;
}

export class CinematicIntro {
  public phase: IntroPhase = "inactive";
  public isActive: boolean = false;

  // Phase timers
  private phaseTimer: number = 0;
  private totalPhaseTime: number = 0;

  // Cliff spawn parameters
  private cliffTop: THREE.Vector3;
  private cliffEdge: THREE.Vector3; // Position at the very edge
  private lookDir: THREE.Vector3;
  private cliffHeight: number;

  // Axe recall mesh (procedural thrown axe)
  private axeMesh: THREE.Group | null = null;
  private axeStartPos: THREE.Vector3 = new THREE.Vector3();
  private axeEndPos: THREE.Vector3 = new THREE.Vector3();

  // Freefall tracking
  private fallVelocity: number = 0;
  private fallPosition: THREE.Vector3 = new THREE.Vector3();

  // Dragon summon timing
  private dragonSummonTriggered: boolean = false;
  private dragonSwoopStartPos: THREE.Vector3 = new THREE.Vector3();

  // Camera cinematic state
  private cinematicCamActive: boolean = false;
  private camStartPos: THREE.Vector3 = new THREE.Vector3();
  private camTargetPos: THREE.Vector3 = new THREE.Vector3();
  private camLookTarget: THREE.Vector3 = new THREE.Vector3();

  // References
  private camera: THREE.PerspectiveCamera;
  private cameraController: CameraController;
  private playerGroup: THREE.Group;
  private playerController: PlayerController;
  private dragonMount: DragonMount;
  private particles: InkParticleSystem;
  private scene: THREE.Scene;

  // Sunlight
  private introSunLight: THREE.DirectionalLight | null = null;
  private introAmbientLight: THREE.AmbientLight | null = null;

  // Wake-up animation state
  private playerStartRotX: number = 0; // starts lying down
  private isPlayerStanding: boolean = false;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    cameraController: CameraController,
    playerGroup: THREE.Group,
    playerController: PlayerController,
    dragonMount: DragonMount,
    particles: InkParticleSystem,
    config: CinematicIntroConfig
  ) {
    this.scene = scene;
    this.camera = camera;
    this.cameraController = cameraController;
    this.playerGroup = playerGroup;
    this.playerController = playerController;
    this.dragonMount = dragonMount;
    this.particles = particles;

    this.cliffTop = config.cliffTopPosition.clone();
    this.cliffEdge = config.cliffTopPosition.clone().add(config.lookDirection.clone().normalize().multiplyScalar(8));
    this.lookDir = config.lookDirection.clone().normalize();
    this.cliffHeight = config.cliffHeight;
  }

  /**
   * Begin the cinematic intro sequence.
   */
  public start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.phase = "sunrise_wake";
    this.phaseTimer = 0;
    this.totalPhaseTime = 0;

    // ── Position player lying down on cliff edge ──
    this.playerGroup.position.copy(this.cliffTop);
    this.playerGroup.rotation.set(0, Math.atan2(-this.lookDir.x, -this.lookDir.z), 0);

    // Player starts "lying down" (rotated on X axis)
    this.playerStartRotX = -Math.PI / 2;
    this.isPlayerStanding = false;

    // ── Hide dragon initially ──
    this.dragonMount.mesh.visible = false;
    this.dragonSummonTriggered = false;

    // ── Setup cinematic sunrise lighting ──
    this.setupSunriseLighting();

    // ── Build the axe prop mesh ──
    this.buildAxeMesh();

    // ── Disable player input during intro ──
    useGameStore.getState().setProloguePhase("sleeping");
    useGameStore.getState().setCinematicIntroActive(true);

    // ── Start peaceful BGM ──
    audioManager.startBGM("peaceful");

    // ── Golden sunrise particle motes ──
    this.emitSunriseParticles();
  }

  private setupSunriseLighting(): void {
    // Warm directional sunrise from the east
    this.introSunLight = new THREE.DirectionalLight(0xffad5c, 0.9);
    _scratchSunDir.set(0.4, 0.2, -0.3).normalize();
    this.introSunLight.position.copy(_scratchSunDir.clone().multiplyScalar(200));
    this.introSunLight.castShadow = true;
    this.scene.add(this.introSunLight);

    // Warm ambient for that golden-hour glow
    this.introAmbientLight = new THREE.AmbientLight(0xffe4c4, 0.3);
    this.scene.add(this.introAmbientLight);
  }

  private buildAxeMesh(): void {
    const axeGroup = MythicWeaponModels.buildLeviathanAxe();
    axeGroup.name = "CinematicAxe";
    axeGroup.scale.setScalar(1.35);

    // Glowing cyan Frost / Qi aura point light
    const glowLight = new THREE.PointLight(0x38bdf8, 1.2, 8);
    glowLight.position.set(0, 0.5, 0);
    axeGroup.add(glowLight);

    axeGroup.visible = false;
    this.scene.add(axeGroup);
    this.axeMesh = axeGroup;
  }

  private emitSunriseParticles(): void {
    // Gentle golden motes floating in morning light
    const sunriseCenter = this.cliffTop.clone().add(new THREE.Vector3(0, 3, 0));
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (!this.isActive) return;
        this.particles.emitBurst({
          position: sunriseCenter.clone().add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 12,
              Math.random() * 5,
              (Math.random() - 0.5) * 12
            )
          ),
          count: 8,
          speed: 0.8,
          life: 3.0,
          size: 0.15,
          color: new THREE.Color(0xfbbf24),
        });
      }, i * 500);
    }
  }

  /**
   * Main update tick — drives all cinematic phases.
   */
  public update(dt: number): void {
    if (!this.isActive) return;

    this.phaseTimer += dt;
    this.totalPhaseTime += dt;

    switch (this.phase) {
      case "sunrise_wake":
        this.updateSunriseWake(dt);
        break;
      case "axe_recall":
        this.updateAxeRecall(dt);
        break;
      case "cliff_leap":
        this.updateCliffLeap(dt);
        break;
      case "dragon_summon":
        this.updateDragonSummon(dt);
        break;
      case "soar_away":
        this.updateSoarAway(dt);
        break;
      case "complete":
        this.finalize();
        break;
    }
  }

  // ════════════════════════════════════════════
  // PHASE 1: SUNRISE WAKE (0s → 6s)
  // MC slowly rises from lying down. Camera pans
  // across the vast ocean with golden sunrise.
  // ════════════════════════════════════════════
  private updateSunriseWake(dt: number): void {
    const duration = 6.0;
    const t = Math.min(1.0, this.phaseTimer / duration);

    // ── Player slowly stands up from lying position ──
    if (t < 0.6) {
      // Lying down → sitting up
      const sitT = t / 0.6;
      this.playerStartRotX = THREE.MathUtils.lerp(-Math.PI / 2, -0.3, this.easeOutQuad(sitT));
    } else {
      // Sitting → standing
      const standT = (t - 0.6) / 0.4;
      this.playerStartRotX = THREE.MathUtils.lerp(-0.3, 0, this.easeOutQuad(standT));
      if (standT > 0.8) this.isPlayerStanding = true;
    }

    // Apply the wake-up rotation to the first child (body mesh)
    if (this.playerGroup.children.length > 0) {
      this.playerGroup.children[0].rotation.x = this.playerStartRotX;
    }

    // ── Cinematic Camera: Wide sweeping arc ──
    // Start behind and above, slowly orbit to show the sunrise ocean
    const camRadius = 14;
    const camAngle = THREE.MathUtils.lerp(-Math.PI * 0.7, -Math.PI * 0.3, this.easeInOutCubic(t));
    const camHeight = THREE.MathUtils.lerp(6, 3, t);

    const camX = this.cliffTop.x + Math.sin(camAngle) * camRadius;
    const camZ = this.cliffTop.z + Math.cos(camAngle) * camRadius;
    const camY = this.cliffTop.y + camHeight;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(
      this.cliffTop.x,
      this.cliffTop.y + 1.5,
      this.cliffTop.z
    );

    // ── Warm sunrise light intensifies ──
    if (this.introSunLight) {
      this.introSunLight.intensity = THREE.MathUtils.lerp(0.3, 1.2, t);
    }
    if (this.introAmbientLight) {
      this.introAmbientLight.intensity = THREE.MathUtils.lerp(0.1, 0.45, t);
    }

    // ── Subtitle at 1.5s ──
    if (this.phaseTimer > 1.5 && this.phaseTimer < 1.5 + dt * 2) {
      useGameStore.getState().setBattleBanner("THE DROWNED EPOCH — A New Dawn Rises", 4.5);
    }

    // ── Transition to Axe Recall ──
    if (this.phaseTimer >= duration) {
      this.phaseTimer = 0;
      this.phase = "axe_recall";

      // Position axe far out in the distance
      this.axeStartPos.set(
        this.cliffTop.x + this.lookDir.x * 120,
        this.cliffTop.y + 30,
        this.cliffTop.z + this.lookDir.z * 120
      );
      this.axeEndPos.copy(this.playerGroup.position).add(new THREE.Vector3(0, 1.4, 0));

      if (this.axeMesh) {
        this.axeMesh.position.copy(this.axeStartPos);
        this.axeMesh.visible = true;
      }

      // Play a distant metallic ring
      audioManager.playSFX("parry");
    }
  }

  // ════════════════════════════════════════════
  // PHASE 2: AXE RECALL (6s → 9.5s)
  // The weapon flies back from the distance,
  // spinning rapidly, and slams into MC's hand.
  // ════════════════════════════════════════════
  private updateAxeRecall(dt: number): void {
    const duration = 3.5;
    const t = Math.min(1.0, this.phaseTimer / duration);

    // ── Axe flight: exponential ease-in-out with spinning ──
    if (this.axeMesh) {
      const flightT = this.easeInOutCubic(t);
      this.axeMesh.position.lerpVectors(this.axeStartPos, this.axeEndPos, flightT);

      // Rapid spinning
      this.axeMesh.rotation.x += dt * 18;
      this.axeMesh.rotation.z += dt * 12;

      // Trail particles
      if (Math.random() < 0.4) {
        this.particles.emitBurst({
          position: this.axeMesh.position.clone(),
          count: 2,
          speed: 1.5,
          life: 0.4,
          size: 0.12,
          color: new THREE.Color(0x2dd4bf),
        });
      }
    }

    // ── Camera: Side profile watching the axe fly in ──
    const camSide = new THREE.Vector3(
      this.cliffTop.x - this.lookDir.z * 10,
      this.cliffTop.y + 2.5,
      this.cliffTop.z + this.lookDir.x * 10
    );
    this.camera.position.lerp(camSide, dt * 3.0);

    // Look at axe when far, look at player when close
    _scratchAxeTarget.copy(this.axeMesh?.position || this.axeEndPos);
    if (t > 0.6) {
      _scratchAxeTarget.lerp(this.playerGroup.position, (t - 0.6) / 0.4);
    }
    _scratchAxeTarget.y += 1.0;
    this.camera.lookAt(_scratchAxeTarget);

    // ── Impact at t=1.0 ──
    if (t >= 0.98 && this.axeMesh?.visible) {
      // Axe snap into hand
      this.axeMesh.visible = false;
      this.playerController.buildGowWeapon("axe");

      // Impact VFX burst — cyan Frost / Qi energy
      this.particles.emitBurst({
        position: this.axeEndPos.clone(),
        count: 42,
        speed: 8.5,
        life: 0.7,
        size: 0.35,
        color: new THREE.Color(0x38bdf8),
      });

      // Camera punch & slash sound
      this.cameraController.addShake(0.9, 0.28);
      audioManager.playSFX("slash");

      useGameStore.getState().setBattleBanner("THE BLADE REMEMBERS — Leviathan Axe In Hand", 3.5);
    }

    // ── Transition ──
    if (this.phaseTimer >= duration) {
      this.phaseTimer = 0;
      this.phase = "cliff_leap";

      // Position player at cliff edge for the jump
      this.fallPosition.copy(this.cliffEdge);
      this.fallVelocity = 0;
    }
  }

  // ════════════════════════════════════════════
  // PHASE 3: CLIFF LEAP (9.5s → ~15s)
  // MC runs to the cliff edge and leaps off.
  // Camera follows the plummet down the massive cliff face.
  // ════════════════════════════════════════════
  private updateCliffLeap(dt: number): void {
    const runDuration = 1.5; // Time to reach edge and leap
    const totalFallDuration = 5.0; // Maximum fall duration before dragon summon

    if (this.phaseTimer < runDuration) {
      // ── MC runs toward cliff edge ──
      const runT = this.phaseTimer / runDuration;
      const playerPos = new THREE.Vector3().lerpVectors(
        this.cliffTop,
        this.cliffEdge,
        this.easeInQuad(runT)
      );
      this.playerGroup.position.copy(playerPos);

      // Camera follows from behind
      const camBehind = this.playerGroup.position.clone()
        .add(this.lookDir.clone().multiplyScalar(-8))
        .add(new THREE.Vector3(0, 3, 0));
      this.camera.position.lerp(camBehind, dt * 4.0);
      this.camera.lookAt(
        this.playerGroup.position.x + this.lookDir.x * 5,
        this.playerGroup.position.y,
        this.playerGroup.position.z + this.lookDir.z * 5
      );

      // ── At the edge, JUMP ──
      if (runT > 0.95) {
        // Initial upward leap velocity
        this.fallVelocity = 12.0;
        this.fallPosition.copy(this.cliffEdge);

        audioManager.playSFX("jump");
        this.cameraController.addShake(0.5, 0.15);

        useGameStore.getState().setBattleBanner("", 0);
      }
    } else {
      // ── FREEFALL ──
      const fallTimer = this.phaseTimer - runDuration;

      // Physics: gravity pulls down
      this.fallVelocity -= 28.0 * dt; // Strong gravity for dramatic fall
      this.fallPosition.y += this.fallVelocity * dt;

      // Slight forward drift
      this.fallPosition.x += this.lookDir.x * 6.0 * dt;
      this.fallPosition.z += this.lookDir.z * 6.0 * dt;

      this.playerGroup.position.copy(this.fallPosition);

      // ── Player tumble animation ──
      if (this.playerGroup.children.length > 0) {
        // Arms spread pose during fall
        const fallT = Math.min(1.0, fallTimer / 3.0);
        this.playerGroup.children[0].rotation.x = THREE.MathUtils.lerp(0, -0.4, fallT);
      }

      // ── Camera: Dramatic side angle tracking the fall ──
      const sideOffset = this.lookDir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
      const camPos = this.fallPosition.clone()
        .add(sideOffset.multiplyScalar(12))
        .add(new THREE.Vector3(0, 3 + fallTimer * 0.5, 0));

      // Slightly slow cam drift
      this.camera.position.lerp(camPos, dt * 2.5);
      this.camera.lookAt(this.fallPosition.x, this.fallPosition.y, this.fallPosition.z);

      // ── Wind rush particles ──
      if (Math.random() < 0.5) {
        this.particles.emitBurst({
          position: this.fallPosition.clone().add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 3,
              Math.random() * 2,
              (Math.random() - 0.5) * 3
            )
          ),
          count: 3,
          speed: 4,
          life: 0.3,
          size: 0.08,
          color: new THREE.Color(0xffffff),
        });
      }

      // ── Audio: wind rush intensifies ──
      audioManager.setFlightWindSpeed(15 + fallTimer * 8);

      // ── DRAGON SUMMON TRIGGER: when close to ocean/ground ──
      // Summon when ~40m above ocean level (-2.0 is ocean Y)
      const heightAboveOcean = this.fallPosition.y - (-2.0);
      if (heightAboveOcean < 45 && !this.dragonSummonTriggered) {
        this.dragonSummonTriggered = true;
        this.phaseTimer = 0;
        this.phase = "dragon_summon";

        // Dragon swoops in from below and behind
        this.dragonSwoopStartPos.set(
          this.fallPosition.x - this.lookDir.x * 60,
          this.fallPosition.y - 30,
          this.fallPosition.z - this.lookDir.z * 60
        );

        // Dramatic cry
        audioManager.playSFX("boss_ripple");

        // Giant qi burst
        this.particles.emitBurst({
          position: this.fallPosition.clone(),
          count: 50,
          speed: 12,
          life: 1.0,
          size: 0.4,
          color: new THREE.Color(0xef4444),
        });

        useGameStore.getState().setBattleBanner("VEYROS! — 破空降臨", 4.0);
      }

      // Safety: if we somehow fall too far without triggering
      if (fallTimer > totalFallDuration && !this.dragonSummonTriggered) {
        this.dragonSummonTriggered = true;
        this.phaseTimer = 0;
        this.phase = "dragon_summon";
      }
    }
  }

  // ════════════════════════════════════════════
  // PHASE 4: DRAGON SUMMON (→ 2.5s)
  // Veyros bursts from below, catches the MC
  // mid-air, and begins a dramatic pull-up arc.
  // ════════════════════════════════════════════
  private updateDragonSummon(dt: number): void {
    const duration = 2.5;
    const t = Math.min(1.0, this.phaseTimer / duration);

    // ── Continue player falling (slower now — time dilation) ──
    if (t < 0.4) {
      this.fallVelocity -= 20.0 * dt;
      this.fallPosition.y += this.fallVelocity * dt;
      this.playerGroup.position.copy(this.fallPosition);
    }

    // ── Dragon swoops in ──
    const dragonTarget = this.fallPosition.clone().add(new THREE.Vector3(0, -2, 0));
    const swoopT = this.easeOutQuad(Math.min(1.0, t / 0.5));
    const dragonPos = new THREE.Vector3().lerpVectors(
      this.dragonSwoopStartPos,
      dragonTarget,
      swoopT
    );

    // Dragon banks upward after reaching player
    if (t > 0.4) {
      const pullUpT = (t - 0.4) / 0.6;
      dragonPos.y += pullUpT * pullUpT * 30; // Parabolic pull up
      dragonPos.x += this.lookDir.x * pullUpT * 20;
      dragonPos.z += this.lookDir.z * pullUpT * 20;

      // MC now attached to dragon
      this.playerGroup.position.copy(dragonPos).add(new THREE.Vector3(0, 2.5, 0));

      // Reset player rotation — riding now
      if (this.playerGroup.children.length > 0) {
        this.playerGroup.children[0].rotation.x = THREE.MathUtils.lerp(
          this.playerGroup.children[0].rotation.x,
          0,
          dt * 5.0
        );
      }
    }

    // ── Make dragon visible and position it ──
    this.dragonMount.mesh.visible = true;
    this.dragonMount.mesh.position.copy(dragonPos);
    this.dragonMount.mesh.rotation.set(0, Math.atan2(-this.lookDir.x, -this.lookDir.z), 0);

    // Dragon pitch: diving up
    if (t > 0.4) {
      const pitchUp = ((t - 0.4) / 0.6) * 0.35;
      this.dragonMount.mesh.rotation.x = -pitchUp;
    }

    // ── Camera: Dramatic low-angle looking up at the swoop ──
    const camLow = dragonPos.clone().add(
      new THREE.Vector3(
        -this.lookDir.x * 15,
        -5 + t * 8,
        -this.lookDir.z * 15
      )
    );
    this.camera.position.lerp(camLow, dt * 3.5);
    this.camera.lookAt(dragonPos);

    // ── Wing-flap particles ──
    if (Math.random() < 0.6) {
      this.particles.emitBurst({
        position: dragonPos.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            -1,
            (Math.random() - 0.5) * 6
          )
        ),
        count: 4,
        speed: 5,
        life: 0.5,
        size: 0.25,
        color: new THREE.Color(0xef4444),
      });
    }

    // ── Camera shake on catch ──
    if (t > 0.38 && t < 0.42) {
      this.cameraController.addShake(1.5, 0.3);
      audioManager.playSFX("soft_landing");
    }

    // ── Transition to soar ──
    if (this.phaseTimer >= duration) {
      this.phaseTimer = 0;
      this.phase = "soar_away";

      // Mount the dragon properly
      this.dragonMount.mount(dragonPos, Math.atan2(-this.lookDir.x, -this.lookDir.z));
      audioManager.setBGMTheme("flight");
    }
  }

  // ════════════════════════════════════════════
  // PHASE 5: SOAR AWAY (→ 3s)
  // Dragon soars upward with player. Camera
  // transitions smoothly to gameplay camera.
  // ════════════════════════════════════════════
  private updateSoarAway(dt: number): void {
    const duration = 3.0;
    const t = Math.min(1.0, this.phaseTimer / duration);

    // ── Camera smoothly returns to normal third-person ──
    // The dragon's update() in GameEngine handles actual flight now that
    // we've called mount(). We just need to ease the camera back.

    // Gradually hand over camera to CameraController
    if (t > 0.3) {
      const handoverT = (t - 0.3) / 0.7;
      // CameraController will take over; we just lerp our camera position
      // toward where the controller wants it
      this.cameraController.setTarget(this.dragonMount.position);
    }

    // ── Wind down cinematic audio ──
    audioManager.setFlightWindSpeed(8);

    // ── Banner ──
    if (t > 0.3 && t < 0.35) {
      useGameStore.getState().setBattleBanner(
        "TAKE FLIGHT — [W/S] Pitch · [A/D] Bank · [Shift] Speed Glide",
        5.0
      );
    }

    // ── Clean up intro lights ──
    if (t > 0.5) {
      if (this.introSunLight) {
        this.introSunLight.intensity = THREE.MathUtils.lerp(this.introSunLight.intensity, 0, dt * 2.0);
      }
    }

    if (this.phaseTimer >= duration) {
      this.phase = "complete";
    }
  }

  /**
   * Finalize intro — hand full control back to player.
   */
  private finalize(): void {
    this.isActive = false;
    this.phase = "complete";

    // Clean up cinematic lights
    if (this.introSunLight) {
      this.scene.remove(this.introSunLight);
      this.introSunLight = null;
    }
    if (this.introAmbientLight) {
      this.scene.remove(this.introAmbientLight);
      this.introAmbientLight = null;
    }

    // Clean up axe mesh
    if (this.axeMesh) {
      this.scene.remove(this.axeMesh);
      this.axeMesh = null;
    }

    // Reset player body rotation
    if (this.playerGroup.children.length > 0) {
      this.playerGroup.children[0].rotation.x = 0;
    }

    // Ensure Leviathan Axe is held in hand
    this.playerController.buildGowWeapon("axe");

    // Advance prologue to flight phase and release cinematic state
    useGameStore.getState().setProloguePhase("first_flight");
    useGameStore.getState().setCinematicIntroActive(false);
    audioManager.setFlightWindSpeed(0);
  }

  // ── Easing functions ──
  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Skip the intro sequence immediately.
   */
  public skip(): void {
    if (!this.isActive) return;
    this.finalize();

    // Position player on island
    this.playerGroup.position.copy(this.cliffTop);
    this.playerController.buildGowWeapon("axe");
    this.dragonMount.mesh.position.copy(this.cliffTop).add(new THREE.Vector3(4, 0, 0));
    this.dragonMount.mesh.visible = true;
    this.dragonMount.isAwake = true;
    useGameStore.getState().setCinematicIntroActive(false);
  }
}
