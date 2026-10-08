/**
 * ForgottenPathBoss — The Final Calamity Boss (Chapter 5: The Forgotten Path).
 * Represents the player's past self, frozen at the moment of the Shattering.
 * Features 3 phases: Ink Silhouette, Shattering Reality (Void tears), and Forgotten Ascendant.
 */
import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { PlayerController } from "./PlayerController";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "../audio/AudioManager";

export class ForgottenPathBoss {
  mesh: THREE.Group;
  state: "intro" | "fight" | "fractures" | "ink_rain" | "devour_pull" | "stagger" | "dead" = "intro";
  private stunTimer: number = 0;
  health: number = 999;
  maxHealth: number = 999;
  private damage: number = 32;
  private speed: number = 4.2;

  private stateTimer: number = 0;
  private actionCooldown: number = 2.0;
  private centerPosition = new THREE.Vector3(0, 0.5, -25);

  // Phase tracking
  phase: 1 | 2 | 3 = 1;
  staggerPoise: number = 200;
  maxStaggerPoise: number = 200;
  private stance: "flow" | "iron" | "thunder" = "flow";
  private stanceTimer: number = 0;

  // Visual meshes
  private body!: THREE.Mesh;
  private head!: THREE.Mesh;
  private weapon!: THREE.Mesh;
  private orbOrbitals: THREE.Mesh[] = [];

  // Projectiles
  private activeProjectiles: { mesh: THREE.Mesh; dir: THREE.Vector3; speed: number; life: number }[] = [];
  private activeVoidTears: { mesh: THREE.Mesh; pos: THREE.Vector3; timer: number; radius: number; warned: boolean }[] = [];

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
    const scale = 2.5;

    // Silhouette Robe (Pure ink shadow)
    const bodyGeo = new THREE.CylinderGeometry(0.25 * scale, 0.4 * scale, 1.4 * scale, 4);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.7 * scale;
    this.mesh.add(this.body);

    // Faceless head
    const headGeo = new THREE.BoxGeometry(0.3 * scale, 0.3 * scale, 0.3 * scale);
    const headMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.5 * scale;
    this.mesh.add(this.head);

    // Floating Ink Sword
    const swordGeo = new THREE.BoxGeometry(0.08 * scale, 1.1 * scale, 0.08 * scale);
    const swordMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    this.weapon = new THREE.Mesh(swordGeo, swordMat);
    this.weapon.position.set(0.6 * scale, 0.8 * scale, 0);
    this.weapon.rotation.z = -0.3;
    this.mesh.add(this.weapon);

