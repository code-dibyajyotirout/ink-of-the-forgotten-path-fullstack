/**
 * RustedEmperorBoss — Chapter 2 Calamity Boss.
 * Features: Bulky iron body, magnetic pulls, heavy shockwave slams,
 * and high physical armor that blocks regular strikes.
 */
import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { PlayerController } from "./PlayerController";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "../audio/AudioManager";

export class RustedEmperorBoss {
  mesh: THREE.Group;
  state: "intro" | "fight" | "windup" | "magnetic_pull" | "slam" | "stagger" | "dead" = "intro";
  private stunTimer: number = 0;
  private health: number = 550;
  private maxHealth: number = 550;
  private damage: number = 32;
  private speed: number = 1.8; // Slow, heavy speed
  
  private stateTimer: number = 0;
  private actionCooldown: number = 2.5;
  private centerPosition = new THREE.Vector3(0, 0, -25);
  
  // Phase tracking
  private phase: 1 | 2 | 3 = 1;
  private isShieldActive: boolean = true;
  staggerPoise: number = 120;
  maxStaggerPoise: number = 120;
  
  // Visual parts
  private body!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  private shieldBubble: THREE.Mesh | null = null;
  private hammer!: THREE.Group | THREE.Mesh;

  // Linear shockwaves
  private activeShockwaves: { mesh: THREE.Mesh; dir: THREE.Vector3; distance: number; maxDistance: number; speed: number; hasHitPlayer?: boolean }[] = [];

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
    const scale = 3.0; // Bulky boss
    
