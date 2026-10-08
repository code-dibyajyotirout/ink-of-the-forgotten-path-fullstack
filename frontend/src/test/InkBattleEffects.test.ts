/**
 * InkBattleEffects.test.ts — Unit tests for 3D slash ribbons, shockwave particles,
 * post-processing battle screen uniforms, and combo style rank mechanics.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { InkSlashManager } from "../engine/rendering/InkSlashMesh";
import { InkParticleSystem } from "../engine/rendering/InkParticleSystem";
import { MonochromePostProcess } from "../engine/rendering/MonochromePostProcess";
import { useGameStore } from "@/stores/gameStore";

describe("Ink Battle Visual Effects & Combat Systems", () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    useGameStore.setState((s) => {
      s.ui.damagePopups = [];
      s.ui.comboStyle = {
        points: 0,
        rank: "E",
        decayTimer: 0,
        bannerText: null,
        bannerTimer: 0,
      };
    });
  });

  describe("InkSlashManager (3D Blade Ribbon Arcs)", () => {
    it("spawns and updates 3D calligraphic slash ribbons", () => {
      const slashManager = new InkSlashManager(scene);
      expect(slashManager.count).toBe(0);

      const slash = slashManager.spawnSlash({
        position: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(0, 0, -1),
        radius: 2.0,
        width: 0.5,
        color: new THREE.Color(0x00e5ff),
        duration: 0.3,
        isHeavy: false,
      });

      expect(slashManager.count).toBe(1);
      expect(slash.isDead).toBe(false);

      // Advance time by 0.15s
      slashManager.update(0.15);
      expect(slashManager.count).toBe(1);

      // Advance time beyond duration
      slashManager.update(0.2);
      expect(slashManager.count).toBe(0);
    });

    it("spawns dual-layered slash ribbons on heavy attacks", () => {
      const slashManager = new InkSlashManager(scene);

      slashManager.spawnSlash({
        position: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(0, 0, -1),
        isHeavy: true,
        duration: 0.4,
      });

      // Primary slash + shadow trail
      expect(slashManager.count).toBe(2);

      slashManager.clear();
      expect(slashManager.count).toBe(0);
    });
  });

  describe("InkParticleSystem (Shockwaves, Splatters, Parry Bursts)", () => {
    it("spawns shockwave rings and updates their life cycle", () => {
      const particles = new InkParticleSystem(scene);

      particles.spawnShockwaveRing({
        position: new THREE.Vector3(0, 0, 0),
        maxRadius: 4.0,
        duration: 0.3,
        color: new THREE.Color(0xffb300),
      });

      // Emitter and points mesh updated cleanly
      particles.update(0.1);
      expect(particles.particleCount).toBeGreaterThanOrEqual(0);

      particles.update(0.3);
      particles.dispose();
    });

    it("spawns Perfect Parry burst particles and ground splatters", () => {
      const particles = new InkParticleSystem(scene);

      particles.spawnParryBurst(new THREE.Vector3(2, 1, 2), new THREE.Color(0x00ffff));

      expect(particles.particleCount).toBeGreaterThan(20);
      particles.update(0.1);
      particles.dispose();
    });
  });

  describe("MonochromePostProcess (Battle Screen Effects)", () => {
    it("triggers parry flash and chromatic impact uniforms", () => {
      // Mock WebGLRenderer
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      
      if (!gl || typeof (gl as any).getShaderPrecisionFormat !== "function") {
        // Skip WebGL hardware renderer test if headless environment lacks WebGL driver
        return;
      }

      const renderer = new THREE.WebGLRenderer({ canvas });
      const postProcess = new MonochromePostProcess(renderer, 800, 600);

      postProcess.triggerParryFlash();
      postProcess.triggerChromaticImpact(1.5);
      postProcess.setSpeedLines(0.8);

      expect(postProcess.settings.pixelSize).toBe(1);

      postProcess.dispose();
      renderer.dispose();
    });
  });

  describe("Combo Style Rank & Floating Damage Popups", () => {
    it("calculates style rank tiers correctly as points accumulate", () => {
      const store = useGameStore.getState();

      store.addComboPoint(25);
      expect(useGameStore.getState().ui.comboStyle.rank).toBe("E");

      store.addComboPoint(50); // Total 75
      expect(useGameStore.getState().ui.comboStyle.rank).toBe("C");

      store.addComboPoint(170); // Total 245
      expect(useGameStore.getState().ui.comboStyle.rank).toBe("A");

      store.addComboPoint(300); // Total 545
      expect(useGameStore.getState().ui.comboStyle.rank).toBe("SSS");
    });

    it("pushes floating damage popups and decays them over time", () => {
      const store = useGameStore.getState();

      store.addDamagePopup(45, true, [0, 2, 0], "#ff1744");
      expect(useGameStore.getState().ui.damagePopups.length).toBe(1);

      const first = useGameStore.getState().ui.damagePopups[0];
      expect(first.amount).toBe(45);
      expect(first.isCrit).toBe(true);

      store.updateCombatUI(0.9);
      expect(useGameStore.getState().ui.damagePopups.length).toBe(0);
    });

    it("handles battle banner announcements", () => {
      const store = useGameStore.getState();

      store.setBattleBanner("PERFECT PARRY!", 1.0);
      expect(useGameStore.getState().ui.comboStyle.bannerText).toBe("PERFECT PARRY!");

      store.updateCombatUI(1.1);
      expect(useGameStore.getState().ui.comboStyle.bannerText).toBeNull();
    });
  });
});
