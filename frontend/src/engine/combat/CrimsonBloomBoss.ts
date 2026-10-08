/**
 * CrimsonBloomBoss — Chapter 4 Calamity Boss.
 * Features: Blood lotus pools (life drain), poison mist clouds,
 * and swelling pods that must be destroyed before exploding.
 */
import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { PlayerController } from "./PlayerController";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "../audio/AudioManager";

export interface SplittingPod {
  mesh: THREE.Mesh;
  timer: number;
  maxTime: number;
  radius: number;
}

export interface PoisonCloud {
  mesh: THREE.Mesh;
  timer: number;
  maxTime: number;
  radius: number;
}

export class CrimsonBloomBoss {
  mesh: THREE.Group;
  state: "intro" | "fight" | "windup" | "drain_pools" | "poison_mist" | "pods" | "stagger" | "dead" = "intro";
  private stunTimer: number = 0;
  private health: number = 850;
  private maxHealth: number = 850;
  private damage: number = 32;
  private speed: number = 2.8;

  private stateTimer: number = 0;
  private actionCooldown: number = 2.0;
  private centerPosition = new THREE.Vector3(0, 0, -25);

  // Phase tracking
  private phase: 1 | 2 | 3 = 1;
  staggerPoise: number = 180;
  maxStaggerPoise: number = 180;

  // Visual parts
  private baseStem!: THREE.Mesh;
  private petals: THREE.Mesh[] = [];
  private leftVine!: THREE.Mesh;
  private rightVine!: THREE.Mesh;

  // Boss hazards
  private drainPools: { mesh: THREE.Mesh; pos: THREE.Vector3; radius: number; timer: number }[] = [];
  private poisonClouds: PoisonCloud[] = [];
  private pods: SplittingPod[] = [];

  constructor(
    private scene: THREE.Scene,
    private particles: InkParticleSystem,
    private playerGroup: THREE.Group,
    private playerController: PlayerController
  ) {
    this.mesh = new THREE.Group();
    this.buildMesh();
    this.mesh.position.copy(this.centerPosition);
    this.scene.add(this.mesh);
  }