    // Bulky rectangular iron body
    const bodyGeo = new THREE.BoxGeometry(0.8 * scale, 0.9 * scale, 0.8 * scale);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a1515, flatShading: true }); // dark rusted color
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.45 * scale;
    this.mesh.add(this.body);

    // Flat iron crown/head
    const headGeo = new THREE.BoxGeometry(0.4 * scale, 0.25 * scale, 0.4 * scale);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x0c0808, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.05 * scale;
    this.mesh.add(head);

    // Stylized heavy block arms
    const armGeo = new THREE.BoxGeometry(0.25 * scale, 0.65 * scale, 0.25 * scale);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x221c1c, flatShading: true });

    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.6 * scale, 0.4 * scale, 0);
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.6 * scale, 0.4 * scale, 0);
    this.mesh.add(this.rightArm);

    // Massive Iron Hammer in right arm
    const hammerShaftGeo = new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 1.2 * scale, 5);
    const hammerHeadGeo = new THREE.BoxGeometry(0.5 * scale, 0.35 * scale, 0.35 * scale);
    
    const hammerGroup = new THREE.Group();
    const shaft = new THREE.Mesh(hammerShaftGeo, armMat);
    shaft.position.y = 0.2 * scale;
    hammerGroup.add(shaft);

    const headMesh = new THREE.Mesh(hammerHeadGeo, bodyMat);
    headMesh.position.y = 0.7 * scale;
    hammerGroup.add(headMesh);

    this.hammer = hammerGroup;
    this.hammer.position.set(0, -0.2 * scale, 0.3 * scale);
    this.hammer.rotation.x = Math.PI / 2;
    this.rightArm.add(this.hammer);

    // Setup shield bubble representing iron ward
    this.createShield();
  }

  private createShield(): void {
    const shieldGeo = new THREE.IcosahedronGeometry(3.8, 1);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x333333,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    this.shieldBubble = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldBubble.position.set(0, 1.5, 0);
    this.mesh.add(this.shieldBubble);
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

    // Update linear shockwaves
    this.updateShockwaves(dt);

    // Phase checks
    const hpRatio = this.health / this.maxHealth;
    if (this.phase === 1 && hpRatio < 0.7) {
      this.phase = 2;
      this.actionCooldown = 0.5;
      this.damage = 38;
      this.triggerPhaseShiftVFX();
    } else if (this.phase === 2 && hpRatio < 0.3) {
      this.phase = 3;
      this.actionCooldown = 0.5;
      this.speed = 2.4;
      this.triggerPhaseShiftVFX();
    }

    // Shield visual pulsing
    if (this.shieldBubble && this.isShieldActive) {
      const pulse = 1.0 + Math.sin(performance.now() * 0.005) * 0.05;
      this.shieldBubble.scale.set(pulse, pulse, pulse);
    }

    switch (this.state) {
      case "intro":
        this.mesh.position.y = Math.sin(performance.now() * 0.001) * 0.1;
        if (distToPlayer <= 22) {
          this.state = "fight";
          useGameStore.getState().triggerDialogue(
            "The Rusted Emperor",
            "METAL CONSUMES SOUL. My forge demands more fuel. Turn your bones into nails."
          );
          useGameStore.getState().setActiveBoss({
            name: "The Rusted Emperor",
            currentHP: this.health,
            maxHP: this.maxHealth,
          });
        }
        break;

      case "fight":
        this.lookAt(playerPos, dt);

        if (this.actionCooldown <= 0) {
          // Select attack pattern based on distance and shield
          if (this.phase === 3 && Math.random() < 0.4) {
            this.transitionTo("magnetic_pull");
          } else if (distToPlayer > 7.0 || Math.random() < 0.5) {
            this.transitionTo("slam");
          } else {
            this.transitionTo("windup");
          }
        } else {
          // Slow pursue
          const targetDir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
          this.mesh.position.addScaledVector(targetDir, this.speed * dt);
        }
        break;

      case "magnetic_pull":
        // Pull player toward the center
        this.particles.emitAmbient(this.mesh.position, 8, 2);
        
        // Apply magnetic drift to player coordinates
        const pullDir = new THREE.Vector3().subVectors(this.mesh.position, playerPos).normalize();
        const pullForce = 9.0; // strong pull
        playerPos.addScaledVector(pullDir, pullForce * dt);

        // Visual arm gestures
        this.leftArm.rotation.z = -Math.PI / 3;
        this.rightArm.rotation.z = Math.PI / 3;

        if (this.stateTimer >= 1.5) {
          // Instantly slam heavy hammer if player got pulled close
          this.actionCooldown = 2.0;
          this.transitionTo("slam");
        }
        break;

      case "windup":
        this.lookAt(playerPos, dt);
        // Wind up hammer over head
        this.rightArm.rotation.x = -Math.PI * 0.7;
        
        if (this.stateTimer >= 0.8) {
          // Heavy Hammer swing visual telegraph
          const facing = new THREE.Vector3(
            -Math.sin(this.mesh.rotation.y),
            0,
            -Math.cos(this.mesh.rotation.y)
          );
          
          this.particles.burst({
            position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0)),
            count: 25,
            speed: 12,
            life: 0.3,
            size: 0.25,
            direction: facing,
            spread: 0.4
          });

          if (distToPlayer <= 6.0) {
            const wasParried = this.playerController.receiveHit(this.damage, this.mesh.position);
            if (wasParried) {
              this.stunTimer = 1.2;
              this.transitionTo("stagger");
              return;
            }
            audioManager.playSFX("block");
          } else {
            audioManager.playSFX("step");
          }
          
          this.actionCooldown = 1.8;
          this.transitionTo("fight");
        }
        break;

      case "slam":
        this.lookAt(playerPos, dt);
        // Hammer lift gesture
        this.rightArm.rotation.x = -Math.PI * 0.8;
        this.leftArm.rotation.x = -Math.PI * 0.8;

        if (this.stateTimer >= 0.9) {
          // Ground impact slam!
          audioManager.playSFX("boss_ripple");
          this.particles.burst({
            position: this.mesh.position.clone().setY(0.2),
            count: 35,
            speed: 7,
            life: 0.5,
            size: 0.25,
          });

          // Spawn three linear expanding shockwaves pointing outwards
          const mainDir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).setY(0).normalize();
          this.spawnShockwave(this.mesh.position.clone(), mainDir);

          const leftDir = mainDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
          this.spawnShockwave(this.mesh.position.clone(), leftDir);

          const rightDir = mainDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 6);
          this.spawnShockwave(this.mesh.position.clone(), rightDir);

          this.actionCooldown = 2.5;
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
    this.mesh.rotation.y += diff * Math.min(1, 4 * dt);
  }

  private transitionTo(nextState: typeof this.state): void {
    this.state = nextState;
    this.stateTimer = 0;
  }

  private triggerPhaseShiftVFX(): void {
    audioManager.playSFX("parry");
    this.particles.burst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)),
      count: 40,
      speed: 10,
      life: 0.65,
      size: 0.3,
    });
    // Restore shield ward
    this.isShieldActive = true;
    if (this.shieldBubble) {
      this.shieldBubble.visible = true;
    }
  }

  private spawnShockwave(position: THREE.Vector3, direction: THREE.Vector3): void {
    // Flat rectangle block representing a rising iron shard wave
    const geom = new THREE.BoxGeometry(1.2, 0.4, 3.0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(position).addScaledVector(direction, 2.0);
    
    // Point in direction
    const angle = Math.atan2(direction.x, direction.z);
    mesh.rotation.y = angle;
    this.scene.add(mesh);

    this.activeShockwaves.push({
      mesh,
      dir: direction,
      distance: 2.0,
      maxDistance: 24.0,
      speed: 12.0,
      hasHitPlayer: false,
    });
  }

  private updateShockwaves(dt: number): void {
    const playerPos = this.playerGroup.position;

    for (let i = this.activeShockwaves.length - 1; i >= 0; i--) {
      const sw = this.activeShockwaves[i];
      sw.distance += sw.speed * dt;
      sw.mesh.position.copy(this.mesh.position).addScaledVector(sw.dir, sw.distance);

      // Procedural height oscillation to simulate underground spikes
      sw.mesh.position.y = 0.2 + Math.sin(sw.distance * 0.8) * 0.3;

      // Check damage overlap
      const dist = playerPos.distanceTo(sw.mesh.position);
      if (!sw.hasHitPlayer && dist < 1.6) {
        sw.hasHitPlayer = true;
        this.playerController.receiveHit(this.damage * 0.7, sw.mesh.position);
      }

      if (sw.distance >= sw.maxDistance) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        if (Array.isArray(sw.mesh.material)) {
          sw.mesh.material.forEach((m) => m.dispose());
        } else {
          sw.mesh.material.dispose();
        }
        this.activeShockwaves.splice(i, 1);
      }
    }
  }

  takeDamage(amount: number): void {
    if (this.state === "dead") return;

    let finalAmount = amount;
    // 50% block if shield is active
    if (this.isShieldActive) {
      finalAmount = amount * 0.5;
      audioManager.playSFX("block");
      
      // Emit metal hit sparks
      this.particles.burst({
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        count: 8,
        speed: 4,
        life: 0.3,
        size: 0.12,
      });

      // Breaking shield trigger
      if (Math.random() < 0.15) {
        this.isShieldActive = false;
        if (this.shieldBubble) {
          this.shieldBubble.visible = false;
        }
        audioManager.playSFX("parry");
        console.log("[RustedEmperor] Shield broken!");
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
      if (!this.isShieldActive) {
        audioManager.playSFX("stagger");
      }
      this.particles.burst({
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        count: 15,
        speed: 6,
        life: 0.5,
        size: 0.18,
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

    // Clean active shockwaves
    this.activeShockwaves.forEach((sw) => {
      this.scene.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      if (Array.isArray(sw.mesh.material)) {
        sw.mesh.material.forEach((m) => m.dispose());
      } else {
        sw.mesh.material.dispose();
      }
    });
    this.activeShockwaves = [];

    if (this.shieldBubble) {
      this.scene.remove(this.shieldBubble);
      this.shieldBubble.geometry.dispose();
      (this.shieldBubble.material as THREE.Material).dispose();
    }

    // Collapse
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y = 0.2;

    // Grant player massive Qi Essence
    useGameStore.setState((s) => {
      s.player.qiEssence += 2500;
      s.world.defeatedBosses.push("rusted_emperor");
    });

    // Trigger dialogue options (Revenge, Peace, Truth alignment decision for Ch 2)
    setTimeout(() => {
      useGameStore.getState().triggerDialogue(
        "Fragment of Iron",
        "The Rusted Emperor is freed from his metal forge. The Fragment of Iron pulses with heavy, metallic energy before you. How will you path your karma?",
        [
          { text: "Plunder: Absorb the forge fires. (Revenge path)", action: "iron_plunder" },
          { text: "Release: Return the iron qi back to sleep. (Peace path)", action: "iron_release" },
          { text: "Inscribe: Record the geometry of forge lines. (Truth path)", action: "iron_inscribe" },
        ]
      );
    }, 1500);
  }

  private animateProcedurally(): void {
    if (this.state === "fight" || this.state === "intro") {
      const breathing = Math.sin(performance.now() * 0.002) * 0.04;
      this.body.position.y = 0.45 * 3.0 + breathing;
      this.leftArm.rotation.z = breathing * 0.5;
      this.rightArm.rotation.z = -breathing * 0.5;
    } else if (this.state === "stagger") {
      this.leftArm.rotation.z = Math.PI / 4;
      this.rightArm.rotation.z = -Math.PI / 4;
    }

    // Dynamic mesh color warning flashes
    if (this.state === "magnetic_pull") {
      const flash = Math.sin(performance.now() * 0.02) * 0.5 + 0.5;
      const col = new THREE.Color().lerpColors(new THREE.Color(0x1a1515), new THREE.Color(0xffffff), flash).getHex();
      this.setMeshColor(col);
    } else if (this.state === "stagger") {
      this.setMeshColor(0x333333);
    } else {
      this.setMeshColor(0x1a1515);
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
