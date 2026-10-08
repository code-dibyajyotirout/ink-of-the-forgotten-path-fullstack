import * as THREE from "three";
import { CollisionSystem } from "../physics/CollisionSystem";

export interface KarstDynamicProps {
  clouds: THREE.Mesh[];
  creakingBridges: THREE.Group[];
  pines: THREE.Group[];
}

/**
 * KarstPinnacleBuilder
 * Constructs the dramatic high-altitude Wuxia geography inspired by Reference Video 1:
 * - Towering Zhangjiajie/Huangshan Karst Pinnacles (sheer vertical rock spires 25m - 55m high)
 * - Hanging Catenary Suspension Rope Bridges with wooden timber planks and rope handrails
 * - Cliffside Glide Launch Decks (cantilevered springboards over the abyss)
 * - Sea-of-Clouds (云海) layered mist banks & dense pink plum/cherry blossom valley canopies
 */
export class KarstPinnacleBuilder {
  public static build(
    scene: THREE.Scene,
    collisions: CollisionSystem
  ): KarstDynamicProps {
    const dynamicProps: KarstDynamicProps = {
      clouds: [],
      creakingBridges: [],
      pines: [],
    };

    // ─── Materials ─────────────────────────────────────────────────────────────
    const karstRockMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Weathered slate grey karst granite
      roughness: 0.9,
      metalness: 0.1,
    });

    const karstRockDarkMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark wet mossy rock base
      roughness: 0.95,
      metalness: 0.05,
    });

    const bridgeWoodMat = new THREE.MeshStandardMaterial({
      color: 0x543d2b, // Weathered mountain bridge cedar planks
      roughness: 0.8,
      metalness: 0.05,
    });

    const bridgeRopeMat = new THREE.MeshStandardMaterial({
      color: 0x926c45, // Twisted hemp rope cables
      roughness: 0.9,
      metalness: 0.0,
    });

    const ironBracketMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937, // Hand-forged wrought iron rings and brackets
      roughness: 0.4,
      metalness: 0.8,
    });

    const pineNeedleMat = new THREE.MeshStandardMaterial({
      color: 0x14532d, // Deep mountain pine needle green
      roughness: 0.7,
      metalness: 0.05,
    });

    const blossomPinkMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e, // Vibrant pink plum blossoms
      roughness: 0.6,
      emissive: 0x881337,
      emissiveIntensity: 0.18,
    });

    const blossomRoseMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185, // Soft rose petals
      roughness: 0.7,
    });

    const blossomWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xfff1f2, // White cloud plum blossoms
      roughness: 0.8,
    });

    // ─── 1. Build Zhangjiajie Karst Rock Pinnacles ──────────────────────────────
    this.buildKarstPinnacles(scene, collisions, karstRockMat, karstRockDarkMat, pineNeedleMat, dynamicProps);

    // ─── 2. Build Catenary Suspension Rope Bridges ─────────────────────────────
    this.buildSuspensionBridges(scene, collisions, bridgeWoodMat, bridgeRopeMat, ironBracketMat, dynamicProps);

    // ─── 3. Build Cliffside Glide Springboard Launch Decks ─────────────────────
    this.buildGlideLaunchDecks(scene, collisions, bridgeWoodMat, ironBracketMat);

    // ─── 4. Build Sea of Clouds & Valley of Blossoms ───────────────────────────
    this.buildCloudSeaAndBlossomValley(
      scene,
      blossomPinkMat,
      blossomRoseMat,
      blossomWhiteMat,
      karstRockMat,
      dynamicProps
    );

    return dynamicProps;
  }

  /**
   * 1. Zhangjiajie Karst Rock Pinnacles (张家界石柱峰)
   * Towering vertical limestone/granite rock spires rising through the clouds with walkable summits.
   */
  private static buildKarstPinnacles(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    rockMat: THREE.Material,
    darkRockMat: THREE.Material,
    pineMat: THREE.Material,
    dynamicProps: KarstDynamicProps
  ): void {
    const pinnaclesGroup = new THREE.Group();
    pinnaclesGroup.name = "KarstPinnacles";

    // 5 Major Dramatic Mountain Karst Pillars
    const pillars = [
      // 1. Western Hermit Spire (西岳凌霄峰) - Connected to water pavilion bridge
      {
        id: "karst_spire_west",
        x: -72,
        z: 18,
        height: 27,
        baseRadius: 9.5,
        topRadius: 6.8,
        shrine: true,
      },
      // 2. Southwest Tiger-Leap Spire (虎跳绝壁峰) - High summit overlooking the clouds
      {
        id: "karst_spire_sw",
        x: -70,
        z: 60,
        height: 35,
        baseRadius: 11.5,
        topRadius: 7.5,
        shrine: true,
      },
      // 3. South Dragon-Abyss Spire (龙渊悬峰) - Connected to southern valley skybridge
      {
        id: "karst_spire_south",
        x: -16,
        z: 82,
        height: 31,
        baseRadius: 10.0,
        topRadius: 7.0,
        shrine: false,
      },
      // 4. Southeast Phoenix-Roost Peak (凤栖绝顶)
      {
        id: "karst_spire_se",
        x: 64,
        z: 72,
        height: 37,
        baseRadius: 11.0,
        topRadius: 7.8,
        shrine: true,
      },
      // 5. Northwest Lone-Cloud Pinnacle (孤云仙柱)
      {
        id: "karst_spire_nw",
        x: -76,
        z: -50,
        height: 44,
        baseRadius: 12.0,
        topRadius: 7.2,
        shrine: true,
      },
    ];

    pillars.forEach((p) => {
      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(p.x, 0, p.z);

      // Stratified vertical segments (gives weathered geologic rock strata appearance)
      const segments = 6;
      const segH = p.height / segments;

      for (let s = 0; s < segments; s++) {
        const t0 = s / segments;
        const t1 = (s + 1) / segments;
        const rBottom = p.baseRadius * (1 - t0 * 0.35);
        const rTop = p.baseRadius * (1 - t1 * 0.35);

        // Segment geometry with slight angular variation
        const segGeo = new THREE.CylinderGeometry(rTop, rBottom, segH, 14);
        const segMat = s === 0 ? darkRockMat : rockMat;
        const segMesh = new THREE.Mesh(segGeo, segMat);
        segMesh.position.y = s * segH + segH / 2;
        segMesh.rotation.y = s * 0.45;
        pillarGroup.add(segMesh);

        // Weathered horizontal rock ledge rings every 2 segments
        if (s > 0 && s < segments - 1 && s % 2 === 0) {
          const ledgeY = s * segH;
          const ledgeGeo = new THREE.CylinderGeometry(rBottom * 1.14, rBottom * 1.06, 0.9, 14);
          const ledgeMesh = new THREE.Mesh(ledgeGeo, rockMat);
          ledgeMesh.position.y = ledgeY;
          pillarGroup.add(ledgeMesh);

          // Register intermediate resting ledges for wall rebounds!
          collisions.addWalkableSurface({
            id: `${p.id}_ledge_${s}`,
            type: "circle",
            surfaceY: ledgeY + 0.45,
            cx: p.x,
            cz: p.z,
            radius: rBottom * 1.14,
          });
        }
      }

      // Summit Terrace Floor (flat granite rock plateau)
      const summitY = p.height;
      const summitFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(p.topRadius, p.topRadius * 1.05, 1.2, 16),
        rockMat
      );
      summitFloor.position.y = summitY - 0.6;
      pillarGroup.add(summitFloor);

      // Register summit walkable platform for player Qinggong landings!
      collisions.addWalkableSurface({
        id: `${p.id}_summit`,
        type: "circle",
        surfaceY: summitY,
        cx: p.x,
        cz: p.z,
        radius: p.topRadius,
      });

      // Central shaft obstacle cylinder collider
      collisions.addCollider({
        id: `${p.id}_shaft`,
        type: "cylinder",
        position: new THREE.Vector3(p.x, 0, p.z),
        radius: (p.baseRadius + p.topRadius) * 0.45,
        height: p.height,
      });

      // Gnarled cliffside Huangshan pine tree growing sideways from rock face
      const pineGroup = this.createCliffPine(pineMat);
      pineGroup.position.set(p.topRadius * 0.85, summitY - 2.5, 0);
      pineGroup.rotation.z = 0.35; // leans over the cliff
      pillarGroup.add(pineGroup);
      dynamicProps.pines.push(pineGroup);

      // Optional Clifftop Vista Shrine (Ancient Taoist Stone Gazebo / Meditation Stele)
      if (p.shrine) {
        const shrine = this.createSummitShrine();
        shrine.position.set(0, summitY, 0);
        pillarGroup.add(shrine);
      }

      pinnaclesGroup.add(pillarGroup);
    });

    scene.add(pinnaclesGroup);
  }

  /**
   * 2. Catenary Suspension Rope Bridges (悬空索桥)
   * High hanging mountain bridges spanning across chasms with sag curves matching Reference Video 1.
   */
  private static buildSuspensionBridges(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    woodMat: THREE.Material,
    ropeMat: THREE.Material,
    ironMat: THREE.Material,
    dynamicProps: KarstDynamicProps
  ): void {
    const bridgesGroup = new THREE.Group();
    bridgesGroup.name = "SuspensionRopeBridges";

    // 3 Major Suspension Bridges Across Chasms
    const bridgeConfigs = [
      // Bridge 1: Grand Ravine Skybridge (Western Lake Pier -> Western Karst Spire)
      // Matches Reference Video 1 crossing!
      {
        id: "skybridge_west_chasm",
        start: new THREE.Vector3(-46, 2.0, 20),
        end: new THREE.Vector3(-72, 27.0, 18),
        sag: 2.8,
        width: 2.4,
        numPlanks: 26,
      },
      // Bridge 2: Southwest Cloud-Sea Skybridge (West Karst Spire -> Southwest High Spire)
      // High-altitude peak-to-peak traverse in the clouds!
      {
        id: "skybridge_cloud_sea",
        start: new THREE.Vector3(-70, 27.0, 24),
        end: new THREE.Vector3(-68, 35.0, 54),
        sag: 3.5,
        width: 2.2,
        numPlanks: 30,
      },
      // Bridge 3: Southern Abyss Skybridge (Southern Terrace -> South Dragon Spire)
      {
        id: "skybridge_south_abyss",
        start: new THREE.Vector3(-2, 3.5, 52),
        end: new THREE.Vector3(-14, 31.0, 76),
        sag: 3.2,
        width: 2.2,
        numPlanks: 28,
      },
    ];

    bridgeConfigs.forEach((cfg) => {
      const bridgeGroup = new THREE.Group();
      bridgeGroup.name = cfg.id;

      const delta = new THREE.Vector3().subVectors(cfg.end, cfg.start);
      const spanLen = delta.length();
      const numSteps = cfg.numPlanks;

      // Anchor Stone Pylons at both ends
      const startPylon = this.createBridgeAnchorPylon(ironMat, ropeMat);
      startPylon.position.copy(cfg.start);
      bridgeGroup.add(startPylon);

      const endPylon = this.createBridgeAnchorPylon(ironMat, ropeMat);
      endPylon.position.copy(cfg.end);
      bridgeGroup.add(endPylon);

      // Generate Planks & Walkable Surfaces along the Catenary Curve
      const halfWidth = cfg.width / 2;

      for (let i = 0; i <= numSteps; i++) {
        const t = i / numSteps;
        // Linear interpolation point
        const pt = new THREE.Vector3().lerpVectors(cfg.start, cfg.end, t);

        // Catenary parabolic sag factor (max at t = 0.5)
        const sagOffset = -cfg.sag * 4 * t * (1 - t);
        pt.y += sagOffset;

        // Timber plank geometry
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(cfg.width, 0.18, 0.75),
          woodMat
        );
        plank.position.copy(pt);

        // Orient plank along bridge trajectory
        const nextT = Math.min(1.0, (i + 1) / numSteps);
        const nextPt = new THREE.Vector3().lerpVectors(cfg.start, cfg.end, nextT);
        nextPt.y += -cfg.sag * 4 * nextT * (1 - nextT);
        plank.lookAt(nextPt);
        plank.rotateY(Math.PI / 2);

        bridgeGroup.add(plank);

        // Twin Side Rope Handrails
        if (i % 2 === 0) {
          // Vertical support rope dropper on left & right
          const dropperGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.25, 6);

          const leftDropper = new THREE.Mesh(dropperGeo, ropeMat);
          leftDropper.position.set(pt.x - halfWidth * 0.9, pt.y + 0.65, pt.z);
          bridgeGroup.add(leftDropper);

          const rightDropper = new THREE.Mesh(dropperGeo, ropeMat);
          rightDropper.position.set(pt.x + halfWidth * 0.9, pt.y + 0.65, pt.z);
          bridgeGroup.add(rightDropper);

          // Side wooden safety guard bar
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.045, 1.25, 6),
            woodMat
          );
          post.position.set(pt.x - halfWidth, pt.y + 0.6, pt.z);
          bridgeGroup.add(post);

          const postR = post.clone();
          postR.position.set(pt.x + halfWidth, pt.y + 0.6, pt.z);
          bridgeGroup.add(postR);
        }

        // Register segmented walkable surfaces in CollisionSystem for running and Qinggong leaps!
        const segStep = spanLen / numSteps;
        collisions.addWalkableSurface({
          id: `${cfg.id}_seg_${i}`,
          type: "box",
          surfaceY: pt.y + 0.1,
          minX: pt.x - halfWidth * 1.15,
          maxX: pt.x + halfWidth * 1.15,
          minZ: pt.z - segStep * 0.8,
          maxZ: pt.z + segStep * 0.8,
        });
      }

      // Continuous Left and Right Overhead Hemp Suspension Cable lines
      const leftCablePoints: THREE.Vector3[] = [];
      const rightCablePoints: THREE.Vector3[] = [];

      for (let s = 0; s <= 24; s++) {
        const t = s / 24;
        const pt = new THREE.Vector3().lerpVectors(cfg.start, cfg.end, t);
        pt.y += -cfg.sag * 4 * t * (1 - t) + 1.25; // 1.25m handrail height

        leftCablePoints.push(new THREE.Vector3(pt.x - halfWidth * 0.92, pt.y, pt.z));
        rightCablePoints.push(new THREE.Vector3(pt.x + halfWidth * 0.92, pt.y, pt.z));
      }

      const leftCableCurve = new THREE.CatmullRomCurve3(leftCablePoints);
      const rightCableCurve = new THREE.CatmullRomCurve3(rightCablePoints);

      const leftCableMesh = new THREE.Mesh(
        new THREE.TubeGeometry(leftCableCurve, 24, 0.045, 8, false),
        ropeMat
      );
      bridgeGroup.add(leftCableMesh);

      const rightCableMesh = new THREE.Mesh(
        new THREE.TubeGeometry(rightCableCurve, 24, 0.045, 8, false),
        ropeMat
      );
      bridgeGroup.add(rightCableMesh);

      dynamicProps.creakingBridges.push(bridgeGroup);
      bridgesGroup.add(bridgeGroup);
    });

    scene.add(bridgesGroup);
  }

  /**
   * 3. Cliffside Glide Springboard Launch Decks (凌空跳台)
   * Cantilevered timber platforms extending over the edge with red prayer ribbons.
   */
  private static buildGlideLaunchDecks(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    woodMat: THREE.Material,
    ironMat: THREE.Material
  ): void {
    const decksGroup = new THREE.Group();
    decksGroup.name = "GlideLaunchDecks";

    const deckLocations = [
      // 1. Water Pavilion cliff launch deck overlooking western ravine
      { x: -44, y: 2.2, z: 12, rotY: Math.PI * 0.85, len: 7.5 },
      // 2. Southern Ravine high launch ramp
      { x: -6, y: 3.8, z: 46, rotY: Math.PI * 0.65, len: 8.0 },
      // 3. Celestial Altar pinnacle cliff launch springboard
      { x: -48, y: 10.8, z: -38, rotY: -Math.PI * 0.45, len: 6.5 },
    ];

    deckLocations.forEach((loc, idx) => {
      const deck = new THREE.Group();
      deck.position.set(loc.x, loc.y, loc.z);
      deck.rotation.y = loc.rotY;

      // Heavy timber support beams cantilevered outward
      const beamGeo = new THREE.BoxGeometry(0.35, 0.45, loc.len);
      const beamL = new THREE.Mesh(beamGeo, woodMat);
      beamL.position.set(-1.1, -0.25, loc.len / 2);
      deck.add(beamL);

      const beamR = new THREE.Mesh(beamGeo, woodMat);
      beamR.position.set(1.1, -0.25, loc.len / 2);
      deck.add(beamR);

      // Floor Planks
      const numPlanks = Math.floor(loc.len / 0.5);
      for (let p = 0; p < numPlanks; p++) {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 0.12, 0.42),
          woodMat
        );
        plank.position.set(0, 0, p * 0.5 + 0.25);
        deck.add(plank);
      }

      // Angled springboard lift at the very tip (gives high aerodynamic launch angle)
      const tipGeo = new THREE.BoxGeometry(2.6, 0.15, 1.2);
      const tip = new THREE.Mesh(tipGeo, woodMat);
      tip.position.set(0, 0.08, loc.len - 0.4);
      tip.rotation.x = -0.12; // tilted slightly upward
      deck.add(tip);

      // Decorative Prayer Lanterns & Fluttering Banners
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8), woodMat);
      postL.position.set(-1.25, 1.25, loc.len - 0.6);
      deck.add(postL);

      const postR = postL.clone();
      postR.position.set(1.25, 1.25, loc.len - 0.6);
      deck.add(postR);

      // Red Silk Lantern on launch posts
      const lanternGeo = new THREE.SphereGeometry(0.24, 10, 8);
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const lanternL = new THREE.Mesh(lanternGeo, lanternMat);
      lanternL.position.set(-1.25, 2.2, loc.len - 0.6);
      deck.add(lanternL);

      const lanternR = lanternL.clone();
      lanternR.position.set(1.25, 2.2, loc.len - 0.6);
      deck.add(lanternR);

      // Register Walkable surface on the launch deck
      collisions.addWalkableSurface({
        id: `launch_deck_${idx}`,
        type: "box",
        surfaceY: loc.y + 0.15,
        minX: loc.x - 2.8,
        maxX: loc.x + 2.8,
        minZ: loc.z - 2.8,
        maxZ: loc.z + loc.len + 2.8,
      });

      decksGroup.add(deck);
    });

    scene.add(decksGroup);
  }

  /**
   * 4. Sea of Clouds (云海) & Valley of Blossoms
   * Layered volumetric cloud planes and clusters of pink cherry/plum blossom trees filling the canyon floor.
   */
  private static buildCloudSeaAndBlossomValley(
    scene: THREE.Scene,
    pinkMat: THREE.Material,
    roseMat: THREE.Material,
    whiteMat: THREE.Material,
    rockMat: THREE.Material,
    dynamicProps: KarstDynamicProps
  ): void {
    const valleyGroup = new THREE.Group();
    valleyGroup.name = "CloudSeaAndBlossomValley";

    // ─── A. Layered Sea of Clouds (云海) ──────────────────────────────────────
    // 3 Huge translucent mist cloud decks at different elevations
    const cloudHeights = [1.2, 8.5, 18.0];
    const cloudOpacities = [0.42, 0.32, 0.22];

    cloudHeights.forEach((cy, idx) => {
      const cloudGeo = new THREE.PlaneGeometry(260, 260, 16, 16);
      const cloudMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe, // Luminous pale celestial white/cyan mist
        transparent: true,
        opacity: cloudOpacities[idx],
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const cloudPlane = new THREE.Mesh(cloudGeo, cloudMat);
      cloudPlane.rotation.x = -Math.PI / 2;
      cloudPlane.position.set(-20, cy, 30);
      valleyGroup.add(cloudPlane);
      dynamicProps.clouds.push(cloudPlane);
    });

    // ─── B. Valley of Blossoms (Dense Plum/Cherry Blossom Canopies) ───────────
    // Low-lying canyon floor below the clouds filled with blooming trees
    const blossomCanopyGroup = new THREE.Group();

    // 32 Blooming Plum/Cherry Blossom Tree Clusters across the southern & western canyons
    const treePositions = [
      // Southwest Ravine
      { x: -55, z: 35, scale: 1.4 },
      { x: -62, z: 42, scale: 1.6 },
      { x: -48, z: 48, scale: 1.3 },
      { x: -52, z: 28, scale: 1.5 },
      { x: -68, z: 32, scale: 1.7 },
      { x: -44, z: 58, scale: 1.4 },
      { x: -58, z: 66, scale: 1.5 },
      // Southern Mountain Chasm
      { x: -10, z: 62, scale: 1.6 },
      { x: -22, z: 68, scale: 1.8 },
      { x: 5, z: 70, scale: 1.5 },
      { x: -4, z: 82, scale: 1.7 },
      { x: -28, z: 78, scale: 1.4 },
      { x: 14, z: 75, scale: 1.6 },
      { x: -32, z: 58, scale: 1.5 },
      // Southeast Valley behind Wayfarer Inn
      { x: 42, z: 52, scale: 1.5 },
      { x: 54, z: 58, scale: 1.7 },
      { x: 62, z: 48, scale: 1.4 },
      { x: 48, z: 72, scale: 1.8 },
      { x: 36, z: 64, scale: 1.3 },
      { x: 68, z: 62, scale: 1.6 },
      { x: 74, z: 78, scale: 1.5 },
      // Northwest Foothills
      { x: -62, z: -35, scale: 1.5 },
      { x: -54, z: -48, scale: 1.4 },
      { x: -68, z: -60, scale: 1.7 },
      { x: -78, z: -38, scale: 1.6 },
    ];

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x2e1c14,
      roughness: 0.9,
    });

    treePositions.forEach((pos, idx) => {
      const tree = new THREE.Group();
      tree.position.set(pos.x, -2.5, pos.z); // Rooted in lower canyon floor
      tree.scale.set(pos.scale, pos.scale, pos.scale);

      // Gnarled dark trunk
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.65, 4.5, 8),
        trunkMat
      );
      trunk.position.y = 2.25;
      trunk.rotation.z = (Math.random() - 0.5) * 0.25;
      tree.add(trunk);

      // Layered blooming plum blossom foliage cloud clusters (pinks and roses)
      const matChoice = idx % 3 === 0 ? pinkMat : idx % 3 === 1 ? roseMat : whiteMat;

      const numFoliageSpheres = 4;
      for (let f = 0; f < numFoliageSpheres; f++) {
        const fSize = 1.4 + Math.random() * 0.6;
        const foliage = new THREE.Mesh(
          new THREE.DodecahedronGeometry(fSize, 1),
          matChoice
        );
        foliage.position.set(
          (Math.random() - 0.5) * 2.2,
          4.0 + Math.random() * 1.8,
          (Math.random() - 0.5) * 2.2
        );
        tree.add(foliage);
      }

      blossomCanopyGroup.add(tree);
    });

    valleyGroup.add(blossomCanopyGroup);
    scene.add(valleyGroup);
  }

  /**
   * Helper: Build Gnarled Cliff Pine clinging horizontally to the mountain rock face.
   */
  private static createCliffPine(needleMat: THREE.Material): THREE.Group {
    const pine = new THREE.Group();
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });

    // Curved trunk branching horizontally
    const trunkPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1.2, -0.2, 0.4),
      new THREE.Vector3(2.6, 0.4, 0.8),
      new THREE.Vector3(4.0, 0.8, 0.5),
    ];
    const curve = new THREE.CatmullRomCurve3(trunkPts);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.22, 6, false), barkMat);
    pine.add(trunk);

    // Deep Green Pine needle tufts / pads
    const needlePads = [
      { pos: new THREE.Vector3(1.8, 0.2, 0.5), r: 1.1 },
      { pos: new THREE.Vector3(2.9, 0.9, 0.9), r: 1.4 },
      { pos: new THREE.Vector3(4.2, 1.2, 0.6), r: 1.6 },
    ];

    needlePads.forEach((pad) => {
      const tuft = new THREE.Mesh(
        new THREE.CylinderGeometry(pad.r, pad.r * 1.15, 0.4, 8),
        needleMat
      );
      tuft.position.copy(pad.pos);
      pine.add(tuft);
    });

    return pine;
  }

  /**
   * Helper: Clifftop Taoist Vista Shrine (Stone Pagoda Gazebo atop peaks).
   */
  private static createSummitShrine(): THREE.Group {
    const shrine = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });

    // 4 Stone Columns
    for (let c = 0; c < 4; c++) {
      const angle = (c / 4) * Math.PI * 2 + Math.PI / 4;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.8, 8), stoneMat);
      col.position.set(Math.cos(angle) * 2.2, 1.4, Math.sin(angle) * 2.2);
      shrine.add(col);
    }

    // Curved Pagoda Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.2, 8), tileMat);
    roof.position.y = 3.4;
    shrine.add(roof);

    // Golden Lotus Finial Spire
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.15, 1.1, 8), goldMat);
    spire.position.y = 4.3;
    shrine.add(spire);

    // Stone Incense Brazier at center
    const cauldron = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.7, 8), stoneMat);
    cauldron.position.y = 0.45;
    shrine.add(cauldron);

    // Warm brazier flame
    const fireLight = new THREE.PointLight(0xf97316, 1.6, 6);
    fireLight.position.y = 1.0;
    shrine.add(fireLight);

    return shrine;
  }

  /**
   * Helper: Bridge Anchor Pylon (Heavy stone obelisk with iron mooring rings).
   */
  private static createBridgeAnchorPylon(ironMat: THREE.Material, ropeMat: THREE.Material): THREE.Group {
    const pylon = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });

    // Twin stone mooring towers
    const towerL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.7), stoneMat);
    towerL.position.set(-1.4, 1.2, 0);
    pylon.add(towerL);

    const towerR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.7), stoneMat);
    towerR.position.set(1.4, 1.2, 0);
    pylon.add(towerR);

    // Heavy iron mooring rings
    const ringGeo = new THREE.TorusGeometry(0.22, 0.05, 6, 12);
    const ringL = new THREE.Mesh(ringGeo, ironMat);
    ringL.position.set(-1.4, 1.5, 0.35);
    pylon.add(ringL);

    const ringR = new THREE.Mesh(ringGeo, ironMat);
    ringR.position.set(1.4, 1.5, 0.35);
    pylon.add(ringR);

    return pylon;
  }
}
