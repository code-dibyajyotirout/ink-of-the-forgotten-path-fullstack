/**
 * FalseSaintBoss — Chapter 3 Calamity Boss.
 * Features: Teleporting mirror phantoms, holy shard barrages,
 * front-guarding illusion shields, and fast agility.
 */
import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { PlayerController } from "./PlayerController";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "../audio/AudioManager";

export class FalseSaintBoss {
  mesh: THREE.Group;
  state: "intro" | "fight" | "windup" | "shards" | "mirror_clones" | "stagger" | "dead" = "intro";
  private stunTimer: number = 0;
  private health: number = 700;
  private maxHealth: number = 700;
  private damage: number = 28;
  private speed: number = 3.5;
  
  private stateTimer: number = 0;
  private actionCooldown: number = 2.0;
  private centerPosition = new THREE.Vector3(0, 0, -25);
  
  // Phase tracking
  private phase: 1 | 2 | 3 = 1;
  private isFrontGuardActive: boolean = true;
  staggerPoise: number = 150;
  maxStaggerPoise: number = 150;
  
  // Visual parts
  private body!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  private haloMesh: THREE.Mesh | null = null;
  private mirrorClones: THREE.Group[] = [];

  // Projectiles
  private activeShards: { mesh: THREE.Mesh; dir: THREE.Vector3; distance: number; maxDistance: number; speed: number }[] = [];

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
    const scale = 2.6;
    
