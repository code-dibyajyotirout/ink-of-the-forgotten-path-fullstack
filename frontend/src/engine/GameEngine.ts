/**
 * GameEngine — Master orchestrator for the game loop.
 * Initializes Three.js, the monochrome pipeline, input, and the demo scene.
 * Manages player controller, static obstacles, NPCs, and Enemy AI/Boss updates.
 */
import * as THREE from "three";
import { Clock } from "./core/Clock";
import { InputManager, GameAction } from "./input/InputManager";
import { CameraController } from "./rendering/CameraController";
import { MonochromePostProcess } from "./rendering/MonochromePostProcess";
import { InkParticleSystem } from "./rendering/InkParticleSystem";
import { InkSlashManager } from "./rendering/InkSlashMesh";
import { PlayerController } from "./combat/PlayerController";
import { EnemyAI, EnemyDef } from "./combat/EnemyAI";
import { HollowWindBoss } from "./combat/HollowWindBoss";
import { RustedEmperorBoss } from "./combat/RustedEmperorBoss";
import { FalseSaintBoss } from "./combat/FalseSaintBoss";
import { CrimsonBloomBoss } from "./combat/CrimsonBloomBoss";
import { ForgottenPathBoss } from "./combat/ForgottenPathBoss";
import { KorrathBoss } from "./combat/KorrathBoss";
import { CollisionSystem } from "./physics/CollisionSystem";
import { saveManager } from "@/systems/SaveManager";
import { useGameStore } from "@/stores/gameStore";
import { audioManager } from "./audio/AudioManager";
import { SparringDummy } from "./combat/SparringDummy";
import { PROFESSIONS, ProfessionId } from "@/data/professions";
import { MythicCharacterModel, MythicCharacterParts } from "./rendering/MythicCharacterModel";
import { MythicUniverseBuilder, UniverseDynamicProps } from "./world/MythicUniverseBuilder";
import { GLTFWorldLoader } from "./world/GLTFWorldLoader";
import { DragonMount } from "./world/DragonMount";
import { WindSlipstreamSystem } from "./world/WindSlipstreamSystem";
import type { AnimatedNPC } from "./rendering/MythicNPCModels";
import { OceanWorldBuilder, OceanDynamicProps } from "./world/OceanWorldBuilder";
import { DayNightCycle } from "./world/DayNightCycle";
import { DragonCombat } from "./combat/DragonCombat";
import { DragonBeamWeapon } from "./combat/DragonBeamWeapon";
import { ZoneManager } from "./world/ZoneManager";
import { PrologueSequence } from "./world/PrologueSequence";
import { ChunkManager } from "./world/ChunkManager";
import { CinematicIntro } from "./world/CinematicIntro";

// Pre-allocated scratch objects (zero per-frame GC)
const _scratchCamDir = new THREE.Vector3();
const _scratchDefaultFwd = new THREE.Vector3(0, 0, -1);
const _scratchDefaultEuler = new THREE.Euler();
const _scratchAttackToEnemy = new THREE.Vector3();
const _scratchForwardDir = new THREE.Vector3();
const _scratchBossCheckPos = new THREE.Vector3(750, 4, 450);
const _scratchDummyDist = new THREE.Vector2();

export class GameEngine {
  // Three.js core
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;

  // Engine systems
  clock: Clock;
  input!: InputManager;
  cameraController!: CameraController;
  postProcess!: MonochromePostProcess;
  inkParticles!: InkParticleSystem;
  slashManager!: InkSlashManager;
  collisions: CollisionSystem;
  windSlipstream!: WindSlipstreamSystem;
  dragonMount!: DragonMount;
  dayNightCycle!: DayNightCycle;
  prologueSequence!: PrologueSequence;
  cinematicIntro!: CinematicIntro;

  // Player and combat systems
  playerController!: PlayerController;
  private playerGroup!: THREE.Group;
  private mythicPlayerParts!: MythicCharacterParts;
  private templeBraziers: { mesh: THREE.Group; light: THREE.PointLight; baseIntensity: number }[] = [];
  private enemies: EnemyAI[] = [];
  private boss: HollowWindBoss | RustedEmperorBoss | FalseSaintBoss | CrimsonBloomBoss | ForgottenPathBoss | KorrathBoss | null = null;
  private sparringDummy: SparringDummy | null = null;

  // Mythic Universe & Animated Characters
  private universeProps: UniverseDynamicProps | null = null;
  private animatedNPCs: AnimatedNPC[] = [];

  // Ocean World (Dragon Rider: Drowned Epoch)
  private oceanProps: OceanDynamicProps | null = null;
  private isOceanWorld: boolean = false;
  private dragonCombat!: DragonCombat;
  private dragonBeamWeapon!: DragonBeamWeapon;
  private hemiLight?: THREE.HemisphereLight;
  private zoneManager?: ZoneManager;
  private chunkManager?: ChunkManager;

  // Aerial combat state
  private aerialLockOnTarget: THREE.Object3D | null = null;
  private isLockOnActive: boolean = false;
  private resizeObserver: ResizeObserver | null = null;
  private handleWindowResize = (): void => {
    this.onResize();
    // Multi-frame debounces for asynchronous browser maximize / restore transitions
    requestAnimationFrame(() => this.onResize());
    setTimeout(() => this.onResize(), 60);
    setTimeout(() => this.onResize(), 180);
    setTimeout(() => this.onResize(), 350);
  };

  // NPC and Interaction markers
  private npcXuMesh!: THREE.Group;
  private readonly xuPosition = new THREE.Vector3(4, 0, 8);
  private npcBaekMesh: THREE.Group | null = null;
  private readonly baekPosition = new THREE.Vector3(-8, 0, 4);
  private npcMaeMesh: THREE.Group | null = null;
  private readonly maePosition = new THREE.Vector3(8, 0, -4);
  private npcShenMesh: THREE.Group | null = null;
  private readonly shenPosition = new THREE.Vector3(16, 0, -4);
  private npcKaelenMesh: THREE.Group | null = null;
  private readonly kaelenPosition = new THREE.Vector3(-14, 0, 11);
  private readonly shrinePosition = new THREE.Vector3(0, 0, 15);
  private readonly riftPosition = new THREE.Vector3(-10, 0, -12);
  private riftMesh: THREE.Group | null = null;
  private domainWave: number = 0;
  private isTrialActive: boolean = false;
  private preDomainChapter: number = 1;

  // Ambient & environment timers
  private ambientTimer: number = 0;
  private timeDilation: number = 1.0;
  private timeDilationTimer: number = 0;

  // State
  private running: boolean = false;
  private animFrameId: number = 0;
  private canvas: HTMLCanvasElement | null = null;
  private lastAiming: boolean = false;
  private playtimeAccumulator: number = 0;

  // UI Throttling / React Render Protection
  private lastExecEnemyId: string | null = null;
  private lastTargetEnemyId: string | null = null;
  private lastTargetHp: number = -1;
  private lastTargetStun: number = -1;
  private lastTargetStatus: string = "";
  private targetScanTimer: number = 0;

  constructor() {
    this.clock = new Clock();
    this.collisions = new CollisionSystem();
  }

  /**
   * Initialize the engine with a canvas element.
   */
  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const width = Math.max(window.innerWidth || 0, canvas.parentElement?.clientWidth || 0, canvas.clientWidth || 0) || 1280;
    const height = Math.max(window.innerHeight || 0, canvas.parentElement?.clientHeight || 0, canvas.clientHeight || 0) || 720;

