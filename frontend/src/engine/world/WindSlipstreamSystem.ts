import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { audioManager } from "../audio/AudioManager";

export interface BoostRing {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  mesh: THREE.Group;
  radius: number;
  lastHitTime: number;
}

export interface WindStreamPath {
  curve: THREE.CatmullRomCurve3;
  mesh: THREE.Mesh;
  points: THREE.Vector3[];
}

/**
 * WindSlipstreamSystem
 * Creates aerodynamic canyon wind currents and luminous aerial boost rings
 * matching Reference Video 1 (Frame 4) and Reference Video 2 (Frame 4).
 * Passing through boosts gliding and dragon flight velocity up to 45+ m/s!
 */
export class WindSlipstreamSystem {
  private boostRings: BoostRing[] = [];
  private windStreams: WindStreamPath[] = [];
  private group: THREE.Group;

  constructor(private scene: THREE.Scene, private particles: InkParticleSystem) {
    this.group = new THREE.Group();
    this.group.name = "WindSlipstreamSystem";
    this.scene.add(this.group);

    this.initWindSlipstreams();
    this.initAerialBoostRings();
  }

  /**
   * Initialize long flowing wind current ribbons through the mountain chasms.
   */
  private initWindSlipstreams(): void {
    // Canyon Flight Stream 1: Weaving through the Western Chasm Bridge towards the Karst Spire
    const stream1Pts = [
      new THREE.Vector3(-38, 8, 14),
      new THREE.Vector3(-52, 14, 22),
      new THREE.Vector3(-66, 22, 24),
      new THREE.Vector3(-72, 30, 42),
      new THREE.Vector3(-68, 38, 62),
    ];

    // Canyon Flight Stream 2: Grand Dive Stream from High Karst Spire down into Blossom Valley
    const stream2Pts = [
      new THREE.Vector3(-65, 36, 56),
      new THREE.Vector3(-45, 24, 65),
      new THREE.Vector3(-15, 16, 74),
      new THREE.Vector3(25, 12, 60),
      new THREE.Vector3(55, 18, 50),
    ];

    // Stream 3: High Sky Loop around Pagoda Spire
    const stream3Pts = [
      new THREE.Vector3(25, 28, -15),
      new THREE.Vector3(44, 32, -26),
      new THREE.Vector3(58, 28, -40),
      new THREE.Vector3(38, 22, -55),
      new THREE.Vector3(0, 18, -45),
    ];

    const streams = [stream1Pts, stream2Pts, stream3Pts];

    const streamMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd, // Luminous pale cyan wind mist
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    streams.forEach((pts) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.45, 8, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, streamMat);
      this.group.add(tubeMesh);

      this.windStreams.push({
        curve,
        mesh: tubeMesh,
        points: pts,
      });
    });
  }

  /**
   * Aerial boost system (visual neon speed rings removed per user request for pure aesthetic sky & sunset view).
   */
  private initAerialBoostRings(): void {
    this.boostRings = [];
  }

  /**
   * Check if player or dragon enters a slipstream or hits a boost ring.
   * Returns forward boost vector and fov acceleration effect if triggered.
   */
  public update(
    dt: number,
    entityPos: THREE.Vector3,
    isAirborne: boolean
  ): { boosted: boolean; boostForce: THREE.Vector3 | null; inSlipstream: boolean } {
    let boosted = false;
    let boostForce: THREE.Vector3 | null = null;
    let inSlipstream = false;

    const now = performance.now() * 0.001;

    // Animate subtle pulsing rotation on boost rings
    for (const ring of this.boostRings) {
      ring.mesh.rotation.z += dt * 0.8;

      // Check distance if airborne
      if (isAirborne) {
        const dist = entityPos.distanceTo(ring.position);
        if (dist <= ring.radius && now - ring.lastHitTime > 2.0) {
          ring.lastHitTime = now;
          boosted = true;

          // Forward direction through ring plane
          const forward = new THREE.Vector3(0, 0, -1).applyEuler(ring.rotation).normalize();
          boostForce = forward.multiplyScalar(28.0); // 28 m/s speed burst!

          // Audio & visual burst
          audioManager.playSFX("dodge");
          this.particles.emitBurst({
            position: ring.position.clone(),
            count: 32,
            speed: 12,
            life: 0.6,
            size: 0.35,
            color: new THREE.Color(0x38bdf8),
          });
        }
      }
    }

    // Check wind slipstream proximity (within 3.5m of stream spline)
    if (isAirborne) {
      for (const stream of this.windStreams) {
        for (let i = 0; i < stream.points.length - 1; i++) {
          const p0 = stream.points[i];
          const p1 = stream.points[i + 1];
          const mid = new THREE.Vector3().lerpVectors(p0, p1, 0.5);
          if (entityPos.distanceTo(mid) < 8.0) {
            inSlipstream = true;
            const streamDir = new THREE.Vector3().subVectors(p1, p0).normalize();
            if (!boostForce) {
              boostForce = streamDir.multiplyScalar(14.0 * dt);
            }
            break;
          }
        }
      }
    }

    return { boosted, boostForce, inSlipstream };
  }
}