    // Slender, monk-like body robe
    const bodyGeo = new THREE.CylinderGeometry(0.2 * scale, 0.45 * scale, 1.5 * scale, 5);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xdddddd, flatShading: true }); // bright white robe
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.75 * scale;
    this.mesh.add(this.body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.35 * scale, 0.35 * scale, 0.35 * scale);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6 * scale;
    this.mesh.add(head);

    // Sleeves/arms
    const armGeo = new THREE.BoxGeometry(0.18 * scale, 0.9 * scale, 0.18 * scale);
    const armMat = new THREE.MeshLambertMaterial({ color: 0xcccccc, flatShading: true });

    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.55 * scale, 1.0 * scale, 0);
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.55 * scale, 1.0 * scale, 0);
    this.mesh.add(this.rightArm);

    // Floating double-sided halo (monastery theme)
    const haloGeo = new THREE.RingGeometry(0.6 * scale, 0.75 * scale, 6);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
    this.haloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.haloMesh.position.set(0, 1.6 * scale, -0.2 * scale);
    this.mesh.add(this.haloMesh);
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

    // Update active light shards
    this.updateShards(dt);

    // Update mirror clone positions
    this.updateMirrorClones(dt);

    // Phase shifts
    const hpRatio = this.health / this.maxHealth;
    if (this.phase === 1 && hpRatio < 0.7) {
      this.phase = 2;
      this.actionCooldown = 0.5;
      this.speed = 4.2;
      this.triggerPhaseShiftVFX();
    } else if (this.phase === 2 && hpRatio < 0.3) {
      this.phase = 3;
      this.actionCooldown = 0.5;
      this.damage = 36;
      this.triggerPhaseShiftVFX();
    }

    // Halo rotation
    if (this.haloMesh) {
      this.haloMesh.rotation.z += dt * 1.5;
    }

    switch (this.state) {
      case "intro":
        if (distToPlayer <= 22) {
          this.state = "fight";
          useGameStore.getState().triggerDialogue(
            "The False Saint",
            "TRUTH IS AN ILLUSION. Forget your names, your sects, and your swords. Enter the peaceful light of memory wipe."
          );
          useGameStore.getState().setActiveBoss({
            name: "The False Saint",
            currentHP: this.health,
            maxHP: this.maxHealth,
          });
        }
        break;

      case "fight":
        this.lookAt(playerPos, dt);

        if (this.actionCooldown <= 0) {
          if (this.phase >= 2 && this.mirrorClones.length === 0 && Math.random() < 0.45) {
            this.transitionTo("mirror_clones");
          } else if (distToPlayer > 8.0 || Math.random() < 0.5) {
            this.transitionTo("shards");
          } else {
            this.transitionTo("windup");
          }
        } else {
          // Swift circle repositioning
          const angle = performance.now() * 0.0015;
          const targetX = playerPos.x + Math.cos(angle) * 7;
          const targetZ = playerPos.z + Math.sin(angle) * 7;
          const targetPos = new THREE.Vector3(targetX, this.mesh.position.y, targetZ);
          this.mesh.position.lerp(targetPos, this.speed * 0.4 * dt);
        }
        break;

      case "mirror_clones":
        // Spawn 2 phantoms to distract the player
        audioManager.playSFX("dodge");
        this.spawnMirrorClone(new THREE.Vector3(this.mesh.position.x - 4, 0, this.mesh.position.z));
        this.spawnMirrorClone(new THREE.Vector3(this.mesh.position.x + 4, 0, this.mesh.position.z));
        
        this.actionCooldown = 2.5;
        this.transitionTo("fight");
        break;

      case "windup":
        this.lookAt(playerPos, dt);
        // Swift float forward
        const forwardDir = new THREE.Vector3(
          -Math.sin(this.mesh.rotation.y),
          0,
          -Math.cos(this.mesh.rotation.y)
        );
        this.mesh.position.addScaledVector(forwardDir, this.speed * 2.2 * dt);

        if (this.stateTimer >= 0.5) {
          // Double arm strike
          audioManager.playSFX("attack");
          if (distToPlayer <= 4.0) {
            const wasParried = this.playerController.receiveHit(this.damage, this.mesh.position);
            if (wasParried) {
              this.stunTimer = 1.2;
              this.transitionTo("stagger");
              return;
            }
          }
          this.actionCooldown = 1.2;
          this.transitionTo("fight");
        }
        break;

      case "shards":
        this.lookAt(playerPos, dt);
        // Spin halo faster
        if (this.haloMesh) this.haloMesh.rotation.z += dt * 8;

        if (this.stateTimer >= 0.4) {
          audioManager.playSFX("boss_ripple");
          
          // Fire 4 light shards in a narrow spray
          const mainDir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).setY(0).normalize();
          this.spawnLightShard(this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), mainDir);

          const leftDir = mainDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 12);
          this.spawnLightShard(this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), leftDir);

          const rightDir = mainDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 12);
          this.spawnLightShard(this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), rightDir);

          this.actionCooldown = 1.6;
          this.transitionTo("fight");
        }
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
    this.mesh.rotation.y += diff * Math.min(1, 9 * dt);
  }

  private transitionTo(nextState: typeof this.state): void {
    this.state = nextState;
    this.stateTimer = 0;
  }

  private triggerPhaseShiftVFX(): void {
    audioManager.playSFX("parry");
    this.particles.burst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)),
      count: 35,
      speed: 9,
      life: 0.5,
      size: 0.22,
    });
  }

  private spawnLightShard(pos: THREE.Vector3, direction: THREE.Vector3): void {
    // Sharp octahedron representing a light crystal
    const geom = new THREE.OctahedronGeometry(0.35, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xdddddd,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    this.activeShards.push({
      mesh,
      dir: direction,
      distance: 0,
      maxDistance: 30.0,
      speed: 15.0,
    });
  }

  private updateShards(dt: number): void {
    const playerPos = this.playerGroup.position;

    for (let i = this.activeShards.length - 1; i >= 0; i--) {
      const s = this.activeShards[i];
      s.distance += s.speed * dt;
      s.mesh.position.addScaledVector(s.dir, s.speed * dt);
      s.mesh.rotation.x += dt * 5;
      s.mesh.rotation.y += dt * 3;

      // Hit check
      const dist = playerPos.distanceTo(s.mesh.position);
      if (dist < 1.4) {
        this.playerController.receiveHit(this.damage * 0.8, s.mesh.position);
        s.distance = s.maxDistance; // force clean
      }

      if (s.distance >= s.maxDistance) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        if (Array.isArray(s.mesh.material)) {
          s.mesh.material.forEach((m) => m.dispose());
        } else {
          s.mesh.material.dispose();
        }
        this.activeShards.splice(i, 1);
      }
    }
  }

  private spawnMirrorClone(pos: THREE.Vector3): void {
    const clone = new THREE.Group();
    
    // Slender clone body
    const bodyGeo = new THREE.CylinderGeometry(0.2 * 2.6, 0.45 * 2.6, 1.5 * 2.6, 5);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.75 * 2.6;
    clone.add(body);

    clone.position.copy(pos);
    this.scene.add(clone);
    this.mirrorClones.push(clone);
  }

  private updateMirrorClones(dt: number): void {
    const playerPos = this.playerGroup.position;

    for (let i = this.mirrorClones.length - 1; i >= 0; i--) {
      const clone = this.mirrorClones[i];
      // Slowly drift toward player
      const dir = new THREE.Vector3().subVectors(playerPos, clone.position).normalize();
      clone.position.addScaledVector(dir, this.speed * 0.7 * dt);
      
      // Look at player
      clone.lookAt(playerPos.x, clone.position.y, playerPos.z);

      // Hit check
      const dist = playerPos.distanceTo(clone.position);
      if (dist < 2.0) {
        this.playerController.receiveHit(this.damage * 0.5, clone.position);
        this.destroyClone(i);
      }
    }
  }

  private destroyClone(idx: number): void {
    const clone = this.mirrorClones[idx];
    
    // Dissipation dust
    this.particles.burst({
      position: clone.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
      count: 10,
      speed: 4,
      life: 0.3,
      size: 0.15,
    });

    this.scene.remove(clone);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });

    this.mirrorClones.splice(idx, 1);
  }

  takeDamage(amount: number): void {
    if (this.state === "dead") return;

    // Check mirror clones hit intercept first
    if (this.mirrorClones.length > 0) {
      // player strike hits the closest clone instead of the boss if player is closer to clone!
      const playerPos = this.playerGroup.position;
      let closestIdx = -1;
      let minDist = 999;
      this.mirrorClones.forEach((clone, idx) => {
        const d = playerPos.distanceTo(clone.position);
        if (d < minDist) {
          minDist = d;
          closestIdx = idx;
        }
      });

      if (closestIdx !== -1 && minDist < 6.0) {
        this.destroyClone(closestIdx);
        audioManager.playSFX("parry");
        return; // intercept attack!
      }
    }

    let finalAmount = amount;
    // Illusion front guard blocks from front
    const facing = new THREE.Vector3(-Math.sin(this.mesh.rotation.y), 0, -Math.cos(this.mesh.rotation.y));
    const toPlayer = new THREE.Vector3().subVectors(this.playerGroup.position, this.mesh.position).normalize();
    const dot = facing.dot(toPlayer);

    if (this.isFrontGuardActive && dot > 0.4) {
      finalAmount = amount * 0.2; // 80% block
      audioManager.playSFX("block");
      
      // Ward flash
      this.particles.burst({
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0.5)),
        count: 6,
        speed: 3,
        life: 0.3,
        size: 0.12,
      });

      if (Math.random() < 0.2) {
        this.isFrontGuardActive = false;
        audioManager.playSFX("parry");
      }
    } else {
      audioManager.playSFX("stagger");
    }

    this.health = Math.max(0, this.health - finalAmount);
    useGameStore.getState().updateBossHP(this.health);

    // Poise damage & stagger break
    this.staggerPoise -= finalAmount;
    if (this.staggerPoise <= 0) {
      this.staggerPoise = this.maxStaggerPoise;
      this.stunTimer = 1.2;
      this.transitionTo("stagger");
      audioManager.playSFX("parry");
      this.particles.burst({
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        count: 25,
        speed: 8,
        life: 0.6,
        size: 0.22,
        color: new THREE.Color(0xffffff)
      });
    } else {
      if (!(this.isFrontGuardActive && dot > 0.4)) {
        audioManager.playSFX("stagger");
      }
      this.particles.burst({
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        count: 14,
        speed: 6,
        life: 0.45,
        size: 0.15,
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

    // Clean shards
    this.activeShards.forEach((s) => {
      this.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      if (Array.isArray(s.mesh.material)) {
        s.mesh.material.forEach((m) => m.dispose());
      } else {
        s.mesh.material.dispose();
      }
    });
    this.activeShards = [];

    // Clean clones
    while (this.mirrorClones.length > 0) {
      this.destroyClone(0);
    }

    // Collapse
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y = 0.2;

    // Grant player massive Qi Essence
    useGameStore.setState((s) => {
      s.player.qiEssence += 4000;
      s.world.defeatedBosses.push("false_saint");
    });

    // Trigger dialogue alignment decision for Chapter 3
    setTimeout(() => {
      useGameStore.getState().triggerDialogue(
        "Fragment of Light",
        "The False Saint collapses, dissolving into pure illusions. The Fragment of Light hovers in his place, glowing with false enlightenment. How will you path your karma?",
        [
          { text: "Devour: Absorb the memories of the monks. (Revenge path)", action: "light_devour" },
          { text: "Liberate: Return the memories to the sect. (Peace path)", action: "light_liberate" },
          { text: "Scribe: Record the formulas of the False Saint. (Truth path)", action: "light_scribe" },
        ]
      );
    }, 1500);
  }

  private animateProcedurally(): void {
    if (this.state === "fight" || this.state === "intro") {
      const breathing = Math.sin(performance.now() * 0.003) * 0.05;
      this.body.position.y = 0.75 * 2.6 + breathing;
      this.leftArm.rotation.z = breathing * 0.3;
      this.rightArm.rotation.z = -breathing * 0.3;
    } else if (this.state === "stagger") {
      this.leftArm.rotation.z = Math.PI / 4;
      this.rightArm.rotation.z = -Math.PI / 4;
    }

    // Dynamic mesh color warning flashes
    if (this.state === "shards" || this.state === "mirror_clones") {
      const flash = Math.sin(performance.now() * 0.025) * 0.5 + 0.5;
      const col = new THREE.Color().lerpColors(new THREE.Color(0xdddddd), new THREE.Color(0xff3333), flash).getHex();
      this.setMeshColor(col);
    } else if (this.state === "stagger") {
      this.setMeshColor(0x333333);
    } else {
      this.setMeshColor(0xdddddd);
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