    // WebGL Renderer - High-Performance Pipeline
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setClearColor(0x93c5fd, 1);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x93c5fd);

    // Camera (0.6m near plane with 24-bit hardware depth buffer provides crystal-clear precision & hardware early-Z)
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.6, 4500);

    // Initial Systems Setup
    this.input = new InputManager(canvas);
    this.cameraController = new CameraController(this.camera, {
      distance: 9,
      heightOffset: 2.3,
    });
    const initialStoreSettings = useGameStore.getState().settings;
    this.postProcess = new MonochromePostProcess(this.renderer, width, height, {
      pixelSize: 1,
      ditherStrength: 0.0,
      threshold: 0.5,
      edgeStrength: 0.8,
      fogNear: 35,
      fogFar: 180,
      fogToWhite: false,
      ditherEnabled: false,
      edgesEnabled: true,
      inkMode: 0,
    });
    this.inkParticles = new InkParticleSystem(this.scene);
    this.slashManager = new InkSlashManager(this.scene);

    // 1. Build Player Group and mesh
    this.playerGroup = new THREE.Group();
    this.buildPlayerMesh();
    this.scene.add(this.playerGroup);

    // Setup character controller with sculpted mythic parts
    this.playerController = new PlayerController(
      this.playerGroup,
      this.inkParticles,
      this.cameraController,
      this.collisions,
      this.slashManager,
      this.mythicPlayerParts
    );

    // ─── Initialize Wind Slipstreams & Dragon Mount (Reference Video 1 & 2) ───
    this.windSlipstream = new WindSlipstreamSystem(this.scene, this.inkParticles);
    this.dragonMount = new DragonMount(this.scene, this.inkParticles);
    this.playerController.setFlightSystems(this.dragonMount, this.windSlipstream);

    // 2. Build the Dragon Rider: Drowned Epoch ocean world
    this.buildOceanWorld();

    // Handle viewport resize across all events (minimize, restore, fullscreen, window snap)
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(canvas);
    if (canvas.parentElement) {
      this.resizeObserver.observe(canvas.parentElement);
    }
    window.addEventListener("resize", this.handleWindowResize);
    window.addEventListener("orientationchange", this.handleWindowResize);
    document.addEventListener("fullscreenchange", this.handleWindowResize);
    document.addEventListener("webkitfullscreenchange", this.handleWindowResize as EventListener);

    // Listen to dialogue choice clicks from UI
    window.addEventListener("gameDialogueChoice", this.onDialogueChoice as EventListener);

    // Listen to virtual input actions
    window.addEventListener("gameVirtualAction", this.onVirtualAction as EventListener);

    // Apply visual filters based on unlocked ending
    this.applyEndingFilter();

    // Mark loaded in store
    useGameStore.getState().setLoaded(true);
  }

  /**
   * Build the Dragon Rider: Drowned Epoch ocean world.
   * Replaces all legacy chapter scenes with the new open ocean world.
   */
  private buildOceanWorld(): void {
    this.isOceanWorld = true;

    // ─── Day/Night Cycle (starts at sunrise — peaceful awakening) ───
    this.dayNightCycle = new DayNightCycle(this.scene);
    const startHour = useGameStore.getState().settings.timeOfDay ?? 6.0;
    this.dayNightCycle.setTime(startHour, 1, this.camera);

    // ─── Full Color Renderer Settings ───
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.setClearColor(0x87ceeb, 1); // Clear sky blue

    // ─── Build the Ocean World ───
    this.oceanProps = OceanWorldBuilder.build(this.scene, this.collisions);

    // ─── Initial fog ───
    const fogParams = this.dayNightCycle.getFogParams();
    this.scene.fog = new THREE.Fog(fogParams.color, fogParams.near, fogParams.far);

    // ─── Player Start Position: Grand Open Dragon Pavilion on 120m Summit ───
    this.playerGroup.position.set(-12, 120.50, 4.0);
    this.playerGroup.rotation.set(0, 0, 0);
    this.playerGroup.quaternion.set(0, 0, 0, 1);

    // ─── Veyros (Dragon Mount) resting on Grand Pavilion Roost Bedding ───
    this.dragonMount.mesh.position.set(1.5, 121.75, 4.0);
    this.dragonMount.mesh.rotation.set(0, -Math.PI * 0.5, 0);
    this.dragonMount.mesh.visible = true; // Visible and ready to mount

    // ─── Hemisphere light for ocean ambience ───
    this.hemiLight = new THREE.HemisphereLight(
      0x87ceeb, // Sky blue
      0x1a7a4c, // Ground green
      0.35
    );
    this.scene.add(this.hemiLight);

    // ─── Dragon Combat System ───
    this.dragonCombat = new DragonCombat(this.scene, this.inkParticles);
    this.dragonBeamWeapon = new DragonBeamWeapon(this.scene, this.inkParticles, this.cameraController);

    // ─── Camera Start: Gaze East toward the rising sun and ocean horizon ───
    this.cameraController.setAngles(-Math.PI / 2, 1.35);
    this.cameraController.setTarget(this.playerGroup.position);

    // ─── Distance-Based Difficulty & Zone Ecosystem ───
    this.zoneManager = new ZoneManager(
      this.scene,
      this.inkParticles,
      this.playerGroup,
      this.playerController,
      this.enemies
    );

    // (OceanLife removed — highland world has no sea creatures)

    // ─── Procedural Chunk Streaming System (600m x 600m Chunks) ───
    this.chunkManager = new ChunkManager(this.scene, this.collisions);

    // ─── Dynamic Layered BGM System (Peaceful Dawn Theme) ───
    // Defer BGM start to the first user interaction so AudioContext gets unlocked
    const startBGMOnInteraction = () => {
      audioManager.startBGM("peaceful");
      window.removeEventListener("click", startBGMOnInteraction);
      window.removeEventListener("keydown", startBGMOnInteraction);
      window.removeEventListener("touchstart", startBGMOnInteraction);
    };
    window.addEventListener("click", startBGMOnInteraction, { once: false });
    window.addEventListener("keydown", startBGMOnInteraction, { once: false });
    window.addEventListener("touchstart", startBGMOnInteraction, { once: false });

    // ─── Prologue Sequence System ───
    this.prologueSequence = new PrologueSequence(
      this.scene,
      this.camera,
      this.cameraController,
      this.playerGroup,
      this.playerController,
      this.dragonMount,
      this.oceanProps,
      this.inkParticles
    );

    // ─── Cinematic Intro Sequence System (available on demand, no auto-start) ───
    this.cinematicIntro = new CinematicIntro(
      this.scene,
      this.camera,
      this.cameraController,
      this.playerGroup,
      this.playerController,
      this.dragonMount,
      this.inkParticles,
      {
        cliffTopPosition: new THREE.Vector3(-6, 120.50, 4),
        lookDirection: new THREE.Vector3(1, 0, 0), // Face east toward sunrise
        cliffHeight: 122,
      }
    );
  }

  /**
   * Build environment terrain and static prop colliders.
   */
  private buildDemoScene(): void {
    // ─── Build Mythic Martial Universe Architecture ───
    this.universeProps = MythicUniverseBuilder.build(this.scene, this.collisions);

    // ─── Load Open-Source 3D World Models, Statues & Custom GLBs ───
    GLTFWorldLoader.load(this.scene, this.collisions).catch((err) => {
      console.warn("GLTFWorldLoader load notice:", err);
    });

    // Sync braziers into templeBraziers for dynamic fire flicker
    if (this.universeProps.braziers) {
      this.templeBraziers.push(...this.universeProps.braziers);
    }

    // Reset player position firmly grounded on the island surface (Y = 4.3)
    // Note: MythicCharacterModel root already has Math.PI to align model facing to -Z
    this.playerGroup.position.set(0, 4.3, 6);
    this.playerGroup.rotation.y = 0;

    // Meditation shrine (save point) placed in sacred southern courtyard
    this.createMeditationShrine(this.shrinePosition.x, this.shrinePosition.z);
    this.collisions.addCollider({
      id: "shrine",
      type: "cylinder",
      position: this.shrinePosition,
      radius: 1.4,
      height: 3,
    });

    // Spawn Ink Rift
    this.createInkRift(this.riftPosition.x, this.riftPosition.z);
    this.collisions.addCollider({
      id: "ink_rift",
      type: "cylinder",
      position: this.riftPosition,
      radius: 1.5,
      height: 3,
    });

    // Spawn Sparring Dummy (Automaton) in the Eastern Martial Pavilion
    this.sparringDummy = new SparringDummy("training_automaton", new THREE.Vector3(20, 0.85, -6), this.scene, this.inkParticles);
    this.collisions.addCollider({
      id: "sparring_dummy",
      type: "cylinder",
      position: new THREE.Vector3(20, 0.85, -6),
      radius: 0.9,
      height: 2.4,
    });

    // Spawn fully sculpted martial NPCs
    this.spawnMartialNPCs();
  }

  private spawnMartialNPCs(): void {
    // Martial NPCs removed per request
    this.animatedNPCs = [];
  }

  private buildPlayerMesh(): void {
    this.mythicPlayerParts = MythicCharacterModel.build();
    this.playerGroup.add(this.mythicPlayerParts.group);
    this.playerGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = false; // Prevents hat and limbs from casting pitch-black self-shadows on the face and body
      }
    });
  }

  /**
   * Generate a canvas-based ink face texture for the player character.
   * Draws eyes, eyebrows, nose, and mouth in a stylized brush-stroke look.
   */
  private createFaceTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Base face color
    ctx.fillStyle = "#888888";
    ctx.fillRect(0, 0, size, size);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // ── Eyebrows (thick angular brush strokes) ──
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 4;
    // Left eyebrow (angled down-inward for intense look)
    ctx.beginPath();
    ctx.moveTo(22, 38);
    ctx.lineTo(46, 34);
    ctx.stroke();
    // Right eyebrow
    ctx.beginPath();
    ctx.moveTo(82, 34);
    ctx.lineTo(106, 38);
    ctx.stroke();

    // ── Eyes (bold ink dots with sharp corners) ──
    ctx.fillStyle = "#000000";
    // Left eye — small rectangle with pupil
    ctx.fillRect(28, 44, 18, 8);
    // Pupil
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(36, 45, 5, 6);
    ctx.fillStyle = "#000000";
    ctx.fillRect(38, 46, 3, 4);

    // Right eye
    ctx.fillRect(82, 44, 18, 8);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(86, 45, 5, 6);
    ctx.fillStyle = "#000000";
    ctx.fillRect(88, 46, 3, 4);

    // ── Nose (subtle vertical stroke) ──
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 54);
    ctx.lineTo(64, 68);
    ctx.lineTo(60, 70);
    ctx.stroke();

    // ── Mouth (firm line with slight curve) ──
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(44, 84);
    ctx.quadraticCurveTo(64, 90, 84, 84);
    ctx.stroke();

    // ── Battle scar (optional diagonal mark on cheek) ──
    ctx.strokeStyle = "#444444";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(85, 60);
    ctx.lineTo(100, 75);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  private createBambooTree(x: number, z: number): void {
    const height = 3 + Math.random() * 5;
    const segments = Math.floor(height / 1.5);

    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, height, 5, segments);
    const trunkPos = trunkGeo.getAttribute("position");
    for (let i = 0; i < trunkPos.count; i++) {
      const y = trunkPos.getY(i);
      const bendFactor = (y / height) * (y / height);
      trunkPos.setX(i, trunkPos.getX(i) + bendFactor * (Math.random() - 0.5) * 0.5);
    }
    trunkGeo.computeVertexNormals();

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x22c55e, flatShading: true });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, height / 2 - 0.5, z);
    this.scene.add(trunk);

    const leafGeo = new THREE.IcosahedronGeometry(0.8 + Math.random() * 0.4, 0);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(x, height - 0.5, z);
    leaf.scale.set(1, 0.6, 1);
    this.scene.add(leaf);
  }

  private createRock(x: number, z: number): void {
    const geo = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.8, 0);
    const pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.15);
      pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * 0.15);
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.15);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, 0, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.scale.y *= 0.6;
    this.scene.add(rock);
  }

  private createInkRift(x: number, z: number): void {
    if (this.riftMesh) {
      this.scene.remove(this.riftMesh);
    }

    const group = new THREE.Group();

    // Portal ring geometry using a Torus
    const ringGeo = new THREE.TorusGeometry(1.2, 0.1, 8, 32);
    // Dark ink brush aesthetic
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.y = Math.PI / 2;
    group.add(ring2);

    // Core floating ink droplet
    const coreGeo = new THREE.DodecahedronGeometry(0.3, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x222222,
      wireframe: true,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0;
    group.add(core);

    group.position.set(x, 1.2, z);
    this.scene.add(group);
    this.riftMesh = group;
  }

  private buildSecretDomain(): void {
    // ─── Lighting ──────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(-5, 12, -5);
    this.scene.add(directionalLight);

    // Ground plane (dark slate hexagonal arena)
    const groundGeo = new THREE.CylinderGeometry(25, 26, 1, 6);
    const groundMat = new THREE.MeshLambertMaterial({
      color: 0x1a1a1a,
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.5;
    this.scene.add(ground);

    // Reset player position to center of arena floor
    this.playerGroup.position.set(0, 4.3, 0);

    // Boundary colliders (6 side walls of the hexagon)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const wallPos = new THREE.Vector3(Math.cos(angle) * 25, 0, Math.sin(angle) * 25);

      // Decorative portal pillars
      const pillarGeo = new THREE.BoxGeometry(2, 8, 2);
      const pillarMat = new THREE.MeshLambertMaterial({ color: 0x111111, flatShading: true });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.copy(wallPos);
      this.scene.add(pillar);

      this.collisions.addCollider({
        id: `arena_wall_${i}`,
        type: "cylinder",
        position: wallPos,
        radius: 2.0,
        height: 10,
      });
    }

    // Portal to return to Murim (placed behind player starting position)
    const returnPos = new THREE.Vector3(0, 0, 10);
    this.createInkRift(returnPos.x, returnPos.z);
    this.collisions.addCollider({
      id: "ink_rift",
      type: "cylinder",
      position: returnPos,
      radius: 1.5,
      height: 3,
    });

    // Trial activation shrine in center
    const trialShrinePos = new THREE.Vector3(0, 0, -6);
    this.createMeditationShrine(trialShrinePos.x, trialShrinePos.z);
    this.collisions.addCollider({
      id: "shrine",
      type: "cylinder",
      position: trialShrinePos,
      radius: 1.4,
      height: 3,
    });
  }

  private startSecretDomainTrial(): void {
    this.isTrialActive = true;
    this.domainWave = 1;
    this.spawnDomainWave();
  }

  private spawnDomainWave(): void {
    const store = useGameStore.getState();
    store.triggerDialogue(
      "Trial Domain",
      `Wave ${this.domainWave} of the Trial begins! Defeat the incoming shadow projections.`
    );

    // Clear any remaining enemies
    this.enemies.forEach((enemy) => this.scene.remove(enemy.mesh));
    this.enemies = [];

    // Spawn elites based on wave
    const waveCount = this.domainWave;
    for (let i = 0; i < waveCount + 1; i++) {
      const angle = (i / (waveCount + 1)) * Math.PI * 2;
      const spawnPos = new THREE.Vector3(Math.cos(angle) * 12, 0, Math.sin(angle) * 12);

      const gruntDef: EnemyDef = {
        id: `wave_${this.domainWave}_enemy_${i}`,
        type: "grunt",
        position: spawnPos,
        health: 50 + this.domainWave * 15,
        maxHealth: 50 + this.domainWave * 15,
        damage: 8 + this.domainWave * 2,
        speed: 2.8 + this.domainWave * 0.2,
        patrolPoints: [spawnPos, new THREE.Vector3(0, 0, 0)],
      };

      const enemy = new EnemyAI(gruntDef, this.scene, this.inkParticles, this.playerGroup, this.playerController);
      this.enemies.push(enemy);
    }
  }

  private createMeditationShrine(x: number, z: number): void {
    const group = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(1.2, 1.5, 0.3, 6);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x666666, flatShading: true });
    const base = new THREE.Mesh(baseGeo, baseMat);
    group.add(base);

    const stoneGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 5);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x444444, flatShading: true });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.y = 0.9;
    group.add(stone);

    const topGeo = new THREE.OctahedronGeometry(0.25, 0);
    const topMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa, flatShading: true });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 1.85;
    group.add(top);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private createRuinedPillar(x: number, z: number): void {
    const height = 2 + Math.random() * 4;
    const geo = new THREE.CylinderGeometry(0.3, 0.4, height, 6);
    const pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > height * 0.3) {
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.1);
        pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.1);
      }
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ color: 0x888888, flatShading: true });
    const pillar = new THREE.Mesh(geo, mat);
    pillar.position.set(x, height / 2 - 0.5, z);
    pillar.rotation.z = (Math.random() - 0.5) * 0.15;
    this.scene.add(pillar);
  }

  /**
   * Spawn blind herbalist NPC (Old Xu - removed per request)
   */
  private spawnOldXuNPC(): void {
    // Herbalist NPC removed per request
  }

  /**
   * Spawn grunts and elites in the surrounding scene.
   */
  private spawnStartingEnemies(): void {
    const gruntDefs: EnemyDef[] = [
      // Bamboo Grove Ambush Patrol - right ahead on the path for high-speed multi-enemy cleaving!
      {
        id: "ambush_1",
        type: "grunt",
        position: new THREE.Vector3(2, 0, -8),
        health: 45,
        maxHealth: 45,
        damage: 25,
        speed: 3.2,
        patrolPoints: [new THREE.Vector3(2, 0, -8), new THREE.Vector3(3, 0, -5)],
      },
      {
        id: "ambush_2",
        type: "grunt",
        position: new THREE.Vector3(4, 0, -9),
        health: 45,
        maxHealth: 45,
        damage: 25,
        speed: 3.4,
        patrolPoints: [new THREE.Vector3(4, 0, -9), new THREE.Vector3(5, 0, -6)],
      },
      {
        id: "ambush_3",
        type: "grunt",
        position: new THREE.Vector3(0, 0, -10),
        health: 45,
        maxHealth: 45,
        damage: 25,
        speed: 3.1,
        patrolPoints: [new THREE.Vector3(0, 0, -10), new THREE.Vector3(1, 0, -6)],
      },
      {
        id: "ambush_4",
        type: "grunt",
        position: new THREE.Vector3(5, 0, -7),
        health: 45,
        maxHealth: 45,
        damage: 25,
        speed: 3.3,
        patrolPoints: [new THREE.Vector3(5, 0, -7), new THREE.Vector3(3, 0, -9)],
      },
      // Perimeter scouts
      {
        id: "g_1",
        type: "grunt",
        position: new THREE.Vector3(-18, 0, -18),
        health: 45,
        maxHealth: 45,
        damage: 25,
        speed: 3.0,
        patrolPoints: [new THREE.Vector3(-18, 0, -18), new THREE.Vector3(-24, 0, -15)],
      },
      {
        id: "g_2",
        type: "grunt",
        position: new THREE.Vector3(18, 0, -20),
        health: 45,
        maxHealth: 45,
        damage: 25,
        speed: 3.0,
        patrolPoints: [new THREE.Vector3(18, 0, -20), new THREE.Vector3(24, 0, -14)],
      },
      {
        id: "g_3",
        type: "grunt",
        position: new THREE.Vector3(-12, 0, 25),
        health: 45,
        maxHealth: 45,
        damage: 25,
        speed: 3.0,
        patrolPoints: [new THREE.Vector3(-12, 0, 25), new THREE.Vector3(-16, 0, 30)],
      },
    ];

    gruntDefs.forEach((def) => {
      const e = new EnemyAI(def, this.scene, this.inkParticles, this.playerGroup, this.playerController);
      this.enemies.push(e);
    });

    const eliteDef: EnemyDef = {
      id: "e_1",
      type: "elite",
      position: new THREE.Vector3(14, 0, 14),
      health: 140,
      maxHealth: 140,
      damage: 40,
      speed: 3.6,
      patrolPoints: [new THREE.Vector3(14, 0, 14), new THREE.Vector3(6, 0, 10), new THREE.Vector3(10, 0, 6)],
    };

    const elite = new EnemyAI(eliteDef, this.scene, this.inkParticles, this.playerGroup, this.playerController);
    this.enemies.push(elite);
  }

  /**
   * Start the loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.loop();
    // BGM is initialized by buildOceanWorld() — no legacy double-play
  }

  /**
   * Stop the loop.
   */
  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    audioManager.stopBGM();
  }

  /**
   * Core frame tick.
   */
  private loop = (): void => {
    if (!this.running) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const rawDt = this.clock.tick();
    const store = useGameStore.getState();
    if (store.ui.isPaused || store.ui.showDialogue) {
      // Clear input buffers and halt player and dragon flight movement
      this.input.clear();
      this.playerController?.stopMovement();
      if (this.dragonMount?.isMounted) {
        this.dragonMount.pauseFlight();
      }
      audioManager.setFlightWindSpeed(0);

      // Keep post-processing settings updated live (e.g. pixelSize, ditherStrength from Settings panel)
      this.postProcess.updateSettings({
        pixelSize: store.settings.pixelSize,
        ditherStrength: store.settings.ditherStrength,
      });

      // Render the current scene so the display does not freeze or black out
      if (this.isOceanWorld) {
        this.renderer.render(this.scene, this.camera);
      } else {
        this.postProcess.render(this.scene, this.camera, 0);
      }
      return;
    }

    // Normal gameplay execution: resume movement capabilities if previously paused
    this.playerController?.resumeMovement();

    // Pull hitFreeze from store
    if (store.ui.hitFreeze) {
      this.timeDilation = store.ui.hitFreeze.scale;
      this.timeDilationTimer = store.ui.hitFreeze.duration;
      useGameStore.setState((s) => {
        s.ui.hitFreeze = null;
      });
    }

    // Tick time dilation
    let dt = rawDt;
    if (this.timeDilationTimer > 0) {
      this.timeDilationTimer -= rawDt;
      dt = rawDt * this.timeDilation;
      if (this.timeDilationTimer <= 0) {
        this.timeDilation = 1.0;
      }
    }

    // 1. Inputs
    const input = this.input.poll();

    // 2. Character & Combat state machine
    const oldState = this.playerController.state;
    this.playerController.update(dt, input, this.enemies, this.boss);
    const newState = this.playerController.state;

    // Attack hit detection check — hit window matches visual swing arc
    const isAttackingState =
      newState.startsWith("attack_light") ||
      newState === "attack_heavy" ||
      newState === "attack_dash" ||
      newState === "attack_jump";
    const pc = this.playerController as any;
    
    // The active swing frame window: connects instantly with razor-sharp responsiveness
    if (isAttackingState && pc.stateTimer >= 0.02 && !pc.hasHitInCurrentAttack) {
      this.resolvePlayerAttacks();
      pc.hasHitInCurrentAttack = true;
    }

    // Tick sparring automaton in training area
    if (this.sparringDummy) {
      this.sparringDummy.update(dt);
    }

    // Trigger parry flash VFX on state transition to parry
    if (oldState !== "parry" && newState === "parry") {
      this.postProcess.triggerParryFlash();
    }

    // 3. Dialogue & Interaction distance checks
    this.updateInteractions(input);

    // 4. Enemy AI cycles
    this.enemies.forEach((enemy) => enemy.update(dt, this.camera));
    // Keep dead enemies during their death animation until cleaned from scene
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.state === "dead") {
        return enemy.mesh.parent !== null;
      }
      return true;
    });

    // 4b. Centralized Target HUD Scan (Throttled to prevent React re-render thrashing)
    this.targetScanTimer += dt;
    if (this.targetScanTimer >= 0.08) {
      this.targetScanTimer = 0;
      let bestTarget: EnemyAI | null = null;
      let bestDist = 16.0;

      for (const enemy of this.enemies) {
        if (enemy.state === "dead") continue;
        const dist = this.playerGroup.position.distanceTo(enemy.mesh.position);
        if (dist < bestDist) {
          bestDist = dist;
          bestTarget = enemy;
        }
      }

      if (bestTarget) {
        const hp = bestTarget.getHealth();
        const stun = bestTarget.stunMeter;
        const isFrozen = bestTarget.frozenTimer > 0;
        const isBurning = bestTarget.burnTimer > 0;
        const canExec = bestTarget.canBeExecuted || stun >= bestTarget.maxStunMeter;
        const statusKey = `${isFrozen}_${isBurning}_${canExec}`;

        const changed =
          this.lastTargetEnemyId !== bestTarget.def.id ||
          Math.abs(this.lastTargetHp - hp) >= 1.0 ||
          Math.abs(this.lastTargetStun - stun) >= 1.0 ||
          this.lastTargetStatus !== statusKey;

        if (changed) {
          this.lastTargetEnemyId = bestTarget.def.id;
          this.lastTargetHp = hp;
          this.lastTargetStun = stun;
          this.lastTargetStatus = statusKey;

          store.setTargetEnemy({
            name: bestTarget.def.type === "boss" ? "Ancient Dragon Fiend Yama" : bestTarget.def.type === "elite" ? "Corrupted Oni Executioner" : "Corrupted Fiend",
            type: bestTarget.def.type,
            hp,
            maxHp: bestTarget.def.maxHealth,
            stun,
            maxStun: bestTarget.maxStunMeter,
            isFrozen,
            isBurning,
            canExecute: canExec,
          });
        }
      } else if (this.lastTargetEnemyId !== null) {
        this.lastTargetEnemyId = null;
        this.lastTargetHp = -1;
        this.lastTargetStun = -1;
        this.lastTargetStatus = "";
        store.setTargetEnemy(null);
      }
    }

    // 4c. God of War Execution Target Scan (Guarded against per-frame React updates)
    let nearestExec: { id: string; pos: THREE.Vector3 } | null = null;
    let nearestExecDist = 6.0;
    for (const enemy of this.enemies) {
      if (enemy.state !== "dead" && (enemy.canBeExecuted || enemy.getHealth() <= enemy.def.maxHealth * 0.4)) {
        const dist = this.playerGroup.position.distanceTo(enemy.mesh.position);
        if (dist < nearestExecDist) {
          nearestExecDist = dist;
          nearestExec = { id: enemy.def.id, pos: enemy.mesh.position };
        }
      }
    }
    if (nearestExec) {
      if (this.lastExecEnemyId !== nearestExec.id) {
        this.lastExecEnemyId = nearestExec.id;
        store.setExecutionPrompt({
          enemyId: nearestExec.id,
          position: [nearestExec.pos.x, nearestExec.pos.y + 2.6, nearestExec.pos.z],
        });
      }
    } else if (this.lastExecEnemyId !== null) {
      this.lastExecEnemyId = null;
      store.setExecutionPrompt(null);
    }

    // Flicker Dragon Braziers
    const brazierTime = performance.now() * 0.005;
    for (let i = 0; i < this.templeBraziers.length; i++) {
      const b = this.templeBraziers[i];
      b.light.intensity = b.baseIntensity + Math.sin(brazierTime * 7 + i * 1.5) * 0.8 + (Math.random() - 0.5) * 0.3;
    }

    // Check for trial domain wave completion
    if (this.isTrialActive && this.enemies.length === 0) {
      if (this.domainWave < 3) {
        this.domainWave++;
        this.spawnDomainWave();
      } else {
        this.isTrialActive = false;
        this.domainWave = 0;
        store.shiftAlignment(15, 15);
        useGameStore.setState((s) => {
          s.player.qi.max += 20;
          s.player.qi.current = s.player.qi.max;
          s.player.health.max += 30;
          s.player.health.current = s.player.health.max;
        });
        store.triggerDialogue(
          "Trial Completed",
          "You have conquered the Trial of the Forgotten Path! The memory seals dissolve, permanently expanding your Meridian Core (+30 Max HP, +20 Max Qi). You may return to your world."
        );
      }
    }

    // ─── Act 1 Boss: Korrath Encounter Trigger & Boss Loop ───
    if (this.isOceanWorld && !this.boss && !store.world.defeatedBosses.includes("korrath")) {
      const distToOutpost = this.playerGroup.position.distanceTo(_scratchBossCheckPos);
      if (distToOutpost < 135.0) {
        if (this.oceanProps?.outpostCirclingDragon) {
          this.oceanProps.outpostCirclingDragon.visible = false;
        }
        this.boss = new KorrathBoss(this.scene, this.inkParticles, this.playerGroup, this.playerController);
        useGameStore.getState().setBattleBanner("BOSS ENCOUNTER: KORRATH THE BRANDED", 4.0);
        audioManager.playSFX("boss_defeat_impact");
      }
    }

    if (this.boss && (this.boss as any).state !== "dead") {
      (this.boss as any).update(dt, this.camera);
    }

    // 4c. Animate Mythic Universe Architecture & Animated Characters
    const timeSec = performance.now() * 0.001;
    for (let i = 0; i < this.animatedNPCs.length; i++) {
      this.animatedNPCs[i].update(dt, timeSec);
    }

    if (this.universeProps) {
      // Dynamic flickering lanterns
      for (let i = 0; i < this.universeProps.lanterns.length; i++) {
        const l = this.universeProps.lanterns[i];
        l.light.intensity = l.baseIntensity + Math.sin(timeSec * 5.0 + l.phase) * 0.6 + (Math.random() - 0.5) * 0.15;
        l.mesh.position.y = l.baseY + Math.sin(timeSec * 2.0 + l.phase) * 0.04;
      }
      // Floating ascending sky lanterns
      for (let i = 0; i < this.universeProps.skyLanterns.length; i++) {
        const sl = this.universeProps.skyLanterns[i];
        sl.mesh.position.y += sl.speed * dt;
        if (sl.mesh.position.y > 75) {
          sl.mesh.position.y = sl.startY;
        }
      }
      // Water gentle shimmer
      if (this.universeProps.waterMesh) {
        this.universeProps.waterMesh.rotation.z = Math.sin(timeSec * 0.5) * 0.02;
      }

      // Where Winds Meet: Swaying Emerald Bamboo Forest (dynamic wind flexure)
      if (this.universeProps.bambooStalks) {
        for (let b = 0; b < this.universeProps.bambooStalks.length; b++) {
          const bs = this.universeProps.bambooStalks[b];
          bs.group.rotation.z = Math.sin(timeSec * 1.6 + bs.phase) * (bs.flex * 0.05);
          bs.group.rotation.x = Math.cos(timeSec * 1.2 + bs.phase) * (bs.flex * 0.035);
        }
      }

      // Billowing Silk Banners
      if (this.universeProps.banners) {
        for (let bn = 0; bn < this.universeProps.banners.length; bn++) {
          this.universeProps.banners[bn].rotation.y = Math.sin(timeSec * 3.2 + bn) * 0.12;
        }
      }

      // Where Winds Meet multi-variety wind leaf & petal drift
      if (this.universeProps.floatingPetals) {
        const pos = this.universeProps.floatingPetals.geometry.attributes.position;
        const windX = Math.sin(timeSec * 0.8) * 1.5 + 0.8;
        const windZ = Math.cos(timeSec * 0.6) * 1.2 + 0.4;
        for (let i = 0; i < pos.count; i++) {
          let x = pos.getX(i) + (windX + Math.sin(timeSec * 1.5 + i * 0.3) * 0.6) * dt * 2.2;
          let y = pos.getY(i) - (0.65 + (i % 5) * 0.18) * dt;
          let z = pos.getZ(i) + (windZ + Math.cos(timeSec * 1.3 + i * 0.4) * 0.5) * dt * 1.8;
          if (y < 0.2 || x > 33 || x < -33 || z > 37 || z < -37) {
            y = 7.5 + Math.random() * 2.0;
            x = (Math.random() - 0.5) * 65;
            z = (Math.random() - 0.5) * 65;
          }
          pos.setX(i, x);
          pos.setY(i, y);
          pos.setZ(i, z);
        }
        pos.needsUpdate = true;
      }
    }

    // 5. Ambient particles
    this.ambientTimer += dt;
    if (this.ambientTimer > 0.3) {
      this.ambientTimer = 0;
      this.inkParticles.emitAmbient(this.playerGroup.position, 15, 2);
    }
    this.inkParticles.update(dt);
    if (this.slashManager) {
      this.slashManager.update(dt);
    }

    // 6. Camera Control & Precision Aim Mode
    const isAiming = input.held.has(GameAction.AIM) || input.held.has(GameAction.BLOCK);
    const isMounted = !!this.dragonMount?.isMounted;
    this.cameraController.setAiming(isAiming, isMounted);
    if (this.lastAiming !== isAiming) {
      this.lastAiming = isAiming;
      store.setIsAiming(isAiming);
    }

    // Handle FPV / POV View Mode Toggle [V]
    if (input.justPressed.has(GameAction.TOGGLE_VIEW)) {
      const isFPV = this.cameraController.toggleFirstPerson();
      if (this.mythicPlayerParts?.group) {
        this.mythicPlayerParts.group.visible = !isFPV;
      }
      store.setBattleBanner(
        isFPV ? "VIEW: FIRST-PERSON (FPV) [V]" : "VIEW: THIRD-PERSON (POV) [V]",
        1.5
      );
    }

    if (input.cameraAxis.x !== 0 || input.cameraAxis.y !== 0) {
      this.cameraController.rotate(input.cameraAxis.x, input.cameraAxis.y);
    }
    this.cameraController.setTarget(this.playerGroup.position, isMounted);
    this.cameraController.update(dt);

    // 7. Game loop saves, UI updates & timer increments
    this.playtimeAccumulator += dt;
    if (this.playtimeAccumulator >= 1.0) {
      store.incrementPlaytime(this.playtimeAccumulator);
      this.playtimeAccumulator = 0;
    }
    store.updateCombatUI(dt);
    saveManager.tick(dt);

    // ─── Day/Night Cycle + Ocean Animation ───
    if (this.isOceanWorld) {
      this.dayNightCycle.update(dt, this.camera);

      // Keep hemisphere light synchronized with time of day
      if (this.hemiLight) {
        this.dayNightCycle.updateHemiLight(this.hemiLight);
      }

      // Update ocean shader with time and sun direction
      if (this.oceanProps) {
        const sunDir = this.dayNightCycle.getSunDirection();
        const sunAlt = this.dayNightCycle.getState().sunAltitude;
        OceanWorldBuilder.updateOcean(this.oceanProps, performance.now() * 0.001, sunDir, sunAlt);
      }

      // Atmospheric fog from day/night cycle (reuse existing fog object to avoid GC)
      const fogParams = this.dayNightCycle.getFogParams();
      if (!this.scene.fog) {
        this.scene.fog = new THREE.Fog(fogParams.color, fogParams.near, fogParams.far);
      } else {
        (this.scene.fog as THREE.Fog).color.copy(fogParams.color);
        (this.scene.fog as THREE.Fog).near = fogParams.near;
        (this.scene.fog as THREE.Fog).far = fogParams.far;
      }
      this.renderer.setClearColor(fogParams.color, 1);

      // ─── Dragon Combat Update ───
      if (this.dragonMount?.isMounted) {
        const headPos = DragonCombat.getDragonHeadPosition(
          this.dragonMount.position,
          this.dragonMount.mesh.rotation
        );
        const forward = DragonCombat.getDragonForward(this.dragonMount.mesh.rotation);

        // ── Barrel Roll / Aerial Evade: Double-tap A/D or [Alt] Dodge key ──
        if (input.doubleTapLeft) {
          this.dragonMount.triggerBarrelRoll(-1);
        } else if (input.doubleTapRight) {
          this.dragonMount.triggerBarrelRoll(1);
        } else if (input.justPressed.has(GameAction.DODGE)) {
          // If steering left, roll left; otherwise roll right
          const rollDir = input.moveAxis.x < -0.1 ? -1 : 1;
          this.dragonMount.triggerBarrelRoll(rollDir);
        }

        // ── Lock-On Target Toggle: Tab ──
        if (input.justPressed.has(GameAction.LOCK_ON)) {
          if (this.isLockOnActive) {
            // Disengage lock-on
            this.isLockOnActive = false;
            this.aerialLockOnTarget = null;
            this.dragonCombat.setLockOnTarget(null);
            useGameStore.getState().setBattleBanner("LOCK-ON DISENGAGED", 1.0);
          } else {
            // Find nearest targetable entity
            let nearestTarget: THREE.Object3D | null = null;
            let nearestDist = 120; // Max lock range

            // Check boss first
            if (this.boss && (this.boss as any).state !== 'dead' && (this.boss as any).mesh) {
              const bossPos = (this.boss as any).mesh.position;
              const dist = this.dragonMount.position.distanceTo(bossPos);
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestTarget = (this.boss as any).mesh;
              }
            }

            // Check enemies
            for (const enemy of this.enemies) {
              if (enemy.state === 'dead') continue;
              const dist = this.dragonMount.position.distanceTo(enemy.mesh.position);
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestTarget = enemy.mesh;
              }
            }

            if (nearestTarget) {
              this.isLockOnActive = true;
              this.aerialLockOnTarget = nearestTarget;
              this.dragonCombat.setLockOnTarget(nearestTarget);
              useGameStore.getState().setBattleBanner("LOCK-ON ENGAGED", 1.0);
            }
          }
        }

        // Auto-break lock-on if target too far or dead
        if (this.isLockOnActive && this.aerialLockOnTarget) {
          const dist = this.dragonMount.position.distanceTo(this.aerialLockOnTarget.position);
          if (dist > 120) {
            this.isLockOnActive = false;
            this.aerialLockOnTarget = null;
            this.dragonCombat.setLockOnTarget(null);
          }
        }

        // ── Speed Tier Sync ──
        const speedTier = this.dragonMount.getSpeedTier();
        this.dragonCombat.setSpeedTier(speedTier);
        this.dragonBeamWeapon.setSpeedTier(speedTier);

        // Get true camera aim vector (pre-allocated — zero GC)
        this.cameraController.camera.getWorldDirection(_scratchCamDir);

        // ── Primary Combat: Left Click & [Q] Throw and Recall Leviathan Axe ──
        if (input.justPressed.has(GameAction.ATTACK) || input.justPressed.has(GameAction.AXE_THROW_RECALL)) {
          if (this.playerController.axeThrowState === "thrown" || this.playerController.axeThrowState === "embedded") {
            this.playerController.triggerAxeRecall();
          } else if (this.playerController.axeThrowState === "recalling") {
            this.playerController.catchAxe();
          } else if (this.playerController.axeThrowState === "idle") {
            this.playerController.triggerAxeThrow(this.enemies, this.boss);
          }
        }

        // ── Sonic Boom Check (barrel roll through enemies) ──
        this.dragonCombat.checkSonicBoom(
          this.dragonMount.position,
          this.dragonMount.invulnerable,
          speedTier,
          this.enemies,
          this.boss
        );

        // Update beam weapon fade + dragon combat flame breath
        this.dragonBeamWeapon.update(dt);
        this.dragonCombat.update(dt, headPos, _scratchCamDir, this.dragonMount.mesh.rotation, this.enemies, this.boss);
      } else {
        this.dragonCombat.setBreathing(false);
        this.dragonBeamWeapon.stopContinuousBeam();
        this.dragonBeamWeapon.update(dt);
        this.dragonCombat.update(
          dt,
          this.playerGroup.position,
          _scratchDefaultFwd,
          _scratchDefaultEuler,
          this.enemies,
          this.boss
        );

        // Clear lock-on when dismounted
        if (this.isLockOnActive) {
          this.isLockOnActive = false;
          this.aerialLockOnTarget = null;
          this.dragonCombat.setLockOnTarget(null);
        }

        // Animate idle resting dragon when not mounted
        if (this.dragonMount) {
          this.dragonMount.updateIdle(dt, timeSec);
        }
      }
    }

    // ─── Cinematic Intro Update ───
    if (this.isOceanWorld && this.cinematicIntro?.isActive) {
      this.cinematicIntro.update(dt);
    }

    // ─── Prologue Sequence Update ───
    if (this.isOceanWorld && this.prologueSequence) {
      this.prologueSequence.update(dt, timeSec);

      // Handle interaction key ([E] / [F] / [G])
      if (
        input.justPressed.has(GameAction.AXE_THROW_RECALL) ||
        input.justPressed.has(GameAction.EXECUTE) ||
        input.justPressed.has(GameAction.DRAGON_MOUNT) ||
        input.justPressed.has(GameAction.INTERACT)
      ) {
        this.prologueSequence.handleInteract();
      }

      // Sync active interaction prompt to store (guarded to prevent per-frame mutations)
      const newPrompt = this.prologueSequence.activePrompt;
      if (useGameStore.getState().ui.interactionPrompt !== newPrompt) {
        useGameStore.getState().setInteractionPrompt(newPrompt);
      }
    }

    // ─── Zone Difficulty Scaling & Ecosystem Update ───
    if (this.isOceanWorld && this.zoneManager) {
      this.zoneManager.update(dt, this.enemies);
    }

    // (OceanLife update removed — no sea creatures in highland world)

    // ─── Procedural Chunk Streaming Update ───
    if (this.isOceanWorld && this.chunkManager) {
      this.chunkManager.update(this.playerGroup.position);
    }

    // ─── Dynamic Audio Atmosphere (BGM Theme, Wind Rush, Underwater Muffle) ───
    if (this.isOceanWorld) {
      const inCombat = !!this.boss || this.enemies.some((e) => e.state === "chase" || e.state === "attack");
      const isMounted = !!this.dragonMount?.isMounted;
      if (inCombat) {
        audioManager.setBGMTheme("combat");
      } else if (isMounted) {
        audioManager.setBGMTheme("flight");
      } else {
        audioManager.setBGMTheme("peaceful");
      }

      // Airspeed wind rush audio
      const airspeed = isMounted ? this.dragonMount.currentSpeed : 0;
      audioManager.setFlightWindSpeed(airspeed);
    }

    // Sync settings from store to post-process shader
    this.postProcess.updateSettings({
      pixelSize: store.settings.pixelSize,
      ditherStrength: store.settings.ditherStrength,
    });

    // 8. Rendering — Full color direct render for Ocean World, post-process for legacy
    if (this.isOceanWorld) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.postProcess.render(this.scene, this.camera, dt);
    }
  };

  /**
   * Check proximities and show prompts, triggered upon INTERACT presses.
   */
  private updateInteractions(input: ReturnType<InputManager["poll"]>): void {
    const store = useGameStore.getState();
    if (store.ui.showDialogue) {
      store.setInteractionPrompt(null);
      return;
    }

    const playerPos = this.playerGroup.position;
    const chapter = store.story.chapter;

    // Check distance to Old Xu NPC (only if not in Secret Domain and not Heavenly Gate)
    const distToXu = (chapter !== 99 && chapter !== 5) ? playerPos.distanceTo(this.xuPosition) : Infinity;

    // Check distance to Meditation Shrine
    const actualShrinePos = chapter === 99 ? new THREE.Vector3(0, 0, -6) : this.shrinePosition;
    const distToShrine = playerPos.distanceTo(actualShrinePos);

    // Check distance to Ink Rift
    const actualRiftPos = chapter === 99 ? new THREE.Vector3(0, 0, 10) : this.riftPosition;
    const distToRift = playerPos.distanceTo(actualRiftPos);

    // Check distance to New NPCs and Training Dummy
    const distToBaek = this.npcBaekMesh ? playerPos.distanceTo(this.npcBaekMesh.position) : Infinity;
    const distToMae = this.npcMaeMesh ? playerPos.distanceTo(this.npcMaeMesh.position) : Infinity;
    const distToShen = this.npcShenMesh ? playerPos.distanceTo(this.npcShenMesh.position) : Infinity;
    const distToKaelen = this.npcKaelenMesh ? playerPos.distanceTo(this.npcKaelenMesh.position) : Infinity;
    const distToDummy = this.sparringDummy ? playerPos.distanceTo(this.sparringDummy.mesh.position) : Infinity;

    // Check distance to Elder Min at First Fishing Village Outpost (Ocean World)
    if (this.isOceanWorld) {
      const elderMinPos = new THREE.Vector3(745, 4.0, 442);
      const distToElder = playerPos.distanceTo(elderMinPos);
      if (distToElder <= 4.0) {
        store.setInteractionPrompt("[E] Speak with Elder Min (Fisherfolk Elder)");
        if (input.justPressed.has(GameAction.INTERACT)) {
          const isKorrathDefeated = store.world.defeatedBosses.includes("korrath");
          if (!isKorrathDefeated) {
            store.triggerDialogue(
              "Elder Min (Fisherfolk Elder)",
              "Young traveler! Look to the smoke rising above — Korrath the Branded and his black-flame wyvern have set our sanctuary ablaze! Mount your dragon and bring down the Ashscale raider before our homes are reduced to cinder!",
              [{ text: "Hold fast, Elder. I will challenge him in the sky!", action: "close_dialogue" }]
            );
          } else {
            store.triggerDialogue(
              "Elder Min (Fisherfolk Elder)",
              "Bless you, Sword Saint of the Tidewalkers! The dark flames are quenched, and our hillside homes are safe once more. Follow the windward ridge westward to the Sky Sanctuary at 2,500m... the sacred records atop the mountain peak await you there.",
              [{ text: "Thank you, Elder. I shall ride for the Sky Sanctuary.", action: "close_dialogue" }]
            );
          }
        }
        return;
      }
    }

    if (distToXu <= 2.2) {
      let npcName = "Old Xu";
      if (chapter === 2) npcName = "Mei Lian";
      if (chapter === 3) npcName = "Brother Jian";
      if (chapter === 4) npcName = "Dr. Shen";

      store.setInteractionPrompt(`[E] Speak with ${npcName}`);
      if (input.justPressed.has(GameAction.INTERACT)) {
        if (chapter === 2) {
          store.triggerDialogue(
            "Mei Lian",
            "You... I know that soul pattern. You were there at the Heavenly Gate when the Inkwell broke! Why have you returned? If you want to forge your path, you must strike the anvil. The Rusted Emperor rules these mines now. Clear the rust or rust away."
          );
        } else if (chapter === 3) {
          store.triggerDialogue(
            "Brother Jian",
            "Greetings, traveler. You scale the Jade Summit seeking truth... but be warned: this mountain's air carries memory fog. The False Saint leads the monks into false enlightenment. If you listen to his sermons, you will forget your quest. Meditate at the shrine to anchor your soul."
          );
        } else if (chapter === 4) {
          store.triggerDialogue(
            "Dr. Shen",
            "Mind your step, cultivator! These marshes are alive with blood parasites. The Crimson Bloom sits at the heart of this swamp, pumping poisonous mist and draining the life force of everything that steps into its crimson ink pools. I can brew an antidote, but only if you bring me a pure petal. For now, stay out of the red water!"
          );
        } else {
          store.triggerDialogue(
            "Ancient Wanderer",
            "You have awakened... The ancestral dragon stirs in the sky above the Sea of Clouds. Meditate at the Dao Stele nearby to anchor your martial breath. When ready, draw your blade and master the way of the sword!"
          );
        }
      }
    } else if (distToShrine <= 2.2) {
      if (chapter === 99) {
        store.setInteractionPrompt("[E] Examine Trial Stone");
        if (input.justPressed.has(GameAction.INTERACT)) {
          if (this.isTrialActive) {
            store.triggerDialogue(
              "Trial Stone",
              `The Trial of the Forgotten Path is active! Current wave: ${this.domainWave}. Defeat all shadow projections.`
            );
          } else {
            store.triggerDialogue(
              "Trial Stone",
              "You place your hand on the cold monolith. It vibrates with heavy memory ripples. Activating the Trial will summon waves of shadow projection elites. Survive to receive a massive expansion to your Meridian Core.",
              [
                { text: "Begin Trial of the Forgotten Path", action: "start_trial" },
                { text: "Leave Monolith", action: "close_dialogue" },
              ]
            );
          }
        }
      } else {
        store.setInteractionPrompt("[E] Meditate at Ancestral Dao Stele (大道石碑)");
        if (input.justPressed.has(GameAction.INTERACT)) {
          store.triggerDialogue(
            "Ancestral Dao Stele (大道石碑)",
            "You sit cross-legged before the ancient monolith etched with primordial sword mantras. The Sea of Clouds rolls beneath the highland peaks as your meridians flood with pure dragon sword qi.",
            [
              { text: "Attune Meridians (Quick Save)", action: "save_game" },
              { text: "Leave Meditation", action: "close_dialogue" },
            ]
          );
        }
      }
    } else if (distToRift <= 2.2 && chapter !== 5) {
      if (chapter === 99) {
        store.setInteractionPrompt("[E] Exit Ink Rift");
        if (input.justPressed.has(GameAction.INTERACT)) {
          store.triggerDialogue(
            "Exit Rift",
            "The rift swirls with threads of your native Murim. Step through to return to your world.",
            [
              { text: "Return to Murim", action: "exit_rift" },
              { text: "Stay here", action: "close_dialogue" },
            ]
          );
        }
      } else {
        store.setInteractionPrompt("[E] Examine Ink Rift");
        if (input.justPressed.has(GameAction.INTERACT)) {
          store.triggerDialogue(
            "Ink Rift",
            "A swirling vortex of reality-degraded ink. It hums with the residual power of past-life challenges. Entering it will transport you to a Secret Trial Domain.",
            [
              { text: "Enter Secret Trial", action: "enter_rift" },
              { text: "Walk Away", action: "close_dialogue" },
            ]
          );
        }
      }
    } else if (distToDummy <= 2.8) {
      const stats = this.sparringDummy?.getTrainingStats();
      store.setInteractionPrompt(`[Attack] Ancient Sparring Automaton (機關木人) (Hits: ${stats?.combo || 0}, Total Dmg: ${stats?.totalDamage || 0})`);
    } else {
      store.setInteractionPrompt(null);
    }
  }

  /**
   * Listen to CJK choices clicked from the Dialogue Overlay
   */
  private onDialogueChoice = (e: CustomEvent<{ action: string }>): void => {
    const action = e.detail.action;
    const store = useGameStore.getState();

    switch (action) {
      case "enter_rift":
        store.closeDialogue();
        this.preDomainChapter = store.story.chapter;
        this.transitionToChapter(99);
        break;

      case "exit_rift":
        store.closeDialogue();
        this.isTrialActive = false;
        this.domainWave = 0;
        this.transitionToChapter(this.preDomainChapter);
        break;

      case "start_trial":
        store.closeDialogue();
        this.startSecretDomainTrial();
        break;

      case "save_game":
        // Run slot save
        saveManager.saveToSlot(1);
        store.triggerDialogue(
          "Meditation Shrine",
          "Your soul blueprint has been quick-saved to local IndexedDB. You can export this progress file from the Settings menu any time."
        );
        break;

      case "moral_choice_purify_korrath":
        store.shiftAlignment(35, 0);
        store.addItem({
          id: "purified_tidewalker_feather",
          name: "Purified Tidewalker Feather (淨化龍羽)",
          type: "material",
          description: "A radiant feather from Ignis-Bane after purification. Overflowing with harmonic ocean qi.",
          quantity: 1,
        });
        useGameStore.setState((s) => {
          if (!s.world.defeatedBosses.includes("korrath")) {
            s.world.defeatedBosses.push("korrath");
          }
          s.player.health.current = s.player.health.max;
          s.player.qi.current = s.player.qi.max;
          if (!s.story.completedQuests.includes("the_first_defiance")) {
            s.story.completedQuests.push("the_first_defiance");
          }
          s.story.activeQuests = [{
            id: "act_2_sky_sanctuary",
            name: "Act 2: The Sky Sanctuary & Cloud Peaks",
            description: "Journey to the Sky Sanctuary (2,500m West atop the Mountain Ridge) to uncover the sacred records.",
            objectives: [
              { id: "reach_sanctuary", text: "Fly 2,500m West atop the Cloud Ridge to the Sky Sanctuary", completed: false }
            ],
            completed: false,
          }];
          s.story.chapter = 2;
        });
        if (this.oceanProps?.smokePlumeGroup) {
          this.oceanProps.smokePlumeGroup.visible = false;
        }
        store.triggerDialogue(
          "Harmonic Purification (天道度化)",
          "You channel pure Tidewalker qi through the Dragon Sword. The black corruption washes away from Ignis-Bane in brilliant azure light. The freed wyvern roars softly in gratitude, taking flight to watch over the reefs. Korrath weeps, discarding his Ashscale badge: 'The legend of the Tidewalkers... it was true.' (+Purified Tidewalker Feather acquired, HP & Qi restored)",
          [{ text: "Continue the Journey", action: "close_dialogue" }]
        );
        store.setBattleBanner("WYVERN PURIFIED · +35 RIGHTEOUS ALIGNMENT · ACT I CONQUERED", 4.0);
        break;

      case "moral_choice_execute_korrath":
        store.shiftAlignment(0, 35);
        store.addItem({
          id: "ashscale_dragon_core",
          name: "Ashscale Dragon Core (灰鱗龍心)",
          type: "material",
          description: "A smoldering corrupted dragon core. Imbues the weapon with +15% raw attack power.",
          quantity: 1,
        });
        useGameStore.setState((s) => {
          if (!s.world.defeatedBosses.includes("korrath")) {
            s.world.defeatedBosses.push("korrath");
          }
          s.player.qiEssence += 250;
          if (!s.story.completedQuests.includes("the_first_defiance")) {
            s.story.completedQuests.push("the_first_defiance");
          }
          s.story.activeQuests = [{
            id: "act_2_sky_sanctuary",
            name: "Act 2: The Sky Sanctuary & Cloud Peaks",
            description: "Journey to the Sky Sanctuary (2,500m West atop the Mountain Ridge) to uncover the sacred records.",
            objectives: [
              { id: "reach_sanctuary", text: "Fly 2,500m West atop the Cloud Ridge to the Sky Sanctuary", completed: false }
            ],
            completed: false,
          }];
          s.story.chapter = 2;
        });
        if (this.oceanProps?.smokePlumeGroup) {
          this.oceanProps.smokePlumeGroup.visible = false;
        }
        store.triggerDialogue(
          "Ashen Ruin (魔道吞噬)",
          "Your blade strikes without hesitation. Korrath falls. You thrust the Dragon Sword into the corrupted dragon core, absorbing its burning fury. Dark crimson veins pulse across the blade: +250 Qi Essence & +15% Raw Attack Power awakened.",
          [{ text: "Claim the Power", action: "close_dialogue" }]
        );
        store.setBattleBanner("CORRUPTED CORE CONSUMED · +35 DEMONIC ALIGNMENT · ACT I CONQUERED", 4.0);
        break;

      case "moral_choice_interrogate_korrath":
        store.shiftAlignment(15, 15);
        store.addItem({
          id: "ashscale_war_map",
          name: "Ashscale War Map & Mountain Cipher (作戰要圖與古卷密鑰)",
          type: "key_item",
          description: "Ancient charts revealing the aerial flight corridor to the Sky Sanctuary at 2,500m West.",
          quantity: 1,
        });
        useGameStore.setState((s) => {
          if (!s.world.defeatedBosses.includes("korrath")) {
            s.world.defeatedBosses.push("korrath");
          }
          s.player.qiEssence += 150;
          if (!s.story.completedQuests.includes("the_first_defiance")) {
            s.story.completedQuests.push("the_first_defiance");
          }
          s.story.activeQuests = [{
            id: "act_2_sky_sanctuary",
            name: "Act 2: The Sky Sanctuary & Cloud Peaks",
            description: "Journey to the Sky Sanctuary (2,500m West atop the Mountain Ridge) to uncover the sacred records.",
            objectives: [
              { id: "reach_sanctuary", text: "Fly 2,500m West atop the Cloud Ridge to the Sky Sanctuary", completed: false }
            ],
            completed: false,
          }];
          s.story.chapter = 2;
        });
        if (this.oceanProps?.smokePlumeGroup) {
          this.oceanProps.smokePlumeGroup.visible = false;
        }
        store.triggerDialogue(
          "The Seeker's Inquiry (探求真理)",
          "Held at blade-point, Korrath confesses: 'The Grand Wyrmlord didn't just drown the world to rule... he seeks the Primordial Dragon sleeping in the Abyssal Trench! Go to the Sunken Library at 2500m... the ancient records will show you what he fears.' (+Ashscale War Map & Cipher acquired)",
          [{ text: "Chart Route to Sunken Library", action: "close_dialogue" }]
        );
        store.setBattleBanner("WAR PLANS REVEALED · +15 HARMONY / +15 WRATH · ACT I CONQUERED", 4.0);
        break;

      case "fragment_purge":
        // Revenge route: shift demonic
        store.shiftAlignment(0, 30);
        store.triggerDialogue(
          "Calamity",
          "You devour the core in a storm of fury. Alignment shifted: +30 DEMONIC (Revenge path). You have conquered Chapter 1: The Bamboo Sea. You may now continue your journey."
        );
        // Advance quest completion
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_bamboo_sea");
        });
        saveManager.saveToSlot(1);
        break;

      case "fragment_purify":
        // Peace route: shift righteous
        store.shiftAlignment(30, 0);
        store.triggerDialogue(
          "Calamity",
          "You guide the wind back into the earth, letting it rest in peace. Alignment shifted: +30 RIGHTEOUS (Peace path). You have conquered Chapter 1: The Bamboo Sea. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_bamboo_sea");
        });
        saveManager.saveToSlot(1);
        break;

      case "fragment_inscribe":
        // Truth route: discover secret power
        store.discoverSecretPower("wind_whisper");
        store.triggerDialogue(
          "Calamity",
          "You copy the geometric runes of the wind into your memory. Secret Power 'Wind Whisper' unlocked! Alignment shifted: neutral. You have conquered Chapter 1: The Bamboo Sea. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_bamboo_sea");
        });
        saveManager.saveToSlot(1);
        break;

      case "iron_plunder":
        store.shiftAlignment(0, 40);
        store.triggerDialogue(
          "Calamity",
          "You consume the forge embers and gain metallic dominance. Alignment shifted: +40 DEMONIC (Revenge path). You have conquered Chapter 2: The Iron Tomb Mines. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_iron_tomb");
        });
        saveManager.saveToSlot(1);
        break;

      case "iron_release":
        store.shiftAlignment(40, 0);
        store.triggerDialogue(
          "Calamity",
          "You return the heavy iron qi to sleep in the deep mines. Alignment shifted: +40 RIGHTEOUS (Peace path). You have conquered Chapter 2: The Iron Tomb Mines. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_iron_tomb");
        });
        saveManager.saveToSlot(1);
        break;

      case "iron_inscribe":
        store.discoverSecretPower("ink_walk");
        store.triggerDialogue(
          "Calamity",
          "You record the magnetic lines of the Iron Tomb. Secret Power 'Ink Walk' unlocked! Alignment shifted: neutral. You have conquered Chapter 2: The Iron Tomb Mines. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_iron_tomb");
        });
        saveManager.saveToSlot(1);
        break;

      case "light_devour":
        store.shiftAlignment(0, 50);
        store.triggerDialogue(
          "Calamity",
          "You absorb the memory wipes, rewriting your revenge agenda with cold clarity. Alignment shifted: +50 DEMONIC (Revenge path). You have conquered Chapter 3: Jade Summit Monastery. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_jade_monastery");
        });
        saveManager.saveToSlot(1);
        break;

      case "light_liberate":
        store.shiftAlignment(50, 0);
        store.triggerDialogue(
          "Calamity",
          "You liberate the monks' trapped souls and return their true memories. Alignment shifted: +50 RIGHTEOUS (Peace path). You have conquered Chapter 3: Jade Summit Monastery. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_jade_monastery");
        });
        saveManager.saveToSlot(1);
        break;

      case "light_scribe":
        store.discoverSecretPower("soul_echo");
        store.triggerDialogue(
          "Calamity",
          "You scribe the formula of False Light. Secret Power 'Soul Echo' unlocked! Alignment shifted: neutral. You have conquered Chapter 3: Jade Summit Monastery. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_jade_monastery");
        });
        saveManager.saveToSlot(1);
        break;

      case "blood_devour":
        store.shiftAlignment(0, 60);
        store.triggerDialogue(
          "Calamity",
          "You ravenously absorb the essence of the Crimson Bloom, feel its wild growth inside your veins. Alignment shifted: +60 DEMONIC (Revenge path). You have conquered Chapter 4: The Blood Lotus Marshlands. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_blood_lotus");
        });
        saveManager.saveToSlot(1);
        break;

      case "blood_purify":
        store.shiftAlignment(60, 0);
        store.triggerDialogue(
          "Calamity",
          "You direct the corrupting blood vitality to seep back into the deep soil as pure nutrients. Alignment shifted: +60 RIGHTEOUS (Peace path). You have conquered Chapter 4: The Blood Lotus Marshlands. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_blood_lotus");
        });
        saveManager.saveToSlot(1);
        break;

      case "blood_archive":
        store.discoverSecretPower("memory_surge");
        store.triggerDialogue(
          "Calamity",
          "You map the cellular multiplication pathways of the Bloom. Secret Power 'Memory Surge' unlocked! Alignment shifted: neutral. You have conquered Chapter 4: The Blood Lotus Marshlands. You may now continue your journey."
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_blood_lotus");
        });
        saveManager.saveToSlot(1);
        break;

      case "ending_revenge":
        store.shiftAlignment(0, 100);
        this.postProcess.updateSettings({ inkMode: 1 });
        store.triggerDialogue(
          "Mirror of Past Lives",
          "You absorb the power of the shattered Inkwell, declaring yourself the eternal Ruler of the realm. A new crimson dawn rises, written in the ink of blood and absolute order. The Murim falls to its knees before its new God. (Revenge Ending unlocked! A Crimson filter is applied to this world.)"
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_forgotten_path");
        });
        saveManager.saveToSlot(1);
        break;

      case "ending_peace":
        store.shiftAlignment(100, 0);
        this.postProcess.updateSettings({ inkMode: 2 });
        store.triggerDialogue(
          "Mirror of Past Lives",
          "You reforge the Inkwell, dispersing your soul to repair the rotting lines of reality. The grey fog clears. The rivers flow, and the world heals, though your name fades completely from memory. (Peace Ending unlocked! A Gentle Grey filter is applied to this world.)"
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_forgotten_path");
        });
        saveManager.saveToSlot(1);
        break;

      case "ending_truth":
        store.discoverSecretPower("the_nameless_art");
        this.postProcess.updateSettings({ inkMode: 3 });
        store.triggerDialogue(
          "Mirror of Past Lives",
          "You shatter the cycle of competition. A new universe is written, where qi flows freely to all souls. The monochrome reality dissolves. Color washes over the sky for the first time. (Truth Ending unlocked! Full Color is restored to this world!)"
        );
        useGameStore.setState((s) => {
          s.story.completedQuests.push("conquer_forgotten_path");
        });
        saveManager.saveToSlot(1);
        break;

      case "close_dialogue":
        store.closeDialogue();
        
        // Auto-advance logic for Chapter transitions when closing conquest dialogue
        if (store.story.chapter === 1 && store.story.completedQuests.includes("conquer_bamboo_sea")) {
          this.transitionToChapter(2);
        } else if (store.story.chapter === 2 && store.story.completedQuests.includes("conquer_iron_tomb")) {
          this.transitionToChapter(3);
        } else if (store.story.chapter === 3 && store.story.completedQuests.includes("conquer_jade_monastery")) {
          this.transitionToChapter(4);
        } else if (store.story.chapter === 4 && store.story.completedQuests.includes("conquer_blood_lotus")) {
          // Transition to Chapter 5 (final Heavenly Gate)!
          this.transitionToChapter(5);
        }
        break;

      default:
        store.closeDialogue();
        break;
    }
  };

  /**
   * Resolve hits from player weapons onto active enemies & boss.
   */
  private resolvePlayerAttacks(): void {
    const store = useGameStore.getState();
    const playerPos = this.playerGroup.position;
    const playerRotY = this.playerGroup.rotation.y;

    // Check hit arc direction
    const forwardDir = _scratchForwardDir.set(-Math.sin(playerRotY), 0, -Math.cos(playerRotY));

    const profId = (store.player.profession || "sword_sage") as ProfessionId;
    const prof = PROFESSIONS[profId] || PROFESSIONS.sword_sage;
    const pc = this.playerController as any;
    const isCharged = pc.isFullyCharged;
    const isHeavy = this.playerController.state === "attack_heavy";
    const isDash = this.playerController.state === "attack_dash";
    const isJump = this.playerController.state === "attack_jump";
    const comboCount = this.playerController.comboCount;
    const isFinisher = comboCount === prof.maxComboChain;

    // High-Lethality "1-Hit Kill or Die" Damage Scaling
    // Standard grunts have 40-50 HP. Every strike cleanly 1-hit kills basic grunts!
    let baseDamage = 65 * (prof.stats.attackPowerMod || 1.0);
    if (isCharged) baseDamage = 260 * prof.stats.attackPowerMod;
    else if (isHeavy) baseDamage = 120 * prof.stats.attackPowerMod;
    else if (isJump) baseDamage = 95 * prof.stats.attackPowerMod;
    else if (isDash) baseDamage = 75 * prof.stats.attackPowerMod;
    else if (isFinisher) baseDamage = 145 * prof.stats.attackPowerMod;
    else baseDamage = (55 + comboCount * 10) * prof.stats.attackPowerMod;

    let stanceMultiplier = 1.0;
    if (store.player.stance === "thunderclap") stanceMultiplier = 1.25;

    // God of War Weapon Awaken & Spartan Rage Multipliers
    const gowWeapon = store.player.gowWeapon || "axe";
    const isAxeThrown = !!store.player.isAxeThrown;
    const isAwakened = !!store.player.weaponAwaken?.active;
    const awakenElement = store.player.weaponAwaken?.element;
    const awakenMultiplier = isAwakened ? 1.5 : 1.0;

    const isRage = store.player.rage?.isActive;
    const rageMultiplier = isRage ? 3.0 : 1.0;

    const damage = Math.round(baseDamage * stanceMultiplier * awakenMultiplier * rageMultiplier);

    // Multi-Target Facing: Wide sweeping arcs & omnidirectional whirlwinds
    let baseRange = 3.6;
    let minDot = -0.2; // 200° sweeping frontal arc by default!

    if (isCharged) {
      baseRange = 6.0;
      minDot = -1.0; // 360° omnidirectional room-clearing shockwave!
    } else if (isHeavy) {
      baseRange = 4.8;
      minDot = -0.1; // 200° cleave
    } else if (isJump) {
      baseRange = 4.5;
      minDot = -0.6; // Broad downward helm-breaker crater
    } else if (isDash) {
      baseRange = 4.2;
      minDot = -0.3; // Wide piercing cutting corridor
    } else if (comboCount === 3 || gowWeapon === "blades") {
      // Blades of Chaos or Light 3 is the 360° whirlwind spin!
      baseRange = gowWeapon === "blades" ? 4.6 : 4.2;
      minDot = gowWeapon === "blades" ? -0.8 : -1.0;
    } else if (isFinisher) {
      baseRange = 4.8;
      minDot = -0.2;
    } else {
      baseRange = 3.6;
      minDot = -0.2;
    }

    const range = baseRange * (prof.stats.rangeMod || 1.0);
    const weaponColor = isAwakened && awakenElement === "frost"
      ? new THREE.Color(0xf43f5e) // 24-Movement Plum Blossom Bloom
      : isAwakened && awakenElement === "flame"
      ? new THREE.Color(0xf97316)
      : gowWeapon === "axe"
      ? new THREE.Color(0xf43f5e) // Blossom Pink
      : gowWeapon === "blades"
      ? new THREE.Color(0xf472b6) // Twin plum sabers
      : new THREE.Color(0x38bdf8);

    // 0. Check Sparring Automaton (Training Dummy)
    if (this.sparringDummy) {
      const dummyDist = _scratchDummyDist.set(
        playerPos.x - this.sparringDummy.mesh.position.x,
        playerPos.z - this.sparringDummy.mesh.position.z
      ).length();

      if (dummyDist <= range + 0.8) {
        this.sparringDummy.takeDamage(damage);
        store.regenQi(10);
        store.addDamagePopup(damage, isHeavy || isCharged || isFinisher, [
          this.sparringDummy.mesh.position.x,
          2.2,
          this.sparringDummy.mesh.position.z,
        ], prof.weaponColor || "#38bdf8");
        store.addComboPoint(isCharged ? 35 : isHeavy ? 25 : 15);
        this.cameraController.addShake(isCharged ? 0.8 : isFinisher ? 0.5 : 0.25, 0.1);
        // Hit-stop on EVERY hit — the #1 feel improvement
        if (isCharged) {
          store.triggerHitFreeze(0.10, 0.02);
        } else if (isFinisher) {
          store.triggerHitFreeze(0.08, 0.03);
        } else if (isHeavy) {
          store.triggerHitFreeze(0.07, 0.05);
        } else {
          store.triggerHitFreeze(0.05, 0.05); // Light hit: 50ms freeze
        }
        this.postProcess.triggerChromaticImpact(isCharged ? 1.8 : isHeavy ? 1.2 : 0.5);
        this.cameraController.addPunchIn(isCharged ? 1.2 : isHeavy ? 0.8 : 0.4, 0.15);
      }
    }

    // 1. Check normal enemies (Multi-Enemy Cleave: hits ALL enemies in arc simultaneously)
    let hitCount = 0;
    this.enemies.forEach((enemy) => {
      if (enemy.state === "dead") return;

      const horizontalDist = Math.hypot(
        playerPos.x - enemy.mesh.position.x,
        playerPos.z - enemy.mesh.position.z
      );
      const verticalDist = Math.abs(playerPos.y - enemy.mesh.position.y);

      if (horizontalDist <= range && verticalDist <= 5.0) {
        _scratchAttackToEnemy.set(
          enemy.mesh.position.x - playerPos.x,
          0,
          enemy.mesh.position.z - playerPos.z
        ).normalize();
        
        const dot = forwardDir.dot(_scratchAttackToEnemy);
        if (dot >= minDot) {
          hitCount++;

          // Calculate knockback direction and force for enemy hit reaction (zero GC)
          const knockbackForce = isCharged ? 4.0 : isHeavy ? 2.5 : isFinisher ? 2.0 : 1.0;
          if (typeof enemy.takeDamage === "function") {
            enemy.takeDamage(damage, _scratchAttackToEnemy, knockbackForce);
          } else if (typeof enemy.takeHit === "function") {
            enemy.takeHit(damage, playerPos);
          }

          // Apply Ragnarök Stun & Elemental Effects
          if (isAwakened) {
            if (awakenElement === "frost" && typeof enemy.applyFrost === "function") {
              enemy.applyFrost(2.5); // Freeze target in solid ice
            } else if (awakenElement === "flame" && typeof enemy.applyBurn === "function") {
              enemy.applyBurn(3.0); // Ticking fire burn
            } else if (typeof enemy.takeStun === "function") {
              enemy.takeStun(40);
            }
          }

          // Bare-handed brawling while Axe is thrown builds extra heavy Stun
          if (gowWeapon === "axe" && isAxeThrown && typeof enemy.takeStun === "function") {
            enemy.takeStun(35);
          }

          store.regenQi(10);
          store.heal(Math.round(damage * 0.12));
          store.addRage(isCharged ? 20 : isHeavy ? 14 : 7);
          store.addDamagePopup(
            damage,
            isHeavy || isCharged || isFinisher,
            [enemy.mesh.position.x, enemy.mesh.position.y + 1.4, enemy.mesh.position.z],
            isRage ? "#ef4444" : gowWeapon === "axe" ? "#f43f5e" : isAwakened ? (awakenElement === "frost" ? "#f43f5e" : "#f97316") : "#f59e0b"
          );
          store.addComboPoint(isCharged ? 40 : isHeavy ? 30 : 15);

          const hitPos = enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
          this.inkParticles.burst({
            position: hitPos,
            count: isCharged ? 35 : isHeavy ? 24 : 16,
            speed: isCharged ? 9 : isHeavy ? 6 : 4,
            life: 0.4,
            size: isCharged ? 0.35 : 0.22,
            color: isRage ? new THREE.Color(0xf59e0b) : weaponColor,
          });
          // Blooming pink plum blossom petal flurry
          this.inkParticles.burst({
            position: hitPos,
            count: isCharged ? 20 : 10,
            speed: 5.5,
            life: 0.55,
            size: 0.26,
            color: new THREE.Color(0xf43f5e),
          });
          this.inkParticles.spawnInkSplatter({
            position: enemy.mesh.position.clone(),
            radius: isCharged ? 2.2 : isHeavy ? 1.4 : 0.8,
            duration: 1.2,
          });
        }
      }
    });

    // Consume 1 awaken charge upon successful hit
    if (hitCount > 0 && isAwakened) {
      store.consumeAwakenCharge();
    }

    // Hit-stop freeze frames on EVERY successful hit — GoW's #1 feel secret
    if (hitCount > 0) {
      if (hitCount >= 2) {
        store.setBattleBanner(`MULTI-CLEAVE x${hitCount}!`, 0.7);
      }
      // Directional camera shake (toward the hit, not random)
      this.cameraController.addShake(
        isCharged ? 1.2 : isFinisher ? 0.8 : isHeavy ? 0.5 : 0.3,
        isCharged ? 0.18 : 0.12
      );
      // Hit-stop on EVERY hit
      if (isCharged) {
        store.triggerHitFreeze(0.12, 0.02); // 120ms near-freeze
      } else if (isFinisher) {
        store.triggerHitFreeze(0.10, 0.03); // 100ms near-freeze
      } else if (isHeavy) {
        store.triggerHitFreeze(0.08, 0.05); // 80ms at 5%
      } else {
        store.triggerHitFreeze(0.05, 0.05); // 50ms at 5% — light attacks
      }
      this.postProcess.triggerChromaticImpact(isCharged ? 2.0 : isHeavy ? 1.2 : 0.6);
      this.cameraController.addPunchIn(isCharged ? 1.5 : isHeavy ? 1.0 : 0.5, 0.18);
      // Notify camera of combat state
      this.cameraController.setCombatZoom(true);
    }

    // 2. Check Boss
    if (this.boss && this.boss.state !== "dead") {
      let podHit = false;
      if (this.boss instanceof CrimsonBloomBoss) {
        podHit = this.boss.checkPodStrike(playerPos, range);
      }

      if (!podHit) {
        const horizontalDist = new THREE.Vector2(
          playerPos.x - this.boss.mesh.position.x,
          playerPos.z - this.boss.mesh.position.z
        ).length();
        const verticalDist = Math.abs(playerPos.y - this.boss.mesh.position.y);

        if (horizontalDist <= range + 1.5 && verticalDist <= 5.0) {
          const toBoss = new THREE.Vector3(
            this.boss.mesh.position.x - playerPos.x,
            0,
            this.boss.mesh.position.z - playerPos.z
          ).normalize();

          const dot = forwardDir.dot(toBoss);
          if (dot >= minDot) {
             if (typeof this.boss.takeDamage === "function") {
               this.boss.takeDamage(damage);
             } else if (typeof (this.boss as any).takeHit === "function") {
               (this.boss as any).takeHit(damage, playerPos);
             }
             store.regenQi(10);
             store.heal(Math.round(damage * 0.12));
             store.addDamagePopup(damage, isHeavy || isCharged || isFinisher, [this.boss.mesh.position.x, this.boss.mesh.position.y + 2.2, this.boss.mesh.position.z], "#ff3366");
             store.addComboPoint(isHeavy ? 45 : 20);
             this.cameraController.addShake(0.6, 0.12);
             if (isCharged || isHeavy) {
               store.triggerHitFreeze(0.05, 0.15);
             }
             this.postProcess.triggerChromaticImpact(isHeavy ? 1.5 : 0.8);

             const hitPos = this.boss.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0));
             this.inkParticles.burst({
               position: hitPos,
               count: 24,
               speed: 5,
               life: 0.4,
               size: 0.22,
               color: this.playerController.getStanceColor(),
             });
             this.inkParticles.spawnShockwaveRing({
               position: this.boss.mesh.position.clone(),
               maxRadius: 2.5,
               duration: 0.3,
               color: this.playerController.getStanceColor(),
             });
           }
        }
      }
    }
  }

  /**
   * Transition game environment, logic, and music to target chapter.
   */
  transitionToChapter(chapter: number): void {
    // 1. Clear old scene elements (except lights and playerGroup)
    this.enemies.forEach((enemy) => {
      this.scene.remove(enemy.mesh);
    });
    this.enemies = [];

    if (this.boss) {
      this.scene.remove(this.boss.mesh);
      this.boss = null;
    }

    if (this.npcXuMesh) {
      this.scene.remove(this.npcXuMesh);
    }

    // Traverse scene and remove environment items
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child !== this.scene && 
          child !== this.playerGroup && 
          !this.playerGroup.getObjectById(child.id) &&
          !(child instanceof THREE.AmbientLight) &&
          !(child instanceof THREE.DirectionalLight)) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((obj) => {
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    // Clear colliders
    this.collisions.clear();

    // 2. Setup new chapter parameters
    useGameStore.setState((s) => {
      s.story.chapter = chapter;
      s.player.health.current = s.player.health.max; // Full heal
      s.player.stamina.current = s.player.stamina.max;
      s.player.qi.current = s.player.qi.max;
    });

    if (chapter === 99) {
      this.playerGroup.position.set(0, 4.3, 0);
    } else {
      this.playerGroup.position.set(0, 4.3, 10);
    }
    this.playerController.transitionTo("idle");

    if (chapter === 2) {
      useGameStore.setState((s) => {
        s.world.currentZone = "iron_tomb_mines";
      });

      // Darker post process settings for underground tomb
      this.postProcess.updateSettings({
        threshold: 0.38,
        ditherStrength: 0.16,
      });

      // Build Iron Tomb Mines environment
      this.buildIronTombMines();

      // Start BGM loop for Chapter 2 (Synthesised fallback is active)
      audioManager.playBGM("/audio/mines_ambient.ogg");
    } else if (chapter === 3) {
      useGameStore.setState((s) => {
        s.world.currentZone = "jade_summit";
      });

      // Hazy bright white settings for Jade Summit
      this.postProcess.updateSettings({
        threshold: 0.44,
        ditherStrength: 0.1,
      });

      // Build Jade Summit Monastery environment
      this.buildJadeMonastery();

      // Start BGM loop for Chapter 3
      audioManager.playBGM("/audio/monastery_ambient.ogg");
    } else if (chapter === 4) {
      useGameStore.setState((s) => {
        s.world.currentZone = "blood_lotus_marshlands";
      });

      // Grim dark dim setting for marshlands
      this.postProcess.updateSettings({
        threshold: 0.40,
        ditherStrength: 0.2,
      });

      // Build Blood Lotus Marshlands environment
      this.buildBloodLotusMarshlands();

      // Start BGM loop for Chapter 4
      audioManager.playBGM("/audio/swamp_ambient.ogg");
    } else if (chapter === 5) {
      useGameStore.setState((s) => {
        s.world.currentZone = "heavenly_gate";
      });

      // Build Heavenly Gate environment & boss
      this.buildHeavenlyGate();

      // Start celestial BGM
      audioManager.playBGM("/audio/monastery_ambient.ogg");

      // Final message dialog
      setTimeout(() => {
        useGameStore.getState().triggerDialogue(
          "Old Xu",
          "You have reached the Heavenly Gate. The Forgotten Path lies ahead. Defeat the shadow of your past self to rewrite the destiny of this ink-bound realm."
        );
      }, 2000);
    } else if (chapter === 99) {
      useGameStore.setState((s) => {
        s.world.currentZone = "secret_domain";
      });

      // Dark, high-contrast settings for the Trial Domain
      this.postProcess.updateSettings({
        threshold: 0.38,
        ditherStrength: 0.25,
      });

      // Build Secret Domain environment
      this.buildSecretDomain();

      // Play dramatic ambient music
      audioManager.playBGM("/audio/mines_ambient.ogg");
    } else {
      // Default fallback
      this.buildDemoScene();
    }

    // Apply any unlocked ending filters
    this.applyEndingFilter();

    console.log(`[GameEngine] Transitioned to Chapter ${chapter}`);
  }

  private buildIronTombMines(): void {
    // ─── Lighting ──────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(3, 10, 5);
    this.scene.add(directionalLight);

    // Ground plane (rusted flat plane with metal grid markings)
    const groundGeo = new THREE.PlaneGeometry(100, 100, 15, 15);
    const posAttr = groundGeo.getAttribute("position");
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const height = (Math.sin(x * 0.15) * Math.sin(y * 0.15)) * 0.8;
      posAttr.setZ(i, height);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshLambertMaterial({
      color: 0x332a2a,
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    this.scene.add(ground);

    // Spawn massive rust pillars and scaffolding
    for (let i = 0; i < 25; i++) {
      const x = (Math.random() - 0.5) * 55;
      const z = (Math.random() - 0.5) * 55;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 5) continue;

      this.createIronScaffold(x, z);
      this.collisions.addCollider({
        id: `scaffold_${i}`,
        type: "cylinder",
        position: new THREE.Vector3(x, 0, z),
        radius: 0.6,
        height: 6,
      });
    }

    // Spawn minecarts
    for (let i = 0; i < 12; i++) {
      const x = (Math.random() - 0.5) * 45;
      const z = (Math.random() - 0.5) * 45;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 4) continue;

      this.createMinecart(x, z);
      this.collisions.addCollider({
        id: `cart_${i}`,
        type: "sphere",
        position: new THREE.Vector3(x, 0, z),
        radius: 1.0,
      });
    }

    // Spawn Save Shrine
    this.createMeditationShrine(0, 8);
    this.collisions.addCollider({
      id: "shrine",
      type: "cylinder",
      position: this.shrinePosition,
      radius: 1.4,
      height: 3,
    });

    // Spawn NPC Blacksmith Mei Lian
    this.spawnMeiLianNPC();

    // Spawn Boss: The Rusted Emperor!
    this.spawnRustedEmperorBoss();

    // Spawn basic mine mobs (rusted grunts)
    this.spawnMineMobs();

    // Spawn Ink Rift
    this.createInkRift(this.riftPosition.x, this.riftPosition.z);
    this.collisions.addCollider({
      id: "ink_rift",
      type: "cylinder",
      position: this.riftPosition,
      radius: 1.5,
      height: 3,
    });
  }

  private createIronScaffold(x: number, z: number): void {
    const group = new THREE.Group();
    const postGeo = new THREE.BoxGeometry(0.5, 6, 0.5);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x221a1a, flatShading: true });
    const post = new THREE.Mesh(postGeo, postMat);
    group.add(post);

    const beamGeo = new THREE.BoxGeometry(1.6, 0.2, 0.2);
    const beam1 = new THREE.Mesh(beamGeo, postMat);
    beam1.position.set(0, 1.8, 0);
    beam1.rotation.z = Math.PI / 4;
    group.add(beam1);

    const beam2 = new THREE.Mesh(beamGeo, postMat);
    beam2.position.set(0, -0.6, 0);
    beam2.rotation.z = -Math.PI / 4;
    group.add(beam2);

    group.position.set(x, 2.5, z);
    this.scene.add(group);
  }

  private createMinecart(x: number, z: number): void {
    const cartGeo = new THREE.BoxGeometry(1.6, 0.9, 1.1);
    const cartMat = new THREE.MeshLambertMaterial({ color: 0x151010, flatShading: true });
    const cart = new THREE.Mesh(cartGeo, cartMat);
    cart.position.set(x, 0.45, z);
    cart.rotation.y = Math.random() * Math.PI;
    this.scene.add(cart);
  }

  private spawnMeiLianNPC(): void {
    this.npcXuMesh = new THREE.Group();
    
    const bodyGeo = new THREE.BoxGeometry(0.7, 1.2, 0.45);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x443a3a, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    this.npcXuMesh.add(body);

    const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x665a5a, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.0;
    this.npcXuMesh.add(head);

    const metalArmGeo = new THREE.BoxGeometry(0.24, 0.9, 0.24);
    const metalArmMat = new THREE.MeshLambertMaterial({ color: 0x111111, flatShading: true });
    const metalArm = new THREE.Mesh(metalArmGeo, metalArmMat);
    metalArm.position.set(0.55, 1.25, 0.15);
    metalArm.rotation.x = Math.PI / 3;
    this.npcXuMesh.add(metalArm);

    this.npcXuMesh.position.copy(this.xuPosition);
    this.scene.add(this.npcXuMesh);
  }

  private spawnRustedEmperorBoss(): void {
    this.boss = new RustedEmperorBoss(
      this.scene,
      this.inkParticles,
      this.playerGroup,
      this.playerController
    );
  }

  private spawnMineMobs(): void {
    const spawns = [
      new THREE.Vector3(-12, 0, -12),
      new THREE.Vector3(14, 0, -6),
      new THREE.Vector3(-16, 0, 10),
    ];
    spawns.forEach((pos, idx) => {
      const gruntDef: EnemyDef = {
        id: `rust_ghoul_${idx}`,
        type: "grunt",
        position: pos,
        health: 75,
        maxHealth: 75,
        damage: 14,
        speed: 3.2,
        patrolPoints: [pos.clone(), pos.clone().add(new THREE.Vector3(3, 0, 3))],
      };
      const enemy = new EnemyAI(gruntDef, this.scene, this.inkParticles, this.playerGroup, this.playerController);
      this.enemies.push(enemy);
    });
  }

  private buildJadeMonastery(): void {
    // ─── Lighting ──────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(4, 12, 6);
    this.scene.add(directionalLight);

    // Ground plane (hazy white marble slabs)
    const groundGeo = new THREE.PlaneGeometry(100, 100, 10, 10);
    const posAttr = groundGeo.getAttribute("position");
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const height = (Math.sin(x * 0.08) * Math.cos(y * 0.08)) * 0.3;
      posAttr.setZ(i, height);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshLambertMaterial({
      color: 0xdddddd,
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    this.scene.add(ground);

    // Spawn stone pagodas
    for (let i = 0; i < 18; i++) {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 5.5) continue;

      this.createStonePagoda(x, z);
      this.collisions.addCollider({
        id: `pagoda_${i}`,
        type: "cylinder",
        position: new THREE.Vector3(x, 0, z),
        radius: 1.2,
        height: 8,
      });
    }

    // Spawn lanterns
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 45;
      const z = (Math.random() - 0.5) * 45;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 4.5) continue;

      this.createTempleLantern(x, z);
      this.collisions.addCollider({
        id: `lantern_${i}`,
        type: "cylinder",
        position: new THREE.Vector3(x, 0, z),
        radius: 0.4,
        height: 3,
      });
    }

    // Spawn Save Shrine
    this.createMeditationShrine(0, 8);
    this.collisions.addCollider({
      id: "shrine",
      type: "cylinder",
      position: this.shrinePosition,
      radius: 1.4,
      height: 3,
    });

    // Spawn NPC Brother Jian
    this.spawnBrotherJianNPC();

    // Spawn Boss: The False Saint!
    this.spawnFalseSaintBoss();

    // Spawn monastery mobs
    this.spawnMonasteryMobs();

    // Spawn Ink Rift
    this.createInkRift(this.riftPosition.x, this.riftPosition.z);
    this.collisions.addCollider({
      id: "ink_rift",
      type: "cylinder",
      position: this.riftPosition,
      radius: 1.5,
      height: 3,
    });
  }

  private createStonePagoda(x: number, z: number): void {
    const group = new THREE.Group();
    const material = new THREE.MeshLambertMaterial({ color: 0xcccccc, flatShading: true });
    
    // Tiered stack
    const levels = 4;
    for (let i = 0; i < levels; i++) {
      const w = 1.5 - i * 0.3;
      const h = 1.2;
      const tier = new THREE.Mesh(new THREE.CylinderGeometry(w - 0.15, w, h, 6), material);
      tier.position.y = i * h + h / 2;
      group.add(tier);

      // Roof rim
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.1, w + 0.2, 0.25, 6), material);
      roof.position.y = i * h + h;
      group.add(roof);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private createTempleLantern(x: number, z: number): void {
    const group = new THREE.Group();
    const material = new THREE.MeshLambertMaterial({ color: 0x999999, flatShading: true });

    // Post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.0, 5), material);
    post.position.y = 1.0;
    group.add(post);

    // Light chamber
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
    lamp.position.y = 2.2;
    group.add(lamp);

    // Roof cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.4, 0.15, 6), material);
    cap.position.y = 2.45;
    group.add(cap);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private spawnBrotherJianNPC(): void {
    this.npcXuMesh = new THREE.Group();

    // Body (Robe)
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.45, 1.1, 5);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x666666, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    this.npcXuMesh.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x999999, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.95;
    this.npcXuMesh.add(head);

    this.npcXuMesh.position.copy(this.xuPosition);
    this.scene.add(this.npcXuMesh);
  }

  private spawnFalseSaintBoss(): void {
    this.boss = new FalseSaintBoss(
      this.scene,
      this.inkParticles,
      this.playerGroup,
      this.playerController
    );
  }

  private spawnMonasteryMobs(): void {
    const spawns = [
      new THREE.Vector3(-14, 0, -14),
      new THREE.Vector3(15, 0, -5),
      new THREE.Vector3(-15, 0, 12),
    ];
    spawns.forEach((pos, idx) => {
      const gruntDef: EnemyDef = {
        id: `false_disciple_${idx}`,
        type: "grunt",
        position: pos,
        health: 90,
        maxHealth: 90,
        damage: 16,
        speed: 3.8,
        patrolPoints: [pos.clone(), pos.clone().add(new THREE.Vector3(-3, 0, 3))],
      };
      const enemy = new EnemyAI(gruntDef, this.scene, this.inkParticles, this.playerGroup, this.playerController);
      this.enemies.push(enemy);
    });
  }

  private buildBloodLotusMarshlands(): void {
    // ─── Swamp Lighting & Fog ──────────────────
    const ambientLight = new THREE.AmbientLight(0x223322, 0.85); // dark swamp green tint
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x882222, 0.6); // faint crimson direct light
    directionalLight.position.set(-5, 10, -5);
    this.scene.add(directionalLight);

    // Mud ground plane with height variation representing marsh pools
    const groundGeo = new THREE.PlaneGeometry(100, 100, 15, 15);
    const posAttr = groundGeo.getAttribute("position");
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      // wavy dips for puddle channels
      const height = (Math.sin(x * 0.12) * Math.cos(y * 0.12)) * 0.5 - 0.2;
      posAttr.setZ(i, height);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshLambertMaterial({
      color: 0x1f1a17, // very dark mud
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.6;
    this.scene.add(ground);

    // Spawn warped willow trees
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 6.0) continue; // save room for player and npc

      this.createWarpedWillow(x, z);
      this.collisions.addCollider({
        id: `willow_${i}`,
        type: "cylinder",
        position: new THREE.Vector3(x, 0, z),
        radius: 1.4,
        height: 6,
      });
    }

    // Spawn decorative blood lotuses
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 4.0) continue;
      this.createBloodLotusFlower(x, z);
    }

    // Spawn Meditation/Save Shrine
    this.createMeditationShrine(0, 8);
    this.collisions.addCollider({
      id: "shrine",
      type: "cylinder",
      position: this.shrinePosition,
      radius: 1.4,
      height: 3,
    });

    // Spawn NPC Dr. Shen
    this.spawnDrShenNPC();

    // Spawn Boss: The Crimson Bloom!
    this.spawnCrimsonBloomBoss();

    // Spawn swamp mobs
    this.spawnMarshMobs();

    // Spawn Ink Rift
    this.createInkRift(this.riftPosition.x, this.riftPosition.z);
    this.collisions.addCollider({
      id: "ink_rift",
      type: "cylinder",
      position: this.riftPosition,
      radius: 1.5,
      height: 3,
    });
  }

  private createWarpedWillow(x: number, z: number): void {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x221a1a, flatShading: true });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2a332a, flatShading: true });

    // Bent trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.45, 3.5, 5), trunkMat);
    trunk.position.y = 1.75;
    trunk.rotation.z = (Math.random() - 0.5) * 0.4;
    trunk.rotation.x = (Math.random() - 0.5) * 0.4;
    group.add(trunk);

    // Drooping foliage chunks
    for (let i = 0; i < 3; i++) {
      const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 - i * 0.2, 0), leafMat);
      leaves.position.set((Math.random() - 0.5) * 0.5, 3.0 + i * 0.6, (Math.random() - 0.5) * 0.5);
      group.add(leaves);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private createBloodLotusFlower(x: number, z: number): void {
    const group = new THREE.Group();
    const leafMat = new THREE.MeshBasicMaterial({ color: 0x1f2b1f }); // pad
    const flowerMat = new THREE.MeshBasicMaterial({ color: 0xaa2222 }); // blood-red blossom

    // Lotus pad
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.05, 5), leafMat);
    pad.position.y = -0.55;
    group.add(pad);

    // Flower bud
    const bud = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 4), flowerMat);
    bud.position.y = -0.4;
    group.add(bud);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private spawnDrShenNPC(): void {
    this.npcXuMesh = new THREE.Group();

    // Body (dark apothecary robes)
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.42, 1.1, 5);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x222225, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    this.npcXuMesh.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x777788, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.9;
    this.npcXuMesh.add(head);

    // Bamboo hat
    const hatGeo = new THREE.ConeGeometry(0.55, 0.22, 6);
    const hatMat = new THREE.MeshLambertMaterial({ color: 0x3d352b, flatShading: true });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 2.15;
    this.npcXuMesh.add(hat);

    // Apothecary box pack on back
    const boxGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const boxMat = new THREE.MeshLambertMaterial({ color: 0x473926, flatShading: true });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 1.25, -0.35);
    this.npcXuMesh.add(box);

    this.npcXuMesh.position.copy(this.xuPosition);
    this.scene.add(this.npcXuMesh);
  }

  private spawnCrimsonBloomBoss(): void {
    this.boss = new CrimsonBloomBoss(
      this.scene,
      this.inkParticles,
      this.playerGroup,
      this.playerController
    );
  }

  private spawnMarshMobs(): void {
    const spawns = [
      new THREE.Vector3(-15, 0, -12),
      new THREE.Vector3(12, 0, -15),
      new THREE.Vector3(-8, 0, 14),
    ];
    spawns.forEach((pos, idx) => {
      const gruntDef: EnemyDef = {
        id: `marsh_ghoul_${idx}`,
        type: "grunt",
        position: pos,
        health: 110,
        maxHealth: 110,
        damage: 18,
        speed: 3.0,
        patrolPoints: [pos.clone(), pos.clone().add(new THREE.Vector3(3, 0, -3))],
      };
      const enemy = new EnemyAI(gruntDef, this.scene, this.inkParticles, this.playerGroup, this.playerController);
      this.enemies.push(enemy);
    });
  }

  private buildHeavenlyGate(): void {
    // ─── Lighting ──────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.55);
    directionalLight.position.set(5, 12, 5);
    this.scene.add(directionalLight);

    // Ink clouds/atmosphere
    this.postProcess.updateSettings({
      threshold: 0.46,
      ditherStrength: 0.05,
    });

    // Void floor: floating tiles / pathway
    const floorGeo = new THREE.BoxGeometry(100, 1, 100);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee, flatShading: true });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.5;
    this.scene.add(floorMesh);
    this.collisions.addCollider({
      id: "floor",
      type: "box",
      position: floorMesh.position,
      halfSize: new THREE.Vector3(50, 0.5, 50),
    });

    // Portal / Heavenly Pillar in the center
    const pillarGeo = new THREE.CylinderGeometry(1.5, 2.0, 25, 6);
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true });
    const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
    pillarMesh.position.set(0, 12.5, -28);
    this.scene.add(pillarMesh);

    // Save shrine / Meditation spot
    this.createMeditationShrine(0, 8);
    this.collisions.addCollider({
      id: "shrine",
      type: "cylinder",
      position: this.shrinePosition,
      radius: 1.4,
      height: 3,
    });

    // Spawn Old Xu NPC near player start
    this.spawnOldXuNPC();

    // Spawn final boss!
    this.spawnForgottenPathBoss();
  }

  private spawnForgottenPathBoss(): void {
    this.boss = new ForgottenPathBoss(
      this.scene,
      this.inkParticles,
      this.playerGroup,
      this.playerController
    );
  }

  private applyEndingFilter(): void {
    const store = useGameStore.getState();
    if (store.story.completedQuests.includes("conquer_forgotten_path")) {
      const righteous = store.player.alignment.righteous;
      const demonic = store.player.alignment.demonic;
      if (demonic > 60) {
        this.postProcess.updateSettings({ inkMode: 1 });
      } else if (righteous > 60) {
        this.postProcess.updateSettings({ inkMode: 2 });
      } else {
        this.postProcess.updateSettings({ inkMode: 3 });
      }
    } else {
      this.postProcess.updateSettings({ inkMode: 0 });
    }
  }

  /**
   * Handle resizing across window restore, maximize, and fullscreen.
   */
  public onResize(): void {
    if (!this.canvas || !this.renderer || !this.camera) return;

    // Read full viewport dimensions from window or parent to prevent half-screen locked aspect ratios
    const width = Math.max(
      window.innerWidth || 0,
      this.canvas.parentElement?.clientWidth || 0,
      document.documentElement.clientWidth || 0,
      this.canvas.clientWidth || 0
    );
    const height = Math.max(
      window.innerHeight || 0,
      this.canvas.parentElement?.clientHeight || 0,
      document.documentElement.clientHeight || 0,
      this.canvas.clientHeight || 0
    );

    if (width <= 0 || height <= 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // updateStyle = false prevents Three.js from setting inline style.width/height on canvas
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
    this.postProcess.setSize(width, height);
  }

  private onVirtualAction = (e: CustomEvent<{ action: string; held?: boolean }>): void => {
    const { action, held } = e.detail;
    if (this.input) {
      if (held === true) {
        this.input.getState().held.add(action as GameAction);
      } else if (held === false) {
        this.input.getState().held.delete(action as GameAction);
      } else {
        this.input.queueVirtualAction(action as GameAction);
      }
      // Also queue justPressed if it's DRAGON_MOUNT or one-shot action
      if (action === "DRAGON_MOUNT" || action === "EXECUTE" || action === "AXE_THROW_RECALL" || action === "TOGGLE_VIEW" || action === "JUMP") {
        this.input.queueVirtualAction(action as GameAction);
      }
      if (action === "TOGGLE_VIEW") {
        const isFPV = this.cameraController.toggleFirstPerson();
        if (this.mythicPlayerParts?.group) {
          this.mythicPlayerParts.group.visible = !isFPV;
        }
        useGameStore.getState().setBattleBanner(
          isFPV ? "VIEW: FIRST-PERSON (FPV) [V]" : "VIEW: THIRD-PERSON (POV) [V]",
          1.5
        );
      }
    }
  };

  /**
   * Cleanup resource bindings.
   */
  dispose(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.handleWindowResize);
    window.removeEventListener("orientationchange", this.handleWindowResize);
    document.removeEventListener("fullscreenchange", this.handleWindowResize);
    document.removeEventListener("webkitfullscreenchange", this.handleWindowResize as EventListener);
    this.chunkManager?.dispose();
    this.dragonBeamWeapon?.dispose();
    this.input?.dispose();
    this.postProcess?.dispose();
    this.inkParticles?.dispose();
    this.renderer?.dispose();
    window.removeEventListener("gameDialogueChoice", this.onDialogueChoice as EventListener);
    window.removeEventListener("gameVirtualAction", this.onVirtualAction as EventListener);
  }

  /** Get current FPS */
  getFPS(): number {
    return this.clock.fps;
  }

  /**
   * Trigger 3D Awakening Descent Sequence for player
   */
  public triggerAwakening(): void {

    // Fallback: standard prologue awakening
    if (this.prologueSequence) {
      this.prologueSequence.triggerAwakening();
    }
    if (this.playerController) {
      this.playerController.triggerAwakeningSequence();
    }
  }

  /**
   * Skip the cinematic intro (called by UI skip button)
   */
  public skipCinematicIntro(): void {
    if (this.cinematicIntro?.isActive) {
      this.cinematicIntro.skip();
    }
  }

  /**
   * Set celestial time of day (0-24 hour), immediately updating lighting, sky, ocean and fog
   */
  public setTimeOfDay(hour: number): void {
    if (this.dayNightCycle) {
      this.dayNightCycle.setTime(hour, undefined, this.camera);
      if (this.hemiLight) {
        this.dayNightCycle.updateHemiLight(this.hemiLight);
      }
      if (this.oceanProps) {
        const sunDir = this.dayNightCycle.getSunDirection();
        const sunAlt = this.dayNightCycle.getState().sunAltitude;
        OceanWorldBuilder.updateOcean(this.oceanProps, performance.now() * 0.001, sunDir, sunAlt);
      }
      const fogParams = this.dayNightCycle.getFogParams();
      if (this.scene.fog) {
        (this.scene.fog as THREE.Fog).color.copy(fogParams.color);
        (this.scene.fog as THREE.Fog).near = fogParams.near;
        (this.scene.fog as THREE.Fog).far = fogParams.far;
      }
      this.renderer?.setClearColor(fogParams.color, 1);
      useGameStore.getState().setTimeOfDay(hour);
    }
  }

  /**
   * Set celestial time flow speed multiplier (0 = paused, 1x, 3x, 10x)
   */
  public setTimeSpeed(speed: number): void {
    if (this.dayNightCycle) {
      this.dayNightCycle.setTimeSpeed(speed);
      useGameStore.getState().setTimeSpeed(speed);
    }
  }
}
