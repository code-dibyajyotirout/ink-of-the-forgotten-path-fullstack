/**
 * OceanWorldBuilder — Constructs the Drowned Epoch world.
 *
 * The endless ocean dotted with sunken ruins, volcanic cliff islands,
 * and the MC's Tidewalker Remnant home island at world center.
 *
 * Features:
 * - Animated Gerstner wave ocean surface (10km² visible)
 * - MC's cliffside hut with dragon sleeping platform
 * - Procedural sunken ruin clusters
 * - Volcanic/karst cliff islands
 * - Coral reef decorations
 * - Underwater terrain hints
 */
import * as THREE from "three";
import { CollisionSystem } from "../physics/CollisionSystem";

export interface OceanDynamicProps {
  oceanMesh: THREE.Mesh;
  oceanMaterial: THREE.ShaderMaterial;
  hutGroup: THREE.Group;
  islandColliders: string[];
  ruinGroups: THREE.Group[];
  seaFoamParticles: THREE.Points | null;
  qiCocoonMesh?: THREE.Group;
  altarSwordMesh?: THREE.Group;
  smokePlumeGroup?: THREE.Group;
  elderMinMesh?: THREE.Group;
  outpostCirclingDragon?: THREE.Group;
}

// ── Gerstner wave shader ──
const OCEAN_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uWaveHeight;
  varying vec2 vUv;
  varying float vElevation;
  varying vec3 vWorldPos;

  // Multi-octave Gerstner waves
  vec3 gerstnerWave(vec3 pos, float amp, float freq, float speed, vec2 dir, float steep) {
    float phase = dot(dir, pos.xz) * freq + uTime * speed;
    float s = sin(phase);
    float c = cos(phase);
    return vec3(
      steep * amp * dir.x * c,
      amp * s,
      steep * amp * dir.y * c
    );
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // 4 wave octaves for rich ocean surface
    vec3 w1 = gerstnerWave(pos, uWaveHeight, 0.06, 1.2, normalize(vec2(1.0, 0.6)), 0.35);
    vec3 w2 = gerstnerWave(pos, uWaveHeight * 0.5, 0.12, 1.8, normalize(vec2(-0.7, 1.0)), 0.25);
    vec3 w3 = gerstnerWave(pos, uWaveHeight * 0.25, 0.22, 2.5, normalize(vec2(0.3, -0.8)), 0.15);
    vec3 w4 = gerstnerWave(pos, uWaveHeight * 0.12, 0.45, 3.2, normalize(vec2(-1.0, 0.2)), 0.1);

    pos += w1 + w2 + w3 + w4;
    vElevation = pos.y;
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const OCEAN_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uFoamColor;
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;
  varying vec2 vUv;
  varying float vElevation;
  varying vec3 vWorldPos;

  void main() {
    // Depth-based color blend
    float depthFactor = smoothstep(-1.5, 2.0, vElevation);
    vec3 waterColor = mix(uDeepColor, uShallowColor, depthFactor);

    // Foam on wave crests
    float foam = smoothstep(0.8, 1.5, vElevation) * 0.6;
    waterColor = mix(waterColor, uFoamColor, foam);

    // Fresnel-like rim shine
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
    waterColor += fresnel * 0.15 * uShallowColor;

    // Specular sun reflection
    vec3 reflectDir = reflect(-uSunDirection, vec3(0.0, 1.0, 0.0));
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 128.0);
    waterColor += spec * uSunIntensity * vec3(1.0, 0.95, 0.85) * 0.8;

    // Subtle animated caustic pattern
    float caustic = sin(vWorldPos.x * 0.5 + uTime * 0.8) * sin(vWorldPos.z * 0.5 + uTime * 0.6) * 0.04;
    waterColor += caustic;

    // Distance fog blend (far ocean fades to sky)
    float dist = length(vWorldPos.xz - cameraPosition.xz);
    float fogFactor = smoothstep(800.0, 3000.0, dist);
    waterColor = mix(waterColor, uDeepColor * 0.7, fogFactor);

    gl_FragColor = vec4(waterColor, 0.92);
  }
