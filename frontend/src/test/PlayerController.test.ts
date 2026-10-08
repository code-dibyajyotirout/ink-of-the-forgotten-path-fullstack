import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { PlayerController } from '../engine/combat/PlayerController';
import { GameAction, InputState } from '../engine/input/InputManager';
import { useGameStore } from '../stores/gameStore';

function createInput(overrides?: Partial<InputState>): InputState {
  return {
    held: new Set<GameAction>(),
    justPressed: new Set<GameAction>(),
    justReleased: new Set<GameAction>(),
    moveAxis: { x: 0, y: 0 },
    cameraAxis: { x: 0, y: 0 },
    pointer: { x: 0, y: 0 },
    pointerDown: false,
    doubleTapLeft: false,
    doubleTapRight: false,
    ...overrides,
  };
}

function buildPlayerGroup(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial();
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  rightArm.position.set(0.5, 1.2, 0);
  g.add(rightArm);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  leftArm.position.set(-0.5, 1.2, 0);
  g.add(leftArm);
  const body = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  body.position.set(0, 1.2, 0);
  g.add(body);
  // Legs for extractLimbs
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  rightLeg.position.set(0.15, 0.35, 0);
  g.add(rightLeg);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  leftLeg.position.set(-0.15, 0.35, 0);
  g.add(leftLeg);
  return g;
}

function createController() {
  useGameStore.getState().resetGame();
  useGameStore.getState().setProfession('sword_sage');
  useGameStore.setState((s) => {
    s.player.health = { current: 90, max: 90 };
    s.player.stamina = { current: 100, max: 100 };
    s.player.qi = { current: 50, max: 50 };
  });

  const playerGroup = buildPlayerGroup();
  const scene = new THREE.Scene();
  scene.add(playerGroup);

  const mockParticles = {
    emitAmbient: vi.fn(),
    burst: vi.fn(),
    emitBurst: vi.fn(),
    createShockwave: vi.fn(),
  };
  const mockCamera = {
    getForwardDirection: vi.fn().mockReturnValue(new THREE.Vector3(0, 0, -1)),
    getRightDirection: vi.fn().mockReturnValue(new THREE.Vector3(1, 0, 0)),
    addShake: vi.fn(),
    triggerRadialBlur: vi.fn(),
  };
  const mockCollisions = {
    resolveCollision: vi.fn().mockReturnValue(false),
    getGroundHeight: vi.fn().mockReturnValue(0),
    isNearWall: vi.fn().mockReturnValue({ near: false, normal: null }),
  };

  const pc = new PlayerController(playerGroup, mockParticles as any, mockCamera as any, mockCollisions as any);
  return { pc, playerGroup, mockCamera, mockParticles };
}

// ── Test 2: Basic Movement ──
describe('Test 2: Basic Movement', () => {
  it('transitions idle ↔ run based on moveAxis', () => {
    const { pc } = createController();
    expect(pc.state).toBe('idle');
    pc.update(0.016, createInput({ moveAxis: { x: 1, y: 0 } }));
    expect(pc.state).toBe('run');
    pc.update(0.016, createInput());
    expect(pc.state).toBe('idle');
  });

  it('moves at ~6 units/sec', () => {
    const { pc, playerGroup } = createController();
    const startX = playerGroup.position.x;
    // Move right for 1 second (62 frames at 16ms)
    for (let i = 0; i < 62; i++) {
      pc.update(0.016, createInput({ moveAxis: { x: 1, y: 0 } }));
    }
    const dist = Math.abs(playerGroup.position.x - startX);
    expect(dist).toBeGreaterThan(4.5);
    expect(dist).toBeLessThan(7.5);
  });
});

