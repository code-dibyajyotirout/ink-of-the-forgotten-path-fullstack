import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { PlayerController } from "./PlayerController";
import { useGameStore } from "@/stores/gameStore";
import { MythicEnemyModel, MythicEnemyParts } from "../rendering/MythicEnemyModel";

export type EnemyType = "grunt" | "elite" | "boss";
export type EnemyState = "idle" | "patrol" | "chase" | "windup" | "attack" | "stagger" | "dead";

export interface EnemyDef {
  id: string;
  type: EnemyType;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  patrolPoints: THREE.Vector3[];
}

const _scratchChaseDir = new THREE.Vector3();
const _scratchFacing = new THREE.Vector3();
const _scratchLookDir = new THREE.Vector3();

export class EnemyAI {
  mesh: THREE.Group;
  state: EnemyState = "patrol";
  private health: number;
  private stateTimer: number = 0;
  private patrolIndex: number = 0;
  private chaseRange: number = 12.0;
  private attackRange: number = 2.2;
  private nextActionTimer: number = 0;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  speedModifier: number = 1.0;
  private stunTimer: number = 0;
  private hasHitInCurrentAttack: boolean = false;

  // Sculpted Mythic Enemy Parts
  public parts!: MythicEnemyParts;
  public canBeExecuted: boolean = false;
  public stunMeter: number = 0;
  public readonly maxStunMeter: number = 100;
  public frozenTimer: number = 0;
  public burnTimer: number = 0;
  public bleedTimer: number = 0;
  public bleedDps: number = 18;
  private bleedTickTimer: number = 0;

  // God of War: Hit Reaction Physics
  private knockbackVelocity: THREE.Vector3 = new THREE.Vector3();
  private hitFlinchTimer: number = 0;
  private hitFlinchDirection: THREE.Vector3 = new THREE.Vector3();
  private stunFlashTimer: number = 0;

  // Limb meshes for animations
  private leftLeg!: THREE.Mesh;
  private rightLeg!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  private hpBarBg!: THREE.Mesh;
  private hpBarFill!: THREE.Mesh;
  private stunBarBg!: THREE.Mesh;
  private stunBarFill!: THREE.Mesh;
  private baseColor: number = 0x666666;

  constructor(
    public def: EnemyDef,
    protected scene: THREE.Scene,
    protected particles: InkParticleSystem,
    protected playerGroup: THREE.Group,
    protected playerController: PlayerController
  ) {
    this.health = def.health;
    this.mesh = new THREE.Group();
    this.buildMesh();
    this.mesh.position.copy(def.position);
    this.scene.add(this.mesh);

    this.attackRange = def.type === "boss" ? 4.5 : def.type === "elite" ? 2.5 : 2.0;
    this.chaseRange = def.type === "boss" ? 30.0 : def.type === "elite" ? 12.0 : 7.5;
  }

