/**
 * CameraController — God of War Ragnarök style third-person combat camera.
 * Features: smooth orbit follow, dynamic combat zoom, directional shake,
 * punch-in snap-zoom on heavy hits, and execution cinematic angles.
 */
import * as THREE from "three";

export interface CameraControllerOptions {
  /** Distance from target */
  distance: number;
  /** Min/max zoom distances */
  minDistance: number;
  maxDistance: number;
  /** Vertical angle limits (radians) */
  minPolarAngle: number;
  maxPolarAngle: number;
  /** How fast the camera smoothly follows */
  followLerp: number;
  /** Camera rotation sensitivity */
  rotationSensitivity: number;
  /** Camera height offset */
  heightOffset: number;
}

const DEFAULT_OPTIONS: CameraControllerOptions = {
  distance: 6.0,
  minDistance: 3.5,
  maxDistance: 15,
  minPolarAngle: 0.05, // Full vertical pitch: look straight up into the sky (~87.1° pitch)
  maxPolarAngle: Math.PI - 0.05, // Full vertical pitch: look straight down at the ground (~87.1° pitch)
  followLerp: 7.0,
  rotationSensitivity: 2.2,
  heightOffset: 1.6,
};

// Module-level scratch vectors to ensure locked 60 FPS with zero GC allocations
const _scratchCamRight = new THREE.Vector3();
const _scratchCamForward = new THREE.Vector3();
const _scratchAnchor = new THREE.Vector3();
const _scratchTargetWithOffset = new THREE.Vector3();
const _scratchLookTarget = new THREE.Vector3();

export class CameraController {
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3 = new THREE.Vector3();

  private azimuth: number = 0;
  private polar: number = 1.25; // Eye-level action horizon angle
  private currentDistance: number = 5.6;
  private targetDistance: number = 5.6;
  private baseDistance: number = 5.6;
  private smoothTarget: THREE.Vector3 = new THREE.Vector3();
  private options: CameraControllerOptions;
  
  // Screen shake
  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;

  // Dynamic Combat Zoom
  private combatZoomTarget: number = 5.6;
  private combatZoomActive: boolean = false;
  private combatZoomCooldown: number = 0; // Time before returning to base distance

  // Punch-In Snap Zoom (brief zoom-in on impact)
  private punchInAmount: number = 0;
  private punchInTimer: number = 0;
  private punchInDuration: number = 0;

  // Execution Cinematic Camera
  private executionCam: boolean = false;
  private executionTimer: number = 0;
  private executionDutchAngle: number = 0;

  // Radial blur state (communicated to post-process)
  public radialBlurIntensity: number = 0;
  private radialBlurTimer: number = 0;

  // Precision Aim Mode (Right Click) & Flight Camera Profiles
  public isAiming: boolean = false;
  public isMounted: boolean = false;
  public isFirstPerson: boolean = false; // FPV vs POV view mode toggle
  private currentFov: number = 60;
  private targetFov: number = 60;
  private currentHeightOffset: number = 1.65;
  private targetHeightOffset: number = 1.65;
  private shoulderSideOffset: number = 0.55;
  private targetShoulderSideOffset: number = 0.55;

  constructor(
    camera: THREE.PerspectiveCamera,
    options?: Partial<CameraControllerOptions>
  ) {
    this.camera = camera;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.currentDistance = this.options.distance;
    this.baseDistance = this.options.distance;
    this.targetDistance = this.options.distance;
    this.combatZoomTarget = this.options.distance;
    this.camera.position.set(0, this.options.heightOffset + 5, this.currentDistance);
    this.camera.lookAt(0, this.options.heightOffset, 0);
  }

  /**
   * Rotate the camera orbit across all axes with 360-degree freedom.
   * @param dx Horizontal delta (radians)
   * @param dy Vertical delta (radians)
   */
  rotate(dx: number, dy: number): void {
    // 360° Horizontal Yaw (continuous loop with zero clamps)
    this.azimuth -= dx * this.options.rotationSensitivity;
    while (this.azimuth > Math.PI) this.azimuth -= Math.PI * 2;
    while (this.azimuth < -Math.PI) this.azimuth += Math.PI * 2;

    // Full Vertical Pitch from nadir (-89.1°) to zenith (+89.1°)
    this.polar -= dy * this.options.rotationSensitivity;
    if (this.polar < this.options.minPolarAngle) {
      this.polar = this.options.minPolarAngle;
    } else if (this.polar > this.options.maxPolarAngle) {
      this.polar = this.options.maxPolarAngle;
    }
  }

  /**
   * Zoom in/out.
   * @param delta Zoom amount (positive = zoom in)
   */
  zoom(delta: number): void {
    this.baseDistance = Math.max(
      this.options.minDistance,
      Math.min(this.options.maxDistance, this.baseDistance - delta)
    );
  }