// ── Test 3: Light Attack Combo (3-Hit Chain) ──
describe('Test 3: Light Attack Combo', () => {
  it('chains attack_light_1 → 2 → 3 with buffered inputs', () => {
    const { pc } = createController();

    // First attack
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.ATTACK]) }));
    expect(pc.state).toBe('attack_light_1');

    // Buffer second attack during first, then advance past 0.28s
    pc.update(0.1, createInput({ justPressed: new Set([GameAction.ATTACK]) }));
    pc.update(0.2, createInput());
    expect(pc.state).toBe('attack_light_2');

    // Buffer third
    pc.update(0.1, createInput({ justPressed: new Set([GameAction.ATTACK]) }));
    pc.update(0.2, createInput());
    expect(pc.state).toBe('attack_light_3');
  });

  it('returns to idle if combo is not continued', () => {
    const { pc } = createController();
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.ATTACK]) }));
    expect(pc.state).toBe('attack_light_1');
    // Wait past 0.4s recovery
    pc.update(0.45, createInput());
    expect(pc.state).toBe('idle');
  });

  it('consumes 12 stamina per light attack', () => {
    const { pc } = createController();
    const before = useGameStore.getState().player.stamina.current;
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.ATTACK]) }));
    // Stamina consumed 12 but regenerated slightly during tick
    expect(useGameStore.getState().player.stamina.current).toBeLessThan(before);
    expect(useGameStore.getState().player.stamina.current).toBeGreaterThan(before - 13);
  });
});

// ── Test 4: Heavy Attack ──
describe('Test 4: Heavy Attack', () => {
  it('transitions to attack_heavy and recovers to idle after ~0.75s', () => {
    const { pc } = createController();
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.HEAVY_ATTACK]) }));
    expect(pc.state).toBe('attack_heavy_charge');
    pc.update(0.016, createInput());
    expect(pc.state).toBe('attack_heavy');

    // Advance past 0.75s
    pc.update(0.4, createInput());
    pc.update(0.4, createInput());
    expect(pc.state).toBe('idle');
  });

  it('can be dodge-cancelled after 0.4s', () => {
    const { pc } = createController();
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.HEAVY_ATTACK]), held: new Set([GameAction.HEAVY_ATTACK]) }));
    expect(pc.state).toBe('attack_heavy_charge');

    // At 0.45s, dodge cancel should work
    pc.update(0.45, createInput({ justPressed: new Set([GameAction.DODGE]) }));
    expect(pc.state).toBe('dodge');
  });

  it('costs 25 stamina', () => {
    const { pc } = createController();
    const before = useGameStore.getState().player.stamina.current;
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.HEAVY_ATTACK]) }));
    expect(useGameStore.getState().player.stamina.current).toBeLessThan(before - 24);
  });
});

// ── Test 5: Dodge (Directional) ──
describe('Test 5: Dodge Directional', () => {
  it('dodges forward when no movement input', () => {
    const { pc } = createController();
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.DODGE]) }));
    expect(pc.state).toBe('dodge');
    expect((pc as any).isInvulnerable).toBe(true);
  });

  it('dodges left when A is held', () => {
    const { pc } = createController();
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.DODGE]), moveAxis: { x: -1, y: 0 } }));
    expect((pc as any).dodgeDirection.x).toBeCloseTo(-1);
  });

  it('restores rotation after dodge completes', () => {
    const { pc, playerGroup } = createController();
    playerGroup.rotation.y = 1.5;
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.DODGE]) }));
    // Advance past dodgeDuration (0.4s)
    for (let i = 0; i < 30; i++) pc.update(0.016, createInput());
    expect(playerGroup.rotation.y).toBeCloseTo(1.5, 0);
    expect(pc.state).toBe('idle');
  });

  it('costs 20 stamina', () => {
    const { pc } = createController();
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.DODGE]) }));
    // 100 - 20 = 80, plus slight regen
    expect(useGameStore.getState().player.stamina.current).toBeCloseTo(80.264, 1);
  });
});

