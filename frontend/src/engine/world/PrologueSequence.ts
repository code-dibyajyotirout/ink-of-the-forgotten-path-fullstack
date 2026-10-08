import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { CameraController } from "../rendering/CameraController";
import { PlayerController } from "../combat/PlayerController";
import { DragonMount } from "./DragonMount";
import { OceanDynamicProps } from "./OceanWorldBuilder";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "../audio/AudioManager";

export interface PrologueSubtitle {
  speaker: string;
  text: string;
  duration: number;
}

/**
 * PrologueSequence — Coordinates the cinematic in-engine Prologue flow for Act 0:
 * 1. The Sleeper Wakes: Qi Cocoon cracks and dissolves with glowing crystal particles.
 * 2. The Sacred Relic: Walk to the altar and draw The Dragon Sword (龍劍).
 * 3. Bond with Veyros: Commune with the resting wyrm beside the hearth fire.
 * 4. First Flight: Soar over the Drowned Epoch ocean with dynamic flight prompts.
 * 5. Horizon of Fire: Spotlight the towering black smoke column over the eastern reef outpost.
 */
export class PrologueSequence {
  private hasAwoken: boolean = false;
  private hasDrawnSword: boolean = false;
  private hasBondedDragon: boolean = false;
  private hasTakenFlight: boolean = false;
  private hasRevealedSmoke: boolean = false;

  private awakeningTimer: number = 0;
  private isAwakeningAnim: boolean = false;
  private smokeCamLookTimer: number = 0;

  // Key locations in Grand Dragon Pavilion on 120m Summit
  private altarPos = new THREE.Vector3(-18.0, 121.1, 1.5);
  private veyrosPos = new THREE.Vector3(1.5, 121.75, 4.0);
  private smokeOutpostPos = new THREE.Vector3(750, 40.0, 450);

