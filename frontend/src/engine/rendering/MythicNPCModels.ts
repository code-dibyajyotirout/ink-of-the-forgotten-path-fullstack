/**
 * MythicNPCModels — Procedural High-Fidelity Character Models for Celestial Sect Universe
 * Authentic "Return of the Celestial Sect" (무림) Manhwa Cast:
 * 1. Senior Brother Baek Cheon (천도 대제자 백천 - Righteous Sword of Celestial)
 * 2. Sword Maiden Yu I-Seol (천도 소사매 유이설 - Plum Blossom Sword Maiden)
 * 3. Sect Leader Hyun Jong (천도문 13대 장문인 현종 - 13th Celestial Sect Leader)
 * 4. Forge Elder (천도문 주검장로 - Cold Steel Weaponsmith)
 * 5. Celestial Gatekeeper Disciples (천도문 수문 제자)
 * 6. Hermit Taoist Sage (천도 은거 도인)
 */
import * as THREE from "three";

export interface AnimatedNPC {
  group: THREE.Group;
  update: (dt: number, time: number) => void;
}

export class MythicNPCModels {
  /**
   * 1. Senior Disciple Baek Cheon (천도 대제자 백천) — "Righteous Sword of Hua"
   * Features: Pristine white Celestial robes with black trim & collar,
   * 5-petal plum blossom chest crest, high tied ponytail with black hair & ribbon,
   * upright handsome posture, Celestial fine steel sword at hip with plum blossom tsuba.
   */
  public static buildSwordsmanBaek(): AnimatedNPC {
    const root = new THREE.Group();

    // Shared Materials
    const whiteRobeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.65,
      metalness: 0.05,
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.5,
      metalness: 0.15,
    });

    const plumCrestMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.5,
      emissive: 0xbe123c,
      emissiveIntensity: 0.35,
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.65,
      metalness: 0.2,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf5d0b0,
      roughness: 0.6,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.85,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.2,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.3,
    });

    const tasselMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.6,
    });

    // ── Torso & Celestial Uniform ──
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 1.25;

    // Muscular white martial tunic
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.72, 8), whiteRobeMat);
    chest.scale.set(1.15, 1.0, 0.75);
    chest.position.y = 0.2;
    bodyGroup.add(chest);

    // Black crossed collar
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.1), blackTrimMat);
    collar.position.set(0, 0.36, 0.26);
    collar.rotation.z = 0.28;
    bodyGroup.add(collar);

    // 5-Petal Plum Blossom Crest on Chest
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.11, 5), plumCrestMat);
    crest.position.set(0, 0.22, 0.29);
    crest.scale.set(1.1, 1.1, 1.0);
    bodyGroup.add(crest);

    // Black Belt Obi
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.18, 8), blackTrimMat);
    belt.scale.set(1.1, 1.0, 0.75);
    belt.position.y = -0.22;
    bodyGroup.add(belt);

    // White Robe Skirt with Black Hem Trim
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.65, 8, 1, true), whiteRobeMat);
    skirt.position.y = -0.58;
    bodyGroup.add(skirt);

    const skirtHem = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 4, 8), blackTrimMat);
    skirtHem.position.y = -0.9;
    skirtHem.rotation.x = Math.PI / 2;
    bodyGroup.add(skirtHem);

    root.add(bodyGroup);

    // ── Head & Baek Cheon High Ponytail ──
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.05;

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.28, 6), skinMat);
    head.position.y = 0.05;
    headGroup.add(head);

    // Anime dark hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), hairMat);
    hair.position.set(0, 0.12, -0.04);
    headGroup.add(hair);

    // High Tied Ponytail (Baek Cheon's signature sleek hair)
    const ponytailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.15, 6), hairMat);
    ponytailBase.position.set(0, 0.28, -0.15);
    ponytailBase.rotation.x = -0.6;
    headGroup.add(ponytailBase);

    const ponytailTrail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.02, 0.6, 6), hairMat);
    ponytailTrail.position.set(0, 0.02, -0.32);
    ponytailTrail.rotation.x = -0.25;
    headGroup.add(ponytailTrail);

    // Red Silk Hair Ribbon
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.4), tasselMat);
    ribbon.position.set(0, 0.15, -0.25);
    ribbon.rotation.x = 0.2;
    headGroup.add(ribbon);

    root.add(headGroup);

    // ── Arms & Vambraces ──
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.42, 1.48, 0);
    const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.52, 6), whiteRobeMat);
    leftSleeve.position.y = -0.2;
    leftArm.add(leftSleeve);
    const leftBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.3, 6), blackTrimMat);
    leftBracer.position.y = -0.45;
    leftArm.add(leftBracer);
    // Left hand rests comfortably on sword hilt
    leftArm.rotation.z = 0.15;
    leftArm.rotation.x = 0.25;
    root.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.42, 1.48, 0);
    const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.52, 6), whiteRobeMat);
    rightSleeve.position.y = -0.2;
    rightArm.add(rightSleeve);
    const rightBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.3, 6), blackTrimMat);
    rightBracer.position.y = -0.45;
    rightArm.add(rightBracer);
    root.add(rightArm);

    // ── Celestial Steel Sword Sheathed on Hip ──
    const swordGroup = new THREE.Group();
    swordGroup.position.set(-0.35, 1.08, 0.02);
    swordGroup.rotation.z = Math.PI / 5;
    swordGroup.rotation.y = 0.15;

    // Black Lacquer Scabbard
    const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.25, 0.05), blackTrimMat);
    scabbard.position.y = -0.3;
    swordGroup.add(scabbard);

    // 5-Petal Gold Plum Blossom Tsuba / Crossguard
    const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 5), goldMat);
    tsuba.position.y = 0.36;
    swordGroup.add(tsuba);

    // Hilt wrapped in black cord
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6), leatherMat);
    hilt.position.y = 0.55;
    swordGroup.add(hilt);

    // Dangling Crimson Tassel
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), tasselMat);
    tassel.position.y = 0.85;
    tassel.rotation.x = Math.PI;
    swordGroup.add(tassel);

    root.add(swordGroup);

    // ── Legs & Hakama ──
    for (let side = -1; side <= 1; side += 2) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.75, 6), whiteRobeMat);
      leg.position.set(side * 0.18, 0.45, 0);
      root.add(leg);

      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.28), blackTrimMat);
      boot.position.set(side * 0.18, 0.09, 0.04);
      root.add(boot);
    }

    return {
      group: root,
      update: (dt: number, time: number) => {
        // Upright disciplined martial breathing
        bodyGroup.position.y = 1.25 + Math.sin(time * 1.8) * 0.012;
        headGroup.position.y = 2.05 + Math.sin(time * 1.8) * 0.01;
        ponytailTrail.rotation.z = Math.sin(time * 2.5) * 0.04;
      },
    };
  }

  /**
   * 2. Sword Maiden Yu I-Seol (천도 소사매 유이설)
   * Features: Pristine white Celestial robes with soft plum pink accents,
   * slender martial artist silhouette, straight raven hair with white silk ribbon,
   * holding an unsheathed fine steel sword with swirling pink plum blossom petal aura.
   */
  public static buildShadowBrokerMae(): AnimatedNPC {
    const root = new THREE.Group();

    // Shared Materials
    const whiteSilkMat = new THREE.MeshStandardMaterial({
      color: 0xfdf4ff,
      roughness: 0.5,
      metalness: 0.05,
    });

    const plumSashMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      roughness: 0.4,
      metalness: 0.1,
    });

    const plumCrestMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.5,
      emissive: 0xbe123c,
      emissiveIntensity: 0.35,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfde2d0,
      roughness: 0.5,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.8,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.15,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.3,
    });

    // ── Slender Silhouette Torso & Robes ──
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 1.2;

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.7, 8), whiteSilkMat);
    chest.scale.set(1.1, 1.0, 0.7);
    chest.position.y = 0.2;
    bodyGroup.add(chest);

    // 5-Petal Plum Crest
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.09, 5), plumCrestMat);
    crest.position.set(0, 0.22, 0.24);
    bodyGroup.add(crest);

    // Plum Blossom Pink Obi Sash
    const obi = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.22, 8), plumSashMat);
    obi.scale.set(1.1, 1.0, 0.7);
    obi.position.y = -0.15;
    bodyGroup.add(obi);

    // Trailing White Silk Skirt with Pink Gradient Hem
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.46, 0.85, 8, 1, true), whiteSilkMat);
    skirt.position.y = -0.58;
    bodyGroup.add(skirt);

    root.add(bodyGroup);

    // ── Head & Straight Dark Hair ──
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.05;

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 6), skinMat);
    head.position.y = 0.05;
    headGroup.add(head);

    // Long straight dark hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), hairMat);
    hair.position.set(0, 0.12, -0.05);
    headGroup.add(hair);

    const hairTrail = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.04, 0.85, 6), hairMat);
    hairTrail.position.set(0, -0.28, -0.16);
    hairTrail.rotation.x = 0.12;
    headGroup.add(hairTrail);

    // White Silk Hair Ribbon
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.5), whiteSilkMat);
    ribbon.position.set(0, 0.1, -0.18);
    ribbon.rotation.x = 0.15;
    headGroup.add(ribbon);

    root.add(headGroup);

    // ── Arms & Unsheathed Slender Plum Blossom Sword ──
    const armsGroup = new THREE.Group();
    for (let side = -1; side <= 1; side += 2) {
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.28), whiteSilkMat);
      sleeve.position.set(side * 0.38, 1.25, 0);
      sleeve.rotation.z = side * 0.12;
      armsGroup.add(sleeve);
    }
    root.add(armsGroup);

    // Unsheathed Slender Plum Blossom Sword in Right Hand
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0.42, 0.85, 0.2);
    swordGroup.rotation.x = 0.4;
    swordGroup.rotation.z = -0.2;

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.015), steelMat);
    blade.position.y = 0.55;
    swordGroup.add(blade);

    // 5-Petal Plum Blossom Guard
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 5), goldMat);
    guard.position.y = 0.0;
    swordGroup.add(guard);

    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), whiteSilkMat);
    hilt.position.y = -0.14;
    swordGroup.add(hilt);

    root.add(swordGroup);

    // ── Swirling Pink Plum Blossom Petals ──
    const petalGroup = new THREE.Group();
    petalGroup.position.set(0, 1.2, 0);

    const petals: THREE.Mesh[] = [];
    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 6; i++) {
      const petalGeo = new THREE.CircleGeometry(0.08, 5);
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petalGroup.add(petal);
      petals.push(petal);
    }
    root.add(petalGroup);

    return {
      group: root,
      update: (dt: number, time: number) => {
        bodyGroup.position.y = 1.2 + Math.sin(time * 2.0) * 0.012;
        headGroup.position.y = 2.05 + Math.sin(time * 2.0) * 0.01;

        // Swirling plum blossom petals drifting in the breeze around her
        petals.forEach((p, i) => {
          const angle = time * 1.8 + (i * Math.PI) / 3;
          const r = 0.65 + Math.sin(time * 2 + i) * 0.15;
          p.position.set(Math.cos(angle) * r, Math.sin(time * 2.5 + i) * 0.35, Math.sin(angle) * r);
          p.rotation.y = angle;
          p.rotation.z = time * 2 + i;
        });
      },
    };
  }

  /**
   * 3. Sect Leader Hyun Jong (천도문 13대 장문인 현종) — 13th Celestial Sect Leader
   * Features: Grand Taoist ceremonial robes (celadon white silk with black/gold borders & plum blossom embroidery),
   * long silver-white beard, Taoist jade lotus crown (옥관), Celestial Sect Leader's horsehair fly-whisk (불진)
   * and gnarled plum blossom walking staff.
   */
  public static buildMasterShen(): AnimatedNPC {
    const root = new THREE.Group();

    const sageRobeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.65,
    });

    const innerDarkMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.5,
    });

    const plumCrestMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.5,
      emissive: 0xbe123c,
      emissiveIntensity: 0.4,
    });

    const beardMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.9,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf5d0b0,
      roughness: 0.6,
    });

    const jadeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.3,
      metalness: 0.2,
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.85,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.3,
    });

    // Grand Ceremonial Robe Torso
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 1.45, 8), sageRobeMat);
    body.position.y = 1.0;
    root.add(body);

    // Black & Plum Blossom Ceremonial Collar
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.12), innerDarkMat);
    collar.position.set(0, 1.45, 0.3);
    collar.rotation.z = 0.2;
    root.add(collar);

    // Grand 5-Petal Plum Crest
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.14, 5), plumCrestMat);
    crest.position.set(0, 1.25, 0.35);
    root.add(crest);

    // Wide Flowing Taoist Sleeves
    for (let side = -1; side <= 1; side += 2) {
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.45), sageRobeMat);
      sleeve.position.set(side * 0.52, 1.15, 0);
      sleeve.rotation.z = side * 0.2;
      root.add(sleeve);
    }

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.95;

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.28, 6), skinMat);
    headGroup.add(head);

    // Long Flowing Silver-White Beard (cascading down past chest)
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.75, 6), beardMat);
    beard.position.set(0, -0.38, 0.14);
    beard.rotation.x = 0.15;
    headGroup.add(beard);

    // Taoist Topknot & Imperial Jade Lotus Crown (옥관)
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 6), jadeMat);
    crown.position.set(0, 0.22, -0.02);
    headGroup.add(crown);

    const hairpin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4), goldMat);
    hairpin.position.set(0, 0.22, -0.02);
    hairpin.rotation.z = Math.PI / 2;
    headGroup.add(hairpin);

    root.add(headGroup);

    // ── Celestial Sect Leader's Horsehair Fly-Whisk (불진 - Buljin) ──
    const whiskGroup = new THREE.Group();
    whiskGroup.position.set(-0.45, 1.25, 0.25);
    whiskGroup.rotation.x = -0.3;
    whiskGroup.rotation.z = 0.4;

    const whiskHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.5, 6), woodMat);
    whiskGroup.add(whiskHandle);

    const whiskHair = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 6), beardMat);
    whiskHair.position.y = 0.45;
    whiskGroup.add(whiskHair);

    root.add(whiskGroup);

    // ── Gnarled Plum Blossom Walking Staff with Glowing Jade Blossom ──
    const staffGroup = new THREE.Group();
    staffGroup.position.set(0.55, 0, 0.3);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6), woodMat);
    shaft.position.y = 1.1;
    staffGroup.add(shaft);

    // Glowing Jade Plum Blossom Sphere on Staff Peak
    const jadeBlossom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), new THREE.MeshBasicMaterial({ color: 0x34d399 }));
    jadeBlossom.position.y = 2.25;
    staffGroup.add(jadeBlossom);

    const jadeLight = new THREE.PointLight(0x34d399, 1.8, 6);
    jadeLight.position.y = 2.25;
    staffGroup.add(jadeLight);

    root.add(staffGroup);

    return {
      group: root,
      update: (dt: number, time: number) => {
        headGroup.position.y = 1.95 + Math.sin(time * 1.5) * 0.012;
        beard.rotation.z = Math.sin(time * 1.6) * 0.03;
        whiskHair.rotation.z = Math.sin(time * 2.0) * 0.05;
      },
    };
  }

  /**
   * 4. Celestial Forge Elder (천도문 주검장로)
   * Features: Sturdy blacksmith elder in leather apron over Celestial robes,
   * holding glowing heated hammer, forging legendary Cold Steel Plum Blossom Swords.
   */
  public static buildForgeMasterKaelen(): AnimatedNPC {
    const root = new THREE.Group();

    const whiteRobeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.85, roughness: 0.3 });
    const heatedSteelMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });

    // Muscular Torso & Leather Apron
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 1.1, 8), leatherMat);
    body.position.y = 1.15;
    root.add(body);

    // Rolled-up white Celestial sleeves
    for (let side = -1; side <= 1; side += 2) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.4, 6), whiteRobeMat);
      sleeve.position.set(side * 0.5, 1.45, 0);
      root.add(sleeve);
    }

    // Head with tied artisan topknot
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.3, 6), skinMat);
    head.position.y = 1.95;
    root.add(head);

    // Heavy Blacksmith Hammer with glowing heated face
    const hammer = new THREE.Group();
    hammer.position.set(0.6, 0.9, 0.2);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), leatherMat);
    shaft.rotation.z = Math.PI / 4;
    hammer.add(shaft);

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.18), ironMat);
    headMesh.position.set(0.35, 0.35, 0);
    hammer.add(headMesh);

    const glowingFace = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.16), heatedSteelMat);
    glowingFace.position.set(0.48, 0.35, 0);
    hammer.add(glowingFace);

    root.add(hammer);

    return {
      group: root,
      update: (dt: number, time: number) => {
        hammer.rotation.x = Math.sin(time * 2.0) * 0.1;
      },
    };
  }

  /**
   * 5. Celestial Gatekeeper Disciples (천도문 수문 제자)
   * Features: Disciplined Celestial disciples in clean white/black robes,
   * 5-petal plum blossom chest crest, standing at attention with ceremonial spears.
   */
  public static buildImperialSentinel(): AnimatedNPC {
    const root = new THREE.Group();

    const whiteRobeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.65,
      metalness: 0.05,
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.5,
      metalness: 0.15,
    });

    const plumCrestMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.5,
      emissive: 0xbe123c,
      emissiveIntensity: 0.35,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    });

    const tasselMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.6,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf5d0b0,
      roughness: 0.6,
    });

    // Disciplined Torso
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 1.2, 8), whiteRobeMat);
    body.position.y = 1.2;
    root.add(body);

    // Black Belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.35, 0.18, 8), blackTrimMat);
    belt.position.y = 0.95;
    root.add(belt);

    // Plum Crest
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.1, 5), plumCrestMat);
    crest.position.set(0, 1.35, 0.35);
    root.add(crest);

    // Head with tied topknot
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.28, 6), skinMat);
    head.position.y = 1.95;
    root.add(head);

    const topknot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 6), blackTrimMat);
    topknot.position.set(0, 2.15, -0.06);
    root.add(topknot);

    // Ceremonial Celestial Spear held upright
    const spear = new THREE.Group();
    spear.position.set(0.45, 0, 0.2);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 8), blackTrimMat);
    shaft.position.y = 1.6;
    spear.add(shaft);

    const spearhead = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 4), steelMat);
    spearhead.position.set(0, 3.35, 0);
    spear.add(spearhead);

    // Crimson & Pink Silk Spear Tassel
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), tasselMat);
    tassel.position.set(0, 3.05, 0);
    tassel.rotation.x = Math.PI;
    spear.add(tassel);

    root.add(spear);

    return {
      group: root,
      update: (dt: number, time: number) => {
        body.position.y = 1.2 + Math.sin(time * 1.2) * 0.005;
      },
    };
  }

  /**
   * 6. Hermit Taoist Sage of Celestial (천도 은거 도인)
   * Features: Weathered dark monk robes, bamboo cane, peaceful meditation posture.
   */
  public static buildOldXu(): AnimatedNPC {
    const root = new THREE.Group();

    const robeMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.2, 8), robeMat);
    body.position.y = 1.1;
    root.add(body);

    const headGroup = new THREE.Group();
    headGroup.position.y = 1.95;

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.28, 6), skinMat);
    headGroup.add(head);

    root.add(headGroup);

    // Bamboo Walking Cane
    const caneGroup = new THREE.Group();
    caneGroup.position.set(0.45, 0, 0.25);

    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.6, 6), woodMat);
    cane.position.y = 0.8;
    cane.rotation.z = -0.08;
    caneGroup.add(cane);

    root.add(caneGroup);

    return {
      group: root,
      update: (dt: number, time: number) => {
        headGroup.position.y = 1.95 + Math.sin(time * 1.5) * 0.01;
        cane.rotation.z = -0.08 + Math.sin(time * 1.5) * 0.02;
      },
    };
  }
}