  /**
   * Build a sculpted high-fidelity mythic enemy mesh with GoW Ragnarök two-tier bar.
   */
  private buildMesh(): void {
    const isBoss = this.def.type === "boss";
    const isElite = this.def.type === "elite";
    const scale = isBoss ? 2.3 : isElite ? 1.35 : 1.0;

    this.parts = MythicEnemyModel.build(this.def.type);
    this.mesh.add(this.parts.group);

    this.leftArm = this.parts.leftArmMesh as any;
    this.rightArm = this.parts.rightArmMesh as any;
    this.leftLeg = this.parts.leftLegMesh as any;
    this.rightLeg = this.parts.rightLegMesh as any;

    // ── Ragnarök Two-Tier Floating Bar (Upper: Red HP, Lower: Silver Stun) ──
    const barWidth = 1.0 * scale;
    const hpBarHeight = 0.08 * scale;
    const stunBarHeight = 0.05 * scale;
    const barY = 2.85 * scale;

    // 1. HP Bar Background & Fill
    const bgGeo = new THREE.PlaneGeometry(barWidth, hpBarHeight);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x111827,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });
    this.hpBarBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBarBg.position.set(0, barY, 0);
    this.mesh.add(this.hpBarBg);

    const fillGeo = new THREE.PlaneGeometry(barWidth, hpBarHeight);
    fillGeo.translate(barWidth / 2, 0, 0);
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626, // Crimson HP
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });
    this.hpBarFill = new THREE.Mesh(fillGeo, fillMat);
    this.hpBarFill.position.set(-barWidth / 2, barY, 0.005);
    this.mesh.add(this.hpBarFill);

    // 2. Ragnarök Stun Bar Background & Silver Fill
    const stunBgGeo = new THREE.PlaneGeometry(barWidth, stunBarHeight);
    const stunBgMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });
    this.stunBarBg = new THREE.Mesh(stunBgGeo, stunBgMat);
    this.stunBarBg.position.set(0, barY - hpBarHeight - 0.02 * scale, 0);
    this.mesh.add(this.stunBarBg);

    const stunFillGeo = new THREE.PlaneGeometry(barWidth, stunBarHeight);
    stunFillGeo.translate(barWidth / 2, 0, 0);
    const stunFillMat = new THREE.MeshBasicMaterial({
      color: 0xf1f5f9, // Gleaming Silver / White Stun
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });
    this.stunBarFill = new THREE.Mesh(stunFillGeo, stunFillMat);
    this.stunBarFill.scale.x = 0.001; // starts empty
    this.stunBarFill.position.set(-barWidth / 2, barY - hpBarHeight - 0.02 * scale, 0.005);
    this.mesh.add(this.stunBarFill);
  }

  /**
   * Main AI update cycle. Runs state transitions, simple pathing, and attack execution.
   */
  update(dt: number, camera?: THREE.Camera): void {
    if (this.state === "dead") return;

    // Reset speed modifier each frame (slow zones re-apply it during their update)
    this.speedModifier = 1.0;

    // ── Elemental Frost / Freeze Processing ──
    if (this.frozenTimer > 0) {
      this.frozenTimer -= dt;
      // Frozen in solid ice! Emit sub-zero mist and immobilize completely
      if (Math.random() < 0.25) {
        this.particles.burst({
          position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)),
          count: 3,
          speed: 1.2,
          life: 0.4,
          size: 0.2,
          color: new THREE.Color(0x38bdf8),
        });
      }
      this.setMeshColor(0x0284c7);
      if (camera) {
        if (this.hpBarBg && this.hpBarFill) {
          this.hpBarBg.quaternion.copy(camera.quaternion);
          this.hpBarFill.quaternion.copy(camera.quaternion);
        }
        if (this.stunBarBg && this.stunBarFill) {
          this.stunBarBg.quaternion.copy(camera.quaternion);
          this.stunBarFill.quaternion.copy(camera.quaternion);
        }
      }
      return; // Skip action while frozen
    }

    // ── Elemental Burn Processing ──
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      // Ticking immolation burn damage
      this.health = Math.max(0, this.health - 12 * dt);
      if (this.hpBarFill) {
        this.hpBarFill.scale.x = Math.max(0.001, this.health / this.def.health);
      }
      if (Math.random() < 0.3) {
        this.particles.burst({
          position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
          count: 4,
          speed: 2.0,
          life: 0.35,
          size: 0.22,
          color: new THREE.Color(0xf97316),
        });
      }
      if (this.health <= 0) {
        this.die();
        return;
      }
    }

    // ── Arterial Bleed Processing (Sky Aura Slash) ──
    if (this.bleedTimer > 0) {
      this.bleedTimer -= dt;
      this.bleedTickTimer -= dt;
      if (this.bleedTickTimer <= 0) {
        this.bleedTickTimer = 0.5;
        this.health = Math.max(0, this.health - this.bleedDps);
        if (this.hpBarFill) {
          this.hpBarFill.scale.x = Math.max(0.001, this.health / this.def.health);
        }
        // Dripping crimson arterial blood droplets
        this.particles.burst({
          position: this.mesh.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            1.1 + Math.random() * 0.4,
            (Math.random() - 0.5) * 0.4
          )),
          count: 5,
          speed: 1.2,
          life: 0.45,
          size: 0.22,
          color: new THREE.Color(0xb91c1c),
        });
        if (this.health <= 0) {
          this.die();
          return;
        }
      }
    }

    // Camera billboarding for health and stun bars
    if (camera) {
      if (this.hpBarBg && this.hpBarFill) {
        this.hpBarBg.quaternion.copy(camera.quaternion);
        this.hpBarFill.quaternion.copy(camera.quaternion);
      }
      if (this.stunBarBg && this.stunBarFill) {
        this.stunBarBg.quaternion.copy(camera.quaternion);
        this.stunBarFill.quaternion.copy(camera.quaternion);
      }
      if (this.parts && this.parts.executionRune && this.parts.executionRune.visible) {
        this.parts.executionRune.quaternion.copy(camera.quaternion);
        this.parts.executionRune.rotation.z += 2.5 * dt;
        const pulse = 1.0 + Math.sin(performance.now() * 0.009) * 0.2;
        this.parts.executionRune.scale.set(pulse, pulse, pulse);
      }
    }

    // Stun recovery / meter decay
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.mesh.position.y = 0;
      this.animateProcedurally();
      return;
    } else if (this.stunMeter > 0 && this.stateTimer > 4.0) {
      // Passive stun meter decay when unmolested
      this.stunMeter = Math.max(0, this.stunMeter - 10 * dt);
      if (this.stunBarFill) {
        this.stunBarFill.scale.x = Math.max(0.001, this.stunMeter / this.maxStunMeter);
      }
    }

    this.stateTimer += dt;
    this.nextActionTimer -= dt;

    const playerPos = this.playerGroup.position;
    const distToPlayer = this.mesh.position.distanceTo(playerPos);

    // Check player status
    const isPlayerDead = useGameStore.getState().player.health.current <= 0;

    // Target HUD info is centrally updated in GameEngine with delta-change detection to avoid React re-render thrashing

    switch (this.state) {
      case "patrol":
        if (isPlayerDead) {
          this.patrolBehavior(dt);
          break;
        }

        // Spot player check
        if (distToPlayer <= this.chaseRange) {
          this.transitionTo("chase");
          break;
        }
        this.patrolBehavior(dt);
        break;

      case "chase":
        if (isPlayerDead || distToPlayer > this.chaseRange * 1.5) {
          this.transitionTo("patrol");
          break;
        }

        // Look at player
        this.lookAt(playerPos, dt);

        // Within attack range?
        if (distToPlayer <= this.attackRange) {
          if (this.nextActionTimer <= 0) {
            this.transitionTo("windup");
          }
        } else {
          // Walk toward player (zero GC)
          _scratchChaseDir.subVectors(playerPos, this.mesh.position).normalize();
          this.mesh.position.addScaledVector(_scratchChaseDir, this.def.speed * this.speedModifier * dt);
        }
        break;

      case "windup":
        this.lookAt(playerPos, dt);
        // Alert flashes (spawn small tell particles)
        if (Math.random() < 0.15) {
          this.particles.burst({
            position: this.mesh.position.clone().add(new THREE.Vector3(0, this.def.type === "boss" ? 4.5 : 2.2, 0)),
            count: 3,
            speed: 1.5,
            life: 0.45,
            size: 0.28,
            color: new THREE.Color(0xff3333),
          });
        }

        const windupDuration = this.def.type === "boss" ? 1.0 : this.def.type === "elite" ? 0.7 : 0.5;
        if (this.stateTimer >= windupDuration) {
          this.transitionTo("attack");
        }
        break;

      case "attack":
        // Execution step — extended window for the lunge to actually connect
        if (this.stateTimer <= 0.25) {
          // Lunge forward (zero GC)
          _scratchFacing.set(
            -Math.sin(this.mesh.rotation.y),
            0,
            -Math.cos(this.mesh.rotation.y)
          );
          
          if (this.stateTimer - dt <= 0) {
            // First frame of attack execution: spawn visual slash!
            this.particles.burst({
              position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
              count: 15,
              speed: 14,
              life: 0.35,
              size: 0.35,
              direction: _scratchFacing,
              spread: 0.2, // Narrow forward cone like a slash
              color: new THREE.Color(0xff3333),
            });
          }

          this.mesh.position.addScaledVector(_scratchFacing, 6 * dt);

          // Use horizontal distance for hit check (zero GC)
          const horizontalDist = Math.hypot(
            this.mesh.position.x - this.playerGroup.position.x,
            this.mesh.position.z - this.playerGroup.position.z
          );

          // Lunge collision window
          if (!this.hasHitInCurrentAttack && horizontalDist <= this.attackRange * 1.2) {
            this.hasHitInCurrentAttack = true;
            // Deliver hit to player controller
            const wasParried = this.playerController.receiveHit(this.def.damage, this.mesh.position);
            
            // If the player perfectly parried this attack, the enemy receives massive Stun!
            if (wasParried) {
              this.takeStun(60);
              this.stunFor(1.8);
              return;
            }
          }
        }

        const recoveryDuration = this.def.type === "boss" ? 0.8 : this.def.type === "elite" ? 0.5 : 0.4;
        if (this.stateTimer >= recoveryDuration) {
          this.nextActionTimer = this.def.type === "boss" ? 1.5 : this.def.type === "elite" ? 0.8 : 1.2;
          this.transitionTo("chase");
        }
        break;

      case "stagger":
        // Apply knockback velocity (decays over time)
        if (this.knockbackVelocity.lengthSq() > 0.01) {
          this.mesh.position.addScaledVector(this.knockbackVelocity, dt);
          this.knockbackVelocity.multiplyScalar(Math.max(0, 1 - 8.0 * dt)); // Decay friction
        }

        // Hit-flinch body rotation — the body lurches in the hit direction
        if (this.hitFlinchTimer > 0) {
          this.hitFlinchTimer -= dt;
          const flinchAmount = Math.min(1, this.hitFlinchTimer / 0.15) * 0.4;
          if (this.parts && this.parts.group) {
            this.parts.group.rotation.x = this.hitFlinchDirection.z * flinchAmount;
            this.parts.group.rotation.z = -this.hitFlinchDirection.x * flinchAmount;
          }
        } else if (this.parts && this.parts.group) {
          // Restore body orientation
          this.parts.group.rotation.x *= 0.85;
          this.parts.group.rotation.z *= 0.85;
        }

        if (this.stateTimer >= 0.35) {
          this.transitionTo("chase");
        }
        break;
    }

    // Keep within world bounds and on ground
    const mapLimit = 11500;
    this.mesh.position.x = Math.max(-mapLimit, Math.min(mapLimit, this.mesh.position.x));
    this.mesh.position.z = Math.max(-mapLimit, Math.min(mapLimit, this.mesh.position.z));
    this.mesh.position.y = 0;

    // Run procedural limb animation
    this.animateProcedurally();
  }

  /**
   * Simple patrol between points.
   */
  private patrolBehavior(dt: number): void {
    if (this.def.patrolPoints.length === 0) return;

    const target = this.def.patrolPoints[this.patrolIndex];
    const dist = this.mesh.position.distanceTo(target);

    if (dist < 0.5) {
      this.patrolIndex = (this.patrolIndex + 1) % this.def.patrolPoints.length;
    } else {
      this.lookAt(target, dt);
      _scratchChaseDir.subVectors(target, this.mesh.position).normalize();
      this.mesh.position.addScaledVector(_scratchChaseDir, this.def.speed * 0.5 * this.speedModifier * dt);
    }
  }

  /**
   * Rotate enemy to look at a target position.
   */
  private lookAt(target: THREE.Vector3, dt: number): void {
    _scratchLookDir.subVectors(target, this.mesh.position);
    const targetAngle = Math.atan2(_scratchLookDir.x, _scratchLookDir.z);
    
    let diff = targetAngle - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    this.mesh.rotation.y += diff * Math.min(1, 8 * dt);
  }

  /**
   * Clean transition helper.
   */
  transitionTo(nextState: EnemyState): void {
    this.state = nextState;
    this.stateTimer = 0;
    if (nextState === "attack") {
      this.hasHitInCurrentAttack = false;
    }
  }

  /**
   * Deal damage to this enemy.
   */
  /**
   * Deal damage to this enemy.
   */
  takeDamage(amount: number, knockbackDir?: THREE.Vector3, knockbackForce?: number): void {
    if (this.state === "dead") return;

    this.health = Math.max(0, this.health - amount);
    if (this.hpBarFill) {
      this.hpBarFill.scale.x = Math.max(0.001, this.health / this.def.health);
    }
    this.transitionTo("stagger");

    // God of War: Knockback physics — enemies get PUSHED by hits
    if (knockbackDir && knockbackForce) {
      this.knockbackVelocity.copy(knockbackDir).multiplyScalar(knockbackForce * 3.5);
      // Hit-flinch: body lurches in the hit direction
      this.hitFlinchDirection.copy(knockbackDir);
      this.hitFlinchTimer = 0.2;
    }

    // All damage generates proportional Ragnarök Stun
    this.takeStun(amount * 0.45);

    // God of War Execution trigger: when health drops below 40%, show execution rune
    if (this.health <= this.def.maxHealth * 0.4 && this.health > 0) {
      this.canBeExecuted = true;
      if (this.parts && this.parts.executionRune) {
        this.parts.executionRune.visible = true;
      }
    }

    // Splash particles — more intense with knockback
    this.particles.burst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)),
      count: knockbackForce && knockbackForce > 2 ? 25 : 14,
      speed: knockbackForce && knockbackForce > 2 ? 7 : 4.5,
      life: 0.5,
      size: knockbackForce && knockbackForce > 2 ? 0.3 : 0.2,
      color: new THREE.Color(0x991b1b),
      direction: knockbackDir,
      spread: 0.5,
    });

    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * Alias / wrapper for takeDamage with optional attacker position for backward compatibility
   */
  takeHit(damage: number, attackerPos?: THREE.Vector3): void {
    const kbDir = attackerPos ? new THREE.Vector3().subVectors(this.mesh.position, attackerPos).normalize() : undefined;
    this.takeDamage(damage, kbDir, 3.5);
  }

  /**
   * Deal Stun buildup to this enemy (Ragnarök Stun Meter).
   * Heavy axe cleaves, shield parries, shield bashes, and bare-handed hits inflict high stun.
   */
  takeStun(amount: number): void {
    if (this.state === "dead") return;

    this.stunMeter = Math.min(this.maxStunMeter, this.stunMeter + amount);
    if (this.stunBarFill) {
      this.stunBarFill.scale.x = Math.max(0.001, Math.min(1.0, this.stunMeter / this.maxStunMeter));
      // Stun bar flash pulse on stun application
      this.stunFlashTimer = 0.15;
    }

    // Ragnarök 100% Stun Break! Enemy falls to knees dazed & vulnerable to R3 Glory Kill
    if (this.stunMeter >= this.maxStunMeter) {
      this.stunMeter = this.maxStunMeter;
      this.canBeExecuted = true;
      this.stunTimer = 5.0; // 5 seconds groggy kneel
      this.transitionTo("stagger");
      this.knockbackVelocity.set(0, 0, 0); // Stop movement during stun break

      if (this.parts && this.parts.executionRune) {
        this.parts.executionRune.visible = true;
      }

      // Golden Stun Break Shockwave
      this.particles.burst({
        position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
        count: 45,
        speed: 8,
        life: 0.8,
        size: 0.4,
        color: new THREE.Color(0xfef08a), // bright gold stun shatter
      });

      const store = useGameStore.getState();
      store.setBattleBanner("STUN BREAK! PRESS [G] FOR EXECUTION", 2.2);
    }
  }

  /**
   * Infuse target with sub-zero freezing frost (Leviathan Axe Frost Awaken).
   */
  applyFrost(duration: number): void {
    if (this.state === "dead") return;
    this.frozenTimer = Math.max(this.frozenTimer, duration);
    this.takeStun(25); // Freezing deals significant Stun
  }

  /**
   * Infuse target with burning Greek fire (Blades of Chaos Flame Whiplash).
   */
  applyBurn(duration: number): void {
    if (this.state === "dead") return;
    this.burnTimer = Math.max(this.burnTimer, duration);
    this.takeStun(15);
  }

  /**
   * Infuse target with arterial bleed from sky aura slash.
   */
  applyBleed(duration: number, dps: number = 18): void {
    if (this.state === "dead") return;
    this.bleedTimer = Math.max(this.bleedTimer, duration);
    this.bleedDps = Math.max(this.bleedDps, dps);
    this.takeStun(15);
  }

  /**
   * Visceral God of War / Black Myth execution death
   */
  public playExecutionDeath(): void {
    this.transitionTo("dead");
    this.canBeExecuted = false;
    if (this.parts && this.parts.executionRune) this.parts.executionRune.visible = false;
    if (this.hpBarBg) this.hpBarBg.visible = false;
    if (this.hpBarFill) this.hpBarFill.visible = false;
    if (this.stunBarBg) this.stunBarBg.visible = false;
    if (this.stunBarFill) this.stunBarFill.visible = false;

    // Massive blood-ink explosion
    this.particles.burst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      count: 65,
      speed: 8.5,
      life: 1.2,
      size: 0.38,
      color: new THREE.Color(0xdc2626),
    });
    this.particles.burst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
      count: 40,
      speed: 5.5,
      life: 0.9,
      size: 0.28,
      color: new THREE.Color(0x18181b),
    });

    // Brutal collapse
    this.mesh.rotation.x = Math.PI * 0.45;
    this.mesh.position.y = 0.05;

    // Grant massive reward
    const reward = this.def.type === "boss" ? 2000 : this.def.type === "elite" ? 300 : 75;
    useGameStore.setState((s) => {
      s.player.qiEssence += reward;
    });

    setTimeout(() => {
      this.scene.remove(this.mesh);
    }, 3000);
  }

  private die(): void {
    this.transitionTo("dead");
    this.canBeExecuted = false;
    if (this.parts && this.parts.executionRune) this.parts.executionRune.visible = false;
    if (this.hpBarBg) this.hpBarBg.visible = false;
    if (this.hpBarFill) this.hpBarFill.visible = false;
    if (this.stunBarBg) this.stunBarBg.visible = false;
    if (this.stunBarFill) this.stunBarFill.visible = false;
    
    // Death collapse animation (for ground units)
    if (!(this as any).isFlying) {
      this.mesh.rotation.z = Math.PI / 2;
      this.mesh.position.y = 0.1;
    }

    // Grant player Qi Essence
    const reward = this.def.type === "boss" ? 1000 : this.def.type === "elite" ? 150 : 25;
    useGameStore.setState((s) => {
      s.player.qiEssence += reward;
    });

    // Spawn massive death ink explosion
    this.particles.burst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
      count: 25,
      speed: 3,
      life: 0.8,
      size: 0.22,
    });

    // Queue clean removal from scene
    setTimeout(() => {
      this.scene.remove(this.mesh);
    }, 5000);
  }

  stunFor(duration: number): void {
    if (this.state === "dead") return;
    this.stunTimer = duration;
    this.transitionTo("stagger");
  }

  /**
   * Procedural arm/leg rotations based on states.
   */
  private animateProcedurally(): void {
    const isMoving = this.state === "patrol" || this.state === "chase";

    if (this.leftLeg && this.rightLeg && this.leftArm && this.rightArm) {
      if (isMoving) {
        const cycle = Math.sin(performance.now() * 0.008);
        this.leftLeg.rotation.x = cycle * 0.6;
        this.rightLeg.rotation.x = -cycle * 0.6;
        this.leftArm.rotation.x = -cycle * 0.4;
        this.rightArm.rotation.x = cycle * 0.4;
      } else {
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
      }

      if (this.state === "windup") {
        // Raise arms slowly
        this.rightArm.rotation.x = -Math.PI * 0.6;
        this.leftArm.rotation.x = -Math.PI * 0.4;
      } else if (this.state === "attack") {
        // Strike arms forwards
        this.rightArm.rotation.x = Math.PI / 2;
        this.leftArm.rotation.x = Math.PI / 3;
      } else if (this.state === "stagger") {
        this.rightArm.rotation.x = -Math.PI / 4;
        this.leftArm.rotation.x = -Math.PI / 4;
      }
    }

    // Dynamic mesh color flashing based on state
    if (this.state === "windup") {
      const flash = Math.sin(performance.now() * 0.02) * 0.5 + 0.5;
      const col = new THREE.Color().lerpColors(new THREE.Color(this.baseColor), new THREE.Color(0xffffff), flash).getHex();
      this.setMeshColor(col);
    } else if (this.state === "attack") {
      this.setMeshColor(0xffffff);
    } else if (this.state === "stagger") {
      this.setMeshColor(0x333333);
    } else {
      this.setMeshColor(this.baseColor);
    }
  }

  private setMeshColor(hex: number): void {
    this.mesh.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material &&
        "color" in child.material &&
        child !== this.parts?.eyeMesh &&
        child.parent !== this.parts?.executionRune &&
        child !== this.hpBarBg &&
        child !== this.hpBarFill
      ) {
        (child.material as any).color.setHex(hex);
      }
    });
  }

  getHealth(): number {
    return this.health;
  }
}