  /**
   * Set the target position the camera orbits around.
   */
  setTarget(position: THREE.Vector3, isMounted: boolean = false): void {
    if (this.isMounted !== isMounted) {
      this.isMounted = isMounted;
      this.setAiming(this.isAiming, isMounted);
    }
    this.target.copy(position);
  }

  /**
   * Get the forward direction on the XZ plane (for player movement relative to camera).
   */
  getForwardDirection(): THREE.Vector3 {
    const forward = new THREE.Vector3(
      -Math.sin(this.azimuth),
      0,
      -Math.cos(this.azimuth)
    );
    return forward.normalize();
  }

  /**
   * Get the right direction on the XZ plane.
   */
  getRightDirection(): THREE.Vector3 {
    const right = new THREE.Vector3(
      Math.cos(this.azimuth),
      0,
      -Math.sin(this.azimuth)
    );
    return right.normalize();
  }

  /**
   * Dynamic combat zoom — pull camera in closer during attack chains.
   * Call setCombatZoom(true) when attacking, the camera will naturally pull back after.
   */
  setCombatZoom(active: boolean): void {
    if (active) {
      this.combatZoomActive = true;
      this.combatZoomTarget = this.targetDistance * 0.75;
      this.combatZoomCooldown = 1.5;
    }
  }

  /**
   * Toggle between First-Person View (FPV) and Third-Person View (POV / TPV).
   */
  toggleFirstPerson(): boolean {
    this.isFirstPerson = !this.isFirstPerson;
    if (this.isFirstPerson) {
      this.targetDistance = 0.05;
      this.targetHeightOffset = this.isMounted ? 2.8 : 1.62;
      this.targetShoulderSideOffset = 0.0;
      this.targetFov = 75;
    } else {
      this.setAiming(this.isAiming, this.isMounted);
    }
    return this.isFirstPerson;
  }

  /**
   * Toggle precision Right-Click Aim Mode (Over-the-shoulder TPS aiming).
   */
  setAiming(aiming: boolean, isMounted: boolean = false): void {
    this.isAiming = aiming;
    this.isMounted = isMounted;

    if (this.isFirstPerson) {
      this.targetDistance = 0.05;
      this.targetHeightOffset = isMounted ? 3.35 : 1.62;
      this.targetShoulderSideOffset = 0.0;
      this.targetFov = aiming ? 50 : 75;
      return;
    }

    if (isMounted) {
      if (aiming) {
        // Mounted Precision Aim (ADS): wide over-the-wing shoulder aim so reticle is completely unobstructed
        this.targetDistance = 13.0;
        this.targetHeightOffset = 5.0;
        this.targetShoulderSideOffset = 4.2;
        this.targetFov = 50;
      } else {
        // Mounted Normal Flight: elevated high camera looking over dragon into open sky
        this.targetDistance = 22.0;
        this.targetHeightOffset = 6.8;
        this.targetShoulderSideOffset = 2.6;
        this.targetFov = 68;
      }
    } else {
      if (aiming) {
        // On Foot Precision Aim: clean over-the-right-shoulder TPS aiming
        this.targetDistance = 3.2;
        this.targetHeightOffset = 1.75;
        this.targetShoulderSideOffset = 0.95;
        this.targetFov = 50;
      } else {
        // On Foot Exploration / Ground Combat: comfortable TPS over-the-shoulder view with clear sightline
        this.targetDistance = 5.2;
        this.targetHeightOffset = 1.85;
        this.targetShoulderSideOffset = 0.85;
        this.targetFov = 64;
      }
    }
  }

  /**
   * Dynamic Rocket Jet Speed FOV kick for aerial dragon flight.
   */
  setFlightSpeedFov(airspeed: number): void {
    if (this.isAiming) return;
    if (this.isMounted) {
      if (airspeed > 40) {
        const t = Math.min(1.0, (airspeed - 40) / 180); // Up to 220+ m/s
        this.targetFov = 62 + t * 26; // 62 -> 88 FOV for supersonic rocket jet rush!
      } else {
        this.targetFov = 62;
      }
    }
  }

  /**
   * Punch-in snap zoom — brief dramatic zoom on heavy impacts.
   * @param amount How much closer to zoom (in world units)
   * @param duration How long the punch-in lasts
   */
  addPunchIn(amount: number, duration: number = 0.15): void {
    this.punchInAmount = Math.max(this.punchInAmount, amount);
    this.punchInTimer = duration;
    this.punchInDuration = duration;
  }

  /**
   * Start execution cinematic camera.
   */
  startExecutionCam(duration: number = 1.2): void {
    this.executionCam = true;
    this.executionTimer = duration;
    this.executionDutchAngle = 0;
  }

  /**
   * Trigger radial blur (for dodge rolls).
   */
  triggerRadialBlur(duration: number = 0.3): void {
    this.radialBlurTimer = duration;
    this.radialBlurIntensity = 1.0;
  }