  // Active interaction prompt for UI
  public activePrompt: string | null = null;
  public activeSubtitle: PrologueSubtitle | null = null;
  private subtitleTimer: number = 0;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private cameraController: CameraController,
    private playerGroup: THREE.Group,
    private playerController: PlayerController,
    private dragonMount: DragonMount,
    private oceanProps: OceanDynamicProps,
    private particles: InkParticleSystem
  ) {
    // Check initial state from store
    const currentPhase = useGameStore.getState().prologuePhase;
    if (currentPhase === "free_roam") {
      this.hasAwoken = true;
      this.hasDrawnSword = true;
      this.hasBondedDragon = true;
      this.hasTakenFlight = true;
      this.hasRevealedSmoke = true;
      // Remove cocoon and altar sword if already past prologue
      if (this.oceanProps.qiCocoonMesh && this.oceanProps.qiCocoonMesh.parent) {
        this.oceanProps.qiCocoonMesh.parent.remove(this.oceanProps.qiCocoonMesh);
      }
      if (this.oceanProps.altarSwordMesh && this.oceanProps.altarSwordMesh.parent) {
        this.oceanProps.altarSwordMesh.parent.remove(this.oceanProps.altarSwordMesh);
      }
      this.dragonMount.isAwake = true;
    }
  }

  /**
   * Triggers the awakening sequence from chrysalis
   */
  public triggerAwakening(): void {
    if (this.hasAwoken) return;
    this.isAwakeningAnim = true;
    this.awakeningTimer = 3.2;

    // Face camera east towards dawn ocean
    this.cameraController.setAngles(-Math.PI / 2, 1.35);

    // Crack Qi Cocoon
    audioManager.playSFX("boss_ripple");
    this.particles.emitBurst({
      position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      count: 50,
      speed: 7,
      life: 1.2,
      size: 0.45,
      color: new THREE.Color(0x2dd4bf),
    });

    this.showSubtitle(
      "The Oracle of the Drowned Epoch",
      "Wake, Sword Saint. The world has drowned in ash and shadow... but the tide always turns. Sleep no more.",
      6.0
    );

    useGameStore.getState().setProloguePhase("awakened");
    useGameStore.getState().setBattleBanner("THE SLEEPER WAKES · 破繭成龍 — Draw The Dragon Sword from the Altar", 5.0);
  }

  /**
   * Handle user interaction ([E] or [F])
   */
  public handleInteract(): boolean {
    const playerPos = this.playerGroup.position;

    // 1. Draw Sword at Altar
    if (!this.hasDrawnSword) {
      const distToAltar = playerPos.distanceTo(this.altarPos);
      if (distToAltar < 6.5) {
        this.drawDragonSword();
        return true;
      }
    }

    // 2. Commune with Veyros
    if (this.hasDrawnSword && !this.hasBondedDragon) {
      const distToVeyros = playerPos.distanceTo(this.veyrosPos);
      if (distToVeyros < 6.5) {
        this.bondWithVeyros();
        return true;
      }
    }

    return false;
  }

  private drawDragonSword(): void {
    this.hasDrawnSword = true;
    audioManager.playSFX("slash");

    // Hide sword on rack
    if (this.oceanProps.altarSwordMesh) {
      this.oceanProps.altarSwordMesh.visible = false;
    }

    // Radiant sword draw VFX
    this.particles.emitBurst({
      position: this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      count: 40,
      speed: 6,
      life: 0.8,
      size: 0.4,
      color: new THREE.Color(0x2dd4bf),
    });

    this.cameraController.addShake(0.6, 0.3);

    this.showSubtitle(
      "The Dragon Sword (龍劍)",
      "The Tidewalker Fang hums with pure draconic qi. The shared meridian bonds stir once more.",
      5.0
    );

    useGameStore.getState().setBattleBanner("DRAGON SWORD BONDED — Approach Veyros [E] on the sleeping dais", 5.0);
    this.activePrompt = null;
  }

  private bondWithVeyros(): void {
    this.hasBondedDragon = true;
    this.dragonMount.awaken();

    this.cameraController.addShake(0.8, 0.4);

    this.showSubtitle(
      "Veyros",
      "Master... five hundred years of ocean wind. Your soul-meridians hum once more. Let us take to the sky.",
      6.0
    );

    useGameStore.getState().setBattleBanner("HARMONIC BOND RESTORED — Mount Veyros [F] for First Flight", 6.0);
    this.activePrompt = null;
  }

  public update(dt: number, timeSec: number): void {
    // 1. Subtitle decay
    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= dt;
      if (this.subtitleTimer <= 0) {
        this.activeSubtitle = null;
      }
    }

    // 2. Animate Qi Cocoon dissolution
    if (this.isAwakeningAnim) {
      this.awakeningTimer -= dt;
      if (this.oceanProps.qiCocoonMesh) {
        this.oceanProps.qiCocoonMesh.rotation.y += dt * 3.0;
        this.oceanProps.qiCocoonMesh.scale.multiplyScalar(Math.max(0.01, 1.0 - dt * 1.5));
        if (this.awakeningTimer <= 0) {
          if (this.oceanProps.qiCocoonMesh.parent) {
            this.oceanProps.qiCocoonMesh.parent.remove(this.oceanProps.qiCocoonMesh);
          }
          this.isAwakeningAnim = false;
          this.hasAwoken = true;
        }
      }
    }

    // 3. Animate Altar Sword glow pulse
    if (!this.hasDrawnSword && this.oceanProps.altarSwordMesh) {
      const swordGlow = Math.sin(timeSec * 3.0) * 0.3 + 0.7;
      this.oceanProps.altarSwordMesh.position.y = 1.25 + Math.sin(timeSec * 2.0) * 0.04;
      const light = this.oceanProps.altarSwordMesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight;
      if (light) light.intensity = swordGlow * 1.2;
    }

    // 4. Animate Ashscale Raid Smoke Plume (billow and drift)
    if (this.oceanProps.smokePlumeGroup) {
      this.oceanProps.smokePlumeGroup.rotation.y += dt * 0.08;
      // Gentle wobble
      this.oceanProps.smokePlumeGroup.rotation.z = Math.sin(timeSec * 0.4) * 0.04;
      this.oceanProps.smokePlumeGroup.rotation.x = Math.cos(timeSec * 0.3) * 0.04;
    }

    // 5. Update interaction prompts based on proximity
    const playerPos = this.playerGroup.position;

    if (!this.hasDrawnSword) {
      const dist = playerPos.distanceTo(this.altarPos);
      if (dist < 6.5) {
        this.activePrompt = "Draw The Dragon Sword [E]";
      } else if (this.activePrompt === "Draw The Dragon Sword [E]") {
        this.activePrompt = null;
      }
    } else if (!this.hasBondedDragon) {
      const dist = playerPos.distanceTo(this.veyrosPos);
      if (dist < 6.5) {
        this.activePrompt = "Commune with Veyros [E]";
      } else if (this.activePrompt === "Commune with Veyros [E]") {
        this.activePrompt = null;
      }
    } else if (!this.dragonMount.isMounted && !this.hasTakenFlight) {
      const dist = playerPos.distanceTo(this.veyrosPos);
      if (dist < 8.0) {
        this.activePrompt = "Mount Veyros for Flight [F]";
      } else if (this.activePrompt === "Mount Veyros for Flight [F]") {
        this.activePrompt = null;
      }
    } else {
      this.activePrompt = null;
    }

    // 6. First flight detection
    if (this.dragonMount.isMounted && !this.hasTakenFlight) {
      this.hasTakenFlight = true;
      useGameStore.getState().setProloguePhase("first_flight");
      audioManager.setBGMTheme("flight");
      useGameStore.getState().setBattleBanner("FIRST FLIGHT — [W/S] Pitch · [A/D] Bank · [Shift] Dive Boost · [Space] Climb", 6.0);
    }

    // 7. Reveal Horizon Smoke Plume when airborne
    if (this.hasTakenFlight && !this.hasRevealedSmoke && this.dragonMount.isMounted) {
      const altitude = this.playerGroup.position.y;
      const distFromIsland = new THREE.Vector2(playerPos.x, playerPos.z).length();

      if (altitude > 16.0 || distFromIsland > 45.0) {
        this.hasRevealedSmoke = true;
        this.smokeCamLookTimer = 3.5;

        useGameStore.getState().setProloguePhase("free_roam");
        useGameStore.getState().setStoryChapter(1);
        useGameStore.getState().setBattleBanner("ACT 1: THE FIRST DEFIANCE — Black smoke rises over the eastern reef outpost (750m East)", 7.0);

        this.showSubtitle(
          "Veyros",
          "Master, look East. Black Ashscale smoke rising over the reef. They are hunting the innocent.",
          6.0
        );
      }
    }

    // 8. Camera focus towards smoke plume if look timer active
    if (this.smokeCamLookTimer > 0) {
      this.smokeCamLookTimer -= dt;
      // Gently blend camera look direction towards the smoke outpost
      const dirToSmoke = this.smokeOutpostPos.clone().sub(playerPos).normalize();
      const targetYaw = Math.atan2(-dirToSmoke.x, -dirToSmoke.z);
      this.cameraController.setAngles(
        THREE.MathUtils.lerp(this.cameraController.getAzimuth(), targetYaw, dt * 2.0),
        1.35
      );
    }
  }

  public showSubtitle(speaker: string, text: string, duration = 5.0): void {
    this.activeSubtitle = { speaker, text, duration };
    this.subtitleTimer = duration;
  }
}
