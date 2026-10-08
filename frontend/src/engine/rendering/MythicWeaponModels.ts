import * as THREE from "three";

/**
 * MythicWeaponModels — High-fidelity procedural 3D models for Murim weapons:
 * 1. Ancestral Dragon Sword (蒼龍破淵劍)
 * 2. Twin Sabers (雙刀)
 * 3. Sky-Piercer Spear (破天槍)
 * 4. Deflect Buckler (玄鐵盾)
 */

export class MythicWeaponModels {
  /**
   * Build the legendary Ancestral Dragon Sword (蒼龍破淵劍)
   * 1. Cold Steel double-edged straight blade
   * 2. Glowing pink blossom sword qi along fuller groove
   * 3. Five-petal golden blossom crossguard with ruby core
   * 4. Black braided silk hilt with gold pommel cap
   * 5. Flowing crimson & soft pink silk tassel with jade beads
   */
  static buildPlumBlossomSword(): THREE.Group {
    const sword = new THREE.Group();

    // Materials - Where Winds Meet Masterwork Wuxia Jian
    // ─── Dragon Sword Materials ───
    const obsidianSteelMat = new THREE.MeshStandardMaterial({
      color: 0x18181f, // Folded obsidian damascus steel
      metalness: 0.94,
      roughness: 0.16,
      emissive: 0x09090b,
      emissiveIntensity: 0.05,
    });

    const crimsonSpineMat = new THREE.MeshBasicMaterial({
      color: 0xef4444, // Burning crimson dragon qi meridian along blade spine
    });

    const dragonFangMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f4, // Ancient dragon fang ivory
      metalness: 0.25,
      roughness: 0.35,
      emissive: 0x451a03,
      emissiveIntensity: 0.08,
    });

    const dragonGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Ancient imperial gold fittings
      metalness: 0.95,
      roughness: 0.25,
    });

    const hiltMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Black braided dragon leather wrap
      roughness: 0.65,
      metalness: 0.1,
    });

    const rubyEyeMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Dragon heart ruby gem
      roughness: 0.1,
      metalness: 0.4,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.5,
    });

    const tasselMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c, // Crimson silk ribbon
      roughness: 0.45,
      side: THREE.DoubleSide,
    });

    // ── 1. Curved Eastern Dao / Katana Blade (1.32m) ──
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.quadraticCurveTo(0.045, 0.65, 0.12, 1.22); // Graceful curved cutting edge
    bladeShape.lineTo(0.075, 1.34); // Razor sweep kissaki point
    bladeShape.quadraticCurveTo(0.015, 0.65, -0.015, 0); // Spine curve
    bladeShape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.02,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.007,
      bevelThickness: 0.007,
    };
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    bladeGeo.center();

    const blade = new THREE.Mesh(bladeGeo, obsidianSteelMat);
    blade.position.set(0, 0.74, 0);
    blade.rotation.y = Math.PI / 2;
    blade.castShadow = true;
    sword.add(blade);

    // Glowing Dragon Spine Qi Fuller (Crimson pulse along dorsal ridge)
    const spineGeo = new THREE.BoxGeometry(0.012, 1.08, 0.025);
    const spineCore = new THREE.Mesh(spineGeo, crimsonSpineMat);
    spineCore.position.set(0, 0.70, -0.015);
    sword.add(spineCore);

    // ── 2. Twin Dragon Fang Crossguard ──
    const guardGroup = new THREE.Group();
    guardGroup.position.set(0, 0.10, 0);

    // Left curved dragon fang
    const leftFang = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.22, 6), dragonFangMat);
    leftFang.position.set(0.08, 0.06, 0);
    leftFang.rotation.z = -0.45;
    leftFang.castShadow = true;
    guardGroup.add(leftFang);

    // Right curved dragon fang
    const rightFang = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.22, 6), dragonFangMat);
    rightFang.position.set(-0.08, 0.06, 0);
    rightFang.rotation.z = 0.45;
    rightFang.castShadow = true;
    guardGroup.add(rightFang);

    // Central Gold Collar Disc with Inset Dragon Eye Ruby
    const centerCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.035, 12), dragonGoldMat);
    centerCollar.castShadow = true;
    guardGroup.add(centerCollar);

    const rubyEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), rubyEyeMat);
    rubyEye.position.y = 0.018;
    guardGroup.add(rubyEye);

    sword.add(guardGroup);

    // ── 3. Hilt & Black Braided Grip ──
    const gripGeo = new THREE.CylinderGeometry(0.028, 0.030, 0.32, 8);
    const grip = new THREE.Mesh(gripGeo, hiltMat);
    grip.position.set(0, -0.07, 0);
    grip.castShadow = true;
    sword.add(grip);

    // Gold dragon scale grip rings
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.005, 6, 14), dragonGoldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, -0.17 + r * 0.10, 0);
      ring.castShadow = true;
      sword.add(ring);
    }

    // Dragon Claw Pommel Cap
    const pommelGeo = new THREE.CylinderGeometry(0.044, 0.038, 0.045, 8);
    const pommel = new THREE.Mesh(pommelGeo, dragonGoldMat);
    pommel.position.set(0, -0.24, 0);
    pommel.castShadow = true;
    sword.add(pommel);

    const pommelRing = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 12), dragonGoldMat);
    pommelRing.position.set(0, -0.27, 0);
    sword.add(pommelRing);

    // ── 4. Trailing Crimson Silk Ribbon ──
    const tasselGroup = new THREE.Group();
    tasselGroup.position.set(0, -0.29, 0);

    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), dragonGoldMat);
    tasselGroup.add(bead);

    const ribbonGeo = new THREE.PlaneGeometry(0.035, 0.45);
    const ribbon = new THREE.Mesh(ribbonGeo, tasselMat);
    ribbon.position.set(0, -0.24, 0);
    tasselGroup.add(ribbon);

    sword.add(tasselGroup);

    sword.position.set(0, -0.35, 0.28);
    sword.rotation.x = Math.PI / 2;
    sword.name = "PlumBlossomSword";
    return sword;
  }

  /**
   * Build the legendary Leviathan Flying Axe with bearded blade, glowing frost runes,
   * ashwood handle with leather wraps, and rear spike.
   */
  static buildLeviathanAxe(): THREE.Group {
    const axe = new THREE.Group();

    // ── 1. Materials ──
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723, // Dense Nordic ashwood
      roughness: 0.75,
      metalness: 0.05,
    });
    const leatherWrapMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917, // Weathered leather wraps
      roughness: 0.8,
      metalness: 0.1,
    });
    const forgedIronMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Scorched dwarf-forged iron
      metalness: 0.88,
      roughness: 0.28,
    });
    const razorEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Polished silver cutting bevel
      metalness: 0.96,
      roughness: 0.12,
    });
    const goldFittingMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Engraved gold trims
      metalness: 0.9,
      roughness: 0.25,
    });
    const frostRuneMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // Glowing Cyan Sub-Zero Frost
    });

    // ── 2. Handle / Haft (centered so (0,0,0) is in hand grip) ──
    const haftGeo = new THREE.CylinderGeometry(0.024, 0.028, 0.95, 8);
    const haft = new THREE.Mesh(haftGeo, woodMat);
    haft.position.y = 0.15;
    axe.add(haft);

    // Leather grip wraps on handle
    const gripGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.32, 8);
    const grip = new THREE.Mesh(gripGeo, leatherWrapMat);
    grip.position.y = 0.0;
    axe.add(grip);

    // Gold pommel cap at base
    const pommelGeo = new THREE.CylinderGeometry(0.038, 0.022, 0.05, 8);
    const pommel = new THREE.Mesh(pommelGeo, goldFittingMat);
    pommel.position.y = -0.32;
    axe.add(pommel);

    // ── 3. Axe Head Collar ──
    const collarGeo = new THREE.BoxGeometry(0.08, 0.16, 0.08);
    const collar = new THREE.Mesh(collarGeo, forgedIronMat);
    collar.position.y = 0.52;
    axe.add(collar);

    // Gold rune band across collar
    const bandGeo = new THREE.BoxGeometry(0.086, 0.035, 0.086);
    const band = new THREE.Mesh(bandGeo, goldFittingMat);
    band.position.y = 0.52;
    axe.add(band);

    // ── 4. Bearded Main Cutting Blade (Curved forward crescent) ──
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, -0.06); // Lower throat
    bladeShape.quadraticCurveTo(0.16, -0.18, 0.32, -0.14); // Bearded lower hook
    bladeShape.quadraticCurveTo(0.38, 0.05, 0.32, 0.22);   // Swept cutting belly
    bladeShape.quadraticCurveTo(0.24, 0.28, 0.0, 0.18);    // Top spine back to collar
    bladeShape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.025,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.008,
      bevelThickness: 0.008,
    };
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    bladeGeo.center();

    const bladeMesh = new THREE.Mesh(bladeGeo, forgedIronMat);
    bladeMesh.position.set(0.18, 0.54, 0);
    axe.add(bladeMesh);

    // Razor Sharp Silver Bevel Edge
    const edgeGeo = new THREE.BoxGeometry(0.01, 0.36, 0.015);
    const edgeMesh = new THREE.Mesh(edgeGeo, razorEdgeMat);
    edgeMesh.position.set(0.31, 0.55, 0);
    edgeMesh.rotation.z = -0.12;
    axe.add(edgeMesh);

    // Glowing Frost Runes on blade face
    const runeGeo = new THREE.BoxGeometry(0.14, 0.018, 0.03);
    const runeMesh = new THREE.Mesh(runeGeo, frostRuneMat);
    runeMesh.position.set(0.16, 0.54, 0);
    axe.add(runeMesh);

    const runeGeo2 = new THREE.BoxGeometry(0.018, 0.12, 0.03);
    const runeMesh2 = new THREE.Mesh(runeGeo2, frostRuneMat);
    runeMesh2.position.set(0.2, 0.54, 0);
    axe.add(runeMesh2);

    // ── 5. Rear Spike / Poll ──
    const spikeGeo = new THREE.ConeGeometry(0.038, 0.15, 6);
    const spike = new THREE.Mesh(spikeGeo, forgedIronMat);
    spike.rotation.z = Math.PI / 2;
    spike.position.set(-0.11, 0.52, 0);
    axe.add(spike);

    return axe;
  }

  /**
   * Build a single Blade of Chaos with wide serrated Greek blade, glowing magma fissures,
   * horned demonic guard, and forearm chain loops.
   */
  static buildSingleBladeOfChaos(isOffhand: boolean = false): THREE.Group {
    const sword = new THREE.Group();

    // ── 1. Greek Serrated Curved Blade ──
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.lineTo(0.12, 0.35);
    bladeShape.lineTo(0.16, 0.42); // Serration 1
    bladeShape.lineTo(0.11, 0.48);
    bladeShape.lineTo(0.18, 0.72); // Serration 2
    bladeShape.lineTo(0.08, 0.78);
    bladeShape.lineTo(0.14, 0.98); // Hooked tip
    bladeShape.lineTo(0.0, 1.05);  // Point
    bladeShape.lineTo(-0.11, 0.65);
    bladeShape.lineTo(-0.08, 0.35);
    bladeShape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.035,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.01,
    };
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    bladeGeo.center();

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // scorched obsidian iron
      metalness: 0.92,
      roughness: 0.3,
      flatShading: true,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.52;
    blade.rotation.y = Math.PI / 2;
    sword.add(blade);

    // Glowing Lava Fissure line through center of blade
    const lavaGeo = new THREE.BoxGeometry(0.02, 0.65, 0.045);
    const lavaMat = new THREE.MeshBasicMaterial({
      color: 0xff3b00, // Molten Magma Orange-Red
      transparent: true,
      opacity: 0.9,
    });
    const lavaCore = new THREE.Mesh(lavaGeo, lavaMat);
    lavaCore.position.y = 0.52;
    sword.add(lavaCore);

    // Blade Edge Highlights
    const edgeLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(bladeGeo),
      new THREE.LineBasicMaterial({ color: 0xf97316 })
    );
    blade.add(edgeLines);

    // ── 2. Horned Demonic Crossguard ──
    const guardGeo = new THREE.BoxGeometry(0.32, 0.08, 0.1);
    const guardMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      metalness: 0.7,
      roughness: 0.4,
      flatShading: true,
    });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.02;
    sword.add(guard);

    // Demon horns on guard
    for (const s of [-1, 1]) {
      const hornGeo = new THREE.ConeGeometry(0.035, 0.14, 5);
      const horn = new THREE.Mesh(hornGeo, guardMat);
      horn.rotation.z = s * 0.6;
      horn.position.set(s * 0.16, 0.06, 0);
      sword.add(horn);
    }

    // ── 3. Handle & Chain Anchor ──
    const gripGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8);
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x292524 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.y = -0.14;
    sword.add(grip);

    // ── 4. Forearm Wrapped Metallic Chains ──
    const chainMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // fiery heated bronze-iron
      metalness: 0.9,
      roughness: 0.25,
    });
    for (let c = 0; c < 5; c++) {
      const linkGeo = new THREE.TorusGeometry(0.075, 0.016, 6, 12);
      const link = new THREE.Mesh(linkGeo, chainMat);
      link.position.set(0, -0.28 - c * 0.12, 0);
      link.rotation.x = Math.PI / 2 + (c % 2 === 0 ? 0.3 : -0.3);
      sword.add(link);
    }

    sword.position.set(0, -0.32, 0.22);
    sword.rotation.x = isOffhand ? -Math.PI / 2 : Math.PI / 2;
    sword.name = isOffhand ? "BladeOfChaos_Offhand" : "BladeOfChaos_Main";
    return sword;
  }

  /**
   * Build the Draupnir Spear with gleaming golden rings, runic Spartan spearhead,
   * and kinetic force emitter tip.
   */
  static buildDraupnirSpear(): THREE.Group {
    const spear = new THREE.Group();

    // ── 1. Polearm Shaft ──
    const shaftGeo = new THREE.CylinderGeometry(0.038, 0.038, 2.4, 8);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      metalness: 0.6,
      roughness: 0.4,
      flatShading: true,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.5;
    spear.add(shaft);

    // ── 2. Draupnir Multiplying Golden Rings ──
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // glowing Spartan gold
      metalness: 0.95,
      roughness: 0.15,
    });
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.TorusGeometry(0.055 + i * 0.006, 0.012, 8, 16);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 1.35 + i * 0.08;
      ring.rotation.x = Math.PI / 2;
      spear.add(ring);
    }

    // ── 3. Spartan Leaf Spearhead ──
    const headGeo = new THREE.ConeGeometry(0.14, 0.75, 4);
    headGeo.scale(1.2, 1, 0.3); // Flatted leaf blade
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.2,
      flatShading: true,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.95;
    spear.add(head);

    // Glowing Kinetic Force Edge
    const headLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(headGeo),
      new THREE.LineBasicMaterial({ color: 0x10b981 }) // Force Emerald
    );
    head.add(headLines);

    // Spear Butt (For Ground Slam Detonation [Q])
    const buttGeo = new THREE.CylinderGeometry(0.065, 0.045, 0.16, 8);
    const butt = new THREE.Mesh(buttGeo, ringMat);
    butt.position.y = -0.7;
    spear.add(butt);

    spear.position.set(0, -0.4, 0.3);
    spear.rotation.x = Math.PI / 2;
    spear.name = "DraupnirSpear";
    return spear;
  }

  /**
   * Build the Dauntless Shield (expands upon block/parry).
   */
  static buildDauntlessShield(): THREE.Group {
    const shieldGroup = new THREE.Group();

    // Round Buckler Shield
    const shieldGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.04, 16);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Spartan Bronze
      metalness: 0.85,
      roughness: 0.3,
      flatShading: true,
    });
    const disc = new THREE.Mesh(shieldGeo, shieldMat);
    disc.rotation.x = Math.PI / 2;
    shieldGroup.add(disc);

    // Center Spiked Umbo
    const umboGeo = new THREE.ConeGeometry(0.14, 0.16, 8);
    const umboMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.2,
    });
    const umbo = new THREE.Mesh(umboGeo, umboMat);
    umbo.rotation.x = Math.PI / 2;
    umbo.position.z = 0.06;
    shieldGroup.add(umbo);

    // Glowing Gold Deflect Runes Rim
    const rimGeo = new THREE.TorusGeometry(0.5, 0.025, 6, 24);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.z = 0.02;
    shieldGroup.add(rim);

    shieldGroup.position.set(0, -0.22, 0.15);
    shieldGroup.scale.set(0.01, 0.01, 0.01); // starts folded/closed until block
    shieldGroup.name = "DauntlessShield";
    return shieldGroup;
  }

  /**
   * Build a standalone flying Leviathan Axe projectile mesh for throw and recall animations.
   * Features spinning double-bearded axe, glowing frost blizzard vortex ring, and cyan vapor trail.
   */
  static buildThrownAxeMesh(): THREE.Group {
    const axe = this.buildLeviathanAxe();

    // Glowing cyan sub-zero frost vortex disc around spinning axe
    const haloGeo = new THREE.RingGeometry(0.2, 0.68, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0.12, 0.52, 0);
    axe.add(halo);

    // Inner bright white frost core
    const innerCore = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.5, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      })
    );
    innerCore.position.set(0.12, 0.52, 0.005);
    axe.add(innerCore);

    return axe;
  }

  /**
   * Build a standalone flying Dragonfang Dao projectile mesh for throw and recall animations (어검술).
   * Features spinning obsidian blade, glowing crimson & golden dragon qi meridian disc.
   */
  static buildThrownSwordMesh(): THREE.Group {
    const sword = this.buildPlumBlossomSword();

    // Glowing crimson dragon qi vortex ring around spinning sword
    const haloGeo = new THREE.RingGeometry(0.18, 0.72, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0, 0.65, 0);
    sword.add(halo);

    // Inner bright gold dragon qi core
    const innerCore = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.52, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      })
    );
    innerCore.position.set(0, 0.65, 0.005);
    sword.add(innerCore);

    return sword;
  }
}