// ── Test 6: Block & Parry ──
describe('Test 6: Block & Parry', () => {
  it('enters and exits block state', () => {
    const { pc } = createController();
    pc.update(0.016, createInput({ held: new Set([GameAction.BLOCK]) }));
    expect(pc.state).toBe('block');
    pc.update(0.016, createInput());
    expect(pc.state).toBe('idle');
  });

  it('perfect parry within parry window restores Qi/Stamina/HP', () => {
    const { pc } = createController();
    useGameStore.setState((s) => { s.player.qi.current = 10; });
    pc.update(0.016, createInput({ held: new Set([GameAction.BLOCK]) }));
    expect(pc.state).toBe('block');

    // Hit immediately (within 300ms parry window for Sword Sage)
    const result = pc.receiveHit(15, new THREE.Vector3(0, 0, -2));
    expect(result).toBe(true); // parry returns true
    expect(pc.state).toBe('parry');
    // Qi gained 25 from parry
    expect(useGameStore.getState().player.qi.current).toBeGreaterThan(30);
  });

  it('regular block (past parry window) mitigates damage', () => {
    const { pc } = createController();
    pc.update(0.016, createInput({ held: new Set([GameAction.BLOCK]) }));
    pc.update(0.35, createInput({ held: new Set([GameAction.BLOCK]) }));

    const hpBefore = useGameStore.getState().player.health.current;
    pc.receiveHit(10, new THREE.Vector3(0, 0, -2));
    const hpAfter = useGameStore.getState().player.health.current;
    expect(hpAfter).toBeLessThan(hpBefore);
    expect(hpAfter).toBeGreaterThan(hpBefore - 10); // blocked some
  });
});

// ── Test 7: Player Hit Reception & Stagger ──
describe('Test 7: Hit Reception & Stagger', () => {
  it('hits < 8 damage do NOT stagger', () => {
    const { pc } = createController();
    pc.receiveHit(5, new THREE.Vector3(0, 0, -2));
    expect(pc.state).toBe('idle');
    expect(useGameStore.getState().player.health.current).toBe(85);
  });

  it('hits >= 8 damage DO stagger', () => {
    const { pc } = createController();
    pc.receiveHit(10, new THREE.Vector3(0, 0, -2));
    expect(pc.state).toBe('stagger');
    expect(useGameStore.getState().player.health.current).toBe(80);
  });

  it('grants i-frames after stagger (0.45s)', () => {
    const { pc } = createController();
    pc.receiveHit(10, new THREE.Vector3(0, 0, -2));
    expect((pc as any).isInvulnerable).toBe(true);
    expect((pc as any).invulnerableTimer).toBeCloseTo(0.45);
  });

  it('grants brief i-frames (0.2s) for minor hits', () => {
    const { pc } = createController();
    pc.receiveHit(5, new THREE.Vector3(0, 0, -2));
    expect((pc as any).isInvulnerable).toBe(true);
    expect((pc as any).invulnerableTimer).toBeCloseTo(0.2);
  });

  it('ignores damage during invulnerability', () => {
    const { pc } = createController();
    pc.receiveHit(10, new THREE.Vector3(0, 0, -2));
    const hpAfterFirst = useGameStore.getState().player.health.current;
    // Second hit during i-frames should be ignored
    const result = pc.receiveHit(10, new THREE.Vector3(0, 0, -2));
    expect(result).toBe(false);
    expect(useGameStore.getState().player.health.current).toBe(hpAfterFirst);
  });
});

