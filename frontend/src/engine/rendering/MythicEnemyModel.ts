/**
 * MythicEnemyModel — Procedural high-detail enemy models
 * Inspired by God of War, Black Myth: Wukong, and Sekiro.
 * Creates menacing Corrupted Oni Fiends with horned demon masks,
 * dorsal vertebrae spikes, jagged executioner cleavers, and
 * a floating God of War style execution rune indicator.
 */
import * as THREE from "three";

export interface MythicEnemyParts {
  group: THREE.Group;
  bodyMesh: THREE.Object3D;
  headMesh: THREE.Object3D;
  leftArmMesh: THREE.Object3D;
  rightArmMesh: THREE.Object3D;
  leftLegMesh: THREE.Object3D;
  rightLegMesh: THREE.Object3D;
  weaponMesh: THREE.Object3D;
  executionRune: THREE.Group;
  eyeMesh: THREE.Mesh;
}

export class MythicEnemyModel {
  public static build(type: "grunt" | "elite" | "boss" = "grunt"): MythicEnemyParts {
    const root = new THREE.Group();
    const isBoss = type === "boss";
    const isElite = type === "elite";
    const scale = isBoss ? 2.3 : isElite ? 1.35 : 1.0;

    // ─── Materials ─────────────────────────────────────────────────────────────
    const rustedIronMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0x0c0a09 : isElite ? 0x1c1917 : 0x292524,
      metalness: 0.8,
      roughness: 0.35,
    });

    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.6,
      metalness: 0.1,
    });

    const crimsonClothMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0x450a0a : isElite ? 0x7f1d1d : 0x991b1b,
      roughness: 0.85,
      metalness: 0.05,
    });

    const demonicGlowMat = new THREE.MeshBasicMaterial({
      color: isBoss ? 0xff0044 : isElite ? 0xff3b30 : 0xef4444,
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.9,
      roughness: 0.3,
    });

    // ─── 1. Torso & Vertebrae Bone Spikes ──────────────────────────────────────
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 1.2 * scale;

    // Muscular hunched torso
    const torsoGeo = new THREE.CylinderGeometry(0.38 * scale, 0.28 * scale, 0.75 * scale, 7);
    const torsoMesh = new THREE.Mesh(torsoGeo, rustedIronMat);
    torsoMesh.scale.set(1.2, 1.0, 0.8);
    torsoMesh.rotation.x = 0.12; // Menacing hunch forward
    bodyGroup.add(torsoMesh);

    // Ribcage bone plates on chest
    for (let i = 0; i < 3; i++) {
      const ribGeo = new THREE.TorusGeometry((0.32 - i * 0.03) * scale, 0.03 * scale, 5, 8, Math.PI * 0.8);
      const ribMesh = new THREE.Mesh(ribGeo, boneMat);
      ribMesh.position.set(0, (0.22 - i * 0.14) * scale, 0.16 * scale);
      ribMesh.rotation.x = Math.PI * 0.55;
      bodyGroup.add(ribMesh);
    }

    // Spine Vertebrae Spikes protruding from back
    for (let i = 0; i < 4; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.06 * scale, (0.25 + i * 0.04) * scale, 4);
      const spikeMesh = new THREE.Mesh(spikeGeo, boneMat);
      spikeMesh.position.set(0, (0.25 - i * 0.15) * scale, -0.26 * scale);
      spikeMesh.rotation.x = -0.6 - i * 0.1;
      bodyGroup.add(spikeMesh);
    }

    // Heavy Tassets & Ripped War Skirt
    const skirtGeo = new THREE.CylinderGeometry(0.32 * scale, 0.42 * scale, 0.4 * scale, 8, 1, true);
    const skirtMesh = new THREE.Mesh(skirtGeo, crimsonClothMat);
    skirtMesh.position.y = -0.45 * scale;
    bodyGroup.add(skirtMesh);

    root.add(bodyGroup);

    // ─── 2. Head, Horned Demon Mask & Burning Gaze ────────────────────────────
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.05 * scale;

    // Skull / Oni Face
    const skullGeo = new THREE.BoxGeometry(0.38 * scale, 0.42 * scale, 0.38 * scale);
    const skullMesh = new THREE.Mesh(skullGeo, boneMat);
    skullMesh.position.set(0, 0.05 * scale, 0.08 * scale);
    headGroup.add(skullMesh);

    // Horns (Cruel curved demonic horns)
    const buildHorn = (isRight: boolean) => {
      const hornGroup = new THREE.Group();
      const sign = isRight ? 1 : -1;
      hornGroup.position.set(sign * 0.18 * scale, 0.28 * scale, 0.08 * scale);

      const baseGeo = new THREE.ConeGeometry(0.08 * scale, 0.35 * scale, 5);
      const baseMesh = new THREE.Mesh(baseGeo, rustedIronMat);
      baseMesh.rotation.z = sign * -0.5;
      baseMesh.rotation.x = -0.3;
      hornGroup.add(baseMesh);

      const tipGeo = new THREE.ConeGeometry(0.05 * scale, 0.28 * scale, 4);
      const tipMesh = new THREE.Mesh(tipGeo, goldAccentMat);
      tipMesh.position.set(sign * 0.12 * scale, 0.24 * scale, -0.06 * scale);
      tipMesh.rotation.z = sign * -0.8;
      tipMesh.rotation.x = -0.5;
      hornGroup.add(tipMesh);

      return hornGroup;
    };
    headGroup.add(buildHorn(true));
    headGroup.add(buildHorn(false));

    // Burning Slit Eyes (Fiery red/ember gaze)
    const eyeGeo = new THREE.BoxGeometry(0.26 * scale, 0.06 * scale, 0.08 * scale);
    const eyeMesh = new THREE.Mesh(eyeGeo, demonicGlowMat);
    eyeMesh.position.set(0, 0.08 * scale, 0.27 * scale);
    headGroup.add(eyeMesh);

    // Fang Jaw Plate
    const jawGeo = new THREE.ConeGeometry(0.16 * scale, 0.2 * scale, 4);
    const jawMesh = new THREE.Mesh(jawGeo, rustedIronMat);
    jawMesh.position.set(0, -0.15 * scale, 0.22 * scale);
    jawMesh.rotation.x = Math.PI;
    headGroup.add(jawMesh);

    root.add(headGroup);

    // ─── 3. Brutal Spiked Arms & Gauntlets ─────────────────────────────────────
    const buildArm = (isRight: boolean) => {
      const armGroup = new THREE.Group();
      const sign = isRight ? 1 : -1;
      armGroup.position.set(sign * 0.52 * scale, 1.65 * scale, 0);

      // Spiked Demon Pauldron
      const pauldronGeo = new THREE.SphereGeometry(0.24 * scale, 6, 6, 0, Math.PI, 0, Math.PI * 0.8);
      const pauldronMesh = new THREE.Mesh(pauldronGeo, rustedIronMat);
      pauldronMesh.rotation.z = sign * -Math.PI / 3;
      pauldronMesh.position.set(sign * 0.06 * scale, 0.05 * scale, 0);
      armGroup.add(pauldronMesh);

      // Pauldron Spike
      const pSpike = new THREE.ConeGeometry(0.07 * scale, 0.3 * scale, 4);
      const pSpikeMesh = new THREE.Mesh(pSpike, boneMat);
      pSpikeMesh.position.set(sign * 0.16 * scale, 0.16 * scale, 0);
      pSpikeMesh.rotation.z = sign * -0.7;
      armGroup.add(pSpikeMesh);

      // Upper arm
      const upperGeo = new THREE.CylinderGeometry(0.12 * scale, 0.1 * scale, 0.4 * scale, 6);
      const upperMesh = new THREE.Mesh(upperGeo, crimsonClothMat);
      upperMesh.position.y = -0.22 * scale;
      armGroup.add(upperMesh);

      // Forearm & Heavy Gauntlet
      const foreGeo = new THREE.CylinderGeometry(0.14 * scale, 0.11 * scale, 0.45 * scale, 6);
      const foreMesh = new THREE.Mesh(foreGeo, rustedIronMat);
      foreMesh.position.y = -0.62 * scale;
      armGroup.add(foreMesh);

      // Fist
      const fistGeo = new THREE.BoxGeometry(0.16 * scale, 0.16 * scale, 0.16 * scale);
      const fistMesh = new THREE.Mesh(fistGeo, rustedIronMat);
      fistMesh.position.y = -0.88 * scale;
      armGroup.add(fistMesh);

      const weaponAnchor = new THREE.Group();
      weaponAnchor.position.set(0, -0.88 * scale, 0.1 * scale);
      armGroup.add(weaponAnchor);

      return { armGroup, weaponAnchor };
    };

    const rightArm = buildArm(true);
    const leftArm = buildArm(false);
    root.add(rightArm.armGroup);
    root.add(leftArm.armGroup);

    // ─── 4. Demonic Weapon: Jagged Executioner Cleaver ─────────────────────────
    const weaponGroup = new THREE.Group();
    // Heavy spiked shaft
    const shaftGeo = new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 1.2 * scale, 6);
    const shaftMesh = new THREE.Mesh(shaftGeo, rustedIronMat);
    shaftMesh.position.y = 0.2 * scale;
    weaponGroup.add(shaftMesh);

    // Jagged cleaver head
    const cleaverGeo = new THREE.BoxGeometry(0.28 * scale, 0.9 * scale, 0.06 * scale);
    const cleaverMesh = new THREE.Mesh(cleaverGeo, rustedIronMat);
    cleaverMesh.position.set(0.12 * scale, 0.7 * scale, 0);
    weaponGroup.add(cleaverMesh);

    // Glowing edge vein
    const veinGeo = new THREE.BoxGeometry(0.04 * scale, 0.85 * scale, 0.07 * scale);
    const veinMesh = new THREE.Mesh(veinGeo, demonicGlowMat);
    veinMesh.position.set(0.24 * scale, 0.7 * scale, 0);
    weaponGroup.add(veinMesh);

    weaponGroup.rotation.x = Math.PI / 2;
    rightArm.weaponAnchor.add(weaponGroup);

    // ─── 5. Heavy Plated Legs ──────────────────────────────────────────────────
    const buildLeg = (isRight: boolean) => {
      const legGroup = new THREE.Group();
      const sign = isRight ? 1 : -1;
      legGroup.position.set(sign * 0.22 * scale, 0.75 * scale, 0);

      // Thigh
      const thighGeo = new THREE.CylinderGeometry(0.15 * scale, 0.12 * scale, 0.45 * scale, 6);
      const thighMesh = new THREE.Mesh(thighGeo, crimsonClothMat);
      thighMesh.position.y = -0.22 * scale;
      legGroup.add(thighMesh);

      // Shin Guard
      const shinGeo = new THREE.CylinderGeometry(0.14 * scale, 0.11 * scale, 0.5 * scale, 6);
      const shinMesh = new THREE.Mesh(shinGeo, rustedIronMat);
      shinMesh.position.y = -0.7 * scale;
      legGroup.add(shinMesh);

      // Plated Claw Boot
      const bootGeo = new THREE.BoxGeometry(0.18 * scale, 0.15 * scale, 0.35 * scale);
      const bootMesh = new THREE.Mesh(bootGeo, rustedIronMat);
      bootMesh.position.set(0, -0.98 * scale, 0.08 * scale);
      legGroup.add(bootMesh);

      return legGroup;
    };

    const rightLeg = buildLeg(true);
    const leftLeg = buildLeg(false);
    root.add(rightLeg);
    root.add(leftLeg);

    // ─── 6. God of War Style Execution Rune Indicator ─────────────────────────
    // Floats above enemy head, hidden by default, pops up when staggered / low HP
    const runeGroup = new THREE.Group();
    runeGroup.position.y = 2.7 * scale;
    runeGroup.visible = false;

    // Glowing outer ring
    const ringGeo = new THREE.RingGeometry(0.3 * scale, 0.38 * scale, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    runeGroup.add(ringMesh);

    // Inner demonic diamond / [F] Execution Icon
    const diamondGeo = new THREE.OctahedronGeometry(0.15 * scale, 0);
    const diamondMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const diamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
    runeGroup.add(diamondMesh);

    root.add(runeGroup);

    return {
      group: root,
      bodyMesh: bodyGroup,
      headMesh: headGroup,
      leftArmMesh: leftArm.armGroup,
      rightArmMesh: rightArm.armGroup,
      leftLegMesh: leftLeg,
      rightLegMesh: rightLeg,
      weaponMesh: weaponGroup,
      executionRune: runeGroup,
      eyeMesh,
    };
  }
}
