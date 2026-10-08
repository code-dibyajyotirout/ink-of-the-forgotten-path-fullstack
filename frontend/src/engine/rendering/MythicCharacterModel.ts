/**
 * MythicCharacterModel — High-fidelity procedural character model
 * Inspired by God of War, Black Myth: Wukong, and Sekiro.
 * Replaces primitive box-mesh geometry with sculpted segmented armor,
 * dynamic flowing cloth capes, glowing runic bracers, and detailed chained weapons.
 */
import * as THREE from "three";

export interface MythicCharacterParts {
  group: THREE.Group;
  bodyMesh: THREE.Object3D;
  headMesh: THREE.Object3D;
  leftArmMesh: THREE.Object3D;
  rightArmMesh: THREE.Object3D;
  leftLegMesh: THREE.Object3D;
  rightLegMesh: THREE.Object3D;
  capeSegments: THREE.Mesh[];
  scarfMesh: THREE.Mesh;
  weaponAnchor: THREE.Group;
  offhandAnchor: THREE.Group;
  eyesMesh: THREE.Mesh;
}

export class MythicCharacterModel {
  /**
   * Builds the complete high-fidelity character model and attaches to target group.
   */
  public static build(): MythicCharacterParts {
    const root = new THREE.Group();
    // Align character model native forward facing to Three.js standard -Z
    root.rotation.y = Math.PI;

    // ─── Materials ─────────────────────────────────────────────────────────────
    // Midnight Shadow Martial Robes (sleek deep obsidian black)
    const blackRobeMat = new THREE.MeshStandardMaterial({
      color: 0x141416, // Deep obsidian martial black
      roughness: 0.65,
      metalness: 0.12,
    });
    const whiteRobeMat = blackRobeMat; // Retain alias so all robes, coat tails, sleeves, and pants are midnight black

    // Harmonist black collar, belt obi & trims
    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.5,
      metalness: 0.15,
    });

    // Sacred Five-Petal Plum Blossom Crest (천도문 매화 문양)
    const plumCrestMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.5,
      emissive: 0xbe123c,
      emissiveIntensity: 0.5,
    });

    // Ancient Ivory White Skeleton Bone (radiant white bone - ONLY the skull is white!)
    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // Pure brilliant white ivory
      roughness: 0.25,
      metalness: 0.08,
      emissive: 0xf8fafc, // Subtle bone luminescence so the floating skull glows bright
      emissiveIntensity: 0.35,
    });

    // Dark bone interior / eye orbit / nasal cavity depth
    const boneDarkMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.95,
      metalness: 0.2,
    });

    // Arm & leg leather wraps
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.7,
      metalness: 0.15,
    });

    // Red hair / talisman ribbon
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });

    // Deep Hollow Black Skull Eyes (abyssal empty eye sockets)
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0x050505,
    });

    // ─── 1. Torso & Midnight Martial Robes ────────────────────────────────────
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 1.25;

    // Muscular black martial tunic
    const chestGeo = new THREE.CylinderGeometry(0.38, 0.3, 0.7, 8);
    const chestMesh = new THREE.Mesh(chestGeo, blackRobeMat);
    chestMesh.scale.set(1.15, 1.0, 0.75);
    chestMesh.position.y = 0.2;
    bodyGroup.add(chestMesh);

    // Crossed Black Collar (V-neck martial lapel)
    const collarGeo = new THREE.BoxGeometry(0.28, 0.32, 0.1);
    const collarMesh = new THREE.Mesh(collarGeo, blackTrimMat);
    collarMesh.position.set(0, 0.36, 0.28);
    collarMesh.rotation.z = 0.25;
    bodyGroup.add(collarMesh);

    // Harmonist Five-Petal Plum Blossom Chest Crest (매화 문양)
    const crestGeo = new THREE.CircleGeometry(0.12, 5);
    const crestMesh = new THREE.Mesh(crestGeo, plumCrestMat);
    crestMesh.position.set(0, 0.24, 0.3);
    crestMesh.scale.set(1.2, 1.2, 1.0);
    bodyGroup.add(crestMesh);

    // Wide Black Waist Obi & Leather Belt
    const beltGeo = new THREE.CylinderGeometry(0.33, 0.34, 0.2, 10);
    const beltMesh = new THREE.Mesh(beltGeo, blackTrimMat);
    beltMesh.scale.set(1.15, 1.0, 0.75);
    beltMesh.position.y = -0.38;
    bodyGroup.add(beltMesh);

    // White Hanging Martial Sash with Pink Border
    const sashGeo = new THREE.PlaneGeometry(0.32, 0.68, 2, 4);
    const sashMesh = new THREE.Mesh(sashGeo, whiteRobeMat);
    sashMesh.position.set(0, -0.68, 0.28);
    sashMesh.rotation.x = 0.1;
    bodyGroup.add(sashMesh);

    // ── Where Winds Meet: Twin Crossed Back Scabbards (双剑鞘) ──
    const scabbardGroup = new THREE.Group();
    scabbardGroup.position.set(0, 0.22, -0.22);

    const scabbardWoodMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917, // Dark lacquered ebony wood
      roughness: 0.4,
      metalness: 0.2,
    });
    const brassFittingMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Polished brass scabbard chapes & guards
      metalness: 0.85,
      roughness: 0.3,
    });

    // Sword 1: Slanted left-to-right (hilt over right shoulder)
    const sword1 = new THREE.Group();
    sword1.rotation.z = -0.55;
    const sheath1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.15, 0.035), scabbardWoodMat);
    sword1.add(sheath1);

    const ring1Top = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.045), brassFittingMat);
    ring1Top.position.y = 0.52;
    sword1.add(ring1Top);
    const ring1Bot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.045), brassFittingMat);
    ring1Bot.position.y = -0.52;
    sword1.add(ring1Bot);

    const hilt1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6), blackTrimMat);
    hilt1.position.y = 0.72;
    sword1.add(hilt1);
    const pommel1 = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 6), brassFittingMat);
    pommel1.position.y = 0.88;
    sword1.add(pommel1);

    scabbardGroup.add(sword1);

    // Sword 2: Slanted right-to-left (hilt over left shoulder) forming 'X'
    const sword2 = new THREE.Group();
    sword2.rotation.z = 0.55;
    sword2.position.z = -0.03;

    const sheath2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.15, 0.035), scabbardWoodMat);
    sword2.add(sheath2);

    const ring2Top = ring1Top.clone();
    sword2.add(ring2Top);
    const ring2Bot = ring1Bot.clone();
    sword2.add(ring2Bot);

    const hilt2 = hilt1.clone();
    sword2.add(hilt2);
    const pommel2 = pommel1.clone();
    sword2.add(pommel2);

    scabbardGroup.add(sword2);
    bodyGroup.add(scabbardGroup);

    // ── Where Winds Meet: Wanderer's Travel Wine Gourd (酒葫芦) on Hip ──
    const gourdGroup = new THREE.Group();
    gourdGroup.position.set(-0.36, -0.28, 0.12);
    gourdGroup.rotation.z = 0.25;

    const gourdMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.45,
      metalness: 0.1,
    });
    const gourdBot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), gourdMat);
    gourdBot.scale.set(1.0, 1.15, 1.0);
    gourdGroup.add(gourdBot);

    const gourdTop = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), gourdMat);
    gourdTop.position.y = 0.15;
    gourdGroup.add(gourdTop);

    const cork = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.06, 6),
      new THREE.MeshStandardMaterial({ color: 0x78350f })
    );
    cork.position.y = 0.24;
    gourdGroup.add(cork);

    const redKnot = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 8), ribbonMat);
    redKnot.position.y = 0.08;
    redKnot.rotation.x = Math.PI / 2;
    gourdGroup.add(redKnot);

    bodyGroup.add(gourdGroup);

    root.add(bodyGroup);

    // ─── 2. Head: Ancient White Skull (九天白骨) & Conical Ronin Straw Hat ───
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.05;

    // 1. White Cranium Dome (smooth sculpted bone)
    const craniumGeo = new THREE.SphereGeometry(0.20, 12, 10);
    const craniumMesh = new THREE.Mesh(craniumGeo, boneMat);
    craniumMesh.position.set(0, 0.14, -0.02);
    craniumMesh.scale.set(1.0, 1.05, 1.05);
    headGroup.add(craniumMesh);

    // 2. Occipital & Parietal bone base
    const occipitalGeo = new THREE.BoxGeometry(0.24, 0.16, 0.18);
    const occipitalMesh = new THREE.Mesh(occipitalGeo, boneMat);
    occipitalMesh.position.set(0, 0.08, -0.06);
    headGroup.add(occipitalMesh);

    // 3. Supraorbital Brow Ridge (heavy menacing skeletal brow)
    const browGeo = new THREE.BoxGeometry(0.28, 0.05, 0.08);
    const browMesh = new THREE.Mesh(browGeo, boneMat);
    browMesh.position.set(0, 0.13, 0.16);
    headGroup.add(browMesh);
    const eyesMesh = browMesh;

    // 4. Deep Hollow Black Eye Orbits (Abyssal Empty Sockets)
    for (const side of [-1, 1]) {
      // Sunken dark orbit cavity
      const socketGeo = new THREE.BoxGeometry(0.085, 0.085, 0.08);
      const socketMesh = new THREE.Mesh(socketGeo, boneDarkMat);
      socketMesh.position.set(side * 0.085, 0.08, 0.165);
      headGroup.add(socketMesh);

      // Deepest void-black inner eye aperture
      const eyeAperture = new THREE.Mesh(
        new THREE.PlaneGeometry(0.07, 0.07),
        eyeMat
      );
      eyeAperture.position.set(side * 0.085, 0.08, 0.19);
      headGroup.add(eyeAperture);
    }

    // 5. Zygomatic Arches (Cheekbones)
    for (const side of [-1, 1]) {
      const cheekGeo = new THREE.BoxGeometry(0.06, 0.05, 0.16);
      const cheekMesh = new THREE.Mesh(cheekGeo, boneMat);
      cheekMesh.position.set(side * 0.15, 0.04, 0.10);
      cheekMesh.rotation.y = side * 0.18;
      headGroup.add(cheekMesh);
    }

    // 6. Piriform Aperture (Nasal Cavity - dark inverted triangle)
    const nasalGeo = new THREE.ConeGeometry(0.035, 0.07, 3);
    const nasalMesh = new THREE.Mesh(nasalGeo, boneDarkMat);
    nasalMesh.position.set(0, 0.035, 0.19);
    nasalMesh.rotation.x = Math.PI; // upside down
    headGroup.add(nasalMesh);

    // 7. Maxilla & Sculpted Upper Ivory Teeth
    const maxillaGeo = new THREE.BoxGeometry(0.19, 0.065, 0.11);
    const maxillaMesh = new THREE.Mesh(maxillaGeo, boneMat);
    maxillaMesh.position.set(0, -0.02, 0.14);
    headGroup.add(maxillaMesh);

    // Upper teeth row (clean unified ivory dental arch)
    const upperTeeth = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.034, 0.05),
      boneMat
    );
    upperTeeth.position.set(0, -0.05, 0.17);
    headGroup.add(upperTeeth);

    // 8. Mandible (Lower Jaw Bone) & Lower Teeth
    const mandibleGroup = new THREE.Group();
    mandibleGroup.position.set(0, -0.065, 0.08);
    headGroup.add(mandibleGroup);

    const jawGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.11, 5);
    const jawMesh = new THREE.Mesh(jawGeo, boneMat);
    jawMesh.position.set(0, -0.04, 0.05);
    mandibleGroup.add(jawMesh);

    // Lower teeth row (clean unified ivory dental arch)
    const lowerTeeth = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.028, 0.045),
      boneMat
    );
    lowerTeeth.position.set(0, 0.01, 0.095);
    mandibleGroup.add(lowerTeeth);

    // (Neck removed completely to give the disembodied white skull an eerie floating hover look!)

    // Trailing Red Wind Ribbon fluttering from the back of the skull
    for (let side = -1; side <= 1; side += 2) {
      const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.55), ribbonMat);
      ribbon.position.set(side * 0.06, 0.15, -0.2);
      ribbon.rotation.x = 0.3;
      ribbon.rotation.z = side * 0.15;
      headGroup.add(ribbon);
    }

    // ── Where Winds Meet: Conical Bamboo Straw Hat (斗笠 Douli) ──
    const hatGroup = new THREE.Group();
    hatGroup.name = "StrawHat";
    hatGroup.position.set(0, 0.26, -0.02);
    hatGroup.rotation.x = 0.08;

    const strawMat = new THREE.MeshStandardMaterial({
      color: 0xc89d6c, // Natural woven golden bamboo straw
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const hatCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.68, 0.24, 20, 1, true),
      strawMat
    );
    hatCone.position.y = 0.12;
    hatGroup.add(hatCone);

    const hatRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.022, 6, 24),
      blackTrimMat
    );
    hatRim.rotation.x = Math.PI / 2;
    hatGroup.add(hatRim);

    const hatCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 8, 8),
      blackTrimMat
    );
    hatCrown.position.y = 0.24;
    hatGroup.add(hatCrown);

    // Black silk chin tie cords
    for (let side = -1; side <= 1; side += 2) {
      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.55, 4),
        blackTrimMat
      );
      cord.position.set(side * 0.18, -0.15, 0.04);
      cord.rotation.z = side * -0.15;
      hatGroup.add(cord);
    }

    // Rear neck veil fluttering cloth
    const veilGeo = new THREE.PlaneGeometry(0.48, 0.38, 4, 3);
    const veilMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const veil = new THREE.Mesh(veilGeo, veilMat);
    veil.position.set(0, -0.12, -0.42);
    veil.rotation.x = 0.35;
    hatGroup.add(veil);

    headGroup.add(hatGroup);

    root.add(headGroup);

    // ─── 3. Flowing Harmonist Robe Coat Tails & Sash (Physics-Driven) ────────
    const capeSegments: THREE.Mesh[] = [];
    const capeSegmentCount = 4;
    let prevAttachment: THREE.Object3D = bodyGroup;

    for (let i = 0; i < capeSegmentCount; i++) {
      const segWidth = 0.52 + i * 0.08;
      const segHeight = 0.35;
      const segGeo = new THREE.PlaneGeometry(segWidth, segHeight, 3, 2);
      const segMesh = new THREE.Mesh(segGeo, whiteRobeMat);
      segMesh.position.set(0, -segHeight / 2 - 0.02, -0.26);
      if (i === 0) {
        segMesh.position.set(0, 0.3, -0.24);
      }
      prevAttachment.add(segMesh);
      capeSegments.push(segMesh);
      prevAttachment = segMesh;
    }

    // Harmonist Collar Cowl / Scarf
    const scarfGeo = new THREE.TorusGeometry(0.36, 0.08, 6, 10);
    const scarfMesh = new THREE.Mesh(scarfGeo, blackTrimMat);
    scarfMesh.position.set(0, 0.5, 0.02);
    scarfMesh.rotation.x = Math.PI / 2 + 0.15;
    bodyGroup.add(scarfMesh);

    // ─── 4. Arms, Harmonist Sleeves & Leather Vambraces ───────────────────────
    const buildArm = (isRight: boolean) => {
      const armGroup = new THREE.Group();
      const sign = isRight ? 1 : -1;
      armGroup.position.set(sign * 0.52, 1.7, 0);

      // Harmonist White Robe Shoulder Sleeve
      const shoulderGeo = new THREE.SphereGeometry(0.2, 6, 6, 0, Math.PI, 0, Math.PI * 0.85);
      const shoulderMesh = new THREE.Mesh(shoulderGeo, whiteRobeMat);
      shoulderMesh.rotation.z = sign * -Math.PI / 3;
      shoulderMesh.position.set(sign * 0.05, 0.05, 0);
      armGroup.add(shoulderMesh);

      // Black Shoulder Trim
      const shoulderTrimGeo = new THREE.TorusGeometry(0.18, 0.03, 4, 8);
      const shoulderTrimMesh = new THREE.Mesh(shoulderTrimGeo, blackTrimMat);
      shoulderTrimMesh.position.set(sign * 0.05, 0.05, 0);
      armGroup.add(shoulderTrimMesh);

      // Bicep (White martial cloth)
      const bicepGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.38, 6);
      const bicepMesh = new THREE.Mesh(bicepGeo, whiteRobeMat);
      bicepMesh.position.y = -0.22;
      armGroup.add(bicepMesh);

      // Elbow guard
      const elbowGeo = new THREE.OctahedronGeometry(0.07, 0);
      const elbowMesh = new THREE.Mesh(elbowGeo, blackTrimMat);
      elbowMesh.position.set(0, -0.42, -0.06);
      armGroup.add(elbowMesh);

      // Forearm & Harmonist Leather Vambrace
      const forearmGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.42, 6);
      const forearmMesh = new THREE.Mesh(forearmGeo, leatherMat);
      forearmMesh.position.y = -0.62;
      armGroup.add(forearmMesh);

      // Plum Blossom Qi Accent on Vambrace
      const runeGeo = new THREE.PlaneGeometry(0.06, 0.28);
      const runeMesh = new THREE.Mesh(runeGeo, plumCrestMat);
      runeMesh.position.set(sign * 0.1, -0.62, 0.06);
      runeMesh.rotation.y = sign * 0.8;
      armGroup.add(runeMesh);

      // Black Leather Combat Gauntlet / Hand
      const wristGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.08, 6);
      const wristMesh = new THREE.Mesh(wristGeo, blackTrimMat);
      wristMesh.position.y = -0.80;
      armGroup.add(wristMesh);

      // Black Leather Palm
      const palmGeo = new THREE.BoxGeometry(0.09, 0.06, 0.08);
      const palmMesh = new THREE.Mesh(palmGeo, blackTrimMat);
      palmMesh.position.set(0, -0.85, 0.02);
      armGroup.add(palmMesh);

      // Curled combat fingers / knuckles gripping weapon
      const knucklesGeo = new THREE.BoxGeometry(0.085, 0.048, 0.065);
      const knucklesMesh = new THREE.Mesh(knucklesGeo, blackTrimMat);
      knucklesMesh.position.set(0, -0.89, 0.035);
      knucklesMesh.rotation.x = 0.55;
      armGroup.add(knucklesMesh);

      // Black Combat Thumb
      const thumb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.015, 0.07, 4),
        blackTrimMat
      );
      thumb.position.set(sign * 0.052, -0.85, 0.035);
      thumb.rotation.set(0.4, 0, sign * -0.5);
      armGroup.add(thumb);

      // Weapon Anchor Point
      const weaponAnchor = new THREE.Group();
      weaponAnchor.position.set(0, -0.88, 0.1);
      armGroup.add(weaponAnchor);

      return { armGroup, weaponAnchor };
    };

    const rightArm = buildArm(true);
    const leftArm = buildArm(false);
    root.add(rightArm.armGroup);
    root.add(leftArm.armGroup);

    // ─── 5. Harmonist White Robe Trousers & Leather Boots ─────────────────────
    const buildLeg = (isRight: boolean) => {
      const legGroup = new THREE.Group();
      const sign = isRight ? 1 : -1;
      legGroup.position.set(sign * 0.2, 0.75, 0);

      // Thigh (White martial robes)
      const thighGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.45, 6);
      const thighMesh = new THREE.Mesh(thighGeo, whiteRobeMat);
      thighMesh.position.y = -0.22;
      legGroup.add(thighMesh);

      // Knee wrap
      const kneeGeo = new THREE.OctahedronGeometry(0.09, 0);
      const kneeMesh = new THREE.Mesh(kneeGeo, blackTrimMat);
      kneeMesh.position.set(0, -0.46, 0.11);
      legGroup.add(kneeMesh);

      // Shin (Black bindings over white robe)
      const shinGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.48, 6);
      const shinMesh = new THREE.Mesh(shinGeo, blackTrimMat);
      shinMesh.position.y = -0.7;
      legGroup.add(shinMesh);

      // Traditional Martial Combat Boot
      const bootGeo = new THREE.BoxGeometry(0.15, 0.14, 0.3);
      const bootMesh = new THREE.Mesh(bootGeo, leatherMat);
      bootMesh.position.set(0, -0.98, 0.07);
      legGroup.add(bootMesh);

      return legGroup;
    };

    const rightLeg = buildLeg(true);
    const leftLeg = buildLeg(false);
    root.add(rightLeg);
    root.add(leftLeg);

    return {
      group: root,
      bodyMesh: bodyGroup,
      headMesh: headGroup,
      leftArmMesh: leftArm.armGroup,
      rightArmMesh: rightArm.armGroup,
      leftLegMesh: leftLeg,
      rightLegMesh: rightLeg,
      capeSegments,
      scarfMesh,
      weaponAnchor: rightArm.weaponAnchor,
      offhandAnchor: leftArm.weaponAnchor,
      eyesMesh,
    };
  }

  /**
   * Procedural cloth wave animation for cape segments based on speed and time.
   */
  public static animateCape(capeSegments: THREE.Mesh[], velocity: number, time: number): void {
    const waveFreq = 4.0 + velocity * 1.5;
    const waveAmp = 0.15 + velocity * 0.1;

    for (let i = 0; i < capeSegments.length; i++) {
      const seg = capeSegments[i];
      const phase = time * waveFreq - i * 0.8;
      seg.rotation.x = -0.15 - Math.sin(phase) * waveAmp * (i + 1) * 0.4;
      seg.rotation.z = Math.cos(phase * 0.7) * waveAmp * 0.2;
    }
  }
}
