/**
 * Biomechanical Physics Engine.
 * Computes 3D landmark kinematics: velocity in m/s, acceleration in m/s²,
 * kinetic energy in Joules, force ratings, and strike classification.
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BiomechanicalFrame {
  timestamp: number; // in seconds
  position: Vector3D;
  velocity: Vector3D;
  speed: number;       // magnitude in m/s
  acceleration: number;// magnitude in m/s^2
  kineticForce: number;// estimated force in Newtons
  kineticEnergy: number; // in Joules
}

export type StrikeArchetype = "Jab" | "Cross" | "Hook" | "Uppercut" | "Duck" | "Neutral";

export class BiomechanicalPhysics {
  private lastPosition: Vector3D | null = null;
  private lastVelocity: Vector3D | null = null;
  private lastTime: number | null = null;
  private effectiveMassKg: number = 4.2; // Average effective arm/fist mass in kg

  constructor(effectiveMassKg: number = 4.2) {
    this.effectiveMassKg = effectiveMassKg;
  }

  /**
   * Distance between two 3D vectors in meters.
   */
  public static distance(a: Vector3D, b: Vector3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Angle between 3 points (e.g. shoulder, elbow, wrist) in degrees.
   */
  public static calculateJointAngle(a: Vector3D, b: Vector3D, c: Vector3D): number {
    const ab = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    const cb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

    const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
    const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y + ab.z * ab.z);
    const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y + cb.z * cb.z);

    if (magAB === 0 || magCB === 0) return 0;
    const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
  }

  /**
   * Process a new positional coordinate frame and derive kinematics.
   */
  public processFrame(pos: Vector3D, timestampSeconds?: number): BiomechanicalFrame {
    const t = timestampSeconds ?? performance.now() / 1000;

    if (this.lastPosition === null || this.lastTime === null) {
      this.lastPosition = pos;
      this.lastTime = t;
      this.lastVelocity = { x: 0, y: 0, z: 0 };
      return {
        timestamp: t,
        position: pos,
        velocity: { x: 0, y: 0, z: 0 },
        speed: 0,
        acceleration: 0,
        kineticForce: 0,
        kineticEnergy: 0,
      };
    }

    const dt = Math.max(t - this.lastTime, 1e-4);
    const vx = (pos.x - this.lastPosition.x) / dt;
    const vy = (pos.y - this.lastPosition.y) / dt;
    const vz = (pos.z - this.lastPosition.z) / dt;
    const currentVelocity = { x: vx, y: vy, z: vz };
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

    let acceleration = 0;
    if (this.lastVelocity) {
      const dvx = vx - this.lastVelocity.x;
      const dvy = vy - this.lastVelocity.y;
      const dvz = vz - this.lastVelocity.z;
      const dvMag = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
      acceleration = dvMag / dt;
    }

    // F = m * a
    const kineticForce = this.effectiveMassKg * acceleration;
    // E_k = 0.5 * m * v^2
    const kineticEnergy = 0.5 * this.effectiveMassKg * (speed * speed);

    this.lastPosition = pos;
    this.lastVelocity = currentVelocity;
    this.lastTime = t;

    return {
      timestamp: t,
      position: pos,
      velocity: currentVelocity,
      speed,
      acceleration,
      kineticForce,
      kineticEnergy,
    };
  }

  /**
   * Classify strike archetype based on joint kinematics and trajectory vectors.
   */
  public static classifyStrike(
    shoulder: Vector3D,
    elbow: Vector3D,
    wrist: Vector3D,
    velocity: Vector3D
  ): StrikeArchetype {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    if (speed < 1.8) return "Neutral";

    const jointAngle = BiomechanicalPhysics.calculateJointAngle(shoulder, elbow, wrist);
    const forwardSpeed = Math.abs(velocity.z);
    const horizontalSpeed = Math.abs(velocity.x);
    const verticalSpeed = velocity.y;

    // Upward dominant movement
    if (verticalSpeed > 2.2 && verticalSpeed > horizontalSpeed && verticalSpeed > forwardSpeed) {
      return "Uppercut";
    }

    // Lateral curve movement with bent arm
    if (horizontalSpeed > 2.5 && jointAngle < 125) {
      return "Hook";
    }

    // Direct forward extension
    if (forwardSpeed > 2.5 && jointAngle > 130) {
      return wrist.x < shoulder.x ? "Cross" : "Jab";
    }

    return "Neutral";
  }

  public reset(): void {
    this.lastPosition = null;
    this.lastVelocity = null;
    this.lastTime = null;
  }
}