`;

export class OceanWorldBuilder {
  /**
   * Build the entire Drowned Epoch world.
   */
  public static build(
    scene: THREE.Scene,
    collisions: CollisionSystem
  ): OceanDynamicProps {
    const props: OceanDynamicProps = {
      oceanMesh: null!,
      oceanMaterial: null!,
      hutGroup: new THREE.Group(),
      islandColliders: [],
      ruinGroups: [],
      seaFoamParticles: null,
    };

    // ─── 1. Ocean Surface ───
    this.buildOcean(scene, props);

    // ─── 2. MC's Home Island — Tidewalker Remnant ───
    this.buildHomeIsland(scene, collisions, props);

    // ─── 3. First Fishing Village & Ashscale Outpost (Hilltop/Cliffside) ───
    this.buildFishingVillageOutpost(scene, collisions, props);

    // ─── 4. Distant Island & Mountain Peak Silhouettes ───
    this.buildDistantIslands(scene, props);

    return props;
  }

  // ════════════════════════════════════════════════════
  // 1. OCEAN SURFACE
  // ════════════════════════════════════════════════════
  private static buildOcean(scene: THREE.Scene, props: OceanDynamicProps): void {
    const oceanGeo = new THREE.PlaneGeometry(12000, 12000, 80, 80);
    oceanGeo.rotateX(-Math.PI / 2);

    const oceanMat = new THREE.ShaderMaterial({
      vertexShader: OCEAN_VERTEX_SHADER,
      fragmentShader: OCEAN_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uWaveHeight: { value: 1.8 },
        uDeepColor: { value: new THREE.Color(0x0a3d62) },     // Deep ocean blue
        uShallowColor: { value: new THREE.Color(0x1abc9c) },  // Teal shallow
        uFoamColor: { value: new THREE.Color(0xe8f4f8) },     // White foam
        uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uSunIntensity: { value: 1.0 },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: true,
    });

    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.y = -2.0; // Ocean surface slightly below island level
    oceanMesh.name = "OceanSurface";
    oceanMesh.receiveShadow = false;
    scene.add(oceanMesh);

    props.oceanMesh = oceanMesh;
    props.oceanMaterial = oceanMat;
  }

  // ════════════════════════════════════════════════════
  // 2. HOME ISLAND — TIDEWALKER REMNANT
  // ════════════════════════════════════════════════════
  private static buildHomeIsland(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    props: OceanDynamicProps
  ): void {
    const islandGroup = new THREE.Group();
    islandGroup.name = "TidewalkerRemnant";

    // ── Materials ──
    const cliffRockMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.85,
      metalness: 0.1,
    });

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2d6a4f,
      roughness: 0.9,
      metalness: 0.0,
    });

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x6b705c,
      roughness: 0.7,
      metalness: 0.15,
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e,
      roughness: 0.75,
      metalness: 0.05,
    });

    const thatchMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.95,
      metalness: 0.0,
    });

    const jadeMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x059669,
      emissiveIntensity: 0.2,
    });

    // ══════════════════════════════════════════════════════════════
    // AESTHETIC DAWN HIGHLAND — Towering 120m Rolling Hills & Sunrise Overlook
    // (Scaled up 20x to Y = 120m with sweeping rolling green knolls matching reference views)
    // ══════════════════════════════════════════════════════════════

    const mountainGroup = new THREE.Group();
    mountainGroup.name = "AestheticDawnHighland";

    // ── 1. Submarine Bedrock Massif Foundation (reaching down to seabed at -80m) ──
    const seabedMassif = new THREE.Mesh(
      new THREE.CylinderGeometry(180, 260, 90, 24),
      cliffRockMat
    );
    const seaPos = seabedMassif.geometry.attributes.position;
    for (let i = 0; i < seaPos.count; i++) {
      const vx = seaPos.getX(i);
      const vz = seaPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const noise = Math.sin(angle * 5) * 16.0 + Math.cos(angle * 3) * 12.0;
      seaPos.setX(i, Math.cos(angle) * (dist + noise));
      seaPos.setZ(i, Math.sin(angle) * (dist + noise));
    }
    seabedMassif.geometry.computeVertexNormals();
    seabedMassif.position.set(0, -35.0, 0); // Y bounds: -80m to +10m
    seabedMassif.receiveShadow = true;
    mountainGroup.add(seabedMassif);

    // ── 2. Lower Coastal Bluffs & Emerald Foothills (Y = 6m to 36m) ──
    const lowerSlopeGeo = new THREE.CylinderGeometry(140, 195, 30, 22);
    const lowPos = lowerSlopeGeo.attributes.position;
    for (let i = 0; i < lowPos.count; i++) {
      const vx = lowPos.getX(i);
      const vz = lowPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const noise = Math.cos(angle * 4) * 12.0 + Math.sin(angle * 2) * 10.0;
      lowPos.setX(i, Math.cos(angle) * (dist + noise));
      lowPos.setZ(i, Math.sin(angle) * (dist + noise));
    }
    lowerSlopeGeo.computeVertexNormals();
    const lowerSlope = new THREE.Mesh(lowerSlopeGeo, cliffRockMat);
    lowerSlope.position.set(0, 21.0, 0); // Y = 6m to 36m
    lowerSlope.receiveShadow = true;
    mountainGroup.add(lowerSlope);

    // Lower green pasture terrace (Y = 35.5m to 36.0m)
    const lowerGrassGeo = new THREE.CylinderGeometry(142, 155, 1.5, 22);
    const lowGrassPos = lowerGrassGeo.attributes.position;
    for (let i = 0; i < lowGrassPos.count; i++) {
      const vx = lowGrassPos.getX(i);
      const vz = lowGrassPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const noise = Math.cos(angle * 3) * 8.0;
      lowGrassPos.setX(i, Math.cos(angle) * (dist + noise));
      lowGrassPos.setZ(i, Math.sin(angle) * (dist + noise));
    }
    lowerGrassGeo.computeVertexNormals();
    const lowerGrass = new THREE.Mesh(lowerGrassGeo, grassMat);
    lowerGrass.position.set(0, 35.5, 0);
    lowerGrass.receiveShadow = true;
    mountainGroup.add(lowerGrass);

    // ── 3. Mid Rolling Ridges (Y = 36m to 66m) ──
    const midSlopeGeo = new THREE.CylinderGeometry(100, 145, 30, 22);
    const midPos = midSlopeGeo.attributes.position;
    for (let i = 0; i < midPos.count; i++) {
      const vx = midPos.getX(i);
      const vz = midPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const noise = Math.cos(angle * 4) * 10.0 + Math.sin(angle * 3) * 8.0;
      midPos.setX(i, Math.cos(angle) * (dist + noise));
      midPos.setZ(i, Math.sin(angle) * (dist + noise));
    }
    midSlopeGeo.computeVertexNormals();
    const midSlope = new THREE.Mesh(midSlopeGeo, cliffRockMat);
    midSlope.position.set(0, 51.0, 0); // Y = 36m to 66m
    midSlope.receiveShadow = true;
    mountainGroup.add(midSlope);

    // Mid green pasture terrace (Y = 65.5m to 66.0m)
    const midGrassGeo = new THREE.CylinderGeometry(102, 115, 1.5, 22);
    const midGrassPos = midGrassGeo.attributes.position;
    for (let i = 0; i < midGrassPos.count; i++) {
      const vx = midGrassPos.getX(i);
      const vz = midGrassPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const noise = Math.cos(angle * 4) * 7.0;
      midGrassPos.setX(i, Math.cos(angle) * (dist + noise));
      midGrassPos.setZ(i, Math.sin(angle) * (dist + noise));
    }
    midGrassGeo.computeVertexNormals();
    const midGrass = new THREE.Mesh(midGrassGeo, grassMat);
    midGrass.position.set(0, 65.5, 0);
    midGrass.receiveShadow = true;
    mountainGroup.add(midGrass);

    // ── 4. Upper Highland Terraces (Y = 66m to 96m) ──
    const upperSlopeGeo = new THREE.CylinderGeometry(68, 105, 30, 20);
    const upPos = upperSlopeGeo.attributes.position;
    for (let i = 0; i < upPos.count; i++) {
      const vx = upPos.getX(i);
      const vz = upPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const noise = Math.sin(angle * 3) * 8.0 + Math.cos(angle * 5) * 6.0;
      upPos.setX(i, Math.cos(angle) * (dist + noise));
      upPos.setZ(i, Math.sin(angle) * (dist + noise));
    }
    upperSlopeGeo.computeVertexNormals();
    const upperSlope = new THREE.Mesh(upperSlopeGeo, cliffRockMat);
    upperSlope.position.set(0, 81.0, 0); // Y = 66m to 96m
    upperSlope.receiveShadow = true;
    mountainGroup.add(upperSlope);

    // Upper green pasture terrace (Y = 95.5m to 96.0m)
    const upperGrassGeo = new THREE.CylinderGeometry(70, 82, 1.5, 20);
    const upGrassPos = upperGrassGeo.attributes.position;
    for (let i = 0; i < upGrassPos.count; i++) {
      const vx = upGrassPos.getX(i);
      const vz = upGrassPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const noise = Math.cos(angle * 3) * 6.0;
      upGrassPos.setX(i, Math.cos(angle) * (dist + noise));
      upGrassPos.setZ(i, Math.sin(angle) * (dist + noise));
    }
    upperGrassGeo.computeVertexNormals();
    const upperGrass = new THREE.Mesh(upperGrassGeo, grassMat);
    upperGrass.position.set(0, 95.5, 0);
    upperGrass.receiveShadow = true;
    mountainGroup.add(upperGrass);

    // ── 5. Summit Highland Ridge & Mountain Cap (Y = 96m to 120.0m) ──
    // ── 5. Summit Highland Ridge & Mountain Cap (Y = 96m to 116.0m — below plateau) ──
    const summitSlopeGeo = new THREE.CylinderGeometry(40, 72, 20, 20);
    const sumPos = summitSlopeGeo.attributes.position;
    for (let i = 0; i < sumPos.count; i++) {
      const vx = sumPos.getX(i);
      const vz = sumPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const noise = Math.sin(angle * 4) * 6.0 + Math.cos(angle * 2) * 4.0;
      sumPos.setX(i, Math.cos(angle) * (dist + noise));
      sumPos.setZ(i, Math.sin(angle) * (dist + noise));
    }
    summitSlopeGeo.computeVertexNormals();
    const summitSlope = new THREE.Mesh(summitSlopeGeo, cliffRockMat);
    summitSlope.position.set(0, 106.0, 0); // Top is at 106 + 10 = 116.0m (cleanly tucks below 120m plateau)
    summitSlope.receiveShadow = true;
    mountainGroup.add(summitSlope);

    // Summit Highland Grass Plateau — Flat top surface EXACTLY at Y = 120.0m!
    const summitPlateauGeo = new THREE.CylinderGeometry(46, 56, 4.0, 22);
    const plateauPos = summitPlateauGeo.attributes.position;
    for (let i = 0; i < plateauPos.count; i++) {
      const vx = plateauPos.getX(i);
      const vy = plateauPos.getY(i);
      const vz = plateauPos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const noise = Math.sin(angle * 3) * 6.0 + Math.cos(angle * 5) * 4.5;
      const newDist = Math.max(16, dist + noise);
      plateauPos.setX(i, Math.cos(angle) * newDist);
      plateauPos.setZ(i, Math.sin(angle) * newDist);
      if (vy > 0) {
        plateauPos.setY(i, 2.0);
      }
    }
    summitPlateauGeo.computeVertexNormals();
    const summitPlateau = new THREE.Mesh(summitPlateauGeo, grassMat);
    summitPlateau.position.set(0, 118.0, 0); // Top is at 118.0 + 2.0 = 120.0m!
    summitPlateau.receiveShadow = true;
    mountainGroup.add(summitPlateau);

    // ── 6. Neighboring Rolling Green Hills (Tuscan / Highland Horizon from Reference Images) ──
    const rollingKnolls = [
      { x: -140, y: 78, z: -85, rx: 75, rz: 65, h: 26 },
      { x: -115, y: 68, z: 125, rx: 65, rz: 60, h: 24 },
      { x: 135, y: 38, z: 65, rx: 55, rz: 50, h: 22 },
      { x: 120, y: 32, z: -90, rx: 50, rz: 55, h: 20 },
    ];
    rollingKnolls.forEach((k) => {
      const knollGeo = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const knollMesh = new THREE.Mesh(knollGeo, grassMat);
      knollMesh.scale.set(k.rx, k.h, k.rz);
      knollMesh.position.set(k.x, k.y, k.z);
      knollMesh.receiveShadow = true;
      mountainGroup.add(knollMesh);
    });

    // ── 7. Natural Sea Cliffs framing outer drop (ALL STRICTLY BELOW Y = 116.0m) ──
    const perimeterCrags = [
      { x: 16, y: 28, z: 18, px: 32, py: 90, pz: -24, ry: 0.5 },
      { x: 18, y: 30, z: 16, px: 36, py: 88, pz: 22, ry: 1.2 },
      { x: 22, y: 28, z: 22, px: -38, py: 92, pz: -30, ry: 2.1 },
      { x: 20, y: 26, z: 20, px: -36, py: 90, pz: 32, ry: 0.8 },
      { x: 24, y: 32, z: 20, px: 38, py: 86, pz: 0, ry: 1.7 },
      { x: 20, y: 28, z: 24, px: -42, py: 88, pz: 0, ry: 2.8 },
    ];
    perimeterCrags.forEach((c) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), cliffRockMat);
      rock.scale.set(c.x, c.y, c.z);
      rock.position.set(c.px, c.py, c.pz);
      rock.rotation.y = c.ry;
      rock.castShadow = true;
      rock.receiveShadow = true;
      mountainGroup.add(rock);
    });

    // ── 7B. STEEP EASTERN PRECIPICE (Sheer 110m Drop Falling DOWN to Ocean Below) ──
    // Outside the viewing deck (X = 22m+), the mountain cliff plunges vertically DOWN into the sea!
    // The central sunrise/gate corridor (Z = -16 to +16) is 100% UNIMPEDED for infinite panoramic views!
    const sheerEscarpmentGroup = new THREE.Group();
    sheerEscarpmentGroup.name = "EasternSheerPrecipice";

    const sheerCliffMat = new THREE.MeshStandardMaterial({
      color: 0x3d3835, // Stratified vertical basalt & dark granite
      roughness: 0.88,
      metalness: 0.12,
    });

    // Colossal vertical cliff face plunging vertically DOWN from 116m to 6m sea level!
    const cliffWallGeo = new THREE.BoxGeometry(20, 110, 68);
    const cliffWall = new THREE.Mesh(cliffWallGeo, sheerCliffMat);
    cliffWall.position.set(30, 55, -2);
    cliffWall.castShadow = true;
    cliffWall.receiveShadow = true;
    sheerEscarpmentGroup.add(cliffWall);

    // Lateral rock buttresses strictly framing the flanks (North: Z < -26, South: Z > 22, height < 114m)
    const buttressConfigs = [
      { x: 28, y: 52, z: -30, sx: 14, sy: 96, sz: 16, rot: 0.15 },
      { x: 30, y: 48, z: 26,  sx: 14, sy: 92, sz: 16, rot: -0.2 },
      { x: 34, y: 36, z: -44, sx: 16, sy: 72, sz: 18, rot: 0.35 },
      { x: 34, y: 36, z: 38,  sx: 16, sy: 72, sz: 18, rot: -0.3 },
    ];
    buttressConfigs.forEach((bc) => {
      const buttress = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), sheerCliffMat);
      buttress.scale.set(bc.sx, bc.sy, bc.sz);
      buttress.position.set(bc.x, bc.y, bc.z);
      buttress.rotation.y = bc.rot;
      buttress.castShadow = true;
      buttress.receiveShadow = true;
      sheerEscarpmentGroup.add(buttress);
    });
    mountainGroup.add(sheerEscarpmentGroup);

    // ── 7C. TITANIC ANCESTRAL PEAKS (Single Seamless Sculpted Mountain Massif — Y = 0 to 385m) ──
    // Majestic continuous mountain flanks towering behind the 120m summit terrace with sheer cliffs and alpine pinnacle
    const colossalPeakGroup = new THREE.Group();
    colossalPeakGroup.name = "TitanicAncestralPeak";

    const mountainGeo = new THREE.CylinderGeometry(14, 330, 385, 48, 48, true);
    const mPos = mountainGeo.attributes.position;
    for (let i = 0; i < mPos.count; i++) {
      const vx = mPos.getX(i);
      const vy = mPos.getY(i);
      const vz = mPos.getZ(i);

      // Normalized height: 0.0 at base (sea level), 1.0 at peak (Y = 385m)
      const h = THREE.MathUtils.clamp((vy + 192.5) / 385.0, 0.0, 1.0);
      const theta = Math.atan2(vz, vx);

      // Natural mountain exponential profile (sweeping concave flare like Mount Fuji / Huangshan karst)
      const baseRadius = 330.0 * Math.pow(1.0 - h, 1.38) + 14.0 * (1.0 - h * 0.5);

      // Sheer eastern precipice facing East (+X) toward the gate & pavilion
      const eastFactor = Math.max(0, Math.cos(theta));
      let r = baseRadius * (1.0 - 0.28 * eastFactor * (1.0 - Math.pow(h, 1.6)));

      // 3 descending arête ridge spines plunging from summit to ocean
      const diff1 = Math.atan2(Math.sin(theta - 2.4), Math.cos(theta - 2.4));
      const w1 = Math.exp(-Math.pow(diff1 / 0.46, 2));
      const diff2 = Math.atan2(Math.sin(theta - (-2.4)), Math.cos(theta - (-2.4)));
      const w2 = Math.exp(-Math.pow(diff2 / 0.46, 2));
      const diff3 = Math.atan2(Math.sin(theta - 0.9), Math.cos(theta - 0.9));
      const w3 = Math.exp(-Math.pow(diff3 / 0.42, 2));
      const ridgeAdd = (w1 * 52.0 + w2 * 48.0 + w3 * 34.0) * Math.pow(1.0 - h, 0.72);
      r += ridgeAdd;

      // Multi-octave organic rock harmonics for natural crag faceting
      const noise1 = Math.sin(theta * 3 + h * 7) * 22.0 * (1.0 - h * 0.45);
      const noise2 = Math.cos(theta * 5 - h * 11) * 12.0 * (1.0 - h * 0.4);
      const noise3 = Math.sin(theta * 8 + h * 16) * 5.0;
      r += noise1 + noise2 + noise3;

      let finalX = Math.cos(theta) * r;
      const finalY = vy + Math.sin(theta * 4) * 6.0 * (1.0 - h);
      const finalZ = Math.sin(theta) * r;

      // ── Clean Summit Clearance: Carve out eastern face so rock never clips through dragon sanctuary ──
      const worldX = -160 + finalX;
      const worldY = 192.5 + finalY;
      if (worldX > -26.0 && worldY > 102.0) {
        // Compress smoothly westward to form a majestic backdrop cliff behind the summit
        const overshoot = worldX - (-26.0);
        finalX -= overshoot * 1.15;
      }

      mPos.setX(i, finalX);
      mPos.setZ(i, finalZ);
      mPos.setY(i, finalY);
    }
    mountainGeo.computeVertexNormals();

    const mountainMesh = new THREE.Mesh(mountainGeo, cliffRockMat);
    mountainMesh.position.set(-160, 192.5, 0);
    mountainMesh.castShadow = false;
    mountainMesh.receiveShadow = true;
    colossalPeakGroup.add(mountainMesh);

    // Weathered alpine pinnacle horn sealing the summit at Y = 385m
    const summitHornGeo = new THREE.ConeGeometry(20, 52, 20);
    const shPos = summitHornGeo.attributes.position;
    for (let i = 0; i < shPos.count; i++) {
      const vx = shPos.getX(i);
      const vz = shPos.getZ(i);
      const theta = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const noise = Math.sin(theta * 3) * 3.5 + Math.cos(theta * 5) * 2.0;
      shPos.setX(i, Math.cos(theta) * (dist + noise));
      shPos.setZ(i, Math.sin(theta) * (dist + noise));
    }
    summitHornGeo.computeVertexNormals();
    const summitHorn = new THREE.Mesh(
      summitHornGeo,
      new THREE.MeshStandardMaterial({
        color: 0x524b45, // Alpine weathered granite horn
        roughness: 0.85,
        metalness: 0.12,
      })
    );
    summitHorn.position.set(-160, 385, 0);
    summitHorn.castShadow = false;
    summitHorn.receiveShadow = true;
    colossalPeakGroup.add(summitHorn);

    // 6. Alpine Pine Trees clinging to the high mountain crags (Y = 160m to 240m)
    const alpineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const alpinePineMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85 });
    const alpineTreeLocs = [
      { x: -75, y: 175, z: -60, s: 2.2 },
      { x: -70, y: 170, z: 55,  s: 2.0 },
      { x: -125, y: 215, z: -65, s: 2.5 },
      { x: -130, y: 210, z: 50,  s: 2.3 },
      { x: -150, y: 245, z: 25,  s: 1.8 },
      { x: -140, y: 250, z: -40, s: 1.9 },
    ];
    alpineTreeLocs.forEach((at) => {
      const tree = new THREE.Group();
      tree.position.set(at.x, at.y, at.z);
      const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * at.s, 0.5 * at.s, 5 * at.s, 6), alpineTrunkMat);
      tMesh.position.y = 2.5 * at.s;
      tree.add(tMesh);
      for (let l = 0; l < 3; l++) {
        const cMesh = new THREE.Mesh(new THREE.ConeGeometry((2.5 - l * 0.6) * at.s, 2.5 * at.s, 6), alpinePineMat);
        cMesh.position.y = (4.5 + l * 1.8) * at.s;
        tree.add(cMesh);
      }
      colossalPeakGroup.add(tree);
    });

    mountainGroup.add(colossalPeakGroup);
    islandGroup.add(mountainGroup);

    // ── 8. Scenic Timber Sunrise Viewing Deck (Looking East toward the Ocean Sun) ──
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.8,
      metalness: 0.05,
    });

    const deckGroup = new THREE.Group();
    deckGroup.name = "SunriseViewingDeck";
    deckGroup.position.set(14, 120.1, -2);

    const deckPlatform = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 16), deckMat);
    deckPlatform.position.set(0, 0, 0);
    deckPlatform.receiveShadow = true;
    deckGroup.add(deckPlatform);

    // ── SPLIT PERIMETER RAILING (Zero fence in gate opening!) ──
    const railMat = new THREE.MeshStandardMaterial({ color: 0x422817, roughness: 0.85 });

    // North Railing Wing (z = -7.5 to -3.6, flanking the gate)
    for (let z = -7.5; z <= -3.6; z += 1.8) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.2, 6), railMat);
      post.position.set(5.8, 0.7, z);
      post.castShadow = true;
      deckGroup.add(post);
    }
    const northRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 4.2), railMat);
    northRail.position.set(5.8, 1.25, -5.6);
    deckGroup.add(northRail);

    // South Railing Wing (z = 3.6 to 7.5, flanking the gate)
    for (let z = 3.6; z <= 7.5; z += 1.8) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.2, 6), railMat);
      post.position.set(5.8, 0.7, z);
      post.castShadow = true;
      deckGroup.add(post);
    }
    const southRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 4.2), railMat);
    southRail.position.set(5.8, 1.25, 5.6);
    deckGroup.add(southRail);

    // ── 100% UNCONSTRAINED OPEN WALKTHROUGH GATE PORTAL (z = -3.5 to +3.5) ──
    // Smooth carved flagstone approach stairs leading through the gate
    const gateStairs = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 0.28, 7.0),
      stoneMat
    );
    gateStairs.position.set(6.8, -0.05, 0);
    gateStairs.receiveShadow = true;
    deckGroup.add(gateStairs);

    // Cantilevered cliff-edge observation rostrum extending beyond the gate over the precipice
    const cliffLookout = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 0.38, 7.5),
      stoneMat
    );
    cliffLookout.position.set(11.2, -0.12, 0);
    cliffLookout.receiveShadow = true;
    deckGroup.add(cliffLookout);

    // The Ceremonial Torii Gate Columns (Z = -3.5 and +3.5)
    const toriiMat = new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.7, metalness: 0.1 });
    const toriiPillarLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 6.0, 8), toriiMat);
    toriiPillarLeft.position.set(5.5, 3.0, -3.5);
    deckGroup.add(toriiPillarLeft);

    const toriiPillarRight = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 6.0, 8), toriiMat);
    toriiPillarRight.position.set(5.5, 3.0, 3.5);
    deckGroup.add(toriiPillarRight);

    const toriiBeam = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 9.6), toriiMat);
    toriiBeam.position.set(5.5, 5.8, 0);
    deckGroup.add(toriiBeam);

    const toriiTopCap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 10.4), toriiMat);
    toriiTopCap.position.set(5.5, 6.15, 0);
    deckGroup.add(toriiTopCap);

    for (const zSide of [-2.8, 2.8]) {
      const toriiLantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.7, 6),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.0 })
      );
      toriiLantern.position.set(5.5, 4.6, zSide);
      deckGroup.add(toriiLantern);
    }
    const gateGlow = new THREE.PointLight(0xfbbf24, 1.2, 11);
    gateGlow.position.set(5.5, 4.6, 0);
    deckGroup.add(gateGlow);

    const medStone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.3, 1),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 })
    );
    medStone.scale.set(1.5, 0.75, 1.3);
    medStone.position.set(2.0, 0.5, -4.5);
    medStone.receiveShadow = true;
    deckGroup.add(medStone);

    islandGroup.add(deckGroup);

    // ── 9. Dragon Promontory Resting Crag (Eastern Scenic Overlook) ──
    const dragonCragGroup = new THREE.Group();
    dragonCragGroup.name = "DragonRestCrag";
    dragonCragGroup.position.set(18, 119.6, 6);

    const cragStone = new THREE.Mesh(new THREE.DodecahedronGeometry(4.5, 1), cliffRockMat);
    cragStone.scale.set(1.9, 0.5, 1.5);
    cragStone.receiveShadow = true;
    dragonCragGroup.add(cragStone);

    const cragSlate = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
    );
    cragSlate.position.y = 0.4;
    cragSlate.receiveShadow = true;
    dragonCragGroup.add(cragSlate);

    islandGroup.add(dragonCragGroup);

    // ── 10. Weathered Stone Mountain Lantern (Tōrō) ──
    const toroGroup = new THREE.Group();
    toroGroup.position.set(7.5, 120.1, -6.5);
    const toroBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.7, 6), stoneMat);
    toroBase.position.y = 0.35;
    toroGroup.add(toroBase);

    const toroShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.2, 6), stoneMat);
    toroShaft.position.y = 1.3;
    toroGroup.add(toroShaft);

    const toroFirebox = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.9 })
    );
    toroFirebox.position.y = 2.0;
    toroGroup.add(toroFirebox);

    const toroLight = new THREE.PointLight(0xf59e0b, 0.8, 6);
    toroLight.position.y = 2.0;
    toroGroup.add(toroLight);

    const toroCap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.4, 6), stoneMat);
    toroCap.position.y = 2.45;
    toroGroup.add(toroCap);

    islandGroup.add(toroGroup);

    // ── 11. Winding Slate Stepping Stones Trail (Pavilion to Sunrise Gate) ──
    const slateMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      const sx = 4.0 + t * 7.5 + Math.sin(t * Math.PI * 2) * 1.0;
      const sz = -4.0 + t * 2.8 + Math.cos(t * Math.PI * 2) * 1.2;
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7 + Math.random() * 0.2, 0.8 + Math.random() * 0.2, 0.18, 7),
        slateMat
      );
      stone.position.set(sx, 120.12, sz);
      stone.rotation.y = Math.random() * Math.PI;
      stone.receiveShadow = true;
      islandGroup.add(stone);
    }

    // ── 12. Wildflower Meadow Clusters across Summit Grass ──
    const flowerColors = [0xf8fafc, 0xc084fc, 0xfde047, 0xf472b6, 0x67e8f9];
    for (let f = 0; f < 50; f++) {
      const fAngle = Math.random() * Math.PI * 2;
      const fDist = 4 + Math.random() * 32;
      const fMat = new THREE.MeshStandardMaterial({
        color: flowerColors[f % flowerColors.length],
        roughness: 0.7,
      });

      const cluster = new THREE.Group();
      for (let p = 0; p < 4; p++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.14, 4, 3), fMat);
        petal.position.set(
          (Math.random() - 0.5) * 0.9,
          0.14 + Math.random() * 0.2,
          (Math.random() - 0.5) * 0.9
        );
        cluster.add(petal);
      }
      cluster.position.set(
        Math.cos(fAngle) * fDist,
        120.03,
        Math.sin(fAngle) * fDist
      );
      islandGroup.add(cluster);
    }

    // ── 13. Sculpted Wind-Swept Bonsai Pines & Plum Blossom Trees ──
    const pineLeafMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85 });
    const plumLeafMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.75 });
    const gnarledTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });

    for (let i = 0; i < 12; i++) {
      const pAngle = (i / 12) * Math.PI * 2 + 0.25;
      const pDist = 20 + Math.random() * 16;
      const isPlum = i % 3 === 0;

      const tree = new THREE.Group();
      const trunkLower = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 3.2, 6), gnarledTrunkMat);
      trunkLower.position.set(0, 1.6, 0);
      trunkLower.rotation.z = -0.3 + (Math.random() - 0.5) * 0.15;
      tree.add(trunkLower);

      const trunkUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 2.8, 5), gnarledTrunkMat);
      trunkUpper.position.set(0.55, 3.8, 0);
      trunkUpper.rotation.z = -0.5;
      tree.add(trunkUpper);

      const foliageMat = isPlum ? plumLeafMat : pineLeafMat;
      for (let c = 0; c < 3; c++) {
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.4 - c * 0.25, 6, 4), foliageMat);
        canopy.scale.set(1.6, 0.6, 1.4);
        canopy.position.set(0.4 + c * 0.6, 3.2 + c * 1.1, (Math.random() - 0.5) * 0.7);
        canopy.castShadow = true;
        tree.add(canopy);
      }

      tree.position.set(
        Math.cos(pAngle) * pDist,
        120.0,
        Math.sin(pAngle) * pDist
      );
      islandGroup.add(tree);
    }

    // ── 14. Floating Golden Dawn Sunrise Motes ──
    const moteMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.65,
    });
    for (let m = 0; m < 35; m++) {
      const mote = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 4, 3), moteMat);
      mote.position.set(
        8 + (Math.random() - 0.5) * 24,
        121.0 + Math.random() * 5.0,
        (Math.random() - 0.5) * 20
      );
      islandGroup.add(mote);
    }

    // ── 15. Walkable Surfaces for CollisionSystem (Towering 120m Peak & Terraces) ──
    collisions.addWalkableSurface({
      id: "home_hill_summit_surface",
      type: "circle",
      surfaceY: 120.0,
      cx: 0,
      cz: 0,
      radius: 48,
    });

    collisions.addWalkableSurface({
      id: "home_hill_pavilion_surface",
      type: "box",
      surfaceY: 120.50,
      minX: -24,
      maxX: 12,
      minZ: -8,
      maxZ: 16,
    });

    collisions.addWalkableSurface({
      id: "home_hill_deck_surface",
      type: "box",
      surfaceY: 120.45,
      minX: 8,
      maxX: 26,
      minZ: -10,
      maxZ: 8,
    });

    collisions.addWalkableSurface({
      id: "home_hill_dragon_surface",
      type: "box",
      surfaceY: 120.0,
      minX: 12,
      maxX: 24,
      minZ: 0,
      maxZ: 12,
    });

    collisions.addWalkableSurface({
      id: "home_hill_upper_surface",
      type: "circle",
      surfaceY: 96.0,
      cx: 0,
      cz: 0,
      radius: 76,
    });

    collisions.addWalkableSurface({
      id: "home_hill_mid_surface",
      type: "circle",
      surfaceY: 66.0,
      cx: 0,
      cz: 0,
      radius: 115,
    });

    collisions.addWalkableSurface({
      id: "home_hill_lower_surface",
      type: "circle",
      surfaceY: 36.0,
      cx: 0,
      cz: 0,
      radius: 160,
    });

    collisions.addWalkableSurface({
      id: "home_hill_base_surface",
      type: "circle",
      surfaceY: 6.0,
      cx: 0,
      cz: 0,
      radius: 210,
    });

    // Solid mountain colliders
    collisions.addCollider({
      id: "home_hill_summit_body",
      type: "cylinder",
      position: new THREE.Vector3(0, 0, 0),
      radius: 48,
      height: 120.0,
      walkable: true,
    });

    collisions.addCollider({
      id: "home_hill_base_body",
      type: "cylinder",
      position: new THREE.Vector3(0, 0, 0),
      radius: 210,
      height: 36.0,
      walkable: true,
    });

    props.islandColliders.push("home_hill_summit_body", "home_hill_base_body");

    // ══════════════════════════════════════════════════════════════
    // GRAND OPEN DRAGON PAVILION & SANCTUARY (大乘驭龙轩)
    // 100% open timber architecture on the summit at Y = 120.0m.
    // Zero burying stones — panoramic ocean & sunrise vistas.
    // Spacious enough to comfortably fit Veyros the Dragon Mount!
    // ══════════════════════════════════════════════════════════════
    const hutGroup = new THREE.Group();
    hutGroup.name = "TidewalkerDragonPavilion";
    hutGroup.position.set(-6, 120.0, 4);

    // ── 1. Raised Flagstone Foundation & Polished Cedar Deck (Strict layer offsets) ──
    const foundationPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.40, 22),
      stoneMat
    );
    foundationPlinth.position.set(0, 0.20, 0); // Bottom at 0.00, top at 0.40
    foundationPlinth.receiveShadow = true;
    hutGroup.add(foundationPlinth);

    const cedarDeck = new THREE.Mesh(
      new THREE.BoxGeometry(32.0, 0.10, 22.0),
      new THREE.MeshStandardMaterial({
        color: 0x5a3d28,
        roughness: 0.65,
        metalness: 0.05,
      })
    );
    cedarDeck.position.set(0, 0.45, 0); // Bottom at 0.40, top at 0.50 (World Y = 120.50m)
    cedarDeck.receiveShadow = true;
    hutGroup.add(cedarDeck);

    // Stone approach steps (South and East entries)
    const southSteps = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.22, 2.5),
      stoneMat
    );
    southSteps.position.set(0, 0.11, 12);
    hutGroup.add(southSteps);

    // ── 2. The Cultivator's Contemplation Pavilion (Western Wing, Sheltered by High Pagoda Roof) ──
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x6d391d, // Rich red cedar
      roughness: 0.7,
      metalness: 0.1,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.85,
    });

    // Pillars shelter ONLY the western contemplation wing (X = -14 to -2).
    // The eastern dragon roost (X = 0 to 16) is 100% open to the celestial sky!
    const westPillarCoords = [
      [-14, 8.5], [-8, 8.5], [-2, 8.5],
      [-14, -8.5], [-8, -8.5], [-2, -8.5],
    ];

    westPillarCoords.forEach(([px, pz]) => {
      // Pillar Column
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.42, 9.2, 10),
        pillarMat
      );
      col.position.set(px, 5.1, pz);
      col.castShadow = true;
      hutGroup.add(col);

      // Brass base collar
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.56, 0.35, 10),
        brassMat
      );
      collar.position.set(px, 0.65, pz);
      hutGroup.add(collar);

      // Capital bracket set (Dou-gong capital)
      const capital = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.38, 1.3),
        pillarMat
      );
      capital.position.set(px, 9.6, pz);
      hutGroup.add(capital);
    });

    // ── 3. High Structural Crossbeams over Cultivator Wing ──
    const westFrontBeam = new THREE.Mesh(
      new THREE.BoxGeometry(14.0, 0.48, 0.65),
      pillarMat
    );
    westFrontBeam.position.set(-8.0, 9.7, 8.5);
    hutGroup.add(westFrontBeam);

    const westBackBeam = new THREE.Mesh(
      new THREE.BoxGeometry(14.0, 0.48, 0.65),
      pillarMat
    );
    westBackBeam.position.set(-8.0, 9.7, -8.5);
    hutGroup.add(westBackBeam);

    const westRidgeBeam = new THREE.Mesh(
      new THREE.BoxGeometry(14.0, 0.55, 0.75),
      pillarMat
    );
    westRidgeBeam.position.set(-8.0, 12.8, 0);
    hutGroup.add(westRidgeBeam);

    // ── 4. Sweeping Pagoda Roof (Sheltering Cultivator Wing ONLY, Leaving Dragon 100% Open to Sky!) ──
    const cultivatorRoof = new THREE.Mesh(
      new THREE.ConeGeometry(11.5, 3.6, 4),
      thatchMat
    );
    cultivatorRoof.rotation.y = Math.PI / 4;
    cultivatorRoof.scale.set(1.2, 0.75, 1.0);
    cultivatorRoof.position.set(-8.0, 11.4, 0);
    cultivatorRoof.castShadow = true;
    hutGroup.add(cultivatorRoof);

    // Golden Dragon Crest Finial on Cultivator Roof Peak
    const roofFinial = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 2.2, 8),
      brassMat
    );
    roofFinial.position.set(-8.0, 13.8, 0);
    hutGroup.add(roofFinial);

    // ── 5. OPTION A: THE GRAND CELESTIAL DRAGON ALTAR (九霄御龍臺) ──
    // 100% OPEN SKY, ZERO CLIPPING, WIDE UNCONSTRAINED 20m TAKEOFF CLEARANCE!
    // Centered at X = +7.5, Z = 0 (World coordinates 1.5, 120.65, 4.0)
    const dragonAltarGroup = new THREE.Group();
    dragonAltarGroup.name = "GrandCelestialDragonAltar";
    dragonAltarGroup.position.set(7.5, 0.50, 0);

    // Tier 1: Outer Carved Basalt & White Granite Dais
    const outerDais = new THREE.Mesh(
      new THREE.CylinderGeometry(8.2, 8.6, 0.22, 24),
      stoneMat
    );
    outerDais.position.y = 0.11;
    outerDais.receiveShadow = true;
    dragonAltarGroup.add(outerDais);

    // Tier 2: Sacred Golden Dragon Qi Meridian Altar Ring
    const qiRingMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Imperial golden dragon qi
      roughness: 0.35,
      metalness: 0.85,
      emissive: 0xb45309,
      emissiveIntensity: 0.6,
    });
    const innerQiRing = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.1, 0.12, 24),
      qiRingMat
    );
    innerQiRing.position.y = 0.24;
    innerQiRing.receiveShadow = true;
    dragonAltarGroup.add(innerQiRing);

    // Tier 3: Golden Mountain Hay & Reed Dragon Nest Bedding
    const dragonBedding = new THREE.Mesh(
      new THREE.CylinderGeometry(5.8, 6.1, 0.09, 20),
      new THREE.MeshStandardMaterial({
        color: 0xb58c4c, // Rich golden mountain hay
        roughness: 0.95,
      })
    );
    dragonBedding.position.y = 0.32;
    dragonBedding.receiveShadow = true;
    dragonAltarGroup.add(dragonBedding);

    // Carved stone flight apron extending East toward the sunrise viewing deck
    const flightApron = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 0.16, 7.5),
      stoneMat
    );
    flightApron.position.set(6.8, 0.08, 0);
    flightApron.receiveShadow = true;
    dragonAltarGroup.add(flightApron);

    // ── Twin Grand Ceremonial Bronze Warming Braziers (North & South) ──
    for (const zSide of [-7.2, 7.2]) {
      const brazier = new THREE.Group();
      brazier.position.set(2.5, 0, zSide);

      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 0.85, 1.3, 8),
        brassMat
      );
      bowl.position.y = 0.85;
      bowl.castShadow = true;
      brazier.add(bowl);

      const coals = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 8, 6),
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xea580c,
          emissiveIntensity: 0.85,
          roughness: 0.8,
        })
      );
      coals.position.y = 1.45;
      brazier.add(coals);

      const brazierGlow = new THREE.PointLight(0xf59e0b, 1.8, 20);
      brazierGlow.position.y = 2.1;
      brazier.add(brazierGlow);

      dragonAltarGroup.add(brazier);
    }

    // ── Four Carved Stone Dragon Guardian Lanterns (Framing the Altar Corners) ──
    const lanternCoords = [
      [-1.5, 6.8], [-1.5, -6.8],
      [7.5, 7.5], [7.5, -7.5],
    ];
    lanternCoords.forEach(([lx, lz]) => {
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(lx, 0, lz);

      const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.65, 6), stoneMat);
      lBase.position.y = 0.32;
      lanternGroup.add(lBase);

      const lPost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.1, 6), stoneMat);
      lPost.position.y = 1.1;
      lanternGroup.add(lPost);

      const lFire = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.42, 0.42),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.0 })
      );
      lFire.position.y = 1.75;
      lanternGroup.add(lFire);

      const lCap = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.35, 6), stoneMat);
      lCap.position.y = 2.1;
      lanternGroup.add(lCap);

      const lLight = new THREE.PointLight(0xf59e0b, 0.65, 8);
      lLight.position.y = 1.75;
      lanternGroup.add(lLight);

      dragonAltarGroup.add(lanternGroup);
    });

    hutGroup.add(dragonAltarGroup);

    // ── 6. MC'S LIVING PAVILION WING (Western Wing, X = -8 to -14) ──
    // Authentic woven rush straw resting mat (flush on cedar deck)
    const strawMatMesh = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.03, 5.4),
      new THREE.MeshStandardMaterial({ color: 0x85794d, roughness: 0.85 })
    );
    strawMatMesh.position.set(-9.0, 0.515, 2.0);
    strawMatMesh.receiveShadow = true;
    hutGroup.add(strawMatMesh);

    // Low polished dark rosewood tea table
    const teaTable = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.14, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.65 })
    );
    teaTable.position.set(-9.0, 0.58, 2.0);
    teaTable.castShadow = true;
    teaTable.receiveShadow = true;
    hutGroup.add(teaTable);

    // Antique bronze incense tripod brazier atop tea table
    const incenseBurner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.09, 0.14, 8),
      brassMat
    );
    incenseBurner.position.set(-9.0, 0.72, 2.0);
    hutGroup.add(incenseBurner);

    // Natural woven rush straw zafu meditation cushion (warm golden straw, zero neon purple!)
    const zafuCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.52, 0.09, 12),
      new THREE.MeshStandardMaterial({ color: 0xa88d5e, roughness: 0.9 })
    );
    zafuCushion.position.set(-9.0, 0.545, 3.2);
    zafuCushion.receiveShadow = true;
    hutGroup.add(zafuCushion);

    // ── 7. Sacred Family Altar (FamilyAltar) ──
    const altar = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.1, 0.9),
      jadeMat
    );
    altar.position.set(-12.0, 1.1, -2.5);
    altar.name = "FamilyAltar";
    altar.castShadow = true;
    hutGroup.add(altar);

    // Jade dragon figurine atop altar
    const figurine = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.5, 6),
      jadeMat
    );
    figurine.position.set(-12.0, 1.9, -2.5);
    hutGroup.add(figurine);

    // ── 8. Weapon Rack (AltarDragonSword) ──
    const rack = new THREE.Group();
    for (const xOff of [-0.6, 0.6]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6),
        woodMat
      );
      post.position.set(xOff, 1.4, -2.2);
      rack.add(post);
    }
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6),
      woodMat
    );
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.9, -2.2);
    rack.add(bar);
    hutGroup.add(rack);

    // The Sacred Dragon Sword on Altar Rack
    const altarSwordGroup = new THREE.Group();
    altarSwordGroup.name = "AltarDragonSword";
    altarSwordGroup.position.set(-12.0, 1.95, -2.2);

    const swordBladeMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x0d9488,
      emissiveIntensity: 0.6,
    });
    const swordBlade = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.06, 0.02),
      swordBladeMat
    );
    altarSwordGroup.add(swordBlade);

    const swordGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.24, 0.07),
      brassMat
    );
    swordGuard.position.x = -0.75;
    altarSwordGroup.add(swordGuard);

    const swordHilt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.38, 6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
    );
    swordHilt.rotation.z = Math.PI / 2;
    swordHilt.position.x = -0.96;
    altarSwordGroup.add(swordHilt);

    const swordLight = new THREE.PointLight(0x2dd4bf, 1.2, 5);
    swordLight.position.set(0, 0.2, 0);
    altarSwordGroup.add(swordLight);

    hutGroup.add(altarSwordGroup);
    props.altarSwordMesh = altarSwordGroup;

    // ── 9. The Oracle's Qi Cocoon (Chrysalis of Awakening) ──
    const qiCocoonGroup = new THREE.Group();
    qiCocoonGroup.name = "QiCocoon";
    qiCocoonGroup.position.set(-7.0, 0.5, 1.0); // MC spawn inside open pavilion

    const cocoonMat = new THREE.MeshStandardMaterial({
      color: 0x5eead4,
      roughness: 0.15,
      metalness: 0.3,
      emissive: 0x0f766e,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const cocoonShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 16, 14),
      cocoonMat
    );
    cocoonShell.scale.set(1.0, 1.6, 1.0);
    cocoonShell.position.y = 1.0;
    qiCocoonGroup.add(cocoonShell);

    const cocoonCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.8, 1),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
      })
    );
    cocoonCore.position.y = 1.0;
    qiCocoonGroup.add(cocoonCore);

    const cocoonLight = new THREE.PointLight(0x2dd4bf, 1.6, 7);
    cocoonLight.position.y = 1.0;
    qiCocoonGroup.add(cocoonLight);

    hutGroup.add(qiCocoonGroup);
    props.qiCocoonMesh = qiCocoonGroup;

    // ── 10. Warm Silk Hanging Lanterns (illuminating pavilion at night) ──
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.8,
      roughness: 0.4,
    });
    const lanternLocs = [
      [-14, 8.5, 9.5], [0, 8.5, 9.5], [14, 8.5, 9.5],
      [-14, 8.5, -9.5], [0, 8.5, -9.5], [14, 8.5, -9.5],
    ];
    lanternLocs.forEach(([lx, ly, lz]) => {
      const lant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 0.7, 8),
        lanternMat
      );
      lant.position.set(lx, ly, lz);
      hutGroup.add(lant);
    });

    // 2 central warm ambient pavilion lights illuminate the entire deck efficiently (zero 6x light loop penalty)
    const pavLightL = new THREE.PointLight(0xfbbf24, 1.2, 18);
    pavLightL.position.set(-7, 8.2, 0);
    hutGroup.add(pavLightL);
    const pavLightR = new THREE.PointLight(0xfbbf24, 1.2, 18);
    pavLightR.position.set(7, 8.2, 0);
    hutGroup.add(pavLightR);

    islandGroup.add(hutGroup);
    props.hutGroup = hutGroup;

    // ── 11. Highland Bonsai Pines & Summit Crags (At Y = 120.0m) ──
    const highlandPineMat = new THREE.MeshStandardMaterial({
      color: 0x1b4332, // Deep alpine pine green
      roughness: 0.8,
    });
    const highlandTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e1b,
      roughness: 0.9,
    });

    const summitTrees = [
      { x: -32, z: -14, s: 1.4 },
      { x: -28, z: 22, s: 1.2 },
      { x: 28, z: -20, s: 1.5 },
      { x: 26, z: 24, s: 1.3 },
      { x: -8, z: -28, s: 1.1 },
      { x: 6, z: -29, s: 1.4 },
      { x: 36, z: 2, s: 1.6 },
    ];

    summitTrees.forEach((t) => {
      const tree = new THREE.Group();
      tree.position.set(t.x, 120.0, t.z);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25 * t.s, 0.4 * t.s, 4.5 * t.s, 6),
        highlandTrunkMat
      );
      trunk.position.y = 2.25 * t.s;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      tree.add(trunk);

      // Layered tiered pine foliage canopy
      for (let layer = 0; layer < 3; layer++) {
        const rad = (2.2 - layer * 0.5) * t.s;
        const fol = new THREE.Mesh(
          new THREE.ConeGeometry(rad, 2.0 * t.s, 6),
          highlandPineMat
        );
        fol.position.y = (3.8 + layer * 1.5) * t.s;
        fol.castShadow = true;
        tree.add(fol);
      }

      islandGroup.add(tree);
    });

    // Mossy Summit Granite Rocks along rim
    for (let r = 0; r < 14; r++) {
      const angle = (r / 14) * Math.PI * 2;
      const dist = 38 + Math.random() * 8;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.6, 1),
        cliffRockMat
      );
      rock.position.set(
        Math.cos(angle) * dist,
        119.5 + Math.random() * 0.8,
        Math.sin(angle) * dist
      );
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      islandGroup.add(rock);
    }



    scene.add(islandGroup);
  }



  // ════════════════════════════════════════════════════
  // 3.5 FIRST FISHING VILLAGE & ASHSCALE OUTPOST
  // ════════════════════════════════════════════════════
  private static buildFishingVillageOutpost(
    scene: THREE.Scene,
    collisions: CollisionSystem,
    props: OceanDynamicProps
  ): void {
    const villageGroup = new THREE.Group();
    villageGroup.name = "FishingVillageOutpost";
    villageGroup.position.set(750, 0, 450); // In Scattered Reefs (Act 1)

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.85,
      metalness: 0.05,
    });

    const thatchMat = new THREE.MeshStandardMaterial({
      color: 0x927856,
      roughness: 0.95,
    });

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x22262e, // Weathered dark volcanic basalt rock
      roughness: 0.88,
      metalness: 0.1,
    });

    // ── 1. Base Dark Volcanic Reef Island (No unnatural white surface) ──
    const islandBase = new THREE.Mesh(
      new THREE.CylinderGeometry(40, 52, 15.6, 16),
      stoneMat
    );
    islandBase.position.y = -4.0;
    islandBase.receiveShadow = true;
    villageGroup.add(islandBase);

    // ── 2. Central Duel Arena Platform (Korrath Arena) ──
    const arenaMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.2,
    });
    const arenaPlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 0.8, 16),
      arenaMat
    );
    arenaPlatform.position.y = 3.9;
    arenaPlatform.receiveShadow = true;
    villageGroup.add(arenaPlatform);

    // Register arena collider
    collisions.addCollider({
      id: "reef_arena_platform",
      type: "cylinder",
      position: new THREE.Vector3(750, 4.0, 450),
      radius: 20,
      height: 1.2,
      walkable: true,
    });

    // ── 3. Four Stilted Fishing Huts around perimeter ──
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + 0.3;
      const hx = Math.cos(angle) * 28;
      const hz = Math.sin(angle) * 28;

      const hut = new THREE.Group();
      hut.position.set(hx, 3.8, hz);

      // Stilts
      for (const [sx, sz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
        const stilt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.15, 6, 5),
          woodMat
        );
        stilt.position.set(sx, -1.5, sz);
        hut.add(stilt);
      }

      // Wooden Deck
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.3, 4.5),
        woodMat
      );
      deck.position.y = 1.4;
      hut.add(deck);

      // Hut walls & thatched roof
      const walls = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 2.5, 3.6),
        woodMat
      );
      walls.position.y = 2.7;
      hut.add(walls);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(3.0, 1.8, 4),
        thatchMat
      );
      roof.position.y = 4.8;
      roof.rotation.y = Math.PI / 4;
      hut.add(roof);

      // Hanging Lantern
      const lanternLight = new THREE.PointLight(0xfbbf24, 1.2, 14);
      lanternLight.position.set(1.5, 2.4, 1.5);
      hut.add(lanternLight);

      villageGroup.add(hut);

      // Walkable collider on hut deck
      collisions.addCollider({
        id: `village_hut_${i}`,
        type: "box",
        position: new THREE.Vector3(750 + hx, 5.2, 450 + hz),
        halfSize: new THREE.Vector3(2.3, 0.3, 2.3),
        walkable: true,
      });
    }

    // ── 4. Wooden Boardwalk Piers extending to water ──
    for (let p = 0; p < 2; p++) {
      const pierAngle = p * Math.PI + 0.8;
      const px = Math.cos(pierAngle) * 32;
      const pz = Math.sin(pierAngle) * 32;

      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 0.4, 16.0),
        woodMat
      );
      pier.position.set(px, 3.0, pz);
      pier.rotation.y = pierAngle;
      villageGroup.add(pier);

      // Moored wooden fishing boats (sampans)
      const boat = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.8, 5.5),
        woodMat
      );
      boat.position.set(px + 4, 0.2, pz + 6);
      boat.rotation.y = pierAngle + 0.2;
      villageGroup.add(boat);
    }

    // ── 5. Ashscale Raid Smoldering Fire Barrels ──
    for (const [bx, bz] of [[-6, 8], [12, -4], [-10, -10]]) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.5, 1.0, 8),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
      );
      barrel.position.set(bx, 4.5, bz);
      villageGroup.add(barrel);

      const fireGlow = new THREE.PointLight(0xf97316, 1.5, 10);
      fireGlow.position.set(bx, 5.4, bz);
      villageGroup.add(fireGlow);
    }

    // ── 6. Towering Volumetric Ashscale Raid Smoke Plume (Visible across the ocean) ──
    const smokeGroup = new THREE.Group();
    smokeGroup.name = "AshscaleRaidSmokePlume";
    smokeGroup.position.set(0, 4.0, 0); // At center of the village platform

    // Base inferno core
    const fireBase = new THREE.Mesh(
      new THREE.ConeGeometry(5.0, 9.0, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff4500,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
      })
    );
    fireBase.position.y = 4.5;
    smokeGroup.add(fireBase);

    const infernoLight = new THREE.PointLight(0xf97316, 5.0, 75);
    infernoLight.position.y = 6.0;
    smokeGroup.add(infernoLight);

    // Ascending billowing dark smoke tiers reaching 120m height
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.82,
    });

    const tierHeights = [
      { y: 6, r1: 3.0, r2: 6.5, h: 16 },
      { y: 22, r1: 6.5, r2: 10.5, h: 20 },
      { y: 42, r1: 10.5, r2: 16.5, h: 26 },
      { y: 68, r1: 16.5, r2: 24.0, h: 32 },
      { y: 100, r1: 24.0, r2: 34.0, h: 38 },
    ];

    tierHeights.forEach((tier, tIdx) => {
      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(tier.r2, tier.r1, tier.h, 10, 1, false),
        smokeMat
      );
      cone.position.set(
        Math.sin(tIdx * 0.9) * (tIdx * 2.0),
        tier.y + tier.h / 2,
        Math.cos(tIdx * 0.9) * (tIdx * 2.0)
      );
      cone.rotation.y = tIdx * 0.5;
      smokeGroup.add(cone);

      // Cloud puffs around tier perimeter
      for (let p = 0; p < 4; p++) {
        const puffAngle = (p * Math.PI) / 2 + tIdx;
        const puffR = tier.r2 * 0.75;
        const puff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(tier.r2 * 0.45, 1),
          smokeMat
        );
        puff.position.set(
          cone.position.x + Math.cos(puffAngle) * puffR,
          cone.position.y + (Math.random() - 0.5) * 4,
          cone.position.z + Math.sin(puffAngle) * puffR
        );
        smokeGroup.add(puff);
      }
    });

    villageGroup.add(smokeGroup);
    props.smokePlumeGroup = smokeGroup;

    // ── 7. Elder Min (Fisherfolk Elder) NPC on Boardwalk ──
    const elderGroup = new THREE.Group();
    elderGroup.name = "NPC_ElderMin";
    // Place at world (745, 4.0, 442) => relative (-5.0, 4.0, -8.0)
    elderGroup.position.set(-5.0, 4.0, -8.0);

    const robeMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Woven indigo blue robes
      roughness: 0.85,
    });
    const elderSkinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.6,
    });
    const strawMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.9,
    });
    const beardMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.9,
    });

    // Body / Robes
    const elderRobe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1.4, 8),
      robeMat
    );
    elderRobe.position.y = 0.7;
    elderGroup.add(elderRobe);

    // Head
    const elderHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      elderSkinMat
    );
    elderHead.position.y = 1.55;
    elderGroup.add(elderHead);

    // Conical Straw Hat
    const strawHat = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 0.25, 10),
      strawMat
    );
    strawHat.position.y = 1.78;
    strawHat.rotation.x = -0.1;
    elderGroup.add(strawHat);

    // Long white beard
    const beard = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.45, 4),
      beardMat
    );
    beard.position.set(0, 1.35, 0.18);
    beard.rotation.x = -0.3;
    elderGroup.add(beard);

    // Bamboo fishing rod held in hand
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.5 });
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.04, 3.2, 5),
      rodMat
    );
    rod.position.set(0.45, 1.2, 0.6);
    rod.rotation.x = 0.8;
    rod.rotation.z = -0.2;
    elderGroup.add(rod);

    // Elder's brass lantern on post
    const lanternPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 1.8, 5),
      robeMat
    );
    lanternPost.position.set(-0.6, 0.9, 0);
    elderGroup.add(lanternPost);

    const elderLanternLight = new THREE.PointLight(0xfbbf24, 1.2, 8);
    elderLanternLight.position.set(-0.6, 1.7, 0.2);
    elderGroup.add(elderLanternLight);

    villageGroup.add(elderGroup);
    props.elderMinMesh = elderGroup;

    // Register interaction collider for Elder Min
    collisions.addCollider({
      id: "npc_elder_min",
      type: "cylinder",
      position: new THREE.Vector3(745, 4.0, 442),
      radius: 2.8,
      height: 3.0,
      walkable: false,
    });

    // ── 7. Volcanic Caldera Mountain Backdrop (Rising to Y = 68m behind the outpost) ──
    const volcanoGeo = new THREE.ConeGeometry(68, 72, 28, 6);
    const vPos = volcanoGeo.attributes.position;
    for (let i = 0; i < vPos.count; i++) {
      const vx = vPos.getX(i);
      const vy = vPos.getY(i);
      const vz = vPos.getZ(i);
      const theta = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const hNorm = THREE.MathUtils.clamp((vy + 36) / 72, 0, 1);
      const noise = Math.sin(theta * 4) * 6.5 + Math.cos(theta * 6) * 3.5;
      vPos.setX(i, Math.cos(theta) * (dist + noise * (1.0 - hNorm * 0.6)));
      vPos.setZ(i, Math.sin(theta) * (dist + noise * (1.0 - hNorm * 0.6)));
    }
    volcanoGeo.computeVertexNormals();

    const volcanoMat = new THREE.MeshStandardMaterial({
      color: 0x22262e, // Dark basaltic volcanic rock
      roughness: 0.9,
      metalness: 0.1,
    });
    const volcanoMesh = new THREE.Mesh(volcanoGeo, volcanoMat);
    volcanoMesh.position.set(35, 30, 25);
    volcanoMesh.castShadow = false;
    volcanoMesh.receiveShadow = true;
    villageGroup.add(volcanoMesh);

    scene.add(villageGroup);

    // ── 8. High-Altitude Circling Ashscale Wyvern (Patrolling above the Volcanic Caldera) ──
    // Visible from 1,500m across the ocean! Solves "why dragon not circling above like before"
    const circlingDragon = new THREE.Group();
    circlingDragon.name = "OutpostCirclingWyvern";

    const dragonScaleMat = new THREE.MeshStandardMaterial({
      color: 0x141419, // Obsidian scales
      roughness: 0.75,
      metalness: 0.2,
    });
    const dragonCrimsonMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Crimson dorsal spines & wing accents
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.4,
      roughness: 0.6,
    });
    const dragonEyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });

    // Torso
    const dTorsoGeo = new THREE.CylinderGeometry(0.7, 1.25, 4.8, 8);
    dTorsoGeo.rotateX(Math.PI / 2);
    const dTorso = new THREE.Mesh(dTorsoGeo, dragonScaleMat);
    circlingDragon.add(dTorso);

    // Head and neck
    const dNeckGeo = new THREE.CylinderGeometry(0.45, 0.7, 2.0, 6);
    dNeckGeo.rotateX(Math.PI / 3);
    const dNeck = new THREE.Mesh(dNeckGeo, dragonScaleMat);
    dNeck.position.set(0, 0.8, -2.6);
    circlingDragon.add(dNeck);

    const dHeadGeo = new THREE.ConeGeometry(0.75, 2.2, 6);
    dHeadGeo.rotateX(-Math.PI / 2);
    const dHead = new THREE.Mesh(dHeadGeo, dragonScaleMat);
    dHead.position.set(0, 1.4, -3.8);
    circlingDragon.add(dHead);

    // Glowing draconic eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), dragonEyeMat);
    eyeL.position.set(-0.35, 1.6, -3.6);
    circlingDragon.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), dragonEyeMat);
    eyeR.position.set(0.35, 1.6, -3.6);
    circlingDragon.add(eyeR);

    // Left Wing Root & Membrane (Wingspan ~16m)
    const leftWingRoot = new THREE.Group();
    leftWingRoot.position.set(-0.8, 0.4, -0.6);
    const lMainSpar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 4.2, 6), dragonScaleMat);
    lMainSpar.position.set(-2.0, 0, 0);
    lMainSpar.rotation.z = Math.PI / 2;
    leftWingRoot.add(lMainSpar);
    const lMembraneGeo = new THREE.PlaneGeometry(5.2, 3.2);
    lMembraneGeo.rotateX(-Math.PI / 2);
    const lMembrane = new THREE.Mesh(lMembraneGeo, new THREE.MeshStandardMaterial({
      color: 0x450a0a,
      emissive: 0x2d0606,
      side: THREE.DoubleSide,
      roughness: 0.7,
    }));
    lMembrane.position.set(-2.5, 0, 1.2);
    leftWingRoot.add(lMembrane);
    circlingDragon.add(leftWingRoot);

    // Right Wing Root & Membrane
    const rightWingRoot = new THREE.Group();
    rightWingRoot.position.set(0.8, 0.4, -0.6);
    const rMainSpar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 4.2, 6), dragonScaleMat);
    rMainSpar.position.set(2.0, 0, 0);
    rMainSpar.rotation.z = -Math.PI / 2;
    rightWingRoot.add(rMainSpar);
    const rMembraneGeo = new THREE.PlaneGeometry(5.2, 3.2);
    rMembraneGeo.rotateX(-Math.PI / 2);
    const rMembrane = new THREE.Mesh(rMembraneGeo, new THREE.MeshStandardMaterial({
      color: 0x450a0a,
      emissive: 0x2d0606,
      side: THREE.DoubleSide,
      roughness: 0.7,
    }));
    rMembrane.position.set(2.5, 0, 1.2);
    rightWingRoot.add(rMembrane);
    circlingDragon.add(rightWingRoot);

    // Long Serpentine Tail
    const dTailGeo = new THREE.ConeGeometry(0.42, 4.8, 6);
    dTailGeo.rotateX(Math.PI / 2);
    const dTail = new THREE.Mesh(dTailGeo, dragonScaleMat);
    dTail.position.set(0, 0.1, 4.2);
    circlingDragon.add(dTail);

    circlingDragon.position.set(750, 95, 450);
    circlingDragon.scale.set(1.4, 1.4, 1.4);
    circlingDragon.userData = {
      leftWing: leftWingRoot,
      rightWing: rightWingRoot,
    };
    scene.add(circlingDragon);
    props.outpostCirclingDragon = circlingDragon;
  }

  // ════════════════════════════════════════════════════
  // 4. DISTANT ISLAND SILHOUETTES (Organic Single Landmasses — Zero Stacked Cones)
  // ════════════════════════════════════════════════════
  private static buildDistantIslands(
    scene: THREE.Scene,
    props: OceanDynamicProps
  ): void {
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.9,
      metalness: 0.1,
    });

    // 8 distant major islands at various directions
    const islandDefs = [
      { angle: 0.3, dist: 800, height: 45, radius: 35 },       // NE — Ashscale Outpost
      { angle: 1.2, dist: 1200, height: 60, radius: 40 },      // E — Scattered Reef
      { angle: 2.1, dist: 1800, height: 80, radius: 50 },      // SE — Sunken Library
      { angle: 3.0, dist: 2200, height: 55, radius: 35 },      // S — Chained Isles
      { angle: 3.9, dist: 2800, height: 100, radius: 60 },     // SW — Volcanic Foundry
      { angle: 4.5, dist: 1500, height: 40, radius: 30 },      // W — Small fishing island
      { angle: 5.2, dist: 3500, height: 120, radius: 70 },     // NW — Black Spire (distant)
      { angle: 5.8, dist: 600, height: 25, radius: 20 },       // N — Close small island
    ];

    islandDefs.forEach((def, i) => {
      // Single continuous naturally displaced island geometry — NO stacked caps!
      const islandGeo = new THREE.ConeGeometry(def.radius, def.height, 16, 6);
      const pos = islandGeo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const vx = pos.getX(v);
        const vy = pos.getY(v);
        const vz = pos.getZ(v);
        const theta = Math.atan2(vz, vx);
        const dist = Math.sqrt(vx * vx + vz * vz);
        const hNorm = (vy + def.height / 2) / def.height;
        const noise = Math.sin(theta * 3) * (def.radius * 0.12) + Math.cos(theta * 5) * (def.radius * 0.08);
        pos.setX(v, Math.cos(theta) * (dist + noise * (1.0 - hNorm * 0.5)));
        pos.setZ(v, Math.sin(theta) * (dist + noise * (1.0 - hNorm * 0.5)));
      }
      islandGeo.computeVertexNormals();

      const island = new THREE.Mesh(islandGeo, islandMat);
      island.position.set(
        Math.cos(def.angle) * def.dist,
        def.height * 0.35,
        Math.sin(def.angle) * def.dist
      );
      island.castShadow = false;
      island.receiveShadow = false;
      island.name = `DistantIsland_${i}`;
      scene.add(island);
    });
  }

  private static readonly _dayDeep = new THREE.Color(0x0a3d62);
  private static readonly _nightDeep = new THREE.Color(0x050f21);
  private static readonly _dayShallow = new THREE.Color(0x1abc9c);
  private static readonly _nightShallow = new THREE.Color(0x0e2a47);
  private static readonly _dayFoam = new THREE.Color(0xe8f4f8);
  private static readonly _nightFoam = new THREE.Color(0x9fc0db);

  /**
   * Update ocean shader time uniform and celestial day/night uniforms.
   * Also animates the high-altitude circling dragon over the Volcanic Outpost.
   * Called every frame from GameEngine.
   */
  public static updateOcean(
    props: OceanDynamicProps,
    time: number,
    sunDir?: THREE.Vector3,
    sunAltitude: number = 1.0
  ): void {
    if (props.oceanMaterial) {
      props.oceanMaterial.uniforms.uTime.value = time;
      if (sunDir) {
        props.oceanMaterial.uniforms.uSunDirection.value.copy(sunDir);
      }
      props.oceanMaterial.uniforms.uDeepColor.value.lerpColors(this._nightDeep, this._dayDeep, sunAltitude);
      props.oceanMaterial.uniforms.uShallowColor.value.lerpColors(this._nightShallow, this._dayShallow, sunAltitude);
      props.oceanMaterial.uniforms.uFoamColor.value.lerpColors(this._nightFoam, this._dayFoam, sunAltitude);
      props.oceanMaterial.uniforms.uSunIntensity.value = THREE.MathUtils.lerp(0.35, 1.0, sunAltitude);
    }

    // ── High-Altitude Circling Ashscale Wyvern Patrol Animation ──
    if (props.outpostCirclingDragon) {
      const dragon = props.outpostCirclingDragon;
      const orbitSpeed = 0.34;
      const orbitRadius = 66.0;
      const angle = time * orbitSpeed;
      const cx = 750 + Math.cos(angle) * orbitRadius;
      const cz = 450 + Math.sin(angle) * orbitRadius;
      const cy = 94.0 + Math.sin(time * 0.75) * 4.2;
      dragon.position.set(cx, cy, cz);

      // Look tangent to flight path
      const fwdX = -Math.sin(angle);
      const fwdZ = Math.cos(angle);
      dragon.lookAt(cx + fwdX, cy, cz + fwdZ);
      dragon.rotation.z = 0.32; // Inward bank on the turn

      // Smooth rhythmic wing flapping
      const flap = Math.sin(time * 5.8) * 0.42;
      if (dragon.userData.leftWing) dragon.userData.leftWing.rotation.z = -flap;
      if (dragon.userData.rightWing) dragon.userData.rightWing.rotation.z = flap;
    }
  }
}
