import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { PlayerController } from "./PlayerController";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "../audio/AudioManager";

export class HollowWindBoss {
  mesh: THREE.Group;
  state: "intro" | "fight" | "windup" | "soundwave" | "teleport" | "storm" | "stagger" | "dead" = "intro";
  private stunTimer: number = 0;
  private health: number = 350;
  private maxHealth: number = 350;
  private damage: number = 22;
  private speed: number = 3.0;
  
  private stateTimer: number = 0;
  private actionCooldown: number = 2.0;
  private centerPosition = new THREE.Vector3(0, 0, -25);
  
  // Phase tracking
  private phase: 1 | 2 | 3 = 1;
  staggerPoise: number = 100;
  maxStaggerPoise: number = 100;
  
  // Visual parts
  private body!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  
  // Sound ripple visual helpers
  private activeRipples: { mesh: THREE.Mesh; radius: number; maxRadius: number; damage: number; hasHitPlayer?: boolean }[] = [];

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
    const scale = 2.4;
    
    // Large, stylized multi-jointed body
    const bodyGeo = new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 1.4 * scale, 6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.7 * scale;
    this.mesh.add(this.body);

    // Horned head (representing a corrupted wind spirit)
    const headGeo = new THREE.DodecahedronGeometry(0.35 * scale, 0);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x111111, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6 * scale;
    this.mesh.add(head);

    // Wind ribbons (flowing flat planes)
    const ribbonGeo = new THREE.BoxGeometry(0.1, 1.8 * scale, 0.4);
    const ribbonMat = new THREE.MeshLambertMaterial({ color: 0x777777, flatShading: true });
    
    this.leftArm = new THREE.Mesh(ribbonGeo, ribbonMat);
    this.leftArm.position.set(-0.6 * scale, 1.0 * scale, 0);
    this.leftArm.rotation.z = Math.PI / 8;
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(ribbonGeo, ribbonMat);
    this.rightArm.position.set(0.6 * scale, 1.0 * scale, 0);
    this.rightArm.rotation.z = -Math.PI / 8;
    this.mesh.add(this.rightArm);

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

    // Update active ring ripples
    this.updateRipples(dt);

    // Phase checks
    const hpRatio = this.health / this.maxHealth;
    if (this.phase === 1 && hpRatio < 0.7) {
      this.phase = 2;
      this.actionCooldown = 0.5;
      this.triggerPhaseShiftVFX();
    } else if (this.phase === 2 && hpRatio < 0.3) {
      this.phase = 3;
      this.actionCooldown = 0.5;
      this.triggerPhaseShiftVFX();
    }