// ── Test 11: Cheat Death (Meridian Core Backflow) ──
describe('Test 11: Cheat Death', () => {
  it('activates when Qi >= 50 on lethal damage', () => {
    const { pc } = createController();
    useGameStore.setState((s) => { s.player.qi.current = 50; });

    pc.receiveHit(999, new THREE.Vector3(0, 0, -2));
    const state = useGameStore.getState();
    // Should NOT be dead — cheat death triggered
    expect(pc.state).toBe('idle');
    expect(state.player.qi.current).toBe(0); // all qi consumed
    expect(state.player.health.current).toBe(Math.round(90 * 0.4)); // 40% restored
    expect((pc as any).isInvulnerable).toBe(true);
    expect((pc as any).invulnerableTimer).toBeCloseTo(1.8);
  });

  it('does NOT activate when Qi < 50', () => {
    const { pc } = createController();
    useGameStore.setState((s) => { s.player.qi.current = 30; });

    pc.receiveHit(999, new THREE.Vector3(0, 0, -2));
    // receiveHit uses stale snapshot, so death detected on next update()
    pc.update(0.016, createInput());
    expect(pc.state).toBe('dead');
    expect(useGameStore.getState().player.health.current).toBe(0);
  });
});

// ── Test 12: Stamina & Qi Regeneration ──
describe('Test 12: Stamina & Qi Regeneration', () => {
  it('regens stamina faster when idle (35/s base)', () => {
    const { pc } = createController();
    useGameStore.setState((s) => { s.player.stamina.current = 50; });

    // 1 second idle
    for (let i = 0; i < 62; i++) pc.update(0.016, createInput());
    const stamina = useGameStore.getState().player.stamina.current;
    // 35 * 1.1 (staminaRegenMod) * 1s ≈ 38.5 gained
    expect(stamina).toBeGreaterThan(80);
  });

  it('regens stamina slower during combat (15/s base)', () => {
    const { pc } = createController();
    useGameStore.setState((s) => { s.player.stamina.current = 50; });

    // Attack then check regen during attack state
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.ATTACK]) }));
    const staminaAfterAttack = useGameStore.getState().player.stamina.current;
    pc.update(0.1, createInput());
    const staminaAfterRegen = useGameStore.getState().player.stamina.current;
    // Combat regen is 15 * 1.1 * 0.1s ≈ 1.65
    const regenAmount = staminaAfterRegen - staminaAfterAttack;
    expect(regenAmount).toBeGreaterThan(0.5);
    expect(regenAmount).toBeLessThan(4);
  });

  it('regens health after 3s idle (8 HP/s)', () => {
    const { pc } = createController();
    useGameStore.setState((s) => { s.player.health.current = 50; });

    // Stand idle for 4 seconds
    for (let i = 0; i < 250; i++) pc.update(0.016, createInput());
    const hp = useGameStore.getState().player.health.current;
    // After ~4s, 3s warmup + 1s of 8HP/s = ~58
    expect(hp).toBeGreaterThan(55);
  });
});

// ── Test 14: Jump Mechanics ──
describe('Test 14: Jump Mechanics', () => {
  it('jumps with velocity 8.5 when grounded and idle', () => {
    const { pc, playerGroup } = createController();
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.JUMP]) }));
    expect((pc as any).isGrounded).toBe(false);
    expect((pc as any).velocityY).toBeGreaterThan(8);
    // Position rises on next frame after velocity is set
    pc.update(0.016, createInput());
    expect(playerGroup.position.y).toBeGreaterThan(0);
  });

  it('cannot double-jump', () => {
    const { pc } = createController();
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.JUMP]) }));
    const vy = (pc as any).velocityY;
    // Try second jump in air
    pc.update(0.1, createInput({ justPressed: new Set([GameAction.JUMP]) }));
    // Velocity should have decreased due to gravity, not reset to 8.5
    expect((pc as any).velocityY).toBeLessThan(vy);
  });

  it('lands back to y=0', () => {
    const { pc, playerGroup } = createController();
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.JUMP]) }));
    // Simulate ~1.5 seconds of gravity
    for (let i = 0; i < 100; i++) pc.update(0.016, createInput());
    expect(playerGroup.position.y).toBe(0);
    expect((pc as any).isGrounded).toBe(true);
  });

  it('cannot jump during attack', () => {
    const { pc } = createController();
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.ATTACK]) }));
    expect(pc.state).toBe('attack_light_1');
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.JUMP]) }));
    expect((pc as any).isGrounded).toBe(true); // still grounded
  });
});

