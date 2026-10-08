/**
 * DayNightCycle — Celestial cycle system for the Drowned Epoch.
 *
 * Features:
 * - 20 real-minute full day/night cycle (configurable)
 * - Sun directional light orbiting on tilted ecliptic plane (360°)
 * - Moon directional light 180° offset with luminous silver-blue tint
 * - Visible Celestial Moon & Sun mesh orbs with ethereal atmospheric halos
 * - Dynamic sky color gradient (dawn → day → dusk → night)
 * - Procedural 4,500-star starfield with fog immunity (visible at night)
 * - Ambient light color/intensity shifts tuned for rich nighttime visibility
 * - Dynamic hemisphere light modulation (moonlit sky / deep earth)
 * - Atmospheric fog tuned for vast ocean horizons
 * - Exports current hour/phase for gameplay systems
 */
import * as THREE from "three";

export type TimePhase = "dawn" | "day" | "dusk" | "night";

export interface DayNightState {
  /** 0-24 continuous hour */
  hour: number;
  /** Current phase name */
  phase: TimePhase;
  /** 0-1 sun altitude (1 = noon, 0 = midnight) */
  sunAltitude: number;
  /** Day counter */
  dayCount: number;
}

// ── Sky palette keyed by hour ──
const SKY_COLORS: { hour: number; color: THREE.Color }[] = [
  { hour: 0, color: new THREE.Color(0x091124) },   // Deep midnight celestial navy
  { hour: 4, color: new THREE.Color(0x0e1b38) },   // Pre-dawn deep indigo
  { hour: 5.5, color: new THREE.Color(0x1b3a5c) },  // Dawn begins — deep ocean blue
  { hour: 6, color: new THREE.Color(0xd4845a) },    // Sunrise — warm peach-gold
  { hour: 7, color: new THREE.Color(0xf0c27f) },    // Golden hour
  { hour: 8, color: new THREE.Color(0x87ceeb) },    // Morning sky blue
  { hour: 12, color: new THREE.Color(0x5ba3d9) },   // Noon — vivid azure
  { hour: 16, color: new THREE.Color(0x87ceeb) },   // Afternoon
  { hour: 17.5, color: new THREE.Color(0xe8956b) },  // Golden hour return
  { hour: 18.5, color: new THREE.Color(0xc0392b) },  // Sunset — crimson
  { hour: 19, color: new THREE.Color(0x5b2c6f) },   // Dusk — deep purple
  { hour: 20, color: new THREE.Color(0x192144) },   // Twilight
  { hour: 21, color: new THREE.Color(0x0c152e) },   // Nightfall
  { hour: 24, color: new THREE.Color(0x091124) },   // Wrap midnight
];

// ── Ambient light palette (balanced so night is atmospheric yet crystal clear) ──
const AMBIENT_COLORS: { hour: number; color: THREE.Color; intensity: number }[] = [
  { hour: 0, color: new THREE.Color(0x253664), intensity: 0.38 }, // Luminous moonlit ambient
  { hour: 4, color: new THREE.Color(0x283b6c), intensity: 0.40 },
  { hour: 5.5, color: new THREE.Color(0x3a4b78), intensity: 0.45 },
  { hour: 6, color: new THREE.Color(0xffecd2), intensity: 0.55 },
  { hour: 8, color: new THREE.Color(0xffffff), intensity: 0.65 },
  { hour: 12, color: new THREE.Color(0xffffff), intensity: 0.75 },
  { hour: 17, color: new THREE.Color(0xffecd2), intensity: 0.60 },
  { hour: 18.5, color: new THREE.Color(0xe8956b), intensity: 0.45 },
  { hour: 20, color: new THREE.Color(0x2d3a5c), intensity: 0.40 },
  { hour: 24, color: new THREE.Color(0x253664), intensity: 0.38 },
];

export class DayNightCycle {
  // Lights
  public sunLight: THREE.DirectionalLight;
  public moonLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;

  // Visual Celestial Bodies in the Sky
  public sunMeshGroup: THREE.Group;
  public moonMeshGroup: THREE.Group;

  // Starfield
  private starField: THREE.Points;
  private starMaterial: THREE.PointsMaterial;

  // State
  private _hour: number = 6.0; // Start at sunrise — peaceful awakening
  private _dayCount: number = 1;

  // Config
  private cycleDurationSeconds: number = 20 * 60; // 20 real minutes = 1 full day
  private timeSpeedMultiplier: number = 1.0;

  // References
  private scene: THREE.Scene;
  private activeCamera?: THREE.Camera;

