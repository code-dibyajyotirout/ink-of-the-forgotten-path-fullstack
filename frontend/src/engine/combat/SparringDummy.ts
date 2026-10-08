import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { audioManager } from "../audio/AudioManager";

export class SparringDummy {
  mesh: THREE.Group;
  state: "idle" | "hit" | "dead" = "idle";
  health: number = 9999;
  maxHealth: number = 9999;
  
  // Training stats tracking
  private totalDamageTaken: number = 0;
  private comboHits: number = 0;
  private hitTimer: number = 0;
  private wobbleAngle: number = 0;
  private wobbleSpeed: number = 0;

  // Meshes for visual representation
  private torsoMesh!: THREE.Mesh;
  private armLeftMesh!: THREE.Mesh;
  private armRightMesh!: THREE.Mesh;
  private headMesh!: THREE.Mesh;

  constructor(
    public id: string,
    public position: THREE.Vector3,
    private scene: THREE.Scene,
    private particles: InkParticleSystem
  ) {
    this.mesh = new THREE.Group();
    this.buildDummyMesh();
    this.mesh.position.copy(position);
    this.scene.add(this.mesh);
  }

  private buildDummyMesh(): void {
    // ── Base pedestal ──
    const baseGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.3, 12);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b, flatShading: true });
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true });
    const base = new THREE.Mesh(baseGeo, ironMat);
    base.position.y = 0.15;
    this.mesh.add(base);

    // ── Main Wooden Post (Torso) ──
    const torsoGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.8, 10);
    this.torsoMesh = new THREE.Mesh(torsoGeo, woodMat);
    this.torsoMesh.position.y = 1.2;
    this.mesh.add(this.torsoMesh);

    // Iron reinforcement rings
    const ringGeo = new THREE.TorusGeometry(0.38, 0.04, 6, 12);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(ringGeo, ironMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.6 + i * 0.5;
      this.mesh.add(ring);
    }

    // ── Dummy Wooden Arms ──
    const armGeo = new THREE.BoxGeometry(0.18, 0.18, 1.2);
    this.armLeftMesh = new THREE.Mesh(armGeo, woodMat);
    this.armLeftMesh.position.set(0, 1.4, 0.2);
    this.armLeftMesh.rotation.y = Math.PI / 6;
    this.mesh.add(this.armLeftMesh);

    this.armRightMesh = new THREE.Mesh(armGeo, woodMat);
    this.armRightMesh.position.set(0, 1.1, -0.2);
    this.armRightMesh.rotation.y = -Math.PI / 5;
    this.mesh.add(this.armRightMesh);

    // ── Dummy Head with Calligraphy "練" (Train) ──
    const headGeo = new THREE.BoxGeometry(0.45, 0.5, 0.45);
    this.headMesh = new THREE.Mesh(headGeo, woodMat);
    this.headMesh.position.y = 2.3;
    this.mesh.add(this.headMesh);

    // Decorative top ribbon / talisman
    const ribbonGeo = new THREE.PlaneGeometry(0.2, 0.6);
    const ribbonMat = new THREE.MeshLambertMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
    });
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    // Decorative martial crest branded onto dummy
    const crestGeo = new THREE.CircleGeometry(0.16, 5);
    const crestMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide });
    const crest = new THREE.Mesh(crestGeo, crestMat);
    crest.position.set(0, 1.5, 0.37);
    this.mesh.add(crest);
  }

  takeDamage(damage: number): void {
    this.totalDamageTaken += damage;
    this.comboHits++;
    this.hitTimer = 2.0; // combo window
    this.wobbleSpeed = Math.min(25, damage * 0.8);
    this.wobbleAngle = (Math.random() - 0.5) * 0.4;

    // Wood sparks & blooming plum blossom petals
    const hitPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    this.particles.burst({
      position: hitPos,
      count: 12,
      speed: 5,
      life: 0.35,
      size: 0.2,
      color: new THREE.Color(0xd97706),
    });
    this.particles.burst({
      position: hitPos,
      count: 8,
      speed: 3.5,
      life: 0.5,
      size: 0.25,
      color: new THREE.Color(0xf43f5e), // Pink plum petals!
    });

    audioManager.playSFX("attack");
  }

  takeHit(damage: number, attackerPos?: THREE.Vector3): void {
    this.takeDamage(damage);
  }

  update(dt: number): void {
    // Wobble decay physics
    if (Math.abs(this.wobbleAngle) > 0.001 || Math.abs(this.wobbleSpeed) > 0.001) {
      this.torsoMesh.rotation.z = Math.sin(performance.now() * 0.02) * this.wobbleAngle;
      this.headMesh.rotation.z = Math.sin(performance.now() * 0.02) * this.wobbleAngle * 1.4;
      this.wobbleAngle *= Math.pow(0.1, dt);
      this.wobbleSpeed *= Math.pow(0.1, dt);
    } else {
      this.torsoMesh.rotation.z = 0;
      this.headMesh.rotation.z = 0;
    }

    // Reset combo counter after idle timeout
    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) {
        this.comboHits = 0;
      }
    }
  }

  getTrainingStats(): { totalDamage: number; combo: number } {
    return {
      totalDamage: Math.round(this.totalDamageTaken),
      combo: this.comboHits,
    };
  }

  dispose(): void {
    this.scene.remove(this.mesh);
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
}