    switch (this.state) {
      case "stagger":
        this.mesh.position.y = 1.0 + Math.sin(performance.now() * 0.003) * 0.15;
        this.stunTimer -= dt;
        if (this.stunTimer <= 0) {
          this.transitionTo("fight");
        }
        break;

      case "intro":
        // Float in place, spot player
        this.mesh.position.y = 1.0 + Math.sin(performance.now() * 0.003) * 0.4;
        if (distToPlayer <= 22) {
          this.state = "fight";
          // Trigger dialogue trigger in store to announce boss!
          useGameStore.getState().triggerDialogue(
            "Calamity",
            "THE HOLLOW WIND HAS AWOKEN. The wind is sharp. Protect your meridians."
          );
          useGameStore.getState().setActiveBoss({
            name: "The Hollow Wind Calamity",
            currentHP: this.health,
            maxHP: this.maxHealth,
          });
        }
        break;

      case "fight":
        // Float and track player
        this.mesh.position.y = 1.0 + Math.sin(performance.now() * 0.003) * 0.2;
        this.lookAt(playerPos, dt);

        if (this.actionCooldown <= 0) {
          // Select attack pattern based on distance and phase
          if (this.phase === 3) {
            this.transitionTo("storm");
          } else if (this.phase === 2 && Math.random() < 0.45) {
            this.transitionTo("teleport");
          } else if (distToPlayer > 8.0 || Math.random() < 0.5) {
            this.transitionTo("soundwave");
          } else {
            // Melee sweep attack
            this.transitionTo("windup");
          }
        } else {
          // Reposition around target center or player
          const targetDir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
          if (distToPlayer > 6.0) {
            this.mesh.position.addScaledVector(targetDir, this.speed * dt);
          } else if (distToPlayer < 4.0) {
            // drift back
            this.mesh.position.addScaledVector(targetDir, -this.speed * dt);
          }
        }
        break;

      case "windup":
        this.lookAt(playerPos, dt);
        // Spin ribbons rapidly
        this.leftArm.rotation.x += dt * 10;
        this.rightArm.rotation.x -= dt * 10;

        // Windup visual tell — flash at player to telegraph incoming strike
        if (Math.random() < 0.15) {
          this.particles.burst({
            position: this.mesh.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
            count: 2,
            speed: 2,
            life: 0.3,
            size: 0.2,
            color: new THREE.Color(0xff3333),
          });
        }

        if (this.stateTimer >= 0.6) {
          // Transition to dedicated lunge phase
          (this as any).hasHitInLunge = false;
          this.transitionTo("fight"); // Temporarily reuse — see below
          // Actually we need a lunge sub-state. Use inline lunge logic:
          // Lunge forward toward player
          const lungeDir = new THREE.Vector3()
            .subVectors(playerPos, this.mesh.position)
            .setY(0)
            .normalize();
          this.mesh.position.addScaledVector(lungeDir, 12 * 0.016); // one-shot burst

          // Spawn attack slash VFX
          this.particles.burst({
            position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
            count: 18,
            speed: 12,
            life: 0.4,
            size: 0.3,
            direction: lungeDir,
            spread: 0.3,
            color: new THREE.Color(0xffffff),
          });

          if (distToPlayer <= 5.5) {
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

      case "soundwave":
        this.lookAt(playerPos, dt);
        // Cast circular expanding ripple
        if (this.stateTimer >= 0.4) {
          this.spawnSoundRipple(this.mesh.position.clone(), 12.0);
          this.actionCooldown = this.phase === 2 ? 1.0 : 1.8;
          this.transitionTo("fight");
        }
        break;

      case "teleport":
        // Teleport right next to player or behind them
        if (this.stateTimer >= 0.3) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 3.0;
          const newPos = new THREE.Vector3(
            playerPos.x + Math.cos(angle) * dist,
            0,
            playerPos.z + Math.sin(angle) * dist
          );
          
          // Old position particles
          this.particles.burst({
            position: this.mesh.position.clone(),
            count: 15,
            speed: 5,
            life: 0.5,
            size: 0.2,
          });

          this.mesh.position.copy(newPos);
          this.lookAt(playerPos, 100); // instant face

          // Teleport strike lunge immediately
          this.transitionTo("windup");
        }
        break;

      case "storm":
        // Fly to center, channel soundstorm (ignore vertical Y distance for reachability check)
        const toCenter = this.centerPosition.clone().sub(this.mesh.position);
        toCenter.y = 0;
        if (toCenter.length() > 1.0) {
          this.mesh.position.addScaledVector(toCenter.normalize(), this.speed * 2 * dt);
          this.mesh.position.y = 4.0; // higher float height
        } else {
          // Channel ripples
          this.mesh.position.y = 4.0 + Math.sin(performance.now() * 0.008) * 0.25;
          const rippleSpawnInterval = 1.0;
          const numRipples = Math.floor(this.stateTimer / rippleSpawnInterval);
          const currentCount = this.activeRipples.length;

          if (currentCount < 3 && numRipples > currentCount) {
            this.spawnSoundRipple(this.mesh.position.clone().setY(0), 18.0);
          }

          if (this.stateTimer >= 5.0) {
            this.actionCooldown = 1.5;
            this.transitionTo("fight");
          }
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
    this.particles.burst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)),
      count: 30,
      speed: 8,
      life: 0.6,
      size: 0.25,
    });
  }

  /**
   * Spawn expanding low-poly sound ring.
   */
  private spawnSoundRipple(position: THREE.Vector3, maxRadius: number): void {
    // Ring geometry (flat toroid)
    const geom = new THREE.RingGeometry(0.1, 0.3, 8);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x999999,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(geom, mat);
    ringMesh.position.copy(position);
    this.scene.add(ringMesh);

    this.activeRipples.push({
      mesh: ringMesh,
      radius: 0.2,
      maxRadius,
      damage: this.damage * 0.8,
      hasHitPlayer: false,
    });

    // Sound release burst
    this.particles.burst({
      position,
      count: 10,
      speed: 4,
      life: 0.3,
      size: 0.15,
    });

    audioManager.playSFX("boss_ripple");
  }

  /**
   * Update active soundwave ripple sizes and resolve hits.
   */
  private updateRipples(dt: number): void {
    const playerPos = this.playerGroup.position;
    
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const r = this.activeRipples[i];
      r.radius += 10.0 * dt; // Expansion speed
      r.mesh.scale.set(r.radius, 1, r.radius);

      // Fade out opacity as it gets larger
      const ratio = r.radius / r.maxRadius;
      if (r.mesh.material instanceof THREE.MeshBasicMaterial) {
        r.mesh.material.opacity = 0.85 * (1 - ratio);
      }

      // Check distance overlap to player (torus thickness)
      const dist = playerPos.distanceTo(r.mesh.position);
      const diff = Math.abs(dist - r.radius);
      if (!r.hasHitPlayer && diff < 0.6) {
        // Player overlaps the ripple edge, trigger hit check!
        r.hasHitPlayer = true;
        this.playerController.receiveHit(r.damage, r.mesh.position);
      }

      if (r.radius >= r.maxRadius) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        if (Array.isArray(r.mesh.material)) {
          r.mesh.material.forEach((m) => m.dispose());
        } else {
          r.mesh.material.dispose();
        }
        this.activeRipples.splice(i, 1);
      }
    }
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
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        count: 25,
        speed: 8,
        life: 0.6,
        size: 0.22,
        color: new THREE.Color(0xffffff)
      });
    } else {
      audioManager.playSFX("stagger");
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

    // Clean active ripples
    this.activeRipples.forEach((r) => {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      if (Array.isArray(r.mesh.material)) {
        r.mesh.material.forEach((m) => m.dispose());
      } else {
        r.mesh.material.dispose();
      }
    });
    this.activeRipples = [];

    // Tumble mesh
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y = 0.1;

    // Grant player massive Qi Essence
    useGameStore.setState((s) => {
      s.player.qiEssence += 1500;
      s.world.defeatedBosses.push("hollow_wind");
    });

    // Trigger dialogue options (Revenge, Peace, Truth alignment decision)
    setTimeout(() => {
      useGameStore.getState().triggerDialogue(
        "Fragment of Wind",
        "The Calamity is pacified. The Fragment of Wind glows before you, pulsing with raw cultivation energy. How will you claim it?",
        [
          { text: "Purge: Grind the fragment into ashes. (Revenge path)", action: "fragment_purge" },
          { text: "Purify: Guide the qi back into the earth. (Peace path)", action: "fragment_purify" },
          { text: "Inscribe: Record the patterns of the wind. (Truth path)", action: "fragment_inscribe" },
        ]
      );
    }, 1500);
  }

  private animateProcedurally(): void {
    if (this.state === "fight" || this.state === "intro") {
      const cycle = Math.sin(performance.now() * 0.004);
      this.leftArm.rotation.z = Math.PI / 8 + cycle * 0.15;
      this.rightArm.rotation.z = -Math.PI / 8 - cycle * 0.15;
    } else if (this.state === "stagger") {
      this.leftArm.rotation.z = Math.PI / 3;
      this.rightArm.rotation.z = -Math.PI / 3;
    }

    // Dynamic mesh color warning flashes
    if (this.state === "windup" || this.state === "soundwave" || this.state === "storm") {
      const flash = Math.sin(performance.now() * 0.02) * 0.5 + 0.5;
      const col = new THREE.Color().lerpColors(new THREE.Color(0x222222), new THREE.Color(0xffffff), flash).getHex();
      this.setMeshColor(col);
    } else if (this.state === "stagger") {
      this.setMeshColor(0x333333);
    } else {
      this.setMeshColor(0x222222);
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