    // Floating void orbitals
    const orbGeo = new THREE.IcosahedronGeometry(0.15, 0);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    for (let i = 0; i < 4; i++) {
      const orb = new THREE.Mesh(orbGeo, orbMat);
      this.mesh.add(orb);
      this.orbOrbitals.push(orb);
    }

  }

  update(dt: number): void {
    if (this.state === "dead") return;

    // Slowly regenerate poise if not staggered
    if (this.state !== "stagger" && this.staggerPoise < this.maxStaggerPoise) {
      this.staggerPoise = Math.min(this.maxStaggerPoise, this.staggerPoise + dt * 15);
    }

    // Dynamic mesh color warning flashes
    if (this.state === "fractures" || this.state === "ink_rain" || this.state === "devour_pull") {
      const flash = Math.sin(performance.now() * 0.02) * 0.5 + 0.5;
      const col = new THREE.Color().lerpColors(new THREE.Color(0x111111), new THREE.Color(0xffffff), flash).getHex();
      this.setMeshColor(col);
    } else if (this.state === "stagger") {
      this.setMeshColor(0x333333);
    } else {
      this.setMeshColor(0x111111);
    }

    if (this.state === "stagger") {
      this.stunTimer -= dt;
      // Droop sword to the ground during stun
      this.weapon.rotation.z = -Math.PI / 4;
      if (this.stunTimer <= 0) {
        this.weapon.rotation.z = -0.3; // restore sword angle
        this.transitionTo("fight");
      }
      return;
    }

    this.stateTimer += dt;
    this.actionCooldown -= dt;
    this.stanceTimer += dt;

    const playerPos = this.playerGroup.position;
    const distToPlayer = this.mesh.position.distanceTo(playerPos);

    // 1. Stance swapping logic in Phase 1 & 2
    if (this.phase < 3 && this.stanceTimer > 6.0) {
      this.swapStance();
    }

    // 2. Rotate void orbitals
    this.orbOrbitals.forEach((orb, index) => {
      const angle = this.stateTimer * 2.0 + (index * Math.PI) / 2;
      const radius = 1.8 + Math.sin(this.stateTimer * 3.0 + index) * 0.3;
      orb.position.set(Math.cos(angle) * radius, 1.8 + Math.sin(angle) * 0.4, Math.sin(angle) * radius);
    });

    // 3. Update spatial tears/void zones & rain
    this.updateProjectiles(dt);
    this.updateVoidTears(dt);

    // 4. State Machine
    if (this.state === "intro") {
      if (this.stateTimer > 3.0) {
        this.state = "fight";
        this.actionCooldown = 1.0;
        useGameStore.getState().setActiveBoss({
          name: "The Forgotten Path",
          currentHP: this.health,
          maxHP: this.maxHealth,
        });
      }
      return;
    }

    if (this.state === "fight") {
      // Rotate body to face player
      const angleToPlayer = Math.atan2(playerPos.x - this.mesh.position.x, playerPos.z - this.mesh.position.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, angleToPlayer, 6.0 * dt);

      // Perform regular action based on range
      if (this.actionCooldown <= 0) {
        if (distToPlayer > 18) {
          // Dash close or spawn rain
          if (Math.random() > 0.4) {
            this.dashTowardsPlayer();
          } else {
            this.triggerInkRain();
          }
        } else if (distToPlayer < 6) {
          // Rapid combo slash or stance attack
          this.triggerMeleeCombo();
        } else {
          // Mid-range: Spawn Void Fractures or project void tears
          if (Math.random() > 0.5 && this.phase >= 2) {
            this.triggerVoidFractures();
          } else {
            this.shootVoidTear();
          }
        }
      } else {
        // Move towards player slowly if in fight
        const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
        dir.y = 0;
        dir.normalize();
        
        let moveSpeed = this.speed;
        if (this.stance === "iron") moveSpeed *= 0.6; // iron is slow but block heavy
        if (this.stance === "thunder") moveSpeed *= 1.4; // fast rush

        this.mesh.position.addScaledVector(dir, moveSpeed * dt);
      }
    } else if (this.state === "fractures") {
      if (this.stateTimer > 2.5) {
        this.state = "fight";
        this.actionCooldown = 1.5;
      }
    } else if (this.state === "ink_rain") {
      if (this.stateTimer > 3.5) {
        this.state = "fight";
        this.actionCooldown = 2.0;
      }
    } else if (this.state === "devour_pull") {
      // In Phase 3: Devour Pull drags the player towards the center
      const pullDir = new THREE.Vector3().subVectors(this.mesh.position, playerPos);
      pullDir.y = 0;
      const pullDist = pullDir.length();
      pullDir.normalize();

      if (pullDist > 1.5) {
        // Drag player 8.5 units per second. Player must run away (Stamina sprint)
        playerPos.addScaledVector(pullDir, 8.5 * dt);
        
        // Spawn drag particles
        this.particles.burst({
          position: playerPos,
          count: 3,
          speed: 6.0,
          life: 0.5,
          size: 0.1
        });
        
        if (this.stateTimer % 0.5 < dt) {
          // Deal ticks of damage if player is close
          if (pullDist < 4) {
            this.playerController.receiveHit(8, this.mesh.position);
            audioManager.playSFX("/audio/impact.ogg");
          }
        }
      }

      if (this.stateTimer > 4.5) {
        // Explode the vortex
        this.particles.burst({
          position: this.mesh.position,
          count: 30,
          speed: 4,
          life: 0.8,
          size: 0.18
        });
        if (pullDist < 6.5) {
          this.playerController.receiveHit(35, this.mesh.position);
          audioManager.playSFX("/audio/impact.ogg");
        }
        this.state = "fight";
        this.actionCooldown = 2.5;
      }
    }
  }

  private swapStance(): void {
    const stances: ("flow" | "iron" | "thunder")[] = ["flow", "iron", "thunder"];
    const prev = this.stance;
    do {
      this.stance = stances[Math.floor(Math.random() * stances.length)];
    } while (this.stance === prev);

    this.stanceTimer = 0;
    audioManager.playSFX("/audio/sword_deflect.ogg");

    // Spawn aura particles depending on stance
    this.particles.burst({
      position: new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 1.0, this.mesh.position.z),
      count: 15,
      speed: 3.5,
      life: 0.6,
      size: 0.15
    });
  }

  private dashTowardsPlayer(): void {
    const playerPos = this.playerGroup.position;
    const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
    dir.y = 0;
    dir.normalize();

    // Dash behind player
    const dashDest = new THREE.Vector3().copy(playerPos).addScaledVector(dir, -2.5);
    
    // Spark particles at current pos
    this.particles.burst({
      position: new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z),
      count: 12,
      speed: 3,
      life: 0.5,
      size: 0.12
    });
    
    // Teleport
    this.mesh.position.copy(dashDest);
    
    // Spark particles at dest pos
    this.particles.burst({
      position: new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z),
      count: 12,
      speed: 3,
      life: 0.5,
      size: 0.12
    });
    
    audioManager.playSFX("/audio/dodge.ogg");

    // Instantly trigger combo slash
    this.triggerMeleeCombo();
  }

  private triggerMeleeCombo(): void {
    this.state = "fight";
    this.actionCooldown = this.stance === "thunder" ? 0.8 : 1.6;

    // Sword swipe animation & hit check
    const swordAnim = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 0.4);
    this.weapon.quaternion.premultiply(swordAnim);
    setTimeout(() => {
      this.weapon.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.3);
    }, 200);

    const playerPos = this.playerGroup.position;
    const dist = this.mesh.position.distanceTo(playerPos);
    if (dist < 4.8) {
      const wasParried = this.playerController.receiveHit(this.damage, this.mesh.position);
      if (wasParried) {
        this.stunTimer = 1.2;
        this.transitionTo("stagger");
        return;
      }
      
      const isPlayerBlocking = this.playerController.state === "block";
      if (isPlayerBlocking) {
        audioManager.playSFX("/audio/sword_deflect.ogg");
        this.particles.burst({
          position: new THREE.Vector3(playerPos.x, playerPos.y + 0.5, playerPos.z),
          count: 5,
          speed: 3,
          life: 0.5,
          size: 0.1
        });
      } else {
        audioManager.playSFX("/audio/impact.ogg");
        this.particles.burst({
          position: playerPos,
          count: 12,
          speed: 3.5,
          life: 0.5,
          size: 0.12
        });
      }
    }
  }

  private shootVoidTear(): void {
    this.actionCooldown = 1.8;
    audioManager.playSFX("/audio/sword_slash.ogg");

    const playerPos = this.playerGroup.position;
    const spawnPos = new THREE.Vector3().copy(this.mesh.position).add(new THREE.Vector3(0, 2, 0));
    
    const dir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();

    // Create projectile mesh
    const projGeo = new THREE.BoxGeometry(0.3, 0.3, 0.9);
    const projMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const projMesh = new THREE.Mesh(projGeo, projMat);
    projMesh.position.copy(spawnPos);
    projMesh.lookAt(playerPos);
    this.scene.add(projMesh);

    this.activeProjectiles.push({
      mesh: projMesh,
      dir,
      speed: 16.0,
      life: 3.5,
    });
  }

  private triggerVoidFractures(): void {
    this.state = "fractures";
    this.stateTimer = 0;
    this.actionCooldown = 3.0;

    audioManager.playSFX("/audio/mines_ambient.ogg");

    // Spawn 3 void zone circles near player
    const playerPos = this.playerGroup.position;
    
    const offsets = [
      new THREE.Vector3(0, 0.02, 0), // center
      new THREE.Vector3((Math.random() - 0.5) * 8, 0.02, (Math.random() - 0.5) * 8),
      new THREE.Vector3((Math.random() - 0.5) * 8, 0.02, (Math.random() - 0.5) * 8),
    ];

    offsets.forEach((offset) => {
      const targetPos = new THREE.Vector3().copy(playerPos).add(offset);
      targetPos.y = 0.02; // flat flat

      // Red/Dark circle indicator mesh
      const circleGeo = new THREE.RingGeometry(0.1, 3.2, 12);
      const circleMat = new THREE.MeshBasicMaterial({ 
        color: 0x222222, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const circleMesh = new THREE.Mesh(circleGeo, circleMat);
      circleMesh.rotation.x = Math.PI / 2;
      circleMesh.position.copy(targetPos);
      this.scene.add(circleMesh);

      this.activeVoidTears.push({
        mesh: circleMesh,
        pos: targetPos,
        timer: 0,
        radius: 3.2,
        warned: false,
      });
    });
  }

  private triggerInkRain(): void {
    this.state = "ink_rain";
    this.stateTimer = 0;
    this.actionCooldown = 4.0;
    
    audioManager.playSFX("/audio/monastery_ambient.ogg");

    const playerPos = this.playerGroup.position;

    // Spawn falling ink tears from sky
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        if (this.state === "dead") return;
        
        // Spawn target offset
        const targetPos = new THREE.Vector3()
          .copy(playerPos)
          .add(new THREE.Vector3((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12));
        
        const skyPos = new THREE.Vector3().copy(targetPos).add(new THREE.Vector3(0, 16, 0));

        const rainGeo = new THREE.CylinderGeometry(0.01, 0.12, 1.2, 4);
        const rainMat = new THREE.MeshBasicMaterial({ color: 0x181818 });
        const rainMesh = new THREE.Mesh(rainGeo, rainMat);
        rainMesh.position.copy(skyPos);
        this.scene.add(rainMesh);

        this.activeProjectiles.push({
          mesh: rainMesh,
          dir: new THREE.Vector3(0, -1, 0),
          speed: 18.0,
          life: 2.0,
        });

        // Spawn splash warning circle on floor
        const splashGeo = new THREE.RingGeometry(0.1, 1.5, 8);
        const splashMat = new THREE.MeshBasicMaterial({ color: 0x0c0c0c, side: THREE.DoubleSide });
        const splashMesh = new THREE.Mesh(splashGeo, splashMat);
        splashMesh.rotation.x = Math.PI / 2;
        splashMesh.position.set(targetPos.x, 0.02, targetPos.z);
        this.scene.add(splashMesh);

        // Remove warning circle after 1.5s
        setTimeout(() => {
          this.scene.remove(splashMesh);
          splashGeo.dispose();
          splashMat.dispose();
        }, 1200);

      }, i * 350);
    }
  }

  private triggerDevourPull(): void {
    this.state = "devour_pull";
    this.stateTimer = 0;
    this.actionCooldown = 5.0;
    audioManager.playSFX("/audio/mines_ambient.ogg");

    this.particles.burst({
      position: this.mesh.position,
      count: 20,
      speed: 4,
      life: 0.7,
      size: 0.15
    });
  }

  private updateProjectiles(dt: number): void {
    const playerPos = this.playerGroup.position;

    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];
      p.mesh.position.addScaledVector(p.dir, p.speed * dt);
      p.life -= dt;

      const distToPlayer = p.mesh.position.distanceTo(playerPos);

      // Check hit player
      if (distToPlayer < 1.4) {
        this.playerController.receiveHit(15, this.mesh.position);
        audioManager.playSFX("/audio/impact.ogg");
        this.particles.burst({
          position: playerPos,
          count: 6,
          speed: 2.5,
          life: 0.4,
          size: 0.08
        });
        
        // Remove
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.activeProjectiles.splice(i, 1);
        continue;
      }

      // Check ground collide
      if (p.mesh.position.y <= 0.05 && p.dir.y < 0) {
        this.particles.burst({
          position: p.mesh.position,
          count: 4,
          speed: 2,
          life: 0.3,
          size: 0.08
        });
        p.life = 0;
      }

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.activeProjectiles.splice(i, 1);
      }
    }
  }

  private updateVoidTears(dt: number): void {
    const playerPos = this.playerGroup.position;

    for (let i = this.activeVoidTears.length - 1; i >= 0; i--) {
      const t = this.activeVoidTears[i];
      t.timer += dt;

      // Pulse color to warn
      if (t.timer > 1.2 && !t.warned) {
        t.warned = true;
        if (t.mesh.material instanceof THREE.MeshBasicMaterial) {
          t.mesh.material.color.setHex(0x550000); // dangerous red outline hint
          t.mesh.material.opacity = 0.8;
        }
      }

      // Explode at 2.0 seconds
      if (t.timer >= 2.0) {
        // Explode VFX
        this.particles.burst({
          position: t.pos,
          count: 15,
          speed: 4,
          life: 0.6,
          size: 0.15
        });
        audioManager.playSFX("/audio/impact.ogg");

        // Damage check
        const dist = playerPos.distanceTo(t.pos);
        if (dist <= t.radius) {
          this.playerController.receiveHit(this.damage * 1.2, this.mesh.position);
        }

        // Clean up
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        if (Array.isArray(t.mesh.material)) {
          t.mesh.material.forEach((m) => m.dispose());
        } else {
          t.mesh.material.dispose();
        }
        this.activeVoidTears.splice(i, 1);
      }
    }
  }

  takeDamage(amount: number): void {
    if (this.state === "dead" || this.state === "intro") return;

    // Stance damage modifiers
    let dmg = amount;
    if (this.stance === "iron") {
      dmg *= 0.45; // high shield defense
      audioManager.playSFX("/audio/sword_deflect.ogg");
    }

    this.health -= dmg;
    useGameStore.getState().updateBossHP(this.health);

    // Phase transitions
    if (this.phase === 1 && this.health <= 700) {
      this.phase = 2;
      this.speed = 4.8;
      this.damage = 38;
      audioManager.playSFX("/audio/monastery_ambient.ogg");
      this.particles.burst({
        position: new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 1.0, this.mesh.position.z),
        count: 25,
        speed: 4,
        life: 0.7,
        size: 0.16
      });
    } else if (this.phase === 2 && this.health <= 350) {
      this.phase = 3;
      this.speed = 5.5;
      this.damage = 45;
      this.triggerDevourPull();
    }

    // Poise damage & stagger break
    this.staggerPoise -= dmg;
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
      if (this.stance !== "iron") {
        audioManager.playSFX("stagger");
      }
      this.particles.burst({
        position: this.mesh.position,
        count: 10,
        speed: 3,
        life: 0.5,
        size: 0.12
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
    this.state = "dead";
    audioManager.playSFX("/audio/impact.ogg");
    useGameStore.getState().setActiveBoss(null);
    this.particles.burst({
      position: new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 1.0, this.mesh.position.z),
      count: 40,
      speed: 5,
      life: 1.0,
      size: 0.2
    });

    // Fade out body and weapon
    let opacity = 1.0;
    const fadeInterval = setInterval(() => {
      opacity -= 0.05;
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.transparent = true;
          child.material.opacity = opacity;
        }
      });

      if (opacity <= 0) {
        clearInterval(fadeInterval);
        this.scene.remove(this.mesh);
        this.dispose();

        // Trigger boss pacification choices via GameEngine dialogue triggers
        const store = useGameStore.getState();
        useGameStore.setState((s) => {
          s.world.defeatedBosses.push("forgotten_path");
        });

        // Trigger Dialogue Window choices to select one of the final endings
        store.triggerDialogue(
          "Mirror of Past Lives",
          "The Shadow of your past self is dissipated. The Heavenly Inkwell lies before you, cracked and leaking. The ink of this reality is almost completely dissolved. You hold the final fragment. How will you rewrite the ending of the Forgotten Path?",
          [
            { text: "Ascend as Tyrant (Revenge)", action: "ending_revenge" },
            { text: "Sacrifice Soul to Restore (Peace)", action: "ending_peace" },
            { text: "Rewrite Cultivation Laws (Truth)", action: "ending_truth" }
          ]
        );
      }
    }, 50);
  }

  dispose(): void {
    // Clear active projectiles & tears
    this.activeProjectiles.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      if (Array.isArray(p.mesh.material)) {
        p.mesh.material.forEach((m) => m.dispose());
      } else {
        p.mesh.material.dispose();
      }
    });
    this.activeProjectiles = [];

    this.activeVoidTears.forEach((t) => {
      this.scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      if (Array.isArray(t.mesh.material)) {
        t.mesh.material.forEach((m) => m.dispose());
      } else {
        t.mesh.material.dispose();
      }
    });
    this.activeVoidTears = [];

    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  private setMeshColor(hex: number): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && "color" in child.material) {
        (child.material as any).color.setHex(hex);
      }
    });
  }

  private transitionTo(nextState: typeof this.state): void {
    this.state = nextState;
    this.stateTimer = 0;
  }
}