  /**
   * Update camera position — call every frame.
   */
  update(dt: number): void {
    // ─── Combat Zoom Logic ───
    if (this.combatZoomCooldown > 0) {
      this.combatZoomCooldown -= dt;
      if (this.combatZoomCooldown <= 0) {
        this.combatZoomActive = false;
        this.combatZoomTarget = this.targetDistance;
      }
    }

    // ─── Smooth Camera Profile Parameter Interpolation ───
    const activeDistance = this.combatZoomActive ? this.combatZoomTarget : this.targetDistance;
    this.currentDistance += (activeDistance - this.currentDistance) * Math.min(1, 8.0 * dt);
    this.currentHeightOffset += (this.targetHeightOffset - this.currentHeightOffset) * Math.min(1, 8.0 * dt);
    this.shoulderSideOffset += (this.targetShoulderSideOffset - this.shoulderSideOffset) * Math.min(1, 8.0 * dt);

    this.currentFov += (this.targetFov - this.currentFov) * Math.min(1, 10.0 * dt);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // ─── Punch-In Snap Zoom ───
    let punchInOffset = 0;
    if (this.punchInTimer > 0) {
      this.punchInTimer -= dt;
      const t = Math.max(0, this.punchInTimer / this.punchInDuration);
      punchInOffset = this.punchInAmount * t * t;
      if (this.punchInTimer <= 0) {
        this.punchInAmount = 0;
      }
    }

    // ─── Radial Blur Decay ───
    if (this.radialBlurTimer > 0) {
      this.radialBlurTimer -= dt;
      this.radialBlurIntensity = Math.max(0, this.radialBlurTimer / 0.3);
    } else {
      this.radialBlurIntensity = 0;
    }

    // ─── Smooth Follow Anchor ───
    this.smoothTarget.lerp(this.target, 1 - Math.exp(-this.options.followLerp * dt));

    const minDistance = this.isFirstPerson ? 0.05 : this.options.minDistance;
    const effectiveDistance = Math.max(minDistance, this.currentDistance - punchInOffset);

    // Camera right vector in horizontal XZ plane
    _scratchCamRight.set(
      Math.cos(this.azimuth),
      0,
      -Math.sin(this.azimuth)
    ).normalize();

    const sinPolar = Math.sin(this.polar);
    const cosPolar = Math.cos(this.polar);
    const sinAzimuth = Math.sin(this.azimuth);
    const cosAzimuth = Math.cos(this.azimuth);

    // Anchor point with smooth vertical height offset
    _scratchAnchor.copy(this.smoothTarget);
    _scratchAnchor.y += this.currentHeightOffset;

    // Shift focal anchor to right shoulder
    _scratchTargetWithOffset.copy(_scratchAnchor).addScaledVector(_scratchCamRight, this.shoulderSideOffset);

    // Camera position in orbit behind the shoulder focal center
    const camX = _scratchTargetWithOffset.x + effectiveDistance * sinPolar * sinAzimuth;
    const camY = _scratchTargetWithOffset.y + effectiveDistance * cosPolar;
    const camZ = _scratchTargetWithOffset.z + effectiveDistance * sinPolar * cosAzimuth;

    this.camera.position.set(camX, camY, camZ);

    // Forward aim direction from camera orbit angles (zero GC)
    _scratchCamForward.set(
      -sinPolar * sinAzimuth,
      -cosPolar,
      -sinPolar * cosAzimuth
    ).normalize();

    // Look target along the true forward line of sight (120m ahead)
    _scratchLookTarget.copy(this.camera.position).addScaledVector(_scratchCamForward, 120.0);

    // ─── Execution Cinematic Camera ───
    if (this.executionCam) {
      this.executionTimer -= dt;
      this.camera.position.y -= 1.2;
      this.executionDutchAngle = Math.sin(this.executionTimer * 4) * 0.15;
      if (this.executionTimer <= 0) {
        this.executionCam = false;
        this.executionDutchAngle = 0;
      }
    }

    // ─── Screen Shake ───
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const decay = this.shakeTimer > 0 ? 1.0 : 0;
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * decay;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * decay * 0.6;
      const shakeZ = (Math.random() - 0.5) * this.shakeIntensity * decay * 0.3;
      this.camera.position.x += shakeX;
      this.camera.position.y += shakeY;
      this.camera.position.z += shakeZ;
      this.shakeIntensity *= 0.88;
    }

    // Stable world up vector: preserves pure horizontal 360° yaw and vertical pitch without horizon roll
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(_scratchLookTarget);

    if (this.executionDutchAngle !== 0) {
      this.camera.rotation.z = this.executionDutchAngle;
    }
  }

  /**
   * Apply a brief screen shake effect for impacts.
   */
  addShake(intensity: number, duration: number = 0.15): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  /** Set explicit orbit azimuth and polar angles */
  setAngles(azimuth: number, polar: number): void {
    this.azimuth = azimuth;
    this.polar = Math.max(
      this.options.minPolarAngle,
      Math.min(this.options.maxPolarAngle, polar)
    );
  }

  /** Get current azimuth angle for movement calculation */
  getAzimuth(): number {
    return this.azimuth;
  }
}
