/**
 * MythicUniverseBuilder — Return of the Celestial Sanctuary Sect (천도귀환 / 天道門)
 * Classical Aesthetic Murim Mountain Peak Universe.
 *
 * Constructs:
 * 1. Sacred Peak of Celestial Sanctuary with Endless Sea of Clouds (운해 / Unhae) & Azure Mountain Dawn
 * 2. Celestial Sanctuary Plum Blossom Palace (천도문 대웅전 / 梅花殿) with white plaster, dark timber, and plum blossom crest
 * 3. Central Martial Drill Court (천도 연무장) with massive 5-Petal Plum Blossom Inlaid Stone Crest
 * 4. Pavilion of Ten Thousand Swords (만검각) shaded by the Centennial Blooming Plum Blossom Tree
 * 5. Pill & Qi Refining Sanctum (단약당 / 丹藥堂) with jade cauldrons and spirit braziers
 * 6. Celestial Sanctuary Sword Forging Hearth (주검방) with glowing forge and weapon anvils
 * 7. Mountain Reflection Spring & Arched Moon Bridge (청심지 / 淸心池) with lotus lilies
 * 8. Cliffside Wooden Safety Railings overlooking the deep mountain gorge
 * 9. Blooming Plum Blossom Grove with dense pink petals and swirling petal storms
 * 10. Celestial Sanctuary Sect Mountain Gate with "天下第一劍門 天道門 (First Sword Sect Under Heaven)" banners
 */
import * as THREE from "three";
import { CollisionSystem } from "../physics/CollisionSystem";
import { KarstPinnacleBuilder } from "./KarstPinnacleBuilder";

export interface BambooStalkData {
  group: THREE.Group;
  baseX: number;
  baseZ: number;
  flex: number;
  phase: number;
}

export interface UniverseDynamicProps {
  braziers: { mesh: THREE.Group; light: THREE.PointLight; baseIntensity: number }[];
  lanterns: { mesh: THREE.Group; light: THREE.PointLight; baseIntensity: number; baseY: number; phase: number }[];
  skyLanterns: { mesh: THREE.Group; speed: number; startY: number }[];
  floatingPetals: THREE.Points | null;
  waterMesh: THREE.Mesh | null;
  bambooStalks: BambooStalkData[];
  greetingPines: THREE.Group[];
  banners: THREE.Mesh[];
  sunLight?: THREE.DirectionalLight;
}

