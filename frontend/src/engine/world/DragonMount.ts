import * as THREE from "three";
import { InkParticleSystem } from "../rendering/InkParticleSystem";
import { audioManager } from "../audio/AudioManager";
import { useGameStore } from "@/stores/gameStore";

/**
 * DragonMount
 * Flying Winged Dragon Mount inspired by Reference Video 2 Frame 4.
 * Features:
 * - Serpentine black obsidian dragon body with crimson spinal crest
 * - Procedural flapping wings with banking roll physics
 * - Soaring flight controls (Pitch, Yaw, Roll, Air-Ring Boost)
 * - Dismount into high-speed Qinggong dive slam ("Press Left Shift to Dismount")
 */
const _scratchCamFlat = new THREE.Vector3();
const _scratchForward = new THREE.Vector3();
const _scratchSaddlePos = new THREE.Vector3();
const _scratchVaporPos = new THREE.Vector3();

export class DragonMount {
  public mesh: THREE.Group;
  public isMounted: boolean = false;
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, "YXZ");

  // Controllable Cinematic Flight Dynamics — Smooth soaring with Shift boost
  private cruisingSpeed: number = 20.0; // Controllable cruising speed (~72 km/h)
  private boostSpeed: number = 44.0;    // [Shift] Dragon Speed Boost (~158 km/h)
  private maxDiveSpeed: number = 60.0;  // Aerodynamic dive speed terminal cap
  public currentSpeed: number = 20.0;
  private pitch: number = 0;
  private roll: number = 0;
  private wingFlapTimer: number = 0;

  // Wing, neck, and tail mesh references for procedural animation
  private leftWing!: THREE.Group;
  private rightWing!: THREE.Group;
  private tailSegments: THREE.Object3D[] = [];
  private saddleAnchor!: THREE.Group;
  private torso!: THREE.Mesh;
  private neckRoot!: THREE.Group;
  private neckSegments: THREE.Group[] = [];
  private headGroup!: THREE.Group;
  private jawGroup!: THREE.Group;
  private whiskersLeft: THREE.Group = new THREE.Group();
  private whiskersRight: THREE.Group = new THREE.Group();
  public isAwake: boolean = false;

  // Barrel Roll Dodge System
  private isBarrelRolling: boolean = false;
  private barrelRollTimer: number = 0;
  private barrelRollCooldown: number = 0;
  private barrelRollDirection: number = 0; // -1 left, 1 right
  private readonly BARREL_ROLL_DURATION = 0.4; // seconds
  private readonly BARREL_ROLL_COOLDOWN = 0.55; // seconds (rapid, agile aerial acrobatics)
  private readonly BARREL_ROLL_SPEED_BOOST = 1.4; // 40% speed increase
  private preRollSpeed: number = 0;
  public isFlightPaused: boolean = false;

  public pauseFlight(): void {
    this.isFlightPaused = true;
    this.velocity.set(0, 0, 0);
  }

  public resumeFlight(): void {
    this.isFlightPaused = false;
  }

  constructor(private scene: THREE.Scene, private particles: InkParticleSystem) {
    this.mesh = new THREE.Group();
    this.mesh.rotation.order = "YXZ";
    this.mesh.name = "FlyingDragonMount";
    this.mesh.visible = false;
    this.scene.add(this.mesh);

    this.buildDragonGeometry();
  }

  /**
   * Helper to construct a skeletal bone cylinder spanning between two joint positions.
   */
  private createBone(pA: THREE.Vector3, pB: THREE.Vector3, radius: number, mat: THREE.Material): THREE.Mesh {
    const dir = new THREE.Vector3().subVectors(pB, pA);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius * 0.78, radius, len, 6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pA).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return mesh;
  }

  /**
   * Build the sculpted winged dragon model — Veyros, the Shadow Wyrm.
   * Sculpted with ferocious draconic anatomy:
   * - Broad armored shoulder mantles & dorsal spikes visible from behind
   * - Massive curved wings with 3D camber, elbow spurs, and trailing crimson web membranes
   * - Muscular hindquarters and aerodynamic folded talons
   * - Long serpentine tail ending in twin majestic rudder fins & dorsal fin
   */
  private buildDragonGeometry(): void {
    // ── Shadow Wyrm Materials ──
    const blackScaleMat = new THREE.MeshStandardMaterial({
      color: 0x111322, // Deep obsidian black dragon scales
      roughness: 0.35,
      metalness: 0.65,
      emissive: 0x05060f,
      emissiveIntensity: 0.15,
    });

    const armoredPlateMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e33, // Heavy carapace plating
      roughness: 0.28,
      metalness: 0.75,
      emissive: 0x0a0c18,
      emissiveIntensity: 0.2,
    });

    const crimsonRidgeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Flaming crimson dragon crest & spines
      roughness: 0.25,
      metalness: 0.6,
      emissive: 0xdc2626,
      emissiveIntensity: 0.55,
    });

    const wingMembraneMat = new THREE.MeshStandardMaterial({
      color: 0x450a0a, // Dark blood-red wing membrane with rich translucent depth
      roughness: 0.45,
      metalness: 0.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      emissive: 0x991b1b,
      emissiveIntensity: 0.25,
    });

    const wingRibMat = new THREE.MeshStandardMaterial({
      color: 0x0f111a, // Dark obsidian wing struts
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.2,
    });

    const hornBoneMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Ancient ivory/bone horns
      roughness: 0.2,
      metalness: 0.45,
      emissive: 0x78350f,
      emissiveIntensity: 0.18,
    });

    const eyeGlowMat = new THREE.MeshBasicMaterial({
      color: 0xef4444, // Burning crimson eyes
    });

    const dragonGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Imperial gold rune bands & fittings
      roughness: 0.25,
      metalness: 0.94,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
    });

    const toothIvoryMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Polished ancient ivory dragon fangs
      roughness: 0.16,
      metalness: 0.2,
      emissive: 0x292524,
      emissiveIntensity: 0.12,
    });

    const mawFireMat = new THREE.MeshBasicMaterial({
      color: 0xff3300, // Molten core interior mouth furnace
    });

    const hairTuftMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Flaming celestial crimson silk mane
      roughness: 0.45,
      metalness: 0.25,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.55,
      side: THREE.DoubleSide,
    });

    const inkHairMat = new THREE.MeshStandardMaterial({
      color: 0x090a14, // Deep calligraphic ink black mane
      roughness: 0.5,
      metalness: 0.4,
      emissive: 0x1e1b4b,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    });

    // ── 1. Massive Muscular Torso & Armored Mantle ──
    const torsoGroup = new THREE.Group();
    this.mesh.add(torsoGroup);

    // Main barrel chest (broad & tapered)
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 0.95, 4.8, 10),
      blackScaleMat
    );
    torso.rotation.x = Math.PI / 2;
    torsoGroup.add(torso);
    this.torso = torso;

    // Muscular chest keel (underbelly armor)
    const underbelly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.5, 4.2, 8),
      armoredPlateMat
    );
    underbelly.position.set(0, -0.4, 0);
    underbelly.rotation.x = Math.PI / 2;
    torsoGroup.add(underbelly);

    // Broad Armored Shoulder Pauldrons (visible prominently from behind!)
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 1.1, 2.2),
        armoredPlateMat
      );
      pauldron.position.set(side * 1.25, 0.5, -0.4);
      pauldron.rotation.set(0.1, 0, side * -0.35);
      torsoGroup.add(pauldron);

      // Shoulder blade spike
      const shoulderSpike = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 1.4, 5),
        crimsonRidgeMat
      );
      shoulderSpike.position.set(side * 1.5, 0.9, -0.2);
      shoulderSpike.rotation.set(0.3, 0, side * -0.55);
      torsoGroup.add(shoulderSpike);
    }

    // Double-Tiered Crimson Spinal Ridge along back
    for (let r = -2.0; r <= 2.0; r += 0.42) {
      const height = 0.55 + Math.sin(((r + 2.0) / 4.0) * Math.PI) * 0.4;
      const ridge = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, height, 4),
        crimsonRidgeMat
      );
      ridge.position.set(0, 1.1 + height * 0.4, r);
      ridge.rotation.x = 0.35;
      torsoGroup.add(ridge);

      // Flanking secondary dorsal scales
      for (const side of [-1, 1]) {
        const sideSpur = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, height * 0.6, 4),
          armoredPlateMat
        );
        sideSpur.position.set(side * 0.42, 0.95, r - 0.1);
        sideSpur.rotation.set(0.2, 0, side * -0.45);
        torsoGroup.add(sideSpur);
      }
    }

    // ── 1B. Muscular Dragon Pelvis & Sacral Carapace (Seamless Rump / 薦骨重甲) ──
    // Tapered pelvic body bridging the torso (radius 0.95 at z=2.4) to the tail base (radius 0.60 at z=3.3)
    const pelvisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.60, 0.95, 1.0, 10),
      blackScaleMat
    );
    pelvisMesh.position.set(0, 0.04, 2.85);
    pelvisMesh.rotation.x = Math.PI / 2;
    torsoGroup.add(pelvisMesh);

    // Ventral pelvic keel (matching underbelly armor to tail)
    const pelvisBelly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.52, 1.0, 8),
      armoredPlateMat
    );
    pelvisBelly.position.set(0, -0.32, 2.85);
    pelvisBelly.rotation.x = Math.PI / 2;
    torsoGroup.add(pelvisBelly);

    // Heavy dorsal sacral carapace plate (shields the upper rump from behind)
    const sacralCarapace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.88, 1.05, 8, 1, false, 0, Math.PI),
      armoredPlateMat
    );
    sacralCarapace.position.set(0, 0.16, 2.82);
    sacralCarapace.rotation.x = Math.PI / 2;
    sacralCarapace.rotation.z = Math.PI; // wraps over top
    torsoGroup.add(sacralCarapace);

    // Flared iliac hip armor crests over left and right hindquarters
    for (const side of [-1, 1]) {
      const hipCrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.75, 1.2),
        armoredPlateMat
      );
      hipCrest.position.set(side * 0.85, 0.22, 2.3);
      hipCrest.rotation.set(-0.25, side * -0.15, side * -0.45);
      torsoGroup.add(hipCrest);

      // Flank guard scute (Ancient Ivory spur)
      const flankScute = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.95, 4),
        hornBoneMat
      );
      flankScute.position.set(side * 1.05, 0.38, 2.5);
      flankScute.rotation.set(0.65, side * 0.2, side * -0.6);
      torsoGroup.add(flankScute);
    }

    // Extended sacral spinal ridge spikes over the rump
    for (let r = 2.3; r <= 3.2; r += 0.35) {
      const hScale = Math.max(0.35, 0.75 - (r - 2.0) * 0.35);
      const sacralSpur = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, hScale, 4),
        crimsonRidgeMat
      );
      sacralSpur.position.set(0, 0.82 - (r - 2.0) * 0.25, r);
      sacralSpur.rotation.x = 0.55;
      torsoGroup.add(sacralSpur);
    }

    // Saddle Anchor where player stands/sits
    this.saddleAnchor = new THREE.Group();
    this.saddleAnchor.position.set(0, 1.15, 0.2);
    this.mesh.add(this.saddleAnchor);

    // ── 2. Muscular Hindquarters & Flying Talons (Visible from Behind) ──
    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.95, -0.1, 1.2);

      // Muscular Thigh
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.4, 2.0, 8),
        blackScaleMat
      );
      thigh.rotation.set(-0.65, 0, side * 0.2);
      thigh.position.set(0, -0.3, 0.4);
      legGroup.add(thigh);

      // Lower leg tucked aerodynamically backwards
      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.25, 1.6, 6),
        armoredPlateMat
      );
      shin.rotation.set(0.85, 0, side * -0.15);
      shin.position.set(0, -0.9, 1.1);
      legGroup.add(shin);

      // 3 Claws/Talons tucked backward in flight
      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.75, 4),
          hornBoneMat
        );
        claw.position.set(c * 0.16, -1.3, 1.6);
        claw.rotation.set(1.4, 0, c * 0.2);
        legGroup.add(claw);
      }

      torsoGroup.add(legGroup);
    }

    // ── 3. Serpentine Cervical Spine & Aerodynamic Articulated Dragon Neck ──
    const neckRoot = new THREE.Group();
    // Neck seamlessly emerges from front chest opening of torso
    neckRoot.position.set(0, 0.22, -2.15);
    this.mesh.add(neckRoot);
    this.neckRoot = neckRoot;
    this.neckSegments = [];

    // Chain of 4 articulated cervical segments curving seamlessly from chest to skull
    let parentSegment: THREE.Object3D = neckRoot;
    const neckDef = [
      { len: 0.85, rBase: 0.86, rTop: 0.74, pitch: -0.20, scuteW: 1.15, spikeH: 0.65 }, // Collar / Shoulder base
      { len: 0.85, rBase: 0.74, rTop: 0.64, pitch: -0.14, scuteW: 1.00, spikeH: 0.55 }, // Lower cervical
      { len: 0.82, rBase: 0.64, rTop: 0.55, pitch:  0.08, scuteW: 0.85, spikeH: 0.48 }, // Mid cervical / arch
      { len: 0.78, rBase: 0.55, rTop: 0.46, pitch:  0.20, scuteW: 0.72, spikeH: 0.40 }, // Nape / Cranial base
    ];

    for (let i = 0; i < neckDef.length; i++) {
      const def = neckDef[i];
      const segGroup = new THREE.Group();
      if (i > 0) {
        segGroup.position.set(0, 0.16, -neckDef[i - 1].len * 0.86);
      }
      segGroup.rotation.x = def.pitch;
      parentSegment.add(segGroup);
      this.neckSegments.push(segGroup);

      // Core muscular cylinder (tapered, faceted, muscular oval cross-section)
      const coreGeo = new THREE.CylinderGeometry(def.rTop, def.rBase, def.len, 10);
      const segMesh = new THREE.Mesh(coreGeo, blackScaleMat);
      segMesh.rotation.x = Math.PI / 2;
      segMesh.position.set(0, 0, -def.len * 0.45);
      segMesh.scale.set(1.12, 0.82, 1.0);
      segGroup.add(segMesh);

      // Ventral underbelly armored gastrosteges (keel plating under the throat)
      const bellyPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(def.rTop * 0.65, def.rBase * 0.65, def.len * 0.95, 6),
        armoredPlateMat
      );
      bellyPlate.rotation.x = Math.PI / 2;
      bellyPlate.position.set(0, -def.rBase * 0.45, -def.len * 0.45);
      bellyPlate.scale.set(0.9, 0.4, 1.0);
      segGroup.add(bellyPlate);

      // Layered Overlapping Dorsal Scutes (armored carapace chevrons along neck spine)
      const dorsalChevron = new THREE.Mesh(
        new THREE.ConeGeometry(def.scuteW * 0.45, def.len * 0.95, 4),
        armoredPlateMat
      );
      dorsalChevron.position.set(0, def.rBase * 0.52, -def.len * 0.45);
      dorsalChevron.rotation.set(Math.PI / 2 + 0.35, 0, 0);
      dorsalChevron.scale.set(1.4, 0.5, 0.7);
      segGroup.add(dorsalChevron);

      // Flaming Crimson Dorsal Spine Fin (raking backward like razor blades)
      const dorsalSpike = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, def.spikeH, 4),
        crimsonRidgeMat
      );
      dorsalSpike.position.set(0, def.rBase * 0.7 + def.spikeH * 0.4, -def.len * 0.5);
      dorsalSpike.rotation.x = 0.65;
      segGroup.add(dorsalSpike);

      // Flanking secondary cervical scutes (lateral neck armor visible from rider perspective)
      for (const side of [-1, 1]) {
        const sideScute = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, def.spikeH * 0.6, 4),
          armoredPlateMat
        );
        sideScute.position.set(side * (def.rBase * 0.65), def.rBase * 0.45, -def.len * 0.45);
        sideScute.rotation.set(0.45, 0, side * -0.55);
        segGroup.add(sideScute);
      }

      // Flowing silken mane locks along upper neck
      if (i >= 2) {
        for (const side of [-1, 0, 1]) {
          const maneLock = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 1.1 + (i - 2) * 0.3, 4),
            side === 0 ? crimsonRidgeMat : inkHairMat
          );
          maneLock.position.set(side * 0.22, def.rBase * 0.68, -def.len * 0.2);
          maneLock.rotation.set(1.1, side * 0.15, 0);
          segGroup.add(maneLock);
        }
      }

      parentSegment = segGroup;
    }

    // ── 4. Sculpted Predatory Dragon Head (Seamlessly attached to nape!) ──
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.04, -0.74);
    headGroup.rotation.x = -0.12; // Level forward alignment with flight path
    parentSegment.add(headGroup);
    this.headGroup = headGroup;

    // 1. Tapered Main Cranium / Braincase (faceted oval prism, broad at temples)
    const craniumGeo = new THREE.CylinderGeometry(0.42, 0.54, 1.25, 7);
    const craniumMesh = new THREE.Mesh(craniumGeo, blackScaleMat);
    craniumMesh.rotation.x = Math.PI / 2;
    craniumMesh.position.set(0, 0.08, -0.45);
    craniumMesh.scale.set(1.15, 0.72, 1.0);
    headGroup.add(craniumMesh);

    // Occipital Armor Cowl (Back of skull shielding the nape joint - completely eliminates flat box back!)
    const cowlMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.52, 0.65, 6),
      armoredPlateMat
    );
    cowlMesh.rotation.x = Math.PI / 2 - 0.2;
    cowlMesh.position.set(0, 0.14, 0.12);
    cowlMesh.scale.set(1.22, 0.65, 0.9);
    headGroup.add(cowlMesh);

    // Sculpted Occipital Crown Plates (overlapping armored scales on skull roof)
    for (let c = 0; c < 3; c++) {
      const crownPlate = new THREE.Mesh(
        new THREE.ConeGeometry(0.32 - c * 0.06, 0.55, 4),
        armoredPlateMat
      );
      crownPlate.position.set(0, 0.28 + c * 0.03, -0.05 - c * 0.32);
      crownPlate.rotation.x = 0.55;
      crownPlate.scale.set(1.4, 0.35, 1.0);
      headGroup.add(crownPlate);
    }

    // 2. Sculpted Predatory Snout & Muzzle (tapered wedge extending forward)
    const snoutGeo = new THREE.CylinderGeometry(0.24, 0.42, 1.55, 6);
    const snoutMesh = new THREE.Mesh(snoutGeo, blackScaleMat);
    snoutMesh.rotation.x = Math.PI / 2;
    snoutMesh.position.set(0, 0.02, -1.65);
    snoutMesh.scale.set(1.0, 0.68, 1.0);
    headGroup.add(snoutMesh);

    // Stepped Nasal Bridge Armor Ridges (serrated dragon scales along snout)
    for (let s = 0; s < 4; s++) {
      const t = s / 3;
      const ridgeScale = new THREE.Mesh(
        new THREE.ConeGeometry(0.18 * (1.0 - t * 0.35), 0.35, 4),
        crimsonRidgeMat
      );
      ridgeScale.position.set(0, 0.18 - t * 0.05, -1.1 - s * 0.38);
      ridgeScale.rotation.x = 0.65;
      ridgeScale.scale.set(1.3, 0.35, 1.0);
      headGroup.add(ridgeScale);
    }

    // Rostral Fang / Snout Blade Hornlet (tip of the upper nose)
    const rostralHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.38, 4),
      crimsonRidgeMat
    );
    rostralHorn.position.set(0, 0.12, -2.42);
    rostralHorn.rotation.x = 0.85;
    headGroup.add(rostralHorn);

    // Sculpted Flared Nostrils (龍鼻) with glowing internal embers
    for (const side of [-1, 1]) {
      const nostril = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.05, 0.28, 5),
        armoredPlateMat
      );
      nostril.position.set(side * 0.22, 0.06, -2.25);
      nostril.rotation.set(0.4, side * 0.3, side * -0.4);
      headGroup.add(nostril);

      const nostrilEmber = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 4, 4),
        mawFireMat
      );
      nostrilEmber.position.set(side * 0.22, 0.04, -2.27);
      headGroup.add(nostrilEmber);
    }

    // 3. Flared Temporal Cheeks & Zygomatic Armor (broad ferocious dragon jowls)
    for (const side of [-1, 1]) {
      const cheekPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.38, 1.1),
        armoredPlateMat
      );
      cheekPlate.position.set(side * 0.46, -0.02, -0.55);
      cheekPlate.rotation.set(0.12, side * -0.25, side * 0.2);
      headGroup.add(cheekPlate);

      // Backward-raking cheek spur (malar horn - flaring outward)
      const cheekSpur = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.75, 4),
        hornBoneMat
      );
      cheekSpur.position.set(side * 0.56, -0.05, -0.15);
      cheekSpur.rotation.set(1.15, side * 0.35, -side * 0.45);
      headGroup.add(cheekSpur);
    }

    // 4. Fierce Brow Ridges & Deep-Set Ruby Dragon Eyes
    for (const side of [-1, 1]) {
      // Slanted Supraorbital Brow Plate
      const browPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.16, 0.82),
        armoredPlateMat
      );
      browPlate.position.set(side * 0.38, 0.22, -0.95);
      browPlate.rotation.set(0.25, side * -0.22, -side * 0.28);
      headGroup.add(browPlate);

      // Sharp Brow Hornlet (flaring outward, ancient ivory bone)
      const browSpur = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.52, 4),
        hornBoneMat
      );
      browSpur.position.set(side * 0.42, 0.30, -0.85);
      browSpur.rotation.set(0.85, side * 0.25, -side * 0.35);
      headGroup.add(browSpur);

      // Burning Crimson Dragon Eye with Gold Iris Ring
      const eyeCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        eyeGlowMat
      );
      eyeCore.position.set(side * 0.39, 0.12, -1.02);
      headGroup.add(eyeCore);

      const eyeRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.022, 4, 8),
        dragonGoldMat
      );
      eyeRing.position.set(side * 0.40, 0.12, -1.02);
      eyeRing.rotation.y = side * (Math.PI / 2 - 0.2);
      headGroup.add(eyeRing);
    }

    // 5. Grand Mythic Crown Horns (九天神龍角) - Flaring OUTWARD & Swept BACKWARD along collar flanks (Pure Ivory & Gold)
    for (const side of [-1, 1]) {
      const hornRootGroup = new THREE.Group();
      hornRootGroup.position.set(side * 0.36, 0.28, 0.12);
      // Swept backward (rotation.x = 1.25) and flaring OUTWARD (-side * 0.48)
      hornRootGroup.rotation.set(1.25, side * 0.15, -side * 0.48);
      headGroup.add(hornRootGroup);

      // Segment A: Horn base with Imperial Gold rune collar
      const hornBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.21, 0.72, 6),
        hornBoneMat
      );
      hornBase.position.set(0, 0.36, 0);
      hornRootGroup.add(hornBase);

      const goldCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.23, 0.20, 8),
        dragonGoldMat
      );
      goldCollar.position.set(0, 0.15, 0);
      hornRootGroup.add(goldCollar);

      // Segment B: Mid-horn arch curving further outward and back along collar
      const hornMidGroup = new THREE.Group();
      hornMidGroup.position.set(0, 0.70, 0);
      hornMidGroup.rotation.set(0.18, side * 0.08, -side * 0.22);
      hornRootGroup.add(hornMidGroup);

      const hornMid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.10, 0.16, 0.85, 6),
        hornBoneMat
      );
      hornMid.position.set(0, 0.42, 0);
      hornMidGroup.add(hornMid);

      // Segment C: Recurved razor-sharp horn tip (Pure ancient ivory bone, zero red!)
      const hornTipGroup = new THREE.Group();
      hornTipGroup.position.set(0, 0.82, 0);
      hornTipGroup.rotation.set(0.15, side * -0.05, -side * 0.12);
      hornMidGroup.add(hornTipGroup);

      const hornTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.10, 0.95, 5),
        hornBoneMat
      );
      hornTip.position.set(0, 0.48, 0);
      hornTipGroup.add(hornTip);

      // Secondary Temporal Ram Horn (flaring low and outward along the cheek)
      const subHorn = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.95, 5),
        hornBoneMat
      );
      subHorn.position.set(side * 0.50, 0.12, 0.05);
      subHorn.rotation.set(1.35, side * 0.35, -side * 0.55);
      headGroup.add(subHorn);
    }

    // 6. Upper Maxilla & Deadly Ancient Ivory Saber Fangs (龍牙)
    for (const side of [-1, 1]) {
      const saberFang = new THREE.Mesh(
        new THREE.ConeGeometry(0.065, 0.62, 5),
        toothIvoryMat
      );
      saberFang.position.set(side * 0.23, -0.22, -1.55);
      saberFang.rotation.set(-0.25, 0, side * -0.15);
      headGroup.add(saberFang);

      // Secondary needle fangs along upper jaw
      for (let f = 0; f < 3; f++) {
        const needleFang = new THREE.Mesh(
          new THREE.ConeGeometry(0.04, 0.32, 4),
          toothIvoryMat
        );
        needleFang.position.set(side * (0.24 - f * 0.03), -0.16, -1.82 - f * 0.18);
        needleFang.rotation.set(-0.2, 0, side * -0.1);
        headGroup.add(needleFang);
      }
    }

    // 7. Articulated Lower Jaw Mandible (龍顎) with Flowing Beard & Interior Maw Fire
    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, -0.14, -0.65);
    headGroup.add(jawGroup);
    this.jawGroup = jawGroup;

    // Sculpted lower jaw chin plate
    const jawMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.35, 1.85, 6),
      blackScaleMat
    );
    jawMesh.rotation.x = Math.PI / 2 + 0.08; // Menacing slightly open maw
    jawMesh.position.set(0, -0.12, -0.85);
    jawMesh.scale.set(0.9, 0.55, 1.0);
    jawGroup.add(jawMesh);

    // Segmented underbelly scales along underside of jaw
    const jawPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.26, 1.7, 5),
      armoredPlateMat
    );
    jawPlate.rotation.x = Math.PI / 2 + 0.08;
    jawPlate.position.set(0, -0.24, -0.82);
    jawPlate.scale.set(0.85, 0.35, 1.0);
    jawGroup.add(jawPlate);

    // Upward-locking lower fangs
    for (const side of [-1, 1]) {
      const lowerFang = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.42, 4),
        toothIvoryMat
      );
      lowerFang.position.set(side * 0.18, 0.02, -1.45);
      lowerFang.rotation.set(Math.PI - 0.25, 0, side * 0.15);
      jawGroup.add(lowerFang);
    }

    // Glowing Magma Dragon Furnace inside the mouth
    const mouthFurnace = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      mawFireMat
    );
    mouthFurnace.position.set(0, 0.04, -1.05);
    mouthFurnace.scale.set(0.8, 0.5, 1.3);
    jawGroup.add(mouthFurnace);

    // Flowing Dragon Chin Beard (龍髯) streaming backward under throat
    for (let b = 0; b < 5; b++) {
      const side = (b - 2) * 0.07;
      const bLen = 1.3 + Math.abs(b - 2) * -0.2;
      const beardLock = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, bLen, 4),
        b % 2 === 0 ? crimsonRidgeMat : inkHairMat
      );
      beardLock.position.set(side, -0.32, -1.55 + Math.abs(b - 2) * 0.15);
      beardLock.rotation.set(Math.PI / 2 + 0.25, side * 0.5, 0);
      jawGroup.add(beardLock);
    }

    // 8. Flowing Celestial Dragon Whiskers (龍鬚)
    this.whiskersLeft = new THREE.Group();
    this.whiskersLeft.position.set(0.28, 0.02, -2.1);
    headGroup.add(this.whiskersLeft);

    this.whiskersRight = new THREE.Group();
    this.whiskersRight.position.set(-0.28, 0.02, -2.1);
    headGroup.add(this.whiskersRight);

    for (const isRight of [false, true]) {
      const whiskerRoot = isRight ? this.whiskersRight : this.whiskersLeft;
      const sign = isRight ? -1 : 1;

      let prevWhisker: THREE.Object3D = whiskerRoot;
      const whiskerDefs = [
        { rad: 0.055, len: 1.0, rot: new THREE.Euler(0.2, sign * 0.65, sign * 0.35) },
        { rad: 0.042, len: 1.1, rot: new THREE.Euler(0.25, sign * -0.2, sign * -0.15) },
        { rad: 0.028, len: 1.2, rot: new THREE.Euler(0.2, sign * -0.15, 0) },
      ];

      for (let w = 0; w < whiskerDefs.length; w++) {
        const wd = whiskerDefs[w];
        const seg = new THREE.Group();
        seg.rotation.copy(wd.rot);
        if (w > 0) {
          seg.position.set(0, -0.05, -whiskerDefs[w - 1].len * 0.9);
        }
        prevWhisker.add(seg);

        const whiskerTube = new THREE.Mesh(
          new THREE.CylinderGeometry(wd.rad * 0.7, wd.rad, wd.len, 5),
          crimsonRidgeMat
        );
        whiskerTube.rotation.x = Math.PI / 2;
        whiskerTube.position.set(0, 0, -wd.len * 0.5);
        seg.add(whiskerTube);

        prevWhisker = seg;
      }
    }

    // 9. Majestic Silken Nape Mane (龍鬃) bridging the cranium and cervical spine
    for (let m = 0; m < 7; m++) {
      const angle = (m / 6 - 0.5) * 0.9;
      const isCrimson = m % 2 === 0;
      const maneLock = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 1.6 + Math.cos(angle) * 0.4, 4),
        isCrimson ? hairTuftMat : inkHairMat
      );
      maneLock.position.set(Math.sin(angle) * 0.35, 0.35, 0.25 - Math.cos(angle) * 0.2);
      maneLock.rotation.set(1.25, angle * 0.4, 0);
      headGroup.add(maneLock);
    }

    // ── 4. Grand Mythic Wings with Unified Webbing & Skeletal Bones ──
    const buildWing = (isRight: boolean): THREE.Group => {
      const wing = new THREE.Group();
      const sign = isRight ? 1 : -1;
      wing.position.set(sign * 1.1, 0.55, 0.1);

      // Key skeletal joint anchors
      const pShoulder = new THREE.Vector3(sign * 0.2, 0.1, -0.2);
      const pElbow = new THREE.Vector3(sign * 3.4, 1.2, -0.3);
      const pWrist = new THREE.Vector3(sign * 6.5, 0.8, 0.4);
      const pTip1 = new THREE.Vector3(sign * 10.2, 0.4, 0.9);   // Leading wingtip
      const pTip2 = new THREE.Vector3(sign * 8.8, -0.4, 2.5);  // Mid-wing trailing feather
      const pTip3 = new THREE.Vector3(sign * 6.8, -0.7, 3.6);  // Inner wing trailing feather
      const pFlank = new THREE.Vector3(sign * 0.6, -0.5, 2.0);  // Torso flank attachment
      const pMid = new THREE.Vector3(sign * 3.8, -0.1, 1.6);    // Webbing inner anchor

      // Skeletal bone tubes directly along the leading edge and fingers
      wing.add(this.createBone(pShoulder, pElbow, 0.36, wingRibMat));
      wing.add(this.createBone(pElbow, pWrist, 0.28, wingRibMat));
      wing.add(this.createBone(pWrist, pTip1, 0.16, wingRibMat));
      wing.add(this.createBone(pWrist, pTip2, 0.14, wingRibMat));
      wing.add(this.createBone(pWrist, pTip3, 0.12, wingRibMat));

      // Backward-raking elbow spur
      const elbowSpur = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 1.6, 5),
        hornBoneMat
      );
      elbowSpur.position.copy(pElbow).add(new THREE.Vector3(sign * 0.2, 0.3, -0.4));
      elbowSpur.rotation.set(-0.7, 0, sign * 0.6);
      wing.add(elbowSpur);

      // Claw tips on each finger
      for (const tipPos of [pTip1, pTip2, pTip3]) {
        const claw = new THREE.Mesh(
          new THREE.ConeGeometry(0.1, 0.7, 4),
          crimsonRidgeMat
        );
        claw.position.copy(tipPos);
        claw.rotation.set(0.6, 0, sign * -0.5);
        wing.add(claw);
      }

      // Continuous Unified Webbing Membrane (zero gaps, zero separated sticks!)
      const membraneGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        pShoulder.x, pShoulder.y, pShoulder.z, // 0
        pElbow.x, pElbow.y, pElbow.z,          // 1
        pWrist.x, pWrist.y, pWrist.z,          // 2
        pTip1.x, pTip1.y, pTip1.z,             // 3
        pTip2.x, pTip2.y, pTip2.z,             // 4
        pTip3.x, pTip3.y, pTip3.z,             // 5
        pFlank.x, pFlank.y, pFlank.z,          // 6
        pMid.x, pMid.y, pMid.z,                // 7
      ]);

      const indices = [
        0, 1, 7,
        1, 2, 7,
        2, 3, 4,
        2, 4, 5,
        2, 5, 7,
        0, 7, 6,
      ];

      membraneGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      membraneGeo.setIndex(indices);
      membraneGeo.computeVertexNormals();

      const membraneMesh = new THREE.Mesh(membraneGeo, wingMembraneMat);
      wing.add(membraneMesh);

      return wing;
    };

    this.leftWing = buildWing(false);
    this.rightWing = buildWing(true);
    this.mesh.add(this.leftWing);
    this.mesh.add(this.rightWing);

    // ── 5. Serpentine Dragon Tail & Flowing Mythic Hair Plume (龍尾鬃毛) ──
    const tailRoot = new THREE.Group();
    // Seamlessly emerges from the tapered pelvic rump at z = 3.25
    tailRoot.position.set(0, 0.04, 3.25);
    this.mesh.add(tailRoot);

    this.tailSegments = [];
    let prevParent: THREE.Object3D = tailRoot;
    const numSegments = 7;

    for (let t = 0; t < numSegments; t++) {
      const segGroup = new THREE.Group();
      // First segment overlaps directly into pelvic opening; subsequent segments step back by 0.95
      segGroup.position.set(0, -0.02, t === 0 ? 0.45 : 0.95);
      prevParent.add(segGroup);
      this.tailSegments.push(segGroup);

      const taper = 1.0 - (t / numSegments) * 0.75;
      const baseR = t === 0 ? 0.58 : 0.55 * taper;
      const topR = 0.55 * taper * 0.85;
      const segMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(topR, baseR, 1.05, 8),
        blackScaleMat
      );
      segMesh.rotation.x = Math.PI / 2;
      segGroup.add(segMesh);

      // Flowing crimson dorsal crest along each segment
      const dorsalLock = new THREE.Mesh(
        new THREE.ConeGeometry(0.12 * taper, 0.65 * taper, 4),
        crimsonRidgeMat
      );
      dorsalLock.position.set(0, 0.45 * taper, 0);
      dorsalLock.rotation.x = 0.55;
      segGroup.add(dorsalLock);

      // Final segment: Celestial Flowing Dragon Tail Hair Plume (龍尾鬃毛)
      if (t === numSegments - 1) {
        const hairPlumeGroup = new THREE.Group();
        hairPlumeGroup.position.set(0, 0, 0.6);

        // Reuse unified hair materials defined above

        // 1. Central tapered brush-core hair
        const coreHair = new THREE.Mesh(
          new THREE.ConeGeometry(0.25, 3.2, 8),
          hairTuftMat
        );
        coreHair.position.set(0, 0, 1.6);
        coreHair.rotation.x = Math.PI / 2;
        hairPlumeGroup.add(coreHair);

        // 2. Multi-layered surrounding silken hair locks (calligraphy brush whiskers)
        const lockCount = 8;
        for (let l = 0; l < lockCount; l++) {
          const angle = (l / lockCount) * Math.PI * 2;
          const isTopOrSide = Math.sin(angle) > -0.2;
          const mat = isTopOrSide ? hairTuftMat : inkHairMat;
          const lockLen = 2.4 + Math.cos(l * 1.5) * 0.6;
          const lock = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, lockLen, 5),
            mat
          );
          const rad = 0.22;
          lock.position.set(Math.cos(angle) * rad, Math.sin(angle) * rad, 1.3);
          lock.rotation.set(
            Math.PI / 2 + Math.sin(angle) * 0.12,
            0,
            Math.cos(angle) * 0.12
          );
          hairPlumeGroup.add(lock);
        }

        // 3. Twin sweeping silk hair ribbons (whiskers flowing behind)
        for (const side of [-1, 1]) {
          const ribbon = new THREE.Mesh(
            new THREE.ConeGeometry(0.09, 3.6, 4),
            hairTuftMat
          );
          ribbon.position.set(side * 0.32, -0.05, 1.8);
          ribbon.rotation.set(Math.PI / 2, side * 0.16, 0);
          hairPlumeGroup.add(ribbon);
        }

        segGroup.add(hairPlumeGroup);
      }

      prevParent = segGroup;
    }
  }

  /**
   * Summon and mount the dragon at player's current position.
   */
  public mount(playerPos: THREE.Vector3, playerRotY: number): void {
    this.isMounted = true;
    this.position.copy(playerPos).add(new THREE.Vector3(0, -0.5, 0));
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, playerRotY, 0);
    this.mesh.visible = true;

    this.pitch = 0;
    this.roll = 0;
    this.currentSpeed = this.cruisingSpeed;

    audioManager.playSFX("parry");
    this.particles.emitBurst({
      position: this.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
      count: 36,
      speed: 10,
      life: 0.8,
      size: 0.45,
      color: new THREE.Color(0xef4444),
    });

    const store = useGameStore.getState();
    store.setDragonMounted(true);
    store.setBattleBanner("VEYROS MOUNTED — [SHIFT] SPEED GLIDE · AIM DOWN TO DIVE", 3.0);
  }

  /**
   * Dismount dragon with an explosive forward leap / Qinggong plunge.
   */
  public dismount(): { launchVelocity: THREE.Vector3 } {
    this.isMounted = false;
    this.mesh.visible = false;
    useGameStore.getState().setDragonMounted(false);

    // Launch vector forward and slightly upward
    _scratchForward.set(0, 0, -1).applyEuler(this.mesh.rotation).normalize();
    const launchVelocity = _scratchForward.clone().multiplyScalar(24.0).add(new THREE.Vector3(0, 6.0, 0));

    audioManager.playSFX("soft_landing");
    this.particles.emitBurst({
      position: this.position.clone(),
      count: 28,
      speed: 8,
      life: 0.5,
      size: 0.35,
      color: new THREE.Color(0xf59e0b),
    });

    return { launchVelocity };
  }

  /**
   * Update flight physics, steering, wing flap cycle, aerodynamic dive glide, and position.
   */
  public update(
    dt: number,
    moveInput: { x: number; y: number },
    cameraDir: THREE.Vector3,
    isAscending: boolean,
    isDescending: boolean,
    isBoosting: boolean,
    boostForce: THREE.Vector3 | null
  ): void {
    if (!this.isMounted) return;
    if (this.isFlightPaused) {
      this.velocity.set(0, 0, 0);
      return;
    }

    // Base target flight speed
    const baseTargetSpeed = isBoosting ? this.boostSpeed : this.cruisingSpeed;

    // ── Steering: Yaw & Pitch towards Camera Aim Vector (Dogfight / 360° Shooter Style) ──
    _scratchCamFlat.set(cameraDir.x, 0, cameraDir.z);
    let diffYaw = 0;
    if (_scratchCamFlat.lengthSq() > 0.0001) {
      _scratchCamFlat.normalize();
      const targetYaw = Math.atan2(-_scratchCamFlat.x, -_scratchCamFlat.z);
      diffYaw = targetYaw - this.mesh.rotation.y;
      while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
      while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
      this.mesh.rotation.y += diffYaw * Math.min(1.0, dt * 8.5);
      while (this.mesh.rotation.y < -Math.PI) this.mesh.rotation.y += Math.PI * 2;
      while (this.mesh.rotation.y > Math.PI) this.mesh.rotation.y -= Math.PI * 2;
    }

    // Pitch: Smoothly track camera aim direction across the entire vertical axis
    let targetPitch = Math.asin(THREE.MathUtils.clamp(cameraDir.y, -0.98, 0.98));
    if (moveInput.y !== 0) {
      targetPitch -= moveInput.y * 0.55;
    }
    targetPitch = THREE.MathUtils.clamp(targetPitch, -1.54, 1.54); // Full ~88.5-degree climb or supersonic dive
    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, dt * 7.5);
    this.mesh.rotation.x = this.pitch;

    // ── Aerodynamic Dive Glide Gravity Acceleration & Momentum Carry ──
    // Pitching downward (nose pointed toward ground/sea) accelerates the dragon steeply into a dive
    if (this.pitch < -0.08) {
      const diveSteepness = Math.min(1.4, -this.pitch);
      const diveAccel = diveSteepness * (isBoosting ? 90.0 : 50.0);
      this.currentSpeed = Math.min(this.maxDiveSpeed, this.currentSpeed + diveAccel * dt);
    } else {
      // Level flight / climb: carry dive glide momentum, snap quickly to boost speed when Shift held
      const accelRate = isBoosting ? 10.0 : (this.currentSpeed > baseTargetSpeed ? 1.5 : 5.5);
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, baseTargetSpeed, dt * accelRate);
    }

    // ── Barrel Roll Update ──
    if (this.barrelRollCooldown > 0) {
      this.barrelRollCooldown -= dt;
    }

    if (this.isBarrelRolling) {
      this.barrelRollTimer -= dt;
      // 360° roll over the duration
      const rollProgress = 1.0 - (this.barrelRollTimer / this.BARREL_ROLL_DURATION);
      const rollAngle = this.barrelRollDirection * rollProgress * Math.PI * 2;
      this.mesh.rotation.z = rollAngle;
      // Speed boost during roll
      this.currentSpeed = this.preRollSpeed * this.BARREL_ROLL_SPEED_BOOST;

      if (this.barrelRollTimer <= 0) {
        this.isBarrelRolling = false;
        this.barrelRollTimer = 0;
        this.barrelRollCooldown = this.BARREL_ROLL_COOLDOWN;
        this.mesh.rotation.z = 0;
      }
    } else {
      // Natural banking roll into turns + strafe banking (flight simulator feel)
      const turnBank = -diffYaw * 1.6 - moveInput.x * 0.55;
      const targetRoll = THREE.MathUtils.clamp(turnBank, -0.85, 0.85);
      this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, dt * 7.5);
      this.mesh.rotation.z = this.roll;
    }

    // ── Forward Flight Velocity ──
    _scratchForward.set(0, 0, -1).applyEuler(this.mesh.rotation).normalize();
    this.velocity.copy(_scratchForward).multiplyScalar(this.currentSpeed);

    // Ascend lift with Space [JUMP]
    if (isAscending) {
      this.velocity.y += 32.0;
    }
    // Descend dive with C / Ctrl
    if (isDescending) {
      this.velocity.y -= 24.0;
    }

    // Apply external boost rings force
    if (boostForce) {
      this.velocity.add(boostForce);
    }

    // Update position
    this.position.addScaledVector(this.velocity, dt);

    // UNLIMITED CEILING: Safe minimum altitude above ocean waves, completely unconstrained sky exploration!
    this.position.y = Math.max(3.5, this.position.y);
    const limit = 25000;
    this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
    this.position.z = Math.max(-limit, Math.min(limit, this.position.z));

    this.mesh.position.copy(this.position);

    // ── Supersonic Rocket Jet Contrails & Afterburner Exhaust ──
    if (this.currentSpeed > 55.0) {
      const leftTip = new THREE.Vector3(-8.8, 0.4, 2.2).applyEuler(this.mesh.rotation).add(this.position);
      const rightTip = new THREE.Vector3(8.8, 0.4, 2.2).applyEuler(this.mesh.rotation).add(this.position);
      const trailColor = this.currentSpeed > 110 ? new THREE.Color(0x38bdf8) : new THREE.Color(0xe0f2fe);
      this.particles.emitBurst({
        position: leftTip,
        count: 2,
        speed: 1.5,
        life: 0.35,
        size: 0.35,
        color: trailColor,
      });
      this.particles.emitBurst({
        position: rightTip,
        count: 2,
        speed: 1.5,
        life: 0.35,
        size: 0.35,
        color: trailColor,
      });
    }

    // ── Procedural Wing Flapping & High-Speed Aerodynamic Tuck ──
    const isSpeedGliding = this.currentSpeed > 40.0;
    const flapRate = isSpeedGliding ? 2.5 : (4.5 + (this.currentSpeed / this.cruisingSpeed) * 3.0);
    this.wingFlapTimer += dt * flapRate;

    // Swept-back wing tuck factor when speed-gliding
    const tuckFactor = Math.min(1.0, Math.max(0.0, (this.currentSpeed - 36.0) / 32.0));
    const flapAmp = 0.48 * (1.0 - tuckFactor * 0.65); // Flap amplitude flattens in speed-glide
    const flapAngle = Math.sin(this.wingFlapTimer) * flapAmp;

    this.leftWing.rotation.z = flapAngle;
    this.rightWing.rotation.z = -flapAngle;

    // Aerodynamic swept-back delta wing angle in high-speed dive
    this.leftWing.rotation.y = -tuckFactor * 0.4;
    this.rightWing.rotation.y = tuckFactor * 0.4;
    this.leftWing.rotation.x = tuckFactor * 0.12;
    this.rightWing.rotation.x = tuckFactor * 0.12;

    // ── Procedural Tail Swish ──
    for (let i = 0; i < this.tailSegments.length; i++) {
      const seg = this.tailSegments[i];
      seg.rotation.y = Math.sin(this.wingFlapTimer * 0.7 - i * 0.5) * 0.18;
    }

    // ── Procedural Serpentine Neck Articulation & Dynamic Head Lead ──
    const flapPhase = this.wingFlapTimer;
    for (let i = 0; i < this.neckSegments.length; i++) {
      const seg = this.neckSegments[i];
      // Subtle serpentine breathing wave traveling up the spine
      const wave = Math.sin(flapPhase * 0.85 - i * 0.45) * 0.035;
      // Banking turn lead: neck and head smoothly curve into the turn
      const bankTurn = -diffYaw * (0.18 + i * 0.06);
      seg.rotation.y = THREE.MathUtils.lerp(seg.rotation.y, bankTurn + wave * 0.4, dt * 7.0);
      // Aerodynamic pitch flex: tucks slightly in dive, arches in climb
      const pitchFlex = -this.pitch * 0.12 + (isBoosting ? 0.06 : 0);
      seg.rotation.x = THREE.MathUtils.lerp(seg.rotation.x, pitchFlex + wave * 0.5, dt * 7.0);
    }

    // Dynamic whisker flutter in the flight slipstream
    const whiskerAmp = 0.06 + Math.min(0.18, this.currentSpeed * 0.0035);
    const whiskerFlutter = Math.sin(flapPhase * 2.5 + this.wingFlapTimer * 3.0) * whiskerAmp;
    this.whiskersLeft.rotation.z = whiskerFlutter;
    this.whiskersRight.rotation.z = -whiskerFlutter;
    this.whiskersLeft.rotation.y = Math.sin(flapPhase * 1.8) * 0.05;
    this.whiskersRight.rotation.y = -Math.sin(flapPhase * 1.8) * 0.05;

    // Subtle jaw breathing flex
    if (this.jawGroup) {
      const jawGap = Math.sin(flapPhase * 0.6) * 0.035 + (isBoosting ? 0.07 : 0.02);
      this.jawGroup.rotation.x = jawGap;
    }

    // Wingtip aerodynamic condensation vapor trails in speed glide
    if (isSpeedGliding && Math.random() < 0.45) {
      const wingDist = 8.2 * (1.0 - tuckFactor * 0.25);
      for (const side of [-1, 1]) {
        _scratchVaporPos.set(side * wingDist, -0.2, 1.8).applyEuler(this.mesh.rotation).add(this.position);
        this.particles.emitAmbient(_scratchVaporPos, 1, 0.35);
      }
    }

    // Barrel roll spiral trail VFX
    if (this.isBarrelRolling && Math.random() < 0.6) {
      const rollProgress = 1.0 - (this.barrelRollTimer / this.BARREL_ROLL_DURATION);
      const trailAngle = rollProgress * Math.PI * 4; // Spiral
      const trailOffset = new THREE.Vector3(
        Math.cos(trailAngle) * 3.0,
        Math.sin(trailAngle) * 2.0,
        0
      ).applyEuler(this.mesh.rotation);
      this.particles.emitAmbient(
        this.position.clone().add(trailOffset),
        2,
        0.5
      );
    }
  }

  /**
   * Trigger a barrel roll dodge in the given direction.
   * Returns true if the roll was initiated, false if on cooldown.
   */
  public triggerBarrelRoll(direction: 1 | -1): boolean {
    if (this.isBarrelRolling || this.barrelRollCooldown > 0 || !this.isMounted) return false;

    this.isBarrelRolling = true;
    this.barrelRollTimer = this.BARREL_ROLL_DURATION;
    this.barrelRollDirection = direction;
    this.preRollSpeed = this.currentSpeed;

    audioManager.playSFX("dodge");
    useGameStore.getState().setBattleBanner(
      direction === -1 ? "BARREL ROLL EVADE (LEFT)" : "BARREL ROLL EVADE (RIGHT)",
      1.2
    );

    // Burst VFX on roll start
    this.particles.emitBurst({
      position: this.position.clone(),
      count: 16,
      speed: 8,
      life: 0.4,
      size: 0.35,
      color: new THREE.Color(0xdc2626),
    });

    return true;
  }

  /**
   * Whether the dragon is currently invulnerable (barrel roll i-frames).
   */
  public get invulnerable(): boolean {
    return this.isBarrelRolling;
  }

  /**
   * Get the current speed tier for damage scaling.
   * Returns: 'normal' (<32), 'swift' (32-50), 'supersonic' (>50)
   */
  public getSpeedTier(): 'normal' | 'swift' | 'supersonic' {
    if (this.currentSpeed > 50) return 'supersonic';
    if (this.currentSpeed >= 32) return 'swift';
    return 'normal';
  }

  public getSaddlePosition(): THREE.Vector3 {
    this.saddleAnchor.getWorldPosition(_scratchSaddlePos);
    return _scratchSaddlePos;
  }

  /**
   * Awaken Veyros from his dormant slumber.
   */
  public awaken(): void {
    this.isAwake = true;
    audioManager.playSFX("boss_ripple");
    this.particles.emitBurst({
      position: this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)),
      count: 36,
      speed: 6,
      life: 0.8,
      size: 0.35,
      color: new THREE.Color(0xdc2626),
    });
  }

  /**
   * Update idle sleeping or waiting animation when not mounted.
   */
  public updateIdle(dt: number, timeSec: number): void {
    if (this.isMounted || !this.mesh.visible) return;

    if (!this.isAwake) {
      // Resting on dais: slow gentle breathing, neck relaxed low
      if (this.torso) {
        this.torso.scale.x = 1.0 + Math.sin(timeSec * 1.5) * 0.04;
        this.torso.scale.y = 1.0 + Math.sin(timeSec * 1.5) * 0.04;
      }
      for (let i = 0; i < this.neckSegments.length; i++) {
        const seg = this.neckSegments[i];
        const sleepRest = 0.02 + Math.sin(timeSec * 1.2 - i * 0.3) * 0.015;
        seg.rotation.x = THREE.MathUtils.lerp(seg.rotation.x, sleepRest, dt * 2.5);
        seg.rotation.y = THREE.MathUtils.lerp(seg.rotation.y, 0, dt * 2.5);
      }
      if (this.headGroup) {
        this.headGroup.rotation.x = 0.04 + Math.sin(timeSec * 1.2) * 0.02;
      }
      if (this.leftWing && this.rightWing) {
        this.leftWing.rotation.z = -0.3;
        this.rightWing.rotation.z = 0.3;
      }
    } else {
      // Awakened: neck arched proudly, head high and watchful
      if (this.torso) {
        this.torso.scale.x = 1.0 + Math.sin(timeSec * 2.5) * 0.03;
        this.torso.scale.y = 1.0 + Math.sin(timeSec * 2.5) * 0.03;
      }
      for (let i = 0; i < this.neckSegments.length; i++) {
        const seg = this.neckSegments[i];
        const alertArch = -0.05 + Math.sin(timeSec * 2.0 - i * 0.3) * 0.025;
        seg.rotation.x = THREE.MathUtils.lerp(seg.rotation.x, alertArch, dt * 3.5);
        seg.rotation.y = THREE.MathUtils.lerp(seg.rotation.y, Math.sin(timeSec * 0.8) * 0.05, dt * 2.0);
      }
      if (this.headGroup) {
        this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, -0.08, dt * 3.0);
        this.headGroup.rotation.y = Math.sin(timeSec * 0.8) * 0.06;
      }
      if (this.leftWing && this.rightWing) {
        const flutter = Math.sin(timeSec * 2.0) * 0.12;
        this.leftWing.rotation.z = THREE.MathUtils.lerp(this.leftWing.rotation.z, -0.15 + flutter, dt * 4.0);
        this.rightWing.rotation.z = THREE.MathUtils.lerp(this.rightWing.rotation.z, 0.15 - flutter, dt * 4.0);
      }
    }

    // Dynamic whisker breathing sway during idle
    const idleWhisker = Math.sin(timeSec * 2.5) * 0.05;
    this.whiskersLeft.rotation.z = idleWhisker;
    this.whiskersRight.rotation.z = -idleWhisker;

    // Subtle tail sway while resting
    for (let i = 0; i < this.tailSegments.length; i++) {
      this.tailSegments[i].rotation.y = Math.sin(timeSec * 1.2 - i * 0.4) * 0.12;
    }
  }
}