  private buildMesh(): void {
    const scale = 2.8;

    // Stem base (twisted cylinder)
    const stemGeo = new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 1.6 * scale, 6);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x3d3535, flatShading: true }); // dark stem
    this.baseStem = new THREE.Mesh(stemGeo, stemMat);
    this.baseStem.position.y = 0.8 * scale;
    this.mesh.add(this.baseStem);

    // Glowing core bloom
    const coreGeo = new THREE.OctahedronGeometry(0.6 * scale, 0);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xaa2222 }); // Blood red core
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 1.7 * scale;
    this.mesh.add(core);

    // Surrounding petals (6 flat boxes)
    const petalGeo = new THREE.BoxGeometry(0.3 * scale, 1.1 * scale, 0.12 * scale);
    const petalMat = new THREE.MeshLambertMaterial({ color: 0x1a1111, flatShading: true }); // dark grey petals
    for (let i = 0; i < 6; i++) {
      const petal = new THREE.Mesh(petalGeo, petalMat);
      const angle = (i * Math.PI) / 3;
      petal.position.set(
        Math.cos(angle) * 0.7 * scale,
        1.7 * scale,
        Math.sin(angle) * 0.7 * scale
      );
      petal.rotation.y = -angle;
      petal.rotation.z = 0.2; // tilted slightly outwards
      this.mesh.add(petal);
      this.petals.push(petal);
    }

    // Whipping vines (limbs)
    const vineGeo = new THREE.BoxGeometry(0.18 * scale, 1.4 * scale, 0.18 * scale);
    const vineMat = new THREE.MeshLambertMaterial({ color: 0x2b2222, flatShading: true });

    this.leftVine = new THREE.Mesh(vineGeo, vineMat);
    this.leftVine.position.set(-0.75 * scale, 1.0 * scale, 0);
    this.mesh.add(this.leftVine);

    this.rightVine = new THREE.Mesh(vineGeo, vineMat);
    this.rightVine.position.set(0.75 * scale, 1.0 * scale, 0);
    this.mesh.add(this.rightVine);
  }

  update(dt: number): void {
    if (this.state === "dead") return;

    // Slowly regenerate poise if not staggered
    if (this.state !== "stagger" && this.staggerPoise < this.maxStaggerPoise) {
      this.staggerPoise = Math.min(this.maxStaggerPoise, this.staggerPoise + dt * 15);
    }

    this.stateTimer += dt;
    this.actionCooldown -= dt;

    const playerPos = this.playerGroup.position;
    const distToPlayer = this.mesh.position.distanceTo(playerPos);

    // Update active fields & hazards
    this.updateDrainPools(dt);
    this.updatePoisonClouds(dt);
    this.updatePods(dt);

    // Phase shifts
    const hpRatio = this.health / this.maxHealth;
    if (this.phase === 1 && hpRatio < 0.7) {
      this.phase = 2;
      this.actionCooldown = 0.5;
      this.speed = 3.3;
      this.triggerPhaseShiftVFX();
    } else if (this.phase === 2 && hpRatio < 0.35) {
      this.phase = 3;
      this.actionCooldown = 0.5;
      this.damage = 38;
      this.triggerPhaseShiftVFX();
    }

    // Rotate petals slowly
    this.petals.forEach((p, idx) => {
      p.rotation.y += dt * 0.5 * (idx % 2 === 0 ? 1 : -1);
    });

    switch (this.state) {
      case "intro":
        if (distToPlayer <= 22) {
          this.state = "fight";
          useGameStore.getState().triggerDialogue(
            "The Crimson Bloom",
            "LIFE DRIPS INTO THE MUD. Your martial veins are but dry stems. Let your blood flow back into the marsh roots."
          );
          useGameStore.getState().setActiveBoss({
            name: "The Crimson Bloom",
            currentHP: this.health,
            maxHP: this.maxHealth,
          });
        }
        break;

      case "fight":
        this.lookAt(playerPos, dt);

        if (this.actionCooldown <= 0) {
          const rand = Math.random();
          if (rand < 0.3) {
            this.transitionTo("drain_pools");
          } else if (rand < 0.6) {
            this.transitionTo("poison_mist");
          } else if (this.phase >= 2 && this.pods.length === 0 && rand < 0.85) {
            this.transitionTo("pods");
          } else {
            this.transitionTo("windup");
          }
        } else {
          // Sidestep or circle float
          const angle = performance.now() * 0.0012;
          const targetX = playerPos.x + Math.cos(angle) * 7.5;
          const targetZ = playerPos.z + Math.sin(angle) * 7.5;
          const targetPos = new THREE.Vector3(targetX, this.mesh.position.y, targetZ);
          this.mesh.position.lerp(targetPos, this.speed * 0.45 * dt);
        }
        break;

      case "drain_pools":
        // Drop 3 blood drain circles on the ground
        audioManager.playSFX("boss_ripple");
        this.spawnDrainPool(playerPos.clone());
        this.spawnDrainPool(new THREE.Vector3(playerPos.x - 5, 0, playerPos.z + 3));
        this.spawnDrainPool(new THREE.Vector3(playerPos.x + 4, 0, playerPos.z - 4));

        this.actionCooldown = 2.4;
        this.transitionTo("fight");
        break;

      case "poison_mist":
        // Emit poison gas around itself
        audioManager.playSFX("step");
        this.spawnPoisonCloud(this.mesh.position.clone(), 6.5, 6.0);
        
        // Spawn small clouds at player's location
        setTimeout(() => {
          if (this.state !== "dead") {
            this.spawnPoisonCloud(this.playerGroup.position.clone(), 3.5, 5.0);
          }
        }, 1200);

        this.actionCooldown = 3.0;
        this.transitionTo("fight");
        break;

      case "pods":
        // Spawn 3 swelling pods that the player must hit
        audioManager.playSFX("block");
        this.spawnExplodingPod(new THREE.Vector3(this.mesh.position.x - 6, 0, this.mesh.position.z - 6));
        this.spawnExplodingPod(new THREE.Vector3(this.mesh.position.x + 6, 0, this.mesh.position.z - 6));
        this.spawnExplodingPod(new THREE.Vector3(this.mesh.position.x, 0, this.mesh.position.z + 8));

        this.actionCooldown = 3.5;
        this.transitionTo("fight");
        break;

      case "windup":
        this.lookAt(playerPos, dt);
        // Vine thrash forward
        const lungeDir = new THREE.Vector3(
          -Math.sin(this.mesh.rotation.y),
          0,
          -Math.cos(this.mesh.rotation.y)
        );
        this.mesh.position.addScaledVector(lungeDir, this.speed * 2.5 * dt);

        if (this.stateTimer >= 0.55) {
          audioManager.playSFX("attack");
          
          // Spawn visual slash burst!
          this.particles.burst({
            position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
            count: 20,
            speed: 15,
            life: 0.3,
            size: 0.15,
            direction: lungeDir,
            spread: 0.35, // Sweeping vine slash
          });

          if (distToPlayer <= 4.5) {
            const wasParried = this.playerController.receiveHit(this.damage, this.mesh.position);
            if (wasParried) {
              this.stunTimer = 1.2;
              this.transitionTo("stagger");
              return;
            }
          }
          this.actionCooldown = 1.4;
          this.transitionTo("fight");
        }
        break;
      case "stagger":
        this.stunTimer -= dt;
        if (this.stunTimer <= 0) {
          this.transitionTo("fight");
        }
        break;
    }

    this.animateProcedurally();
  }

  private lookAt(target: THREE.Vector3, dt: number): void {
    const dir = target.clone().sub(this.mesh.position);
    const targetAngle = Math.atan2(dir.x, dir.z);
    let diff = targetAngle - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, 8 * dt);
  }

  private transitionTo(nextState: typeof this.state): void {
    this.state = nextState;
    this.stateTimer = 0;
  }

  private triggerPhaseShiftVFX(): void {
    audioManager.playSFX("parry");
    this.particles.burst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0)),
      count: 35,
      speed: 8,
      life: 0.6,
      size: 0.2,
    });
  }

  private spawnDrainPool(pos: THREE.Vector3): void {
    const geom = new THREE.RingGeometry(0.1, 2.5, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x881111,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.05, pos.z);
    this.scene.add(mesh);

    this.drainPools.push({
      mesh,
      pos: pos.clone(),
      radius: 2.5,
      timer: 7.0, // remains for 7 seconds
    });
  }

  private updateDrainPools(dt: number): void {
    const playerPos = this.playerGroup.position;

    for (let i = this.drainPools.length - 1; i >= 0; i--) {
      const p = this.drainPools[i];
      p.timer -= dt;

      // Pulse color
      const scale = 1.0 + Math.sin(performance.now() * 0.01) * 0.1;
      p.mesh.scale.set(scale, scale, 1.0);

      // Hit check (drains health to heal boss!)
      const dist = playerPos.distanceTo(p.pos);
      if (dist < p.radius) {
        // Drain player, heal boss
        this.playerController.receiveHit(this.damage * 0.25 * dt, p.pos);
        this.health = Math.min(this.maxHealth, this.health + 12 * dt);
        
        // Spawn small siphon dots flowing to boss
        if (Math.random() < 0.1) {
          this.particles.burst({
            position: playerPos.clone().add(new THREE.Vector3(0, 0.5, 0)),
            count: 2,
            speed: 3,
            life: 0.3,
            size: 0.08,
          });
        }
      }

      if (p.timer <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.drainPools.splice(i, 1);
      }
    }
  }

  private spawnPoisonCloud(pos: THREE.Vector3, radius: number, maxTime: number): void {
    // Cloud represented by green/grey flat shapes
    const geom = new THREE.DodecahedronGeometry(radius, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x223a22,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(pos.x, 0.5, pos.z);
    this.scene.add(mesh);

    this.poisonClouds.push({
      mesh,
      timer: maxTime,
      maxTime,
      radius,
    });
  }

  private updatePoisonClouds(dt: number): void {
    const playerPos = this.playerGroup.position;

    for (let i = this.poisonClouds.length - 1; i >= 0; i--) {
      const c = this.poisonClouds[i];
      c.timer -= dt;

      // Expand & rotate
      c.mesh.rotation.y += dt * 0.2;
      const ratio = c.timer / c.maxTime;
      c.mesh.scale.setScalar(1.2 - ratio * 0.2);

      // Check poison contact
      const dist = playerPos.distanceTo(c.mesh.position);
      if (dist < c.radius) {
        // Soft continuous poison tick
        this.playerController.receiveHit(this.damage * 0.18 * dt, c.mesh.position);
      }

      if (c.timer <= 0) {
        this.scene.remove(c.mesh);
        c.mesh.geometry.dispose();
        if (Array.isArray(c.mesh.material)) {
          c.mesh.material.forEach((m) => m.dispose());
        } else {
          c.mesh.material.dispose();
        }
        this.poisonClouds.splice(i, 1);
      }
    }
  }

  private spawnExplodingPod(pos: THREE.Vector3): void {
    // Pod geometry (sphere)
    const geom = new THREE.SphereGeometry(0.7, 5, 5);
    const mat = new THREE.MeshLambertMaterial({ color: 0xcc2222, flatShading: true });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    this.pods.push({
      mesh,
      timer: 5.0, // 5 seconds to explode
      maxTime: 5.0,
      radius: 5.0, // blast radius
    });
  }

  private updatePods(dt: number): void {
    const playerPos = this.playerGroup.position;

    for (let i = this.pods.length - 1; i >= 0; i--) {
      const p = this.pods[i];
      p.timer -= dt;

      // Swell pod mesh
      const swell = 1.0 + (1.0 - p.timer / p.maxTime) * 1.5;
      p.mesh.scale.setScalar(swell);

      // Warning flashes
      if (Math.random() < 0.15) {
        this.particles.burst({
          position: p.mesh.position,
          count: 3,
          speed: 2,
          life: 0.2,
          size: 0.1,
        });
      }

      if (p.timer <= 0) {
        // DETONATE!
        audioManager.playSFX("boss_ripple");
        this.particles.burst({
          position: p.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
          count: 20,
          speed: 8,
          life: 0.6,
          size: 0.25,
        });

        // Check blast hit
        const dist = playerPos.distanceTo(p.mesh.position);
        if (dist < p.radius) {
          this.playerController.receiveHit(this.damage * 1.25, p.mesh.position);
        }

        this.removePod(i);
      }
    }
  }

  private removePod(idx: number): void {
    const p = this.pods[idx];
    this.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    if (Array.isArray(p.mesh.material)) {
      p.mesh.material.forEach((m) => m.dispose());
    } else {
      p.mesh.material.dispose();
    }
    this.pods.splice(idx, 1);
  }

  /** Player hits a pod, destroying it safely before detonation */
  checkPodStrike(playerAttackPos: THREE.Vector3, radius: number): boolean {
    let hitAny = false;
    for (let i = this.pods.length - 1; i >= 0; i--) {
      const p = this.pods[i];
      const dist = playerAttackPos.distanceTo(p.mesh.position);
      if (dist <= radius + 1.2) {
        // Hit! Dissolve pod safely
        audioManager.playSFX("block");
        this.particles.burst({
          position: p.mesh.position,
          count: 10,
          speed: 3,
          life: 0.4,
          size: 0.12,
        });
        this.removePod(i);
        hitAny = true;
      }
    }
    return hitAny;
  }

  takeDamage(amount: number): void {
    if (this.state === "dead") return;

    this.health = Math.max(0, this.health - amount);
    useGameStore.getState().updateBossHP(this.health);

    // Poise damage & stagger break
    this.staggerPoise -= amount;
    if (this.staggerPoise <= 0) {
      this.staggerPoise = this.maxStaggerPoise;
      this.stunTimer = 1.2;
      this.transitionTo("stagger");
      audioManager.playSFX("parry");
      this.particles.burst({
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0)),
        count: 25,
        speed: 8,
        life: 0.6,
        size: 0.22,
        color: new THREE.Color(0xffffff)
      });
    } else {
      audioManager.playSFX("stagger");
      this.particles.burst({
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0)),
        count: 14,
        speed: 6,
        life: 0.4,
        size: 0.14,
      });
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  takeHit(damage: number, attackerPos?: THREE.Vector3): void {
    this.takeDamage(damage);
  }

  private die(): void {
    this.transitionTo("dead");
    audioManager.playSFX("parry");
    useGameStore.getState().setActiveBoss(null);

    // Clean pools
    this.drainPools.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      if (Array.isArray(p.mesh.material)) {
        p.mesh.material.forEach((m) => m.dispose());
      } else {
        p.mesh.material.dispose();
      }
    });
    this.drainPools = [];

    // Clean poison
    this.poisonClouds.forEach((c) => {
      this.scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      if (Array.isArray(c.mesh.material)) {
        c.mesh.material.forEach((m) => m.dispose());
      } else {
        c.mesh.material.dispose();
      }
    });
    this.poisonClouds = [];

    // Clean pods
    while (this.pods.length > 0) {
      this.removePod(0);
    }

    // Collapse
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y = 0.2;

    // Grant player massive Qi Essence
    useGameStore.setState((s) => {
      s.player.qiEssence += 5500;
      s.world.defeatedBosses.push("crimson_bloom");
    });

    // Trigger dialogue alignment decision for Chapter 4
    setTimeout(() => {
      useGameStore.getState().triggerDialogue(
        "Fragment of Blood",
        "The Crimson Bloom shrivels, returning the life force to the soil. The Fragment of Blood pulses at the center. How will you direct your alignment?",
        [
          { text: "Devour: Absorb the blood vitality. (Revenge path)", action: "blood_devour" },
          { text: "Purify: Release the corruption into the earth. (Peace path)", action: "blood_purify" },
          { text: "Archive: Bind the cell formulas into the Codex. (Truth path)", action: "blood_archive" },
        ]
      );
    }, 1500);
  }

  private animateProcedurally(): void {
    if (this.state === "fight" || this.state === "intro") {
      const breathing = Math.sin(performance.now() * 0.0025) * 0.06;
      this.baseStem.position.y = 0.8 * 2.8 + breathing;
      this.leftVine.rotation.z = breathing * 0.4;
      this.rightVine.rotation.z = -breathing * 0.4;
    } else if (this.state === "stagger") {
      this.leftVine.rotation.z = Math.PI / 4;
      this.rightVine.rotation.z = -Math.PI / 4;
    }

    // Dynamic mesh color warning flashes
    if (this.state === "drain_pools" || this.state === "poison_mist" || this.state === "pods") {
      const flash = Math.sin(performance.now() * 0.02) * 0.5 + 0.5;
      const col = new THREE.Color().lerpColors(new THREE.Color(0x3d3535), new THREE.Color(0xffffff), flash).getHex();
      this.setMeshColor(col);
    } else if (this.state === "stagger") {
      this.setMeshColor(0x221a1a);
    } else {
      this.setMeshColor(0x3d3535);
    }
  }

  private setMeshColor(hex: number): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && "color" in child.material) {
        (child.material as any).color.setHex(hex);
      }
    });
  }

  getHealth(): number { return this.health; }
  getMaxHealth(): number { return this.maxHealth; }
}