  // Sun orbit parameters
  private readonly sunOrbitRadius = 800;
  private readonly celestialVisualRadius = 880; // Visible orb distance in sky (crisp within fog distance)
  private readonly sunTilt = 0.15; // Slight axial tilt for realistic arc

  // Scratch objects to eliminate per-frame GC allocations
  private _scratchSkyColor = new THREE.Color();
  private _scratchSunColor = new THREE.Color();
  private _colorWhite = new THREE.Color(0xffffff);
  private _colorGolden = new THREE.Color(0xffb347);
  private _scratchAmbientResult = { color: new THREE.Color(), intensity: 0.5 };
  private _scratchFogParams = { near: 100, far: 2000, color: new THREE.Color() };
  private _scratchSunDir = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // ── 1. Sun Directional Light (Centered on summit at Y = 120m) ──
    this.sunLight = new THREE.DirectionalLight(0xfff4e6, 1.25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1100;
    this.sunLight.shadow.camera.left = -90;
    this.sunLight.shadow.camera.right = 90;
    this.sunLight.shadow.camera.top = 90;
    this.sunLight.shadow.camera.bottom = -90;
    // Positive normalBias with minimal negative bias completely eliminates shadow acne lines on flat decks
    this.sunLight.shadow.bias = -0.00003;
    this.sunLight.shadow.normalBias = 0.04;
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // ── 2. Moon Directional Light (Luminous lunar silver-blue) ──
    this.moonLight = new THREE.DirectionalLight(0xd4e9ff, 0.85);
    this.moonLight.castShadow = false;
    scene.add(this.moonLight);
    scene.add(this.moonLight.target);

    // ── 3. Ambient Light ──
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(this.ambientLight);

    // ── Helper: Generate procedural smooth radial gradient glow texture ──
    const makeRadialTexture = (c1: string, c2: string, c3: string): THREE.CanvasTexture => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, c1);
      grad.addColorStop(0.35, c2);
      grad.addColorStop(1.0, c3);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(canvas);
    };

    // ── 4. Visual Sun Celestial Body (Solid Radiant Golden Sun — Zero Rings/Slats) ──
    this.sunMeshGroup = new THREE.Group();
    this.sunMeshGroup.name = "CelestialSun";

    // A. Solid Incandescent Solar Core Sphere
    const sunOrbGeo = new THREE.SphereGeometry(36, 32, 32);
    const sunOrbMat = new THREE.MeshBasicMaterial({
      color: 0xfffdf0,
      fog: false,
    });
    this.sunMeshGroup.add(new THREE.Mesh(sunOrbGeo, sunOrbMat));

    // B. Pure Circular Golden Atmospheric Coronas (Silky radial canvas falloff, billboarded to camera)
    const sunInnerTex = makeRadialTexture("rgba(255,255,248,1.0)", "rgba(251,191,36,0.85)", "rgba(245,158,11,0.0)");
    const sunMidTex = makeRadialTexture("rgba(251,191,36,0.8)", "rgba(245,158,11,0.4)", "rgba(217,119,6,0.0)");
    const sunAtmosphereTex = makeRadialTexture("rgba(245,158,11,0.45)", "rgba(217,119,6,0.18)", "rgba(180,83,9,0.0)");

    const sunCoronas = [
      { radius: 75, tex: sunInnerTex, opacity: 0.9 },
      { radius: 145, tex: sunMidTex, opacity: 0.6 },
      { radius: 230, tex: sunAtmosphereTex, opacity: 0.3 },
    ];
    sunCoronas.forEach((c) => {
      const coronaMat = new THREE.MeshBasicMaterial({
        map: c.tex,
        transparent: true,
        opacity: c.opacity,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.sunMeshGroup.add(new THREE.Mesh(new THREE.CircleGeometry(c.radius, 36), coronaMat));
    });

    scene.add(this.sunMeshGroup);

    // ── 5. Visual Moon Celestial Body (Luminous Pearl Lunar Sphere & Soft Silver Aura — Zero Blue Marks) ──
    this.moonMeshGroup = new THREE.Group();
    this.moonMeshGroup.name = "CelestialMoon";

    // A. Clean Luminous Lunar Sphere (Pure ivory/pearl white — zero slate-blue patches!)
    const moonOrbGeo = new THREE.SphereGeometry(38, 36, 36);
    const moonOrbMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      fog: false,
    });
    const moonOrb = new THREE.Mesh(moonOrbGeo, moonOrbMat);
    this.moonMeshGroup.add(moonOrb);

    // B. Soft Circular Silver-White Coronas (Zero cyan/blue tint, pure ethereal moonlight)
    const moonInnerTex = makeRadialTexture("rgba(255,255,255,0.92)", "rgba(241,245,249,0.55)", "rgba(226,232,240,0.0)");
    const moonMidTex = makeRadialTexture("rgba(241,245,249,0.5)", "rgba(226,232,240,0.22)", "rgba(203,213,225,0.0)");
    const moonOuterTex = makeRadialTexture("rgba(226,232,240,0.25)", "rgba(203,213,225,0.08)", "rgba(148,163,184,0.0)");

    const moonCoronas = [
      { radius: 80, tex: moonInnerTex, opacity: 0.8 },
      { radius: 150, tex: moonMidTex, opacity: 0.45 },
      { radius: 240, tex: moonOuterTex, opacity: 0.2 },
    ];
    moonCoronas.forEach((c) => {
      const coronaMat = new THREE.MeshBasicMaterial({
        map: c.tex,
        transparent: true,
        opacity: c.opacity,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      this.moonMeshGroup.add(new THREE.Mesh(new THREE.CircleGeometry(c.radius, 36), coronaMat));
    });

    scene.add(this.moonMeshGroup);

    // ── 6. Starfield (Immune to fog, sparkles across the midnight sky) ──
    const starCount = 4500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2400 + Math.random() * 400;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 50; // Strictly upper celestial dome
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

    this.starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false, // CRITICAL: Stars MUST NOT be occluded by distance fog!
    });
    this.starField = new THREE.Points(starGeo, this.starMaterial);
    this.starField.name = "StarField";
    scene.add(this.starField);

    // Initial update
    this.applyTimeOfDay();
  }

  /** Set time directly (for debug / prologue / UI slider) */
  public setTime(hour: number, dayCount?: number, camera?: THREE.Camera): void {
    if (camera) this.activeCamera = camera;
    this._hour = ((hour % 24) + 24) % 24;
    if (dayCount !== undefined) this._dayCount = dayCount;
    this.applyTimeOfDay(camera);
  }

  /** Get current state */
  public getState(): DayNightState {
    return {
      hour: this._hour,
      phase: this.getPhase(),
      sunAltitude: this.getSunAltitude(),
      dayCount: this._dayCount,
    };
  }

  public setTimeSpeed(multiplier: number): void {
    this.timeSpeedMultiplier = Math.max(0, multiplier);
  }

  public getTimeSpeed(): number {
    return this.timeSpeedMultiplier;
  }

  public get hour(): number {
    return this._hour;
  }

  /** Tick the cycle forward */
  public update(dt: number, camera?: THREE.Camera): void {
    if (camera) this.activeCamera = camera;
    if (this.timeSpeedMultiplier > 0) {
      const hoursPerSecond = (24 / this.cycleDurationSeconds) * this.timeSpeedMultiplier;
      this._hour += dt * hoursPerSecond;
      if (this._hour >= 24) {
        this._hour -= 24;
        this._dayCount++;
      }
    }
    this.applyTimeOfDay(camera);
  }

  /** Get current time phase */
  public getPhase(): TimePhase {
    const h = this._hour;
    if (h >= 5.5 && h < 7.5) return "dawn";
    if (h >= 7.5 && h < 17) return "day";
    if (h >= 17 && h < 20) return "dusk";
    return "night";
  }

  /** Get normalized sun direction pointing from sky toward origin */
  public getSunDirection(): THREE.Vector3 {
    return this._scratchSunDir.copy(this.sunLight.position).normalize();
  }

  /** Get current sun color */
  public getSunColor(): THREE.Color {
    return this.sunLight.color;
  }

  /** Get current sun intensity */
  public getSunIntensity(): number {
    return this.sunLight.intensity;
  }

  /** Sun altitude 0-1 (0 = below horizon, 1 = zenith) */
  public getSunAltitude(): number {
    const sunAngle = ((this._hour - 6) / 12) * Math.PI; // 0 at 6am, PI at 6pm
    return Math.max(0, Math.sin(sunAngle));
  }

  /** Update hemisphere light color and intensity according to celestial phase */
  public updateHemiLight(hemiLight: THREE.HemisphereLight): void {
    const sunAlt = this.getSunAltitude();
    // Day colors: Sky 0x87ceeb, Ground 0x1a7a4c, Intensity 0.38
    // Night colors: Sky 0x22365c (moonlit navy), Ground 0x0c1424 (deep earth), Intensity 0.28
    const skyDay = new THREE.Color(0x87ceeb);
    const skyNight = new THREE.Color(0x22365c);
    const groundDay = new THREE.Color(0x1a7a4c);
    const groundNight = new THREE.Color(0x0c1424);

    hemiLight.color.lerpColors(skyNight, skyDay, sunAlt);
    hemiLight.groundColor.lerpColors(groundNight, groundDay, sunAlt);
    hemiLight.intensity = THREE.MathUtils.lerp(0.28, 0.38, sunAlt);
  }

  /** Interpolate a value array keyed by hour into target color */
  private lerpColorByHour(entries: { hour: number; color: THREE.Color }[], target: THREE.Color): THREE.Color {
    const h = this._hour;
    for (let i = 0; i < entries.length - 1; i++) {
      if (h >= entries[i].hour && h < entries[i + 1].hour) {
        const t = (h - entries[i].hour) / (entries[i + 1].hour - entries[i].hour);
        return target.lerpColors(entries[i].color, entries[i + 1].color, t);
      }
    }
    return target.copy(entries[entries.length - 1].color);
  }

  private lerpAmbientByHour(): { color: THREE.Color; intensity: number } {
    const h = this._hour;
    for (let i = 0; i < AMBIENT_COLORS.length - 1; i++) {
      if (h >= AMBIENT_COLORS[i].hour && h < AMBIENT_COLORS[i + 1].hour) {
        const t = (h - AMBIENT_COLORS[i].hour) / (AMBIENT_COLORS[i + 1].hour - AMBIENT_COLORS[i].hour);
        this._scratchAmbientResult.color.lerpColors(AMBIENT_COLORS[i].color, AMBIENT_COLORS[i + 1].color, t);
        this._scratchAmbientResult.intensity = THREE.MathUtils.lerp(AMBIENT_COLORS[i].intensity, AMBIENT_COLORS[i + 1].intensity, t);
        return this._scratchAmbientResult;
      }
    }
    this._scratchAmbientResult.color.copy(AMBIENT_COLORS[0].color);
    this._scratchAmbientResult.intensity = AMBIENT_COLORS[0].intensity;
    return this._scratchAmbientResult;
  }

  /** Apply all visual changes for current time */
  public applyTimeOfDay(camera?: THREE.Camera): void {
    const sunAlt = this.getSunAltitude();
    // Celestial East-West solar corridor:
    // Sun rises East (+X) at 6:00, zenith at 12:00, sets West (-X) at 18:00
    // The main ceremonial gate is at (+14, 120.1, -2) looking directly EAST (+X)
    const sunAzimuth = ((this._hour - 6) / 12) * Math.PI;

    // ── Sun Light Position on ecliptic arc (Centered on summit Y = 120m) ──
    const sunX = this.sunOrbitRadius * Math.cos(sunAzimuth);
    const sunY = this.sunOrbitRadius * Math.sin(sunAzimuth);
    const sunZ = -this.sunOrbitRadius * Math.sin(sunAzimuth) * this.sunTilt;
    this.sunLight.position.set(sunX - 6, Math.max(sunY + 120, -100), sunZ);
    this.sunLight.target.position.set(-6, 120, 0);

    // Sun intensity fades when below horizon
    this.sunLight.intensity = Math.max(0, sunAlt) * 1.35;

    // Sun color shifts: warm at dawn/dusk, crisp white at noon
    if (sunAlt > 0) {
      const warmth = 1 - sunAlt;
      this._scratchSunColor.lerpColors(
        this._colorWhite,
        this._colorGolden,
        warmth * 0.7
      );
      this.sunLight.color.copy(this._scratchSunColor);
    }

    // ── Strictly Mutually Exclusive Visibility: NEVER 2 objects at dawn! ──
    // Sun is visible strictly in daytime (5.8 to 18.2).
    // Moon is visible strictly in nighttime (18.6 to 5.4).
    const isDay = this._hour >= 5.8 && this._hour <= 18.2;
    const isNightVisible = this._hour >= 18.6 || this._hour <= 5.4;

    // ── Visible Sun Orb (rises directly framed in front of the main gate at dawn) ──
    const sunVisualX = this.celestialVisualRadius * Math.cos(sunAzimuth);
    const sunVisualY = this.celestialVisualRadius * Math.sin(sunAzimuth);
    const sunVisualZ = -this.celestialVisualRadius * Math.sin(sunAzimuth) * this.sunTilt;
    this.sunMeshGroup.position.set(sunVisualX - 6, sunVisualY + 120, sunVisualZ);
    this.sunMeshGroup.visible = isDay && sunVisualY > -80;

    // ── Moon Light Position (Directional illumination) ──
    const moonAzimuth = sunAzimuth + Math.PI;
    const moonX = this.sunOrbitRadius * Math.cos(moonAzimuth);
    const moonY = this.sunOrbitRadius * Math.sin(moonAzimuth);
    const moonZ = -this.sunOrbitRadius * Math.sin(moonAzimuth) * this.sunTilt;
    this.moonLight.position.set(moonX - 6, Math.max(moonY + 120, 150), moonZ);
    this.moonLight.target.position.set(-6, 120, 0);

    // Luminous moonlight at night (intensity 0.85 when sun is down)
    const isNight = sunAlt < 0.2;
    this.moonLight.intensity = isNight ? 0.85 * (1 - sunAlt / 0.2) : 0;
    this.moonLight.color.setHex(0xd0e6ff);

    // ── Visible Moon Orb (Framed aesthetically across the night sky & Torii Gate) ──
    if (isNightVisible) {
      let nightProgress: number;
      if (this._hour >= 18.6) {
        nightProgress = (this._hour - 18.6) / 10.8; // 18.6 -> 0.0, 24.0 -> ~0.5
      } else {
        nightProgress = (this._hour + 5.4) / 10.8; // 0.0 -> ~0.5, 5.4 -> 1.0
      }
      nightProgress = THREE.MathUtils.clamp(nightProgress, 0, 1);

      // Aesthetic elevation arc: arches smoothly between 16° and 26° above horizon
      const moonElevAngle = (16.0 + 10.0 * Math.sin(nightProgress * Math.PI)) * (Math.PI / 180);
      // Gentle horizontal drift from East-Northeast (+X, -Z) to East-Southeast (+X, +Z)
      const moonAzimAngle = 0.22 - 0.55 * nightProgress;

      const moonDist = this.celestialVisualRadius;
      const moonVisualX = moonDist * Math.cos(moonElevAngle) * Math.cos(moonAzimAngle);
      const moonVisualY = moonDist * Math.sin(moonElevAngle);
      const moonVisualZ = moonDist * Math.cos(moonElevAngle) * Math.sin(moonAzimAngle);

      this.moonMeshGroup.position.set(moonVisualX - 6, moonVisualY + 120, moonVisualZ);
      this.moonMeshGroup.visible = true;
    } else {
      this.moonMeshGroup.visible = false;
    }

    // ── Camera Billboarding: Coronas ALWAYS face the camera flat and head-on ──
    // Completely eliminates edge-on perspective distortion, slanted white streaks, and elliptical shears!
    const cam = camera || this.activeCamera;
    if (cam) {
      this.sunMeshGroup.quaternion.copy(cam.quaternion);
      this.moonMeshGroup.quaternion.copy(cam.quaternion);
    } else {
      this.sunMeshGroup.lookAt(-6, 120, 0);
      this.moonMeshGroup.lookAt(-6, 120, 0);
    }

    // ── Sky background color ──
    this.lerpColorByHour(SKY_COLORS, this._scratchSkyColor);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this._scratchSkyColor);
    } else {
      this.scene.background = this._scratchSkyColor.clone();
    }

    // ── Ambient light ──
    const ambient = this.lerpAmbientByHour();
    this.ambientLight.color.copy(ambient.color);
    this.ambientLight.intensity = ambient.intensity;

    // ── Stars ──
    // Fade in gracefully when sun altitude drops below 0.25
    const starOpacity = sunAlt < 0.25
      ? THREE.MathUtils.smoothstep(1 - sunAlt / 0.25, 0, 1) * 0.95
      : 0;
    this.starMaterial.opacity = starOpacity;

    // Slowly rotate starfield
    this.starField.rotation.y += 0.00003;
  }

  /** Get current fog parameters for the post-process / renderer */
  public getFogParams(): { near: number; far: number; color: THREE.Color } {
    const phase = this.getPhase();

    // Night: expansive moonlit atmosphere. Day: high-visibility horizon
    let near: number, far: number;
    if (phase === "night") {
      near = 70;
      far = 1600;
    } else if (phase === "dawn" || phase === "dusk") {
      near = 80;
      far = 2000;
    } else {
      near = 100;
      far = 2600;
    }

    this._scratchFogParams.near = near;
    this._scratchFogParams.far = far;
    this._scratchFogParams.color.copy(this._scratchSkyColor);
    return this._scratchFogParams;
  }

  /** Cleanup */
  public dispose(): void {
    this.scene.remove(this.sunLight);
    this.scene.remove(this.moonLight);
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.sunMeshGroup);
    this.scene.remove(this.moonMeshGroup);
    this.scene.remove(this.starField);
  }
}
