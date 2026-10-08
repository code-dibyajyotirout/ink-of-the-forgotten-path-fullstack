import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { HollowWindBoss } from '../engine/combat/HollowWindBoss';
import { useGameStore } from '../stores/gameStore';

describe('Test 10: HollowWindBoss Fight', () => {
  let scene: THREE.Scene;
  let mockParticles: any;
  let playerGroup: THREE.Group;
  let mockPlayerController: any;
  let boss: HollowWindBoss;

  beforeEach(() => {
    useGameStore.getState().resetGame();

    scene = new THREE.Scene();
    mockParticles = { emitAmbient: vi.fn(), burst: vi.fn() };
    playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 0);

    mockPlayerController = {
      state: 'idle',
      playerGroup,
      receiveHit: vi.fn().mockReturnValue(false),
    };

    boss = new HollowWindBoss(
      scene,
      mockParticles as any,
      playerGroup,
      mockPlayerController as any
    );
  });

  it('starts in intro state with 350 HP', () => {
    expect(boss.state).toBe('intro');
    expect(boss.getHealth()).toBe(350);
    expect(boss.getMaxHealth()).toBe(350);
  });

  it('transitions to fight when player is within 22 units', () => {
    // Boss is at (0,0,-25). Move player close.
    playerGroup.position.set(0, 0, -10);
    boss.update(0.1);
    expect(boss.state).toBe('fight');
  });

  it('stays in intro when player is far away', () => {
    playerGroup.position.set(0, 0, 50);
    boss.update(0.1);
    expect(boss.state).toBe('intro');
  });

  it('triggers boss HUD via setActiveBoss on fight entry', () => {
    playerGroup.position.set(0, 0, -10);
    boss.update(0.1);
    const ui = useGameStore.getState().ui;
    expect(ui.activeBoss).not.toBeNull();
    expect(ui.activeBoss?.name).toBe('The Hollow Wind Calamity');
    expect(ui.activeBoss?.maxHP).toBe(350);
  });

  it('takes damage and updates boss HP in store', () => {
    playerGroup.position.set(0, 0, -10);
    boss.update(0.1); // enter fight

    boss.takeDamage(50);
    expect(boss.getHealth()).toBe(300);
    expect(useGameStore.getState().ui.activeBoss?.currentHP).toBe(300);
  });

  it('enters phase 2 at 70% HP (245 HP)', () => {
    playerGroup.position.set(0, 0, -10);
    boss.update(0.1); // enter fight

    boss.takeDamage(106); // 350 - 106 = 244, below 70% threshold
    boss.update(0.1); // phase check runs in update
    expect((boss as any).phase).toBe(2);
  });

  it('enters phase 3 at 30% HP (105 HP)', () => {
    playerGroup.position.set(0, 0, -10);
    boss.update(0.1);

    // First cross 70% threshold to enter phase 2
    boss.takeDamage(110); // 350 - 110 = 240, below 70%
    boss.update(0.1);
    expect((boss as any).phase).toBe(2);

    // Then cross 30% threshold
    boss.takeDamage(140); // 240 - 140 = 100, below 30%
    boss.update(0.1);
    expect((boss as any).phase).toBe(3);
  });

  it('transitions to stagger when stunTimer is set', () => {
    playerGroup.position.set(0, 0, -10);
    boss.update(0.1); // enter fight

    // Simulate parry stun
    (boss as any).stunTimer = 1.2;
    (boss as any).transitionTo('stagger');
    expect(boss.state).toBe('stagger');

    // Recover after stunTimer expires
    boss.update(1.3);
    expect(boss.state).toBe('fight');
  });

  it('transitions to dead and grants 1500 Qi Essence', () => {
    playerGroup.position.set(0, 0, -10);
    boss.update(0.1);

    boss.takeDamage(350);
    expect(boss.state).toBe('dead');
    expect(boss.getHealth()).toBe(0);
    expect(useGameStore.getState().player.qiEssence).toBe(1500);
    expect(useGameStore.getState().world.defeatedBosses).toContain('hollow_wind');
    expect(useGameStore.getState().ui.activeBoss).toBeNull();
  });

  it('does not process updates when dead', () => {
    playerGroup.position.set(0, 0, -10);
    boss.update(0.1);
    boss.takeDamage(350);
    expect(boss.state).toBe('dead');

    // Further updates should be no-ops
    boss.update(1.0);
    expect(boss.state).toBe('dead');
  });

  it('cleans up active ripples on death', () => {
    playerGroup.position.set(0, 0, -10);
    boss.update(0.1);

    // Manually spawn a ripple
    (boss as any).spawnSoundRipple(new THREE.Vector3(0, 0, 0), 12.0);
    expect((boss as any).activeRipples.length).toBe(1);

    boss.takeDamage(350);
    expect((boss as any).activeRipples.length).toBe(0);
  });
});