// ── Test 16: World Boundary Enforcement ──
describe('Test 16: World Boundary', () => {
  it('clamps player position to ±11500', () => {
    const { pc, playerGroup } = createController();
    playerGroup.position.set(15000, 0, -15000);
    pc.update(0.016, createInput());
    expect(playerGroup.position.x).toBe(11500);
    expect(playerGroup.position.z).toBe(-11500);
  });
});

// ── Test 17: Death & Respawn ──
// Note: receiveHit uses a stale store snapshot, so the HP>0 check inside
// receiveHit reads the old value. Death is detected on the next update() call.
describe('Test 17: Death & Respawn', () => {
  it('transitions to dead state and shows death screen', () => {
    const { pc } = createController();
    useGameStore.setState((s) => { s.player.qi.current = 0; }); // no cheat death
    pc.receiveHit(999, new THREE.Vector3(0, 0, -2));
    // Death detected on next update tick
    pc.update(0.016, createInput());
    expect(pc.state).toBe('dead');
    expect(useGameStore.getState().ui.showDeathScreen).toBe(true);
  });

  it('revivePlayer restores all stats and clears death screen', () => {
    useGameStore.getState().resetGame();
    useGameStore.getState().takeDamage(100);
    expect(useGameStore.getState().ui.showDeathScreen).toBe(true);

    useGameStore.getState().revivePlayer();
    const s = useGameStore.getState();
    expect(s.player.health.current).toBe(s.player.health.max);
    expect(s.player.stamina.current).toBe(s.player.stamina.max);
    expect(s.player.qi.current).toBe(s.player.qi.max);
    expect(s.player.position).toEqual([0, 0, 0]);
    expect(s.ui.showDeathScreen).toBe(false);
  });

  it('resurrection from dead → idle resets position', () => {
    const { pc, playerGroup } = createController();
    useGameStore.setState((s) => { s.player.qi.current = 0; });
    pc.receiveHit(999, new THREE.Vector3(0, 0, -2));
    pc.update(0.016, createInput()); // triggers death
    expect(pc.state).toBe('dead');

    // Simulate revive: restore health
    useGameStore.getState().revivePlayer();
    pc.update(0.016, createInput());
    expect(pc.state).toBe('idle');
    expect(playerGroup.position.x).toBe(0);
    expect(playerGroup.position.z).toBe(0);
  });
});

// ── Test: Weapon Clash Deflection ──
describe('Weapon Clash Deflection', () => {
  it('triggers weapon clash when player is hit during early attack frame', () => {
    const { pc } = createController();
    useGameStore.setState((s) => {
      s.player.health.current = 100;
    });

    // Start an attack
    pc.update(0.016, createInput({ justPressed: new Set([GameAction.ATTACK]) }));
    expect(pc.state).toBe('attack_light_1');
    expect(pc.stateTimer).toBe(0);

    // Take hit from front while attacking
    const result = pc.receiveHit(20, new THREE.Vector3(0, 0, -2));
    expect(result).toBe(true); // returns true to indicate offensive deflection/stagger on attacker
    expect(pc.state).toBe('attack_light_1'); // Hyper-armor: cleanly maintains attack state without recoiling into stagger!
    expect(useGameStore.getState().player.health.current).toBe(100); // strike cuts through incoming hit!
  });

  it('receives normal damage when hit while in idle or recovery', () => {
    const { pc } = createController();
    useGameStore.setState((s) => {
      s.player.health.current = 100;
    });

    // Start in idle
    expect(pc.state).toBe('idle');

    // Take hit
    const result = pc.receiveHit(20, new THREE.Vector3(0, 0, -2));
    expect(result).toBe(false); // regular hit, not a clash
    expect(useGameStore.getState().player.health.current).toBe(80); // damage taken
  });
});