export class MythicUniverseBuilder {
  public static build(
    scene: THREE.Scene,
    collisions: CollisionSystem
  ): UniverseDynamicProps {
    const dynamicProps: UniverseDynamicProps = {
      braziers: [],
      lanterns: [],
      skyLanterns: [],
      floatingPetals: null,
      waterMesh: null,
      bambooStalks: [],
      greetingPines: [],
      banners: [],
    };

    // ─── Classical Murim Taoist Materials ──────────────────────────────────────
    const darkTileMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark slate grey Taoist temple roof tiles
      roughness: 0.35,
      metalness: 0.2,
    });

    const whitePlasterMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Pure white plaster monastery walls
      roughness: 0.7,
      metalness: 0.05,
    });

    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x271e1b, // Dark aged mountain cedar wood
      roughness: 0.6,
      metalness: 0.1,
    });

    const plumPinkMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e, // Vibrant blossoming plum blossom petal pink
      roughness: 0.6,
      metalness: 0.1,
      emissive: 0x9f1239,
      emissiveIntensity: 0.2,
    });

    const plumWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xfff1f2, // Pale white plum blossom petal
      roughness: 0.7,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Taoist gilded plaque gold
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x78350f,
      emissiveIntensity: 0.3,
    });

    const graniteMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Mountain cliff granite flagstones
      roughness: 0.8,
      metalness: 0.1,
    });

    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // White jade stairs & balustrades
      roughness: 0.5,
    });

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      metalness: 0.8,
      roughness: 0.35,
    });

    // ─── 1. Sky & Horizon: Celestial Sanctuary Precipitous Peaks & Sea of Clouds ─────────
    this.buildMountHuaSkyAndPeaks(scene, dynamicProps);

    // ─── 2. Drill Court & Giant 5-Petal Plum Blossom Stone Mosaic ──────────────
    this.buildPlumBlossomDrillCourt(scene, graniteMat, plumPinkMat, plumWhiteMat, goldMat);

    // ─── 3. Celestial Sanctuary Plum Blossom Palace (천도문 대웅전 / 梅花殿) ─────────────
    this.buildMountHuaSanctuary(scene, collisions, darkTileMat, whitePlasterMat, timberMat, goldMat, marbleMat, bronzeMat);

    // ─── 4. Celestial Sanctuary Mountain Gate (천도 산문 / 華山 山門) ────────────────────
    this.buildMountHuaMountainGate(scene, collisions, dynamicProps, timberMat, darkTileMat, goldMat, plumPinkMat);

    // ─── 5. Pavilion of 10,000 Swords (만검각) & Centennial Plum Tree ──────────
    this.buildTenThousandSwordsPavilion(scene, collisions, dynamicProps, timberMat, darkTileMat, goldMat, graniteMat);

    // ─── 6. Pill & Qi Refining Hall (단약당 / 丹藥堂) ──────────────────────────
    this.buildPillRefiningHall(scene, collisions, dynamicProps, darkTileMat, timberMat, goldMat, graniteMat);

    // ─── 7. Celestial Sanctuary Sword Forging Hearth (주검방) ────────────────────────────
    this.buildSwordForgingHearth(scene, collisions, dynamicProps, graniteMat, timberMat);

    // ─── 8. Mountain Reflection Spring & Moon Bridge (청심지 / 淸心池) ─────────
    this.buildReflectionSpringAndBridge(scene, collisions, dynamicProps, graniteMat, marbleMat);

    // ─── 9. Cliffside Railings & Expanded Scenic Pathways Overlooking Sea of Clouds ───
    this.buildCliffsideRailings(scene, collisions, timberMat, graniteMat);

    // ─── 10. Blooming Plum Blossom Grove & Petal Storm ─────────────────────────
    this.buildPlumBlossomGroveAndPetalStorm(scene, collisions, dynamicProps);

    // ─── 11. Celestial Sanctuary Sect Banners & Sacred Sword Inscription Steles ──────────
    this.buildMountHuaBannersAndSteles(scene, collisions, dynamicProps, graniteMat, goldMat, plumPinkMat);

    // ─── 12. Emerald Bamboo Groves (翠竹海) ───────────────────────────
    this.buildEmeraldBambooGroves(scene, collisions, dynamicProps);

    // ─── 13. Greeting Pines & Golden Ginkgo / Autumn Maple Foliage ────
    this.buildGreetingPinesAndAutumnFoliage(scene, collisions, dynamicProps);

    // ─── 14. Where Winds Meet: Grand 5-Tier Octagonal Pagoda (八角千佛宝塔) ────
    this.buildGrandOctagonalPagoda(scene, collisions, dynamicProps, timberMat, darkTileMat, goldMat, marbleMat);

    // ─── 15. Where Winds Meet: Windswept Wayfarer Inn & Teahouse (風雲客棧) ───
    this.buildWindsweptWayfarerInn(scene, collisions, dynamicProps, timberMat, darkTileMat, goldMat);

    // ─── 16. Where Winds Meet: Misty Water Pavilion & Stilt Boardwalks (水榭碧波) ─
    this.buildMistyWaterPavilion(scene, collisions, dynamicProps, timberMat, darkTileMat, marbleMat);

    // ─── 17. Where Winds Meet: Ancient Covered Wind-and-Rain Bridge (風雨廊橋) ─
    this.buildCoveredWindAndRainBridge(scene, collisions, dynamicProps, timberMat, darkTileMat, goldMat);

    // ─── 18. Where Winds Meet: Celestial Hermit's Cloud-Peak Altar & Paifang Arch (雲霄仙壇) ─
    this.buildCelestialHermitAltar(scene, collisions, dynamicProps, graniteMat, goldMat, timberMat, darkTileMat);

    // ─── 19. Where Winds Meet: Ancient Bell & Drum Tower (鐘鼓樓) ─────────────
    this.buildAncientBellTower(scene, collisions, dynamicProps, timberMat, darkTileMat, bronzeMat, graniteMat);

    // ─── 20. Where Winds Meet: Plum Blossom Traversal Poles (梅花桩) ───────────
    this.buildPlumBlossomPoles(scene, collisions, timberMat);

    // ─── 21. Where Winds Meet: Zhangjiajie Karst Pinnacles & Suspension Rope Bridges ─
    KarstPinnacleBuilder.build(scene, collisions);

    // Enable soft shadow casting and receiving across all static architecture
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (
          !(child.geometry instanceof THREE.SphereGeometry && child.geometry.parameters.radius > 100)
        ) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      }
    });

    return dynamicProps;
  }

  /**
   * 1. Celestial Sanctuary Precipitous Peaks & Sea of Clouds (천도 운해)
   * High altitude mountain dawn sky with billowing white clouds rolling below granite peaks.
   */
  private static buildMountHuaSkyAndPeaks(scene: THREE.Scene, dynamicProps: UniverseDynamicProps): void {
    // Radiant Celestial Sanctuary Morning Sky: Celestial Azure
    scene.background = new THREE.Color(0x93c5fd);

    // Soft celestial sky hemisphere illumination (azure sky + warm earth bounce)
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x8d6e63, 1.25);
    scene.add(hemiLight);

    // Warm Golden Morning Sunlight (Breaking over Celestial Sanctuary summit with PCF Soft Shadows)
    const sunLight = new THREE.DirectionalLight(0xfff3d6, 2.8);
    sunLight.position.set(22, 45, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 160;
    sunLight.shadow.camera.left = -48;
    sunLight.shadow.camera.right = 48;
    sunLight.shadow.camera.top = 48;
    sunLight.shadow.camera.bottom = -48;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);
    dynamicProps.sunLight = sunLight;

    // Soft Golden Rim Light
    const plumRim = new THREE.DirectionalLight(0xfde047, 0.9);
    plumRim.position.set(-25, 30, -35);
    scene.add(plumRim);

    // ── Celestial Sky Dome with Morning Sunrise Gradient ──
    const skyGeo = new THREE.SphereGeometry(150, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      side: THREE.BackSide,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Luminous Morning Sun Disk
    const sunGroup = new THREE.Group();
    sunGroup.position.set(35, 52, -85);

    const sunGeo = new THREE.SphereGeometry(14, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    sunGroup.add(new THREE.Mesh(sunGeo, sunMat));

    // Golden & Rosy celestial halo ring
    const haloGeo = new THREE.RingGeometry(14.5, 28, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfbcfe8,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.lookAt(0, 0, 0);
    sunGroup.add(haloMesh);
    scene.add(sunGroup);

    // Vast Endless Sea of Clouds (천도 운해 / Unhae) rolling below Celestial Sanctuary's peaks
    const cloudSeaGeo = new THREE.PlaneGeometry(280, 280, 8, 8);
    const cloudSeaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });
    const cloudSea = new THREE.Mesh(cloudSeaGeo, cloudSeaMat);
    cloudSea.rotation.x = -Math.PI / 2;
    cloudSea.position.y = -3.2; // Sea of clouds rolling right below the cliffside railings
    scene.add(cloudSea);

    // Second billowing cloud puffs layer
    for (let c = 0; c < 24; c++) {
      const puffGeo = new THREE.SphereGeometry(12 + Math.random() * 8, 8, 6);
      const puffMat = new THREE.MeshBasicMaterial({
        color: 0xf8fafc,
        transparent: true,
        opacity: 0.75,
      });
      const puff = new THREE.Mesh(puffGeo, puffMat);
      const angle = (c / 24) * Math.PI * 2;
      const dist = 55 + Math.random() * 40;
      puff.position.set(Math.cos(angle) * dist, -3.8 + Math.random() * 1.5, Math.sin(angle) * dist);
      puff.scale.set(1.8, 0.45, 1.8);
      scene.add(puff);
    }

    // Steep Precipitous Celestial Sanctuary Granite Needles rising through the sea of clouds
    const needleColors = [0x64748b, 0x475569, 0x334155];
    for (let layer = 0; layer < 3; layer++) {
      const radius = 75 + layer * 25;
      const count = 22;
      const mat = new THREE.MeshStandardMaterial({
        color: needleColors[layer],
        roughness: 0.85,
        flatShading: true,
      });

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + layer * 0.25;
        const nx = Math.cos(angle) * radius;
        const nz = Math.sin(angle) * radius;
        const width = 14 + Math.random() * 12;
        const height = 38 + layer * 18 + Math.random() * 25;

        const needleGeo = new THREE.ConeGeometry(width, height, 5);
        const needle = new THREE.Mesh(needleGeo, mat);
        needle.position.set(nx, height * 0.42 - 5, nz);
        needle.rotation.y = angle;
        scene.add(needle);
      }
    }

    // Ascending paper sky lanterns floating up from Celestial Sanctuary's valleys
    for (let i = 0; i < 22; i++) {
      const lanternGroup = new THREE.Group();
      const lx = (Math.random() - 0.5) * 80;
      const lz = -25 - Math.random() * 65;
      const ly = 10 + Math.random() * 40;
      lanternGroup.position.set(lx, ly, lz);

      const lampGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.7, 8);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });
      lanternGroup.add(new THREE.Mesh(lampGeo, lampMat));

      const glowGeo = new THREE.SphereGeometry(0.5, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.35 });
      lanternGroup.add(new THREE.Mesh(glowGeo, glowMat));

      scene.add(lanternGroup);
      dynamicProps.skyLanterns.push({
        mesh: lanternGroup,
        speed: 0.75 + Math.random() * 0.75,
        startY: ly,
      });
    }
  }

  /**
   * 2. Drill Court & Giant 5-Petal Plum Blossom Inlaid Stone Crest (천도 연무장)
   */
  private static buildPlumBlossomDrillCourt(
    scene: THREE.Scene,
    graniteMat: THREE.Material,
    plumPinkMat: THREE.Material,
    plumWhiteMat: THREE.Material,
    goldMat: THREE.Material
  ): void {
    // Mountain Granite Plaza (66m x 74m summit court)
    const plazaGeo = new THREE.BoxGeometry(66, 0.45, 74);
    const plaza = new THREE.Mesh(plazaGeo, graniteMat);
    plaza.position.set(0, -0.22, -2);
    scene.add(plaza);

    // Central Ceremonial Granite Path leading to the Sanctuary
    const pathGeo = new THREE.BoxGeometry(7.0, 0.06, 64);
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.15,
    });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.position.set(0, 0.04, -2);
    scene.add(path);

    // Inlaid White Jade Borders along central path
    for (let side = -1; side <= 1; side += 2) {
      const border = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 64), plumWhiteMat);
      border.position.set(side * 3.5, 0.05, -2);
      scene.add(border);
    }

    // ── Giant Inlaid 5-Petal Plum Blossom Crest (천도문 상징 매화 문양) ──
    const crestGroup = new THREE.Group();
    crestGroup.position.set(0, 0.06, -6);

    // Outer Circle Ring
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(8.8, 9.4, 48),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide })
    );
    outerRing.rotation.x = -Math.PI / 2;
    crestGroup.add(outerRing);

    // Inner White Jade Ring
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(8.2, 8.6, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    innerRing.rotation.x = -Math.PI / 2;
    crestGroup.add(innerRing);

    // 5 Sacred Plum Blossom Petals (매화 꽃잎 5수)
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * 4.8;
      const pz = Math.sin(angle) * 4.8;

      // Outer Pink Petal Blade
      const petalGeo = new THREE.CircleGeometry(3.0, 24);
      const petal = new THREE.Mesh(petalGeo, plumPinkMat);
      petal.rotation.x = -Math.PI / 2;
      petal.position.set(px, 0.005, pz);
      crestGroup.add(petal);

      // Inner White Petal Vein
      const innerPetalGeo = new THREE.CircleGeometry(1.8, 20);
      const innerPetal = new THREE.Mesh(innerPetalGeo, plumWhiteMat);
      innerPetal.rotation.x = -Math.PI / 2;
      innerPetal.position.set(px * 0.8, 0.01, pz * 0.8);
      crestGroup.add(innerPetal);
    }

    // Central Gold Plum Blossom Core & Stamen Rays (화심 / 花心)
    const coreGeo = new THREE.CircleGeometry(2.0, 24);
    const core = new THREE.Mesh(coreGeo, goldMat);
    core.rotation.x = -Math.PI / 2;
    core.position.y = 0.015;
    crestGroup.add(core);

    for (let r = 0; r < 8; r++) {
      const rayAngle = (r / 8) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 1.8), goldMat);
      ray.position.set(Math.cos(rayAngle) * 1.5, 0.02, Math.sin(rayAngle) * 1.5);
      ray.rotation.y = -rayAngle;
      crestGroup.add(ray);
    }

    scene.add(crestGroup);
  }

  /**
   * 3. Celestial Sanctuary Plum Blossom Palace (천도문 대웅전 / 梅花殿)
   */
  private static buildMountHuaSanctuary(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    tileMat: THREE.Material,
    plasterMat: THREE.Material,
    timberMat: THREE.Material,
    goldMat: THREE.Material,
    marbleMat: THREE.Material,
    bronzeMat: THREE.Material
  ): void {
    const palaceGroup = new THREE.Group();
    const palaceZ = -34;
    palaceGroup.position.set(0, 0, palaceZ);

    // ── High Granite Stone Foundation Terrace ──
    const terraceGeo = new THREE.BoxGeometry(26, 2.4, 20);
    const terrace = new THREE.Mesh(terraceGeo, timberMat);
    terrace.position.y = 1.2;
    palaceGroup.add(terrace);

    // Front Grand Mountain Steps
    const steps = 8;
    for (let s = 0; s < steps; s++) {
      const sw = 15;
      const sd = 0.9;
      const sh = 2.4 / steps;
      const step = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), marbleMat);
      step.position.set(0, sh * (s + 0.5), 10 + sd * (steps - s));
      palaceGroup.add(step);
    }

    // Carved Center Plum Blossom Ramp on stairs
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 8.2), marbleMat);
    ramp.position.set(0, 1.2, 13.8);
    ramp.rotation.x = -0.28;
    palaceGroup.add(ramp);

    // ── Tier 1: Main Grand Plum Blossom Sanctuary ──
    const t1H = 5.5;
    const t1BaseY = 2.4;

    // 8 Massive Dark Mountain Cedar Columns
    const pillarPositions: [number, number][] = [
      [-8, -6], [-8, 0], [-8, 6],
      [8, -6], [8, 0], [8, 6],
      [-3, 6], [3, 6],
    ];

    for (const [px, pz] of pillarPositions) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, t1H, 12), timberMat);
      col.position.set(px, t1BaseY + t1H / 2, pz);
      palaceGroup.add(col);

      // Bronze column base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.35, 12), bronzeMat);
      base.position.set(px, t1BaseY + 0.17, pz);
      palaceGroup.add(base);
    }

    // Pure White Plaster Walls with Dark Timber Framing
    const wall = new THREE.Mesh(new THREE.BoxGeometry(15, t1H - 0.5, 12), plasterMat);
    wall.position.set(0, t1BaseY + (t1H - 0.5) / 2, 0);
    palaceGroup.add(wall);

    // Warm glowing paper lattice windows
    const winGeo = new THREE.PlaneGeometry(3.2, 2.4);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide });
    for (let i = -1; i <= 1; i += 2) {
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(i * 4.2, t1BaseY + 2.8, 6.05);
      palaceGroup.add(win);
    }

    // Grand Cedar Double Doors
    const door = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.8, 0.3), timberMat);
    door.position.set(0, t1BaseY + 1.9, 6.1);
    palaceGroup.add(door);

    // ── Iconic Calligraphic Board: "天道門 (CELESTIAL SECT)" ──
    const plaqueFrame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.5, 0.25), timberMat);
    plaqueFrame.position.set(0, t1BaseY + 4.5, 6.15);
    palaceGroup.add(plaqueFrame);

    const plaqueBoard = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.2, 0.3), goldMat);
    plaqueBoard.position.set(0, t1BaseY + 4.5, 6.2);
    palaceGroup.add(plaqueBoard);

    // Gilded Plum Blossom Badges flanking the plaque
    for (let side = -1; side <= 1; side += 2) {
      const flowerBadge = new THREE.Mesh(new THREE.CircleGeometry(0.35, 5), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
      flowerBadge.position.set(side * 2.5, t1BaseY + 4.5, 6.36);
      palaceGroup.add(flowerBadge);
    }

    // 2 Glowing Palace Lanterns on terrace facade
    for (let side = -1; side <= 1; side += 2) {
      const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.85, 8),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      lantern.position.set(side * 5.2, t1BaseY + 3.2, 6.4);
      palaceGroup.add(lantern);

      const light = new THREE.PointLight(0xf59e0b, 3.8, 22);
      light.position.set(side * 5.2, t1BaseY + 3.2, 6.8);
      palaceGroup.add(light);
    }

    // ── Build Multi-Tier Flared Slate Roofs ──
    this.createCurvedTileRoof(palaceGroup, t1BaseY + t1H, 22, 18, 2.4, tileMat, goldMat);

    // Tier 2: Middle Pavilion
    const t2BaseY = t1BaseY + t1H + 1.8;
    const t2H = 4.2;
    const t2Wall = new THREE.Mesh(new THREE.BoxGeometry(13, t2H, 10), plasterMat);
    t2Wall.position.set(0, t2BaseY + t2H / 2, 0);
    palaceGroup.add(t2Wall);

    this.createCurvedTileRoof(palaceGroup, t2BaseY + t2H, 17, 14, 2.0, tileMat, goldMat);

    // Tier 3: Upper Sanctum & Spire
    const t3BaseY = t2BaseY + t2H + 1.6;
    const t3H = 3.6;
    const t3Wall = new THREE.Mesh(new THREE.BoxGeometry(9.5, t3H, 7.5), plasterMat);
    t3Wall.position.set(0, t3BaseY + t3H / 2, 0);
    palaceGroup.add(t3Wall);

    this.createCurvedTileRoof(palaceGroup, t3BaseY + t3H, 13, 10.5, 1.8, tileMat, goldMat);

    // Spire Peak Finial
    const spireGeo = new THREE.CylinderGeometry(0.12, 0.5, 5.0, 8);
    const spire = new THREE.Mesh(spireGeo, goldMat);
    spire.position.set(0, t3BaseY + t3H + 1.8 + 2.5, 0);
    palaceGroup.add(spire);

    // ── Giant Bronze Incense Cauldron in front of stairs ──
    const cauldronGroup = new THREE.Group();
    cauldronGroup.position.set(0, 0, 19);

    const cauldronGeo = new THREE.CylinderGeometry(1.2, 0.9, 1.4, 12);
    const cauldron = new THREE.Mesh(cauldronGeo, bronzeMat);
    cauldron.position.y = 0.9;
    cauldronGroup.add(cauldron);

    // 3 Legs of the Cauldron
    for (let l = 0; l < 3; l++) {
      const legAngle = (l / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.9, 6), bronzeMat);
      leg.position.set(Math.cos(legAngle) * 0.8, 0.45, Math.sin(legAngle) * 0.8);
      leg.rotation.z = Math.cos(legAngle) * 0.2;
      cauldronGroup.add(leg);
    }

    // Glowing Sacred Incense Ash & Rising Smoke
    const ashGeo = new THREE.CircleGeometry(1.1, 12);
    const ashMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const ash = new THREE.Mesh(ashGeo, ashMat);
    ash.rotation.x = -Math.PI / 2;
    ash.position.y = 1.62;
    cauldronGroup.add(ash);

    const incenseLight = new THREE.PointLight(0xf97316, 2.5, 8);
    incenseLight.position.set(0, 2.0, 0);
    cauldronGroup.add(incenseLight);

    palaceGroup.add(cauldronGroup);

    scene.add(palaceGroup);

    collisions.addCollider({
      id: "mount_hua_sanctuary",
      type: "box",
      position: new THREE.Vector3(0, 6, palaceZ),
      halfSize: new THREE.Vector3(12, 10, 10),
    });
    collisions.addWalkableSurface({
      id: "sanctuary_terrace",
      type: "box",
      surfaceY: 2.4,
      minX: -13,
      maxX: 13,
      minZ: palaceZ - 10,
      maxZ: palaceZ + 10,
    });
    collisions.addWalkableSurface({
      id: "sanctuary_roof_tier1",
      type: "box",
      surfaceY: 8.5,
      minX: -14,
      maxX: 14,
      minZ: palaceZ - 11,
      maxZ: palaceZ + 11,
    });
    collisions.addWalkableSurface({
      id: "sanctuary_roof_tier2",
      type: "box",
      surfaceY: 15.5,
      minX: -10,
      maxX: 10,
      minZ: palaceZ - 8,
      maxZ: palaceZ + 8,
    });
  }

  /**
   * Helper to create traditional Taoist curved tile roof with upturned eaves.
   */
  private static createCurvedTileRoof(
    parent: THREE.Group,
    y: number,
    width: number,
    depth: number,
    height: number,
    tileMat: THREE.Material,
    goldMat: THREE.Material
  ): void {
    const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.72, height, 4);
    const roof = new THREE.Mesh(roofGeo, tileMat);
    roof.position.set(0, y + height * 0.45, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(width / Math.max(width, depth), 1.0, depth / Math.max(width, depth));
    parent.add(roof);

    // 4 Upturned Eaves Corners with Gold Chiwen Ridge Ornaments
    const corners = [
      [-width * 0.5, -depth * 0.5],
      [width * 0.5, -depth * 0.5],
      [width * 0.5, depth * 0.5],
      [-width * 0.5, depth * 0.5],
    ];

    for (const [cx, cz] of corners) {
      const ornament = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 4), goldMat);
      ornament.position.set(cx * 1.05, y + 0.35, cz * 1.05);
      ornament.rotation.x = (cz > 0 ? 1 : -1) * 0.4;
      ornament.rotation.z = (cx > 0 ? -1 : 1) * 0.4;
      parent.add(ornament);
    }
  }

  /**
   * 4. Celestial Sanctuary Mountain Gate (천도 산문 / 華山 山門)
   */
  private static buildMountHuaMountainGate(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    timberMat: THREE.Material,
    tileMat: THREE.Material,
    goldMat: THREE.Material,
    silkMat: THREE.Material
  ): void {
    const gateGroup = new THREE.Group();
    const gateZ = 24;
    gateGroup.position.set(0, 0, gateZ);

    // 4 Heavy Mountain Cedar Columns
    const offsets = [-7, -2.8, 2.8, 7];
    const heights = [6.5, 8.5, 8.5, 6.5];

    offsets.forEach((ox, i) => {
      const h = heights[i];
      const r = i === 1 || i === 2 ? 0.5 : 0.4;

      const col = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 12), timberMat);
      col.position.set(ox, h / 2, 0);
      gateGroup.add(col);

      // Bronze ring wraps
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.15, 0.05, 6, 12), goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(ox, 2.2, 0);
      gateGroup.add(ring);
    });

    // Massive Cedar Crossbeams
    const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(16, 0.65, 0.85), timberMat);
    mainBeam.position.set(0, 7.8, 0);
    gateGroup.add(mainBeam);

    // Inscription Plaque: "天下第一劍門 天道門 (First Sword Sect Under Heaven, Celestial Sanctuary)"
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.4, 0.25), timberMat);
    plaque.position.set(0, 8.5, 0.4);
    gateGroup.add(plaque);

    const plaqueFace = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.1, 0.3), goldMat);
    plaqueFace.position.set(0, 8.5, 0.42);
    gateGroup.add(plaqueFace);

    // Tiled Gate Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.8, 1.8, 4), tileMat);
    roof.position.set(0, 10.3, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.4, 1.0, 0.6);
    gateGroup.add(roof);

    // 4 Hanging Silk Plum Blossom Lanterns
    const lanternX = [-4.8, -1.6, 1.6, 4.8];
    lanternX.forEach((lx, i) => {
      const lGroup = new THREE.Group();
      lGroup.position.set(lx, 6.8, 0.6);

      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.65, 8), silkMat);
      lGroup.add(lamp);

      const light = new THREE.PointLight(0xf43f5e, 2.2, 9);
      light.position.set(0, -0.2, 0);
      lGroup.add(light);

      gateGroup.add(lGroup);
      dynamicProps.lanterns.push({
        mesh: lGroup,
        light,
        baseIntensity: 2.2,
        baseY: 6.8,
        phase: i * 1.5,
      });
    });

    scene.add(gateGroup);

    collisions.addCollider({
      id: "mount_hua_gate_left",
      type: "cylinder",
      position: new THREE.Vector3(-5, 0, gateZ),
      radius: 2.5,
      height: 8,
    });
    collisions.addCollider({
      id: "mount_hua_gate_right",
      type: "cylinder",
      position: new THREE.Vector3(5, 0, gateZ),
      radius: 2.5,
      height: 8,
    });
  }

  /**
   * 5. Pavilion of 10,000 Swords (만검각 / 萬劍閣) & Centennial Plum Tree
   */
  private static buildTenThousandSwordsPavilion(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    timberMat: THREE.Material,
    tileMat: THREE.Material,
    goldMat: THREE.Material,
    graniteMat: THREE.Material
  ): void {
    const pavGroup = new THREE.Group();
    const px = 20;
    const pz = -6;
    pavGroup.position.set(px, 0, pz);

    // Octagonal Granite Sparring Plinth
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.0, 0.8, 8), graniteMat);
    plinth.position.y = 0.4;
    pavGroup.add(plinth);

    // Polished Mountain Cedar Sparring Deck
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 7.8, 0.1, 8), timberMat);
    deck.position.y = 0.85;
    pavGroup.add(deck);

    // 8 Timber Pillars & Curved Roof
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 5.2, 8), timberMat);
      col.position.set(Math.cos(angle) * 7.2, 0.8 + 2.6, Math.sin(angle) * 7.2);
      pavGroup.add(col);
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(9.8, 3.2, 8), tileMat);
    roof.position.y = 6.0 + 1.6;
    roof.rotation.y = Math.PI / 8;
    pavGroup.add(roof);

    // Gilded Plum Blossom Finial
    const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 1.8, 8), goldMat);
    finial.position.y = 6.0 + 3.2 + 0.9;
    pavGroup.add(finial);

    // Wooden Weapon Racks with Celestial Sanctuary Plum Blossom Swords
    for (let r = 0; r < 2; r++) {
      const rack = new THREE.Group();
      rack.position.set(r === 0 ? -4.5 : 4.5, 0.85, -4.5);
      rack.rotation.y = r === 0 ? 0.7 : -0.7;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 0.4), timberMat);
      rack.add(frame);

      // Displayed steel plum blossom swords
      for (let w = 0; w < 4; w++) {
        const sword = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 })
        );
        sword.position.set(-0.8 + w * 0.5, 0.5, 0);
        rack.add(sword);
      }
      pavGroup.add(rack);
    }

    // ── Massive Centennial Blooming Plum Blossom Tree beside Pavilion ──
    const treeGroup = new THREE.Group();
    treeGroup.position.set(8.5, 0, 2.0);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 6.5, 8), timberMat);
    trunk.position.y = 3.25;
    trunk.rotation.z = -0.15;
    treeGroup.add(trunk);

    // Dense Clouds of Blooming Pink Plum Blossoms
    const plumFoliageMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.65,
      metalness: 0.05,
      emissive: 0x9f1239,
      emissiveIntensity: 0.25,
    });

    for (let c = 0; c < 7; c++) {
      const cloud = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2.2 + Math.random() * 0.8, 1),
        plumFoliageMat
      );
      cloud.position.set(
        (Math.random() - 0.5) * 4.0,
        5.5 + Math.random() * 2.8,
        (Math.random() - 0.5) * 4.0
      );
      treeGroup.add(cloud);
    }
    pavGroup.add(treeGroup);

    scene.add(pavGroup);

    collisions.addWalkableSurface({
      id: "ten_thousand_swords_deck",
      type: "circle",
      surfaceY: 0.85,
      cx: px,
      cz: pz,
      radius: 7.8,
    });
    collisions.addWalkableSurface({
      id: "ten_thousand_swords_roof",
      type: "circle",
      surfaceY: 7.6,
      cx: px,
      cz: pz,
      radius: 8.5,
    });
    collisions.addCollider({
      id: "ten_thousand_swords_core",
      type: "cylinder",
      position: new THREE.Vector3(px, 0.85, pz),
      radius: 1.8,
      height: 6,
    });
  }

  /**
   * 6. Pill & Qi Refining Hall (단약당 / 丹藥堂)
   */
  private static buildPillRefiningHall(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    tileMat: THREE.Material,
    timberMat: THREE.Material,
    goldMat: THREE.Material,
    graniteMat: THREE.Material
  ): void {
    const hallGroup = new THREE.Group();
    const ax = -20;
    const az = -6;
    hallGroup.position.set(ax, 0, az);

    // Stone Podium
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.0, 0.7, 16), graniteMat);
    podium.position.y = 0.35;
    hallGroup.add(podium);

    // Inlaid Yin-Yang Qi Refining Circle
    const yinYang = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 5.8, 32),
      new THREE.MeshBasicMaterial({ color: 0x059669, side: THREE.DoubleSide })
    );
    yinYang.rotation.x = -Math.PI / 2;
    yinYang.position.y = 0.72;
    hallGroup.add(yinYang);

    // Great Jade Pill Alchemy Furnace in center
    const furnaceGroup = new THREE.Group();
    furnaceGroup.position.set(0, 2.0, 0);

    const furnaceGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const jadeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x047857,
      emissiveIntensity: 0.4,
    });
    furnaceGroup.add(new THREE.Mesh(furnaceGeo, jadeMat));

    const furnaceLight = new THREE.PointLight(0x10b981, 2.8, 12);
    furnaceGroup.add(furnaceLight);

    hallGroup.add(furnaceGroup);

    scene.add(hallGroup);

    collisions.addWalkableSurface({
      id: "pill_refining_deck",
      type: "circle",
      surfaceY: 0.7,
      cx: ax,
      cz: az,
      radius: 7.5,
    });
    collisions.addWalkableSurface({
      id: "pill_refining_roof",
      type: "circle",
      surfaceY: 6.2,
      cx: ax,
      cz: az,
      radius: 7.8,
    });
    collisions.addCollider({
      id: "pill_refining_furnace",
      type: "cylinder",
      position: new THREE.Vector3(ax, 0.7, az),
      radius: 1.8,
      height: 4,
    });
  }

  /**
   * 7. Celestial Sanctuary Sword Forging Hearth (주검방 / 鑄劍坊)
   */
  private static buildSwordForgingHearth(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    graniteMat: THREE.Material,
    timberMat: THREE.Material
  ): void {
    const forgeGroup = new THREE.Group();
    const fx = -16;
    const fz = 10;
    forgeGroup.position.set(fx, 0, fz);

    // Stone Hearth
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.6, 3.5), graniteMat);
    hearth.position.set(0, 1.3, 0);
    forgeGroup.add(hearth);

    // Chimney
    const flue = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 4.2, 8), graniteMat);
    flue.position.set(0, 4.0, -0.4);
    forgeGroup.add(flue);

    // Glowing Molten Fire Pit
    const fire = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.2), new THREE.MeshBasicMaterial({ color: 0xff4500 }));
    fire.position.set(0, 1.4, 1.2);
    forgeGroup.add(fire);

    const forgeLight = new THREE.PointLight(0xff5500, 3.8, 14);
    forgeLight.position.set(0, 1.6, 1.8);
    forgeGroup.add(forgeLight);

    // Blacksmith Anvil
    const anvilMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9, roughness: 0.2 });
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.6), anvilMat);
    anvil.position.set(1.8, 1.15, 2.4);
    forgeGroup.add(anvil);

    scene.add(forgeGroup);

    collisions.addCollider({
      id: "sword_forging_hearth",
      type: "box",
      position: new THREE.Vector3(fx, 1.3, fz),
      halfSize: new THREE.Vector3(2.3, 1.3, 1.8),
    });
    collisions.addWalkableSurface({
      id: "hearth_top",
      type: "box",
      surfaceY: 2.6,
      minX: fx - 2.3,
      maxX: fx + 2.3,
      minZ: fz - 1.8,
      maxZ: fz + 1.8,
    });
  }

  /**
   * 8. Mountain Reflection Spring & Moon Bridge (청심지 / 淸心池)
   */
  private static buildReflectionSpringAndBridge(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    graniteMat: THREE.Material,
    marbleMat: THREE.Material
  ): void {
    const pondGroup = new THREE.Group();
    const px = 16;
    const pz = 10;
    pondGroup.position.set(px, 0, pz);

    // Spring Basin
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6.2, 0.6, 24), graniteMat);
    basin.position.y = -0.15;
    pondGroup.add(basin);

    // Shimmering Spring Water
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(5.6, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85,
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.08;
    pondGroup.add(water);
    dynamicProps.waterMesh = water;

    // Pink Water Lilies
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const r = 1.8 + Math.random() * 2.8;
      const flower = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 0.25, 6),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
      );
      flower.position.set(Math.cos(angle) * r, 0.18, Math.sin(angle) * r);
      pondGroup.add(flower);
    }

    // Arched Stone Bridge across the spring
    for (let b = 0; b < 10; b++) {
      const t = (b / 9) * Math.PI;
      const by = Math.sin(t) * 1.4 + 0.15;
      const bz = (b / 9 - 0.5) * 8.5;
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 0.95), marbleMat);
      step.position.set(0, by, bz);
      pondGroup.add(step);
    }

    scene.add(pondGroup);

    // Bridge deck walkable surface
    collisions.addWalkableSurface({
      id: "moon_bridge_deck",
      type: "box",
      surfaceY: 1.4,
      minX: px - 1.4,
      maxX: px + 1.4,
      minZ: pz - 4.5,
      maxZ: pz + 4.5,
    });
  }

  /**
   * 9. Cliffside Railings & Expanded Scenic Pathways Overlooking Sea of Clouds
   */
  private static buildCliffsideRailings(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    timberMat: THREE.Material,
    graniteMat: THREE.Material
  ): void {
    // ── Extended Mountain Plateau Foundations ──
    // 1. East Pagoda & Wayfarer Terrace (granite foundation at y = -0.22)
    const eastTerrace = new THREE.Mesh(new THREE.BoxGeometry(46, 0.45, 68), graniteMat);
    eastTerrace.position.set(48, -0.22, -6);
    scene.add(eastTerrace);

    // 2. West Water & Hermit Terrace
    const westTerrace = new THREE.Mesh(new THREE.BoxGeometry(46, 0.45, 68), graniteMat);
    westTerrace.position.set(-48, -0.22, -6);
    scene.add(westTerrace);

    // 3. South Gorge Approach Terrace
    const southTerrace = new THREE.Mesh(new THREE.BoxGeometry(40, 0.45, 42), graniteMat);
    southTerrace.position.set(0, -0.22, 50);
    scene.add(southTerrace);

    // ── Paved Flagstone Promenades Connecting Districts ──
    // North-East path leading to 5-Tier Pagoda
    const nePath = new THREE.Mesh(new THREE.BoxGeometry(26, 0.05, 5.0), graniteMat);
    nePath.position.set(28, 0.03, -22);
    nePath.rotation.y = -0.35;
    scene.add(nePath);

    // East path leading to Wayfarer Inn
    const ePath = new THREE.Mesh(new THREE.BoxGeometry(24, 0.05, 4.5), graniteMat);
    ePath.position.set(30, 0.03, 14);
    scene.add(ePath);

    // West path leading to Water Pavilion & Bell Tower
    const wPath = new THREE.Mesh(new THREE.BoxGeometry(24, 0.05, 4.5), graniteMat);
    wPath.position.set(-30, 0.03, 14);
    scene.add(wPath);

    // North-West path leading to Hermit's Pinnacle
    const nwPath = new THREE.Mesh(new THREE.BoxGeometry(26, 0.05, 4.5), graniteMat);
    nwPath.position.set(-28, 0.03, -22);
    nwPath.rotation.y = 0.35;
    scene.add(nwPath);

    // South path leading from Mountain Gate to Covered Bridge
    const sPath = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.05, 20), graniteMat);
    sPath.position.set(0, 0.03, 32);
    scene.add(sPath);

    // ── Outer Boundary Railings (88m x 88m perimeter) ──
    const outerBound = 88;
    const fenceSides = [
      { start: [-outerBound, -outerBound], end: [outerBound, -outerBound] },
      { start: [-outerBound, outerBound], end: [outerBound, outerBound] },
      { start: [-outerBound, -outerBound], end: [-outerBound, outerBound] },
      { start: [outerBound, -outerBound], end: [outerBound, outerBound] },
    ];

    fenceSides.forEach((side) => {
      const count = 28;
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const x = side.start[0] + (side.end[0] - side.start[0]) * t;
        const z = side.start[1] + (side.end[1] - side.start[1]) * t;

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.8, 6), timberMat);
        post.position.set(x, 0.9, z);
        scene.add(post);
      }
    });

    // Outer Boundary Colliders
    collisions.addCollider({
      id: "boundary_west",
      type: "box",
      position: new THREE.Vector3(-outerBound, 8, 0),
      halfSize: new THREE.Vector3(2.0, 15, outerBound),
    });
    collisions.addCollider({
      id: "boundary_east",
      type: "box",
      position: new THREE.Vector3(outerBound, 8, 0),
      halfSize: new THREE.Vector3(2.0, 15, outerBound),
    });
    collisions.addCollider({
      id: "boundary_north",
      type: "box",
      position: new THREE.Vector3(0, 8, -outerBound),
      halfSize: new THREE.Vector3(outerBound, 15, 2.0),
    });
    collisions.addCollider({
      id: "boundary_south",
      type: "box",
      position: new THREE.Vector3(0, 8, outerBound),
      halfSize: new THREE.Vector3(outerBound, 15, 2.0),
    });
  }

  /**
   * 10. Blooming Plum Blossom Grove & Petal Storm (천도 매화림)
   */
  private static buildPlumBlossomGroveAndPetalStorm(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps
  ): void {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const plumBlossomMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.65,
      emissive: 0xbe123c,
      emissiveIntensity: 0.3,
    });

    // 8 Ancient Blooming Plum Blossom Trees positioned strategically around the court
    const treePositions: [number, number][] = [
      [-11, -16], [11, -16],
      [-26, -18], [26, -18],
      [-11, 16], [11, 16],
      [-24, 6], [24, 6],
    ];

    treePositions.forEach(([tx, tz], i) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      // Gnarled dark wood trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 5.5, 7), trunkMat);
      trunk.position.y = 2.75;
      trunk.rotation.z = (Math.random() - 0.5) * 0.25;
      tree.add(trunk);

      // Clusters of blooming pink plum blossoms
      for (let c = 0; c < 6; c++) {
        const rad = 1.7 + Math.random() * 0.8;
        const blossomCluster = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), plumBlossomMat);
        blossomCluster.position.set(
          (Math.random() - 0.5) * 2.8,
          4.8 + Math.random() * 2.2,
          (Math.random() - 0.5) * 2.8
        );
        tree.add(blossomCluster);
      }

      scene.add(tree);
      collisions.addCollider({
        id: `plum_tree_${i}`,
        type: "cylinder",
        position: new THREE.Vector3(tx, 0, tz),
        radius: 0.7,
        height: 6,
      });
    });

    // ── Where Winds Meet Multi-Variety Wind Particle Storm ──
    const particleCount = 550;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const leafPalette = [
      new THREE.Color(0x22c55e), // Jade Green Bamboo Leaf
      new THREE.Color(0x16a34a), // Deep Bamboo Leaf
      new THREE.Color(0xfbbf24), // Golden Ginkgo Fan Leaf
      new THREE.Color(0xf59e0b), // Amber Ginkgo Leaf
      new THREE.Color(0xef4444), // Scarlet Autumn Maple Leaf
      new THREE.Color(0xdc2626), // Deep Crimson Maple Leaf
      new THREE.Color(0xfb7185), // Rosy Plum Blossom Petal
      new THREE.Color(0xfef08a), // Golden Sun Dust Mote / Pollen
    ];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 65;
      particlePositions[i * 3 + 1] = 0.4 + Math.random() * 8.5;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 65;

      const col = leafPalette[i % leafPalette.length];
      particleColors[i * 3] = col.r;
      particleColors[i * 3 + 1] = col.g;
      particleColors[i * 3 + 2] = col.b;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.38,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const windPoints = new THREE.Points(particleGeo, particleMat);
    scene.add(windPoints);
    dynamicProps.floatingPetals = windPoints;
  }

  /**
   * 11. Celestial Sanctuary Sect Banners & Sacred Sword Inscription Steles
   */
  private static buildMountHuaBannersAndSteles(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    graniteMat: THREE.Material,
    goldMat: THREE.Material,
    plumPinkMat: THREE.Material
  ): void {
    // Celestial Sanctuary Silk Banners flanking the central walkway
    const bannerX = [-5.5, 5.5];
    bannerX.forEach((bx, i) => {
      const bannerGroup = new THREE.Group();
      bannerGroup.position.set(bx, 0, 8);

      // Cedar Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6.0, 6), graniteMat);
      pole.position.y = 3.0;
      bannerGroup.add(pole);

      // White Silk Banner with Pink Plum Blossom Emblem
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 3.2),
        new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      banner.position.set(0.65, 3.6, 0);
      bannerGroup.add(banner);

      // 5-Petal Plum Blossom Crest on Banner
      const crest = new THREE.Mesh(new THREE.CircleGeometry(0.35, 5), plumPinkMat);
      crest.position.set(0.65, 3.8, 0.01);
      bannerGroup.add(crest);

      scene.add(bannerGroup);
      dynamicProps.banners.push(banner);
    });

    // Sacred Inscribed Stone Steles: "二十四手梅花劍法 (24 Plum Blossom Sword Art)"
    const stelePositions: [number, number][] = [
      [-6.5, 14], [6.5, 14],
    ];

    stelePositions.forEach(([sx, sz], i) => {
      const steleGroup = new THREE.Group();
      steleGroup.position.set(sx, 0, sz);

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.8), graniteMat);
      base.position.y = 0.25;
      steleGroup.add(base);

      const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.8, 0.35), graniteMat);
      tablet.position.set(0, 1.8, 0);
      steleGroup.add(tablet);

      // Engraved Glowing Plum Blossom Rune
      const rune = new THREE.Mesh(new THREE.CircleGeometry(0.25, 5), plumPinkMat);
      rune.position.set(0, 2.4, 0.19);
      steleGroup.add(rune);

      scene.add(steleGroup);
      collisions.addCollider({
        id: `stele_${i}`,
        type: "cylinder",
        position: new THREE.Vector3(sx, 0, sz),
        radius: 0.8,
        height: 3.5,
      });
    });
  }

  /**
   * 12. Towering Emerald Bamboo Forest (翠竹海 - Where Winds Meet Bamboo Sea)
   */
  private static buildEmeraldBambooGroves(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps
  ): void {
    const culmMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Vibrant mountain jade bamboo culm
      roughness: 0.35,
      metalness: 0.1,
    });

    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xeab308, // Golden-amber bamboo ring node
      roughness: 0.4,
      metalness: 0.15,
    });

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // Fresh bamboo leaf cluster
      roughness: 0.55,
      side: THREE.DoubleSide,
    });

    // 4 Distinct Bamboo Grove Clusters flanking the drill court and mountain paths
    const bambooClusters: { cx: number; cz: number; count: number; spread: number }[] = [
      { cx: -25, cz: -8, count: 18, spread: 5.5 },  // Western Bamboo Grove
      { cx: 25, cz: -8, count: 18, spread: 5.5 },   // Eastern Bamboo Grove
      { cx: -24, cz: 18, count: 14, spread: 5.0 },  // South-West Approach
      { cx: 24, cz: 18, count: 14, spread: 5.0 },   // South-East Pond Flank
    ];

    bambooClusters.forEach((cluster, cIdx) => {
      for (let b = 0; b < cluster.count; b++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * cluster.spread;
        const bx = cluster.cx + Math.cos(angle) * radius;
        const bz = cluster.cz + Math.sin(angle) * radius;

        const stalkGroup = new THREE.Group();
        stalkGroup.position.set(bx, 0, bz);

        const height = 8.0 + Math.random() * 5.0; // 8m to 13m tall towering bamboo
        const segments = 7;
        const segHeight = height / segments;

        // Build segmented culms with node rings
        for (let s = 0; s < segments; s++) {
          const taper = 1.0 - (s / segments) * 0.35;
          const culmGeo = new THREE.CylinderGeometry(0.10 * taper, 0.12 * taper, segHeight * 0.94, 6);
          const culmMesh = new THREE.Mesh(culmGeo, culmMat);
          culmMesh.position.y = s * segHeight + segHeight * 0.47;
          culmMesh.castShadow = true;
          stalkGroup.add(culmMesh);

          // Golden Node Ring at joint
          const ringGeo = new THREE.TorusGeometry(0.125 * taper, 0.02 * taper, 4, 8);
          const ringMesh = new THREE.Mesh(ringGeo, nodeMat);
          ringMesh.rotation.x = Math.PI / 2;
          ringMesh.position.y = (s + 1) * segHeight;
          stalkGroup.add(ringMesh);

          // Upper segments have leafy bamboo branches
          if (s >= 3) {
            const branchAngle = (s * 2.2 + b) % (Math.PI * 2);
            for (let l = 0; l < 2; l++) {
              const leafFanGeo = new THREE.PlaneGeometry(0.9 * taper, 0.45 * taper);
              const leafMesh = new THREE.Mesh(leafFanGeo, leafMat);
              leafMesh.position.set(
                Math.cos(branchAngle) * 0.5 * taper,
                s * segHeight + segHeight * 0.8,
                Math.sin(branchAngle) * 0.5 * taper
              );
              leafMesh.rotation.y = branchAngle + (l - 0.5) * 0.6;
              leafMesh.rotation.x = -0.35;
              stalkGroup.add(leafMesh);
            }
          }
        }

        scene.add(stalkGroup);
        dynamicProps.bambooStalks.push({
          group: stalkGroup,
          baseX: bx,
          baseZ: bz,
          flex: 0.6 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
        });

        if (b % 3 === 0) {
          collisions.addCollider({
            id: `bamboo_${cIdx}_${b}`,
            type: "cylinder",
            position: new THREE.Vector3(bx, 0, bz),
            radius: 0.35,
            height: height,
          });
        }
      }
    });
  }

  /**
   * 13. Cliffside Greeting Pines (迎客松) & Golden Ginkgo / Autumn Maple Foliage
   */
  private static buildGreetingPinesAndAutumnFoliage(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps
  ): void {
    const pineTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x3d271d,
      roughness: 0.95,
    });

    const needleMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b, // Deep emerald cliff pine needles
      roughness: 0.75,
      side: THREE.DoubleSide,
    });

    const ginkgoMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Radiant golden ginkgo canopy
      roughness: 0.6,
      emissive: 0xd97706,
      emissiveIntensity: 0.18,
    });

    const mapleMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Scarlet mountain maple foliage
      roughness: 0.6,
      emissive: 0x991b1b,
      emissiveIntensity: 0.18,
    });

    // ── 1. Three Ancient Greeting Pines extending over the cliff gorge ──
    const pinePositions: { px: number; pz: number; rotY: number; leanAngle: number }[] = [
      { px: -29, pz: -26, rotY: -0.6, leanAngle: 0.45 },
      { px: 29, pz: -26, rotY: 0.6, leanAngle: -0.45 },
      { px: 0, pz: 32, rotY: Math.PI, leanAngle: 0.35 },
    ];

    pinePositions.forEach((pine, idx) => {
      const pineGroup = new THREE.Group();
      pineGroup.position.set(pine.px, 0, pine.pz);
      pineGroup.rotation.y = pine.rotY;

      // Curved Gnarled Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.4, 0.75, 7.5, 7);
      const trunkMesh = new THREE.Mesh(trunkGeo, pineTrunkMat);
      trunkMesh.position.set(1.2, 3.5, 0);
      trunkMesh.rotation.z = pine.leanAngle;
      trunkMesh.castShadow = true;
      pineGroup.add(trunkMesh);

      // Horizontal Tiered Pine Needle Cushions
      for (let t = 0; t < 5; t++) {
        const cushionGeo = new THREE.CylinderGeometry(1.6 - t * 0.2, 1.8 - t * 0.2, 0.35, 10);
        const cushion = new THREE.Mesh(cushionGeo, needleMat);
        cushion.position.set(1.6 + t * 0.6 * Math.sign(pine.leanAngle), 4.8 + t * 0.7, (t % 2 - 0.5) * 0.8);
        cushion.castShadow = true;
        pineGroup.add(cushion);
      }

      scene.add(pineGroup);
      dynamicProps.greetingPines.push(pineGroup);

      collisions.addCollider({
        id: `greeting_pine_${idx}`,
        type: "cylinder",
        position: new THREE.Vector3(pine.px, 0, pine.pz),
        radius: 0.8,
        height: 6,
      });
    });

    // ── 2. Golden Ginkgo & Scarlet Maple Trees ──
    const autumnTrees: { tx: number; tz: number; mat: THREE.Material }[] = [
      { tx: -18, tz: -24, mat: ginkgoMat }, // Western Golden Ginkgo
      { tx: 18, tz: -24, mat: ginkgoMat },  // Eastern Golden Ginkgo
      { tx: -27, tz: 3, mat: mapleMat },    // Western Scarlet Maple
      { tx: 27, tz: 3, mat: mapleMat },     // Eastern Scarlet Maple
    ];

    autumnTrees.forEach((at, idx) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(at.tx, 0, at.tz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 6.0, 7), pineTrunkMat);
      trunk.position.y = 3.0;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      for (let c = 0; c < 5; c++) {
        const canopyCluster = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0 + Math.random() * 0.6, 1), at.mat);
        canopyCluster.position.set(
          (Math.random() - 0.5) * 2.5,
          5.2 + Math.random() * 1.8,
          (Math.random() - 0.5) * 2.5
        );
        canopyCluster.castShadow = true;
        treeGroup.add(canopyCluster);
      }

      scene.add(treeGroup);
      collisions.addCollider({
        id: `autumn_tree_${idx}`,
        type: "cylinder",
        position: new THREE.Vector3(at.tx, 0, at.tz),
        radius: 0.7,
        height: 6,
      });
    });
  }

  /**
   * 14. Where Winds Meet: Grand 5-Tier Octagonal Pagoda (八角千佛宝塔)
   * Towering authentic Song-dynasty multi-tiered pagoda with sweeping eaves,
   * wind-bells, golden spire, and 5 walkable balcony levels for Qinggong rooftop climbing.
   */
  private static buildGrandOctagonalPagoda(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    timberMat: THREE.Material,
    tileMat: THREE.Material,
    goldMat: THREE.Material,
    marbleMat: THREE.Material
  ): void {
    const pagodaGroup = new THREE.Group();
    const px = 44;
    const pz = -26;
    pagodaGroup.position.set(px, 0, pz);

    // ── High Octagonal White Jade & Marble Plinth ──
    const plinthGeo = new THREE.CylinderGeometry(9.8, 10.5, 1.2, 8);
    const plinth = new THREE.Mesh(plinthGeo, marbleMat);
    plinth.position.y = 0.6;
    pagodaGroup.add(plinth);

    collisions.addWalkableSurface({
      id: "pagoda_plinth",
      type: "circle",
      surfaceY: 1.2,
      cx: px,
      cz: pz,
      radius: 9.8,
    });

    // Front stone access steps
    const stepsCount = 5;
    for (let s = 0; s < stepsCount; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2 / stepsCount, 0.7), marbleMat);
      step.position.set(0, (s + 0.5) * (1.2 / stepsCount), 10.2 + (stepsCount - s) * 0.65);
      pagodaGroup.add(step);
    }

    // ── 5 Tiers with Walkable Balconies & Flared Eaves ──
    const tiers = [
      { y: 1.2, chamberR: 6.2, balconyR: 7.8, roofH: 1.8, eaveR: 8.8 },
      { y: 5.2, chamberR: 5.2, balconyR: 6.6, roofH: 1.6, eaveR: 7.6 },
      { y: 10.2, chamberR: 4.2, balconyR: 5.4, roofH: 1.5, eaveR: 6.4 },
      { y: 15.2, chamberR: 3.2, balconyR: 4.2, roofH: 1.4, eaveR: 5.2 },
      { y: 20.2, chamberR: 2.2, balconyR: 3.0, roofH: 1.3, eaveR: 4.0 },
    ];

    tiers.forEach((tier, idx) => {
      const tierH = 4.0;
      const baseTierY = tier.y;

      // Octagonal Wall Chamber
      const wallGeo = new THREE.CylinderGeometry(tier.chamberR, tier.chamberR, tierH, 8);
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.65,
        metalness: 0.05,
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.y = baseTierY + tierH / 2;
      pagodaGroup.add(wall);

      // 8 Red Lacquer Cedar Columns around chamber
      for (let c = 0; c < 8; c++) {
        const angle = (c / 8) * Math.PI * 2 + Math.PI / 8;
        const colX = Math.cos(angle) * (tier.chamberR + 0.15);
        const colZ = Math.sin(angle) * (tier.chamberR + 0.15);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, tierH, 8), timberMat);
        col.position.set(colX, baseTierY + tierH / 2, colZ);
        pagodaGroup.add(col);
      }

      // Wooden Balcony Deck
      const deckGeo = new THREE.CylinderGeometry(tier.balconyR, tier.balconyR, 0.22, 8);
      const deck = new THREE.Mesh(deckGeo, timberMat);
      deck.position.y = baseTierY + tierH;
      pagodaGroup.add(deck);

      // Balcony Railings
      for (let r = 0; r < 8; r++) {
        const a = (r / 8) * Math.PI * 2;
        const rx = Math.cos(a) * (tier.balconyR - 0.2);
        const rz = Math.sin(a) * (tier.balconyR - 0.2);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6), timberMat);
        post.position.set(rx, baseTierY + tierH + 0.45, rz);
        pagodaGroup.add(post);
      }

      // Register Walkable Surface for this tier's balcony!
      collisions.addWalkableSurface({
        id: `pagoda_balcony_tier_${idx + 1}`,
        type: "circle",
        surfaceY: baseTierY + tierH,
        cx: px,
        cz: pz,
        radius: tier.balconyR,
      });

      // Octagonal Flared Tiled Roof
      const roofGeo = new THREE.ConeGeometry(tier.eaveR, tier.roofH, 8);
      const roof = new THREE.Mesh(roofGeo, tileMat);
      roof.position.y = baseTierY + tierH + tier.roofH * 0.45;
      roof.rotation.y = Math.PI / 8;
      pagodaGroup.add(roof);

      // 8 Golden Chiwen Corner Ornaments & Suspended Bronze Wind Bells
      for (let b = 0; b < 8; b++) {
        const bAngle = (b / 8) * Math.PI * 2 + Math.PI / 8;
        const bx = Math.cos(bAngle) * tier.eaveR;
        const bz = Math.sin(bAngle) * tier.eaveR;

        // Chiwen ridge beast
        const chiwen = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 4), goldMat);
        chiwen.position.set(bx * 0.98, baseTierY + tierH + 0.35, bz * 0.98);
        pagodaGroup.add(chiwen);

        // Hanging bronze wind bell
        const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.25, 6), goldMat);
        bell.position.set(bx, baseTierY + tierH - 0.18, bz);
        pagodaGroup.add(bell);
      }

      // Lanterns on Tier 1 and 2
      if (idx < 2) {
        for (let l = 0; l < 4; l++) {
          const lAngle = (l / 4) * Math.PI * 2;
          const lx = Math.cos(lAngle) * (tier.balconyR - 0.4);
          const lz = Math.sin(lAngle) * (tier.balconyR - 0.4);
          const lanternMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
          lanternMesh.position.set(lx, baseTierY + tierH + 0.9, lz);
          pagodaGroup.add(lanternMesh);
        }
      }
    });

    // ── Grand Golden Lotus Spire Finial (九重金宝顶) ──
    const topY = 25.2;
    const spireGroup = new THREE.Group();
    spireGroup.position.set(0, topY, 0);

    // Base lotus petal pod
    const lotusPod = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 0.6, 8), goldMat);
    spireGroup.add(lotusPod);

    // Golden Rings shaft
    const ringsShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 4.2, 8), goldMat);
    ringsShaft.position.y = 2.1;
    spireGroup.add(ringsShaft);

    // 5 Nine-Heavens Rings
    for (let r = 0; r < 5; r++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 - r * 0.06, 0.08, 6, 12), goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.8 + r * 0.65;
      spireGroup.add(ring);
    }

    // Sacred Flame Jewel at the peak
    const jewel = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    jewel.position.y = 4.4;
    spireGroup.add(jewel);

    const jewelLight = new THREE.PointLight(0xfef08a, 2.5, 18);
    jewelLight.position.y = 4.6;
    spireGroup.add(jewelLight);

    pagodaGroup.add(spireGroup);
    scene.add(pagodaGroup);

    // Central Core Solid Collider (prevents clipping through center)
    collisions.addCollider({
      id: "pagoda_core",
      type: "cylinder",
      position: new THREE.Vector3(px, 1.2, pz),
      radius: 2.2,
      height: 25,
    });
  }

  /**
   * 15. Where Winds Meet: Windswept Wayfarer Inn & Teahouse (風雲客棧)
   * Classic two-story Jianghu tavern with wooden veranda balcony,
   * outdoor dining terrace, tea tables, stacked wine jugs, and banners.
   */
  private static buildWindsweptWayfarerInn(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    timberMat: THREE.Material,
    tileMat: THREE.Material,
    goldMat: THREE.Material
  ): void {
    const innGroup = new THREE.Group();
    const ix = 48;
    const iz = 14;
    innGroup.position.set(ix, 0, iz);

    // ── Ground Level Timber Deck Foundation ──
    const deckGeo = new THREE.BoxGeometry(17, 0.6, 15);
    const deck = new THREE.Mesh(deckGeo, timberMat);
    deck.position.y = 0.3;
    innGroup.add(deck);

    collisions.addWalkableSurface({
      id: "wayfarer_inn_ground_deck",
      type: "box",
      surfaceY: 0.6,
      minX: ix - 8.5,
      maxX: ix + 8.5,
      minZ: iz - 7.5,
      maxZ: iz + 7.5,
    });

    // ── Ground Floor Main Hall Walls & Posts ──
    const wallGeo = new THREE.BoxGeometry(11, 3.6, 10);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.7,
      metalness: 0.1,
    });
    const mainWall = new THREE.Mesh(wallGeo, wallMat);
    mainWall.position.set(-2.5, 0.6 + 1.8, 0);
    innGroup.add(mainWall);

    // ── Outdoor Shaded Dining Pergola & Tables ──
    for (let tx = 0; tx < 2; tx++) {
      for (let tz = 0; tz < 2; tz++) {
        const tableX = 4.2 + tx * 3.2;
        const tableZ = -3.2 + tz * 4.5;

        // Square Table
        const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 1.4), timberMat);
        table.position.set(tableX, 0.6 + 0.375, tableZ);
        innGroup.add(table);

        // Teapot & Bowls
        const teapot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.16, 0.22, 8),
          new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.3 })
        );
        teapot.position.set(tableX, 0.6 + 0.85, tableZ);
        innGroup.add(teapot);

        // 4 Stools around table
        const stoolOffsets = [[-0.9, 0], [0.9, 0], [0, -0.9], [0, 0.9]];
        stoolOffsets.forEach(([ox, oz]) => {
          const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.45, 6), timberMat);
          stool.position.set(tableX + ox, 0.6 + 0.225, tableZ + oz);
          innGroup.add(stool);
        });
      }
    }

    // Stacked Wine Jars (壇子酒) with Red Seals
    const wineMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const sealMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    for (let w = 0; w < 6; w++) {
      const wx = 3.5 + (w % 3) * 0.8;
      const wz = 5.2 - Math.floor(w / 3) * 0.8;
      const jar = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), wineMat);
      jar.position.set(wx, 0.6 + 0.38, wz);
      innGroup.add(jar);

      const seal = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.15, 6), sealMat);
      seal.position.set(wx, 0.6 + 0.75, wz);
      innGroup.add(seal);
    }

    // Hanging Fabric Banners: "茶" and "酒"
    const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.2, 6), timberMat);
    bannerPole.position.set(7.5, 2.6, 5.5);
    innGroup.add(bannerPole);

    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 2.2), bannerMat);
    bannerMesh.position.set(7.5, 3.6, 5.5);
    innGroup.add(bannerMesh);
    dynamicProps.banners.push(bannerMesh);

    // ── Second Story Veranda Balcony ──
    const balconyGeo = new THREE.BoxGeometry(15.5, 0.25, 13.5);
    const balcony = new THREE.Mesh(balconyGeo, timberMat);
    balcony.position.set(-0.5, 4.2, 0);
    innGroup.add(balcony);

    collisions.addWalkableSurface({
      id: "wayfarer_inn_veranda",
      type: "box",
      surfaceY: 4.2,
      minX: ix - 8.2,
      maxX: ix + 7.2,
      minZ: iz - 6.8,
      maxZ: iz + 6.8,
    });

    // Balcony Railings
    const railPositions = [
      { start: [-8.0, -6.5], end: [7.0, -6.5] },
      { start: [-8.0, 6.5], end: [7.0, 6.5] },
      { start: [7.0, -6.5], end: [7.0, 6.5] },
    ];
    railPositions.forEach((line) => {
      const count = 10;
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const px = line.start[0] + (line.end[0] - line.start[0]) * t;
        const pz = line.start[1] + (line.end[1] - line.start[1]) * t;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6), timberMat);
        post.position.set(px, 4.2 + 0.45, pz);
        innGroup.add(post);
      }
    });

    // 2nd Floor Room Chamber
    const upperWall = new THREE.Mesh(new THREE.BoxGeometry(10, 3.4, 9), wallMat);
    upperWall.position.set(-2.5, 4.2 + 1.7, 0);
    innGroup.add(upperWall);

    // Warm glowing paper lattice windows
    const winGeo = new THREE.PlaneGeometry(2.4, 1.8);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide });
    for (let w = -1; w <= 1; w += 2) {
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(w * 3.0 - 2.5, 4.2 + 1.8, 4.55);
      innGroup.add(win);
    }

    // ── Hip-and-Gable Tiled Roof ──
    const roofGeo = new THREE.ConeGeometry(12.5, 3.4, 4);
    const roof = new THREE.Mesh(roofGeo, tileMat);
    roof.position.set(-0.5, 7.8 + 1.2, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.4, 1.0, 1.15);
    innGroup.add(roof);

    collisions.addWalkableSurface({
      id: "wayfarer_inn_roof",
      type: "box",
      surfaceY: 7.8,
      minX: ix - 7.5,
      maxX: ix + 6.5,
      minZ: iz - 6.0,
      maxZ: iz + 6.0,
    });

    // 4 Hanging Silk Lanterns
    for (let l = 0; l < 4; l++) {
      const lx = (l % 2 === 0 ? -1 : 1) * 6.5 - 0.5;
      const lz = (l < 2 ? -1 : 1) * 5.8;
      const lanternMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      lanternMesh.position.set(lx, 4.2 + 0.3, lz);
      innGroup.add(lanternMesh);

      const lanternLight = new THREE.PointLight(0xf59e0b, 1.8, 10);
      lanternLight.position.set(lx, 4.2, lz);
      innGroup.add(lanternLight);
    }

    scene.add(innGroup);

    // Solid Building Wall Collider
    collisions.addCollider({
      id: "wayfarer_inn_walls",
      type: "box",
      position: new THREE.Vector3(ix - 2.5, 3.8, iz),
      halfSize: new THREE.Vector3(5.5, 3.8, 5.0),
    });
  }

  /**
   * 16. Where Winds Meet: Misty Water Pavilion & Stilt Boardwalks (水榭碧波)
   * Elevated wooden boardwalk piers over a tranquil mountain lake leading to an open-air
   * hexagonal pavilion with carved benches, weeping willows, and floating water lilies.
   */
  private static buildMistyWaterPavilion(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    timberMat: THREE.Material,
    tileMat: THREE.Material,
    marbleMat: THREE.Material
  ): void {
    const waterGroup = new THREE.Group();
    const wx = -48;
    const wz = 14;
    waterGroup.position.set(wx, 0, wz);

    // ── Expansive Shimmering Mountain Lake ──
    const lakeGeo = new THREE.PlaneGeometry(42, 38, 8, 8);
    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.85,
      roughness: 0.15,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const lake = new THREE.Mesh(lakeGeo, lakeMat);
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(2, -0.05, 0);
    waterGroup.add(lake);

    // ── Elevated Wooden Boardwalk Pier (Connecting Shore to Pavilion) ──
    // Pier extends from x = -26 to x = -48 (relative x = 22 to 0)
    const pierLength = 22;
    const pierWidth = 3.4;
    const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(pierLength, 0.22, pierWidth), timberMat);
    pierDeck.position.set(pierLength / 2, 1.4, 0);
    waterGroup.add(pierDeck);

    collisions.addWalkableSurface({
      id: "water_pier_deck",
      type: "box",
      surfaceY: 1.4,
      minX: wx,
      maxX: wx + pierLength,
      minZ: wz - pierWidth / 2,
      maxZ: wz + pierWidth / 2,
    });

    // Timber Stilt Pilings under pier
    for (let p = 0; p < 6; p++) {
      const px = p * 4.0 + 1.0;
      for (let side = -1; side <= 1; side += 2) {
        const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.0, 6), timberMat);
        piling.position.set(px, 0.6, side * (pierWidth / 2 - 0.2));
        waterGroup.add(piling);
      }
    }

    // ── Hexagonal Water Pavilion (水榭) ──
    const pavR = 6.8;
    const pavFloor = new THREE.Mesh(new THREE.CylinderGeometry(pavR, pavR, 0.25, 6), timberMat);
    pavFloor.position.y = 1.4;
    waterGroup.add(pavFloor);

    collisions.addWalkableSurface({
      id: "water_pavilion_floor",
      type: "circle",
      surfaceY: 1.4,
      cx: wx,
      cz: wz,
      radius: pavR,
    });

    // Pilings under Hexagonal Pavilion
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 2.2, 6), timberMat);
      pil.position.set(Math.cos(a) * (pavR - 0.8), 0.5, Math.sin(a) * (pavR - 0.8));
      waterGroup.add(pil);
    }

    // 6 Columns & Perimeter Benches
    for (let c = 0; c < 6; c++) {
      const angle = (c / 6) * Math.PI * 2;
      const cx = Math.cos(angle) * (pavR - 0.6);
      const cz = Math.sin(angle) * (pavR - 0.6);

      // Red Lacquer Column
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 4.4, 8), timberMat);
      col.position.set(cx, 1.4 + 2.2, cz);
      waterGroup.add(col);

      // Built-in wooden bench between columns (except entry at angle 0)
      if (c > 0) {
        const nextA = ((c + 1) / 6) * Math.PI * 2;
        const midA = (angle + nextA) / 2;
        const benchX = Math.cos(midA) * (pavR - 0.7);
        const benchZ = Math.sin(midA) * (pavR - 0.7);
        const bench = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.45, 0.4), timberMat);
        bench.position.set(benchX, 1.4 + 0.225, benchZ);
        bench.rotation.y = -midA;
        waterGroup.add(bench);
      }
    }

    // Hexagonal Curved Tiled Roof
    const roofR = 7.8;
    const roofH = 2.6;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(roofR, roofH, 6), tileMat);
    roof.position.y = 1.4 + 4.4 + roofH * 0.45;
    waterGroup.add(roof);

    collisions.addWalkableSurface({
      id: "water_pavilion_roof",
      type: "circle",
      surfaceY: 5.8,
      cx: wx,
      cz: wz,
      radius: roofR,
    });

    // Central Stone Tea Table & Ceramic Censer
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.6, 12), marbleMat);
    table.position.set(0, 1.4 + 0.3, 0);
    waterGroup.add(table);

    // 4 Stone Lantern Pagodas Rising From the Water
    for (let l = 0; l < 4; l++) {
      const a = (l / 4) * Math.PI * 2 + Math.PI / 4;
      const lx = Math.cos(a) * 11.5;
      const lz = Math.sin(a) * 11.5;

      const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.6, 6), marbleMat);
      lanternPost.position.set(lx, 1.0, lz);
      waterGroup.add(lanternPost);

      const lanternHead = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), marbleMat);
      lanternHead.position.set(lx, 2.5, lz);
      waterGroup.add(lanternHead);

      const light = new THREE.PointLight(0xfef08a, 2.0, 8);
      light.position.set(lx, 2.5, lz);
      waterGroup.add(light);
    }

    // Lotus Flower Lily Clusters floating on the water
    const lotusMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    for (let lf = 0; lf < 12; lf++) {
      const la = (lf / 12) * Math.PI * 2;
      const lr = 8.5 + (lf % 4) * 2.5;
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 6), lotusMat);
      flower.position.set(Math.cos(la) * lr, 0.1, Math.sin(la) * lr);
      waterGroup.add(flower);
    }

    scene.add(waterGroup);
  }

  /**
   * 17. Where Winds Meet: Ancient Covered Wind-and-Rain Bridge (風雨廊橋)
   * Grand traditional timber covered corridor bridge spanning the southern gorge
   * with walkable deck, tiled hip-and-gable canopy roof, red lacquer pillars, and lanterns.
   */
  private static buildCoveredWindAndRainBridge(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    timberMat: THREE.Material,
    tileMat: THREE.Material,
    goldMat: THREE.Material
  ): void {
    const bridgeGroup = new THREE.Group();
    const bx = 0;
    const bz = 48;
    bridgeGroup.position.set(bx, 0, bz);

    const bridgeLength = 32; // spans z = -16 to +16 (world z = 32 to 64)
    const bridgeWidth = 5.6;
    const deckY = 2.2;

    // ── Heavy Timber Bridge Deck Platform ──
    const deckGeo = new THREE.BoxGeometry(bridgeWidth, 0.45, bridgeLength);
    const deck = new THREE.Mesh(deckGeo, timberMat);
    deck.position.y = deckY;
    bridgeGroup.add(deck);

    collisions.addWalkableSurface({
      id: "covered_bridge_deck",
      type: "box",
      surfaceY: deckY + 0.22,
      minX: bx - bridgeWidth / 2,
      maxX: bx + bridgeWidth / 2,
      minZ: bz - bridgeLength / 2,
      maxZ: bz + bridgeLength / 2,
    });

    // Stone Trestle Pier Supports plunging into the mist
    for (let p = -1; p <= 1; p++) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth + 0.8, deckY + 2.5, 2.4), timberMat);
      pier.position.set(0, (deckY - 1.2) / 2, p * 10);
      bridgeGroup.add(pier);
    }

    // ── 12 Pairs of Red Lacquer Columns along corridor ──
    const colCount = 8;
    for (let c = 0; c <= colCount; c++) {
      const cz = -bridgeLength / 2 + (c / colCount) * bridgeLength;
      for (let side = -1; side <= 1; side += 2) {
        const cx = side * (bridgeWidth / 2 - 0.45);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 3.4, 8), timberMat);
        col.position.set(cx, deckY + 1.7, cz);
        bridgeGroup.add(col);

        // Bronze base ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 12), goldMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(cx, deckY + 0.3, cz);
        bridgeGroup.add(ring);
      }
    }

    // Timber Handrail Balustrades along bridge edges
    for (let side = -1; side <= 1; side += 2) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, bridgeLength), timberMat);
      rail.position.set(side * (bridgeWidth / 2 - 0.2), deckY + 0.65, 0);
      bridgeGroup.add(rail);
    }

    // ── Continuous Hip-and-Gable Tiled Corridor Roof ──
    const roofGeo = new THREE.ConeGeometry(bridgeWidth * 0.85, 2.2, 4);
    const roof = new THREE.Mesh(roofGeo, tileMat);
    roof.position.set(0, deckY + 3.4 + 1.0, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.0, 1.0, bridgeLength / bridgeWidth);
    bridgeGroup.add(roof);

    collisions.addWalkableSurface({
      id: "covered_bridge_roof",
      type: "box",
      surfaceY: deckY + 3.4,
      minX: bx - bridgeWidth / 2,
      maxX: bx + bridgeWidth / 2,
      minZ: bz - bridgeLength / 2,
      maxZ: bz + bridgeLength / 2,
    });

    // 8 Hanging Silk Plum Blossom Lanterns Along Corridor
    for (let l = 0; l < 4; l++) {
      const lz = -12 + l * 8;
      const lanternMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
      );
      lanternMesh.position.set(0, deckY + 2.8, lz);
      bridgeGroup.add(lanternMesh);

      const light = new THREE.PointLight(0xf43f5e, 1.6, 8);
      light.position.set(0, deckY + 2.6, lz);
      bridgeGroup.add(light);
    }

    scene.add(bridgeGroup);
  }

  /**
   * 18. Where Winds Meet: Celestial Hermit's Cloud-Peak Altar & Paifang Arch (雲霄仙壇)
   * High rocky mountain peak rising 10.5m above the sea of clouds with ceremonial Paifang
   * archway, Yin-Yang floor mosaic, giant smoking cauldron, and floating stepping rocks.
   */
  private static buildCelestialHermitAltar(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    graniteMat: THREE.Material,
    goldMat: THREE.Material,
    timberMat: THREE.Material,
    tileMat: THREE.Material
  ): void {
    const altarGroup = new THREE.Group();
    const ax = -44;
    const az = -32;
    altarGroup.position.set(ax, 0, az);

    const peakH = 10.5;
    const plateauR = 11.5;

    // ── High Granite Rock Pinnacle Rising through Clouds ──
    const rockGeo = new THREE.CylinderGeometry(plateauR, plateauR * 1.35, peakH, 12);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });
    const rockPeak = new THREE.Mesh(rockGeo, rockMat);
    rockPeak.position.y = peakH / 2;
    altarGroup.add(rockPeak);

    collisions.addWalkableSurface({
      id: "celestial_altar_plateau",
      type: "circle",
      surfaceY: peakH,
      cx: ax,
      cz: az,
      radius: plateauR,
    });

    // ── Sacred Yin-Yang Taiji Stone Floor Mosaic ──
    const taijiGeo = new THREE.CircleGeometry(4.8, 32);
    const taijiMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    const taiji = new THREE.Mesh(taijiGeo, taijiMat);
    taiji.rotation.x = -Math.PI / 2;
    taiji.position.y = peakH + 0.05;
    altarGroup.add(taiji);

    const whiteHalf = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 4.75, 32, 1, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    whiteHalf.rotation.x = -Math.PI / 2;
    whiteHalf.position.y = peakH + 0.06;
    altarGroup.add(whiteHalf);

    // ── Grand 3-Bay Paifang Ceremonial Gateway (雲霄仙壇) ──
    const paifangGroup = new THREE.Group();
    paifangGroup.position.set(0, peakH, 6.5);

    const offsets = [-4.5, -1.8, 1.8, 4.5];
    const colHeights = [4.5, 6.2, 6.2, 4.5];
    offsets.forEach((ox, i) => {
      const h = colHeights[i];
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, h, 8), timberMat);
      col.position.set(ox, h / 2, 0);
      paifangGroup.add(col);

      // Stone drum base (抱鼓石)
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.6, 8), graniteMat);
      drum.position.set(ox, 0.3, 0);
      paifangGroup.add(drum);
    });

    // Main Crossbeam & Inscription Plaque: "雲霄仙壇"
    const beam = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.5, 0.6), timberMat);
    beam.position.set(0, 5.5, 0);
    paifangGroup.add(beam);

    const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 0.2), goldMat);
    plaque.position.set(0, 6.2, 0.2);
    paifangGroup.add(plaque);

    // Triple Paifang Roof
    const centerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.2, 4), tileMat);
    centerRoof.position.set(0, 7.2, 0);
    centerRoof.rotation.y = Math.PI / 4;
    centerRoof.scale.set(1.4, 1.0, 0.6);
    paifangGroup.add(centerRoof);

    for (let side = -1; side <= 1; side += 2) {
      const sideRoof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 0.9, 4), tileMat);
      sideRoof.position.set(side * 3.2, 5.4, 0);
      sideRoof.rotation.y = Math.PI / 4;
      sideRoof.scale.set(1.4, 1.0, 0.6);
      paifangGroup.add(sideRoof);
    }
    altarGroup.add(paifangGroup);

    // ── Giant Ancient Bronze Tripod Cauldron (鼎) ──
    const cauldronGroup = new THREE.Group();
    cauldronGroup.position.set(0, peakH, 0);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      metalness: 0.85,
      roughness: 0.35,
    });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.1, 1.8, 12), bronzeMat);
    pot.position.y = 1.3;
    cauldronGroup.add(pot);

    // 3 Legs
    for (let l = 0; l < 3; l++) {
      const la = (l / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 1.2, 6), bronzeMat);
      leg.position.set(Math.cos(la) * 0.9, 0.6, Math.sin(la) * 0.9);
      cauldronGroup.add(leg);
    }

    // Glowing Embers
    const fire = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 12),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    fire.rotation.x = -Math.PI / 2;
    fire.position.y = 2.22;
    cauldronGroup.add(fire);

    const flameLight = new THREE.PointLight(0xf97316, 2.5, 12);
    flameLight.position.set(0, 2.8, 0);
    cauldronGroup.add(flameLight);

    altarGroup.add(cauldronGroup);

    // ── 4 Floating Stepping Rocks Linking Altar to Mainland (Qinggong Stepping Stones) ──
    // Stones bridge the gap from mainland (x = -26) to altar (x = -44)
    const steppingRocks = [
      { rx: 12, rz: 8, h: 3.5, radius: 1.8 },
      { rx: 8, rz: 5, h: 6.0, radius: 1.6 },
      { rx: 4, rz: 2, h: 8.5, radius: 1.5 },
      { rx: -1, rz: -1, h: 9.8, radius: 1.6 },
    ];

    steppingRocks.forEach((stone, idx) => {
      const stoneMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(stone.radius, stone.radius * 1.2, stone.h, 7),
        graniteMat
      );
      stoneMesh.position.set(stone.rx, stone.h / 2, stone.rz);
      altarGroup.add(stoneMesh);

      collisions.addWalkableSurface({
        id: `celestial_step_rock_${idx}`,
        type: "circle",
        surfaceY: stone.h,
        cx: ax + stone.rx,
        cz: az + stone.rz,
        radius: stone.radius,
      });
    });

    scene.add(altarGroup);

    // Pinnacle Center Collider
    collisions.addCollider({
      id: "celestial_altar_core",
      type: "cylinder",
      position: new THREE.Vector3(ax, 0, az),
      radius: 1.8,
      height: peakH + 4,
    });
  }

  /**
   * 19. Where Winds Meet: Ancient Bell & Drum Tower (鐘鼓樓)
   * Open timber pavilion housing an ancient bronze temple bell with suspended striker log.
   */
  private static buildAncientBellTower(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    dynamicProps: UniverseDynamicProps,
    timberMat: THREE.Material,
    tileMat: THREE.Material,
    bronzeMat: THREE.Material,
    graniteMat: THREE.Material
  ): void {
    const towerGroup = new THREE.Group();
    const bx = -28;
    const bz = 32;
    towerGroup.position.set(bx, 0, bz);

    // Stone Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.2, 9.0), graniteMat);
    base.position.y = 0.6;
    towerGroup.add(base);

    collisions.addWalkableSurface({
      id: "bell_tower_base",
      type: "box",
      surfaceY: 1.2,
      minX: bx - 4.5,
      maxX: bx + 4.5,
      minZ: bz - 4.5,
      maxZ: bz + 4.5,
    });

    // 4 Heavy Timber Columns
    const offsets = [-3.4, 3.4];
    offsets.forEach((ox) => {
      offsets.forEach((oz) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 5.2, 8), timberMat);
        col.position.set(ox, 1.2 + 2.6, oz);
        towerGroup.add(col);
      });
    });

    // Massive Suspended Bronze Temple Bell
    const bellGroup = new THREE.Group();
    bellGroup.position.set(0, 1.2 + 3.2, 0);

    const bellBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.1, 2.2, 16),
      bronzeMat
    );
    bellGroup.add(bellBody);

    const bellDome = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 8), bronzeMat);
    bellDome.position.y = 1.1;
    bellGroup.add(bellDome);

    // Striking Log Suspended on Chains
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.2, 8), timberMat);
    log.rotation.z = Math.PI / 2;
    log.position.set(0, -0.6, 1.4);
    bellGroup.add(log);

    towerGroup.add(bellGroup);

    // Pyramidal Tiled Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 2.4, 4), tileMat);
    roof.position.y = 6.4 + 1.0;
    roof.rotation.y = Math.PI / 4;
    towerGroup.add(roof);

    collisions.addWalkableSurface({
      id: "bell_tower_roof",
      type: "box",
      surfaceY: 6.4,
      minX: bx - 4.2,
      maxX: bx + 4.2,
      minZ: bz - 4.2,
      maxZ: bz + 4.2,
    });

    scene.add(towerGroup);
  }

  /**
   * 20. Where Winds Meet: Plum Blossom Traversal Poles (梅花桩 / Martial Training Stilts)
   * Staggered circular timber training poles ranging from 1.5m to 3.8m for precision Qinggong leaping.
   */
  private static buildPlumBlossomPoles(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    timberMat: THREE.Material
  ): void {
    const polesGroup = new THREE.Group();
    const cx = 18;
    const cz = 18;
    polesGroup.position.set(cx, 0, cz);

    // 12 Plum Blossom Training Poles arranged in concentric stepping pattern
    const poleConfigs = [
      { x: 0, z: 0, h: 2.2 },
      { x: 2.5, z: 0, h: 2.6 },
      { x: -2.5, z: 0, h: 1.8 },
      { x: 0, z: 2.5, h: 3.0 },
      { x: 0, z: -2.5, h: 1.5 },
      { x: 2.2, z: 2.2, h: 3.4 },
      { x: -2.2, z: -2.2, h: 2.0 },
      { x: 2.2, z: -2.2, h: 2.8 },
      { x: -2.2, z: 2.2, h: 3.8 },
      { x: 4.2, z: 1.5, h: 3.2 },
      { x: -4.2, z: -1.5, h: 2.4 },
      { x: 1.5, z: 4.2, h: 3.6 },
    ];

    poleConfigs.forEach((p, idx) => {
      const radius = 0.48;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius * 1.1, p.h, 10),
        timberMat
      );
      pole.position.set(p.x, p.h / 2, p.z);
      polesGroup.add(pole);

      // Gold metal reinforcement ring around top
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.02, 0.03, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(p.x, p.h - 0.05, p.z);
      polesGroup.add(ring);

      // Register walkable surface at the top of each pole!
      collisions.addWalkableSurface({
        id: `plum_blossom_pole_${idx}`,
        type: "circle",
        surfaceY: p.h,
        cx: cx + p.x,
        cz: cz + p.z,
        radius: radius,
      });

      // Cylinder collider so player doesn't clip through side of pole
      collisions.addCollider({
        id: `plum_pole_col_${idx}`,
        type: "cylinder",
        position: new THREE.Vector3(cx + p.x, 0, cz + p.z),
        radius: radius * 0.9,
        height: p.h,
      });
    });

    scene.add(polesGroup);
  }
}
