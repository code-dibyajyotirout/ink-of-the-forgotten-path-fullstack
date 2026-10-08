import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { EnemyAI, EnemyDef } from '../engine/combat/EnemyAI';
import { PlayerController } from '../engine/combat/PlayerController';

describe('EnemyAI Behavior State Machine', () => {
  let scene: THREE.Scene;
  let mockParticles: any;
  let playerGroup: THREE.Group;
  let mockPlayerController: any;
  let enemyDef: EnemyDef;
  let enemyAI: EnemyAI;

  beforeEach(() => {
    scene = new THREE.Scene();
    
    mockParticles = {
      emitAmbient: vi.fn(),
      burst: vi.fn(),
    };

    playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 0);

    mockPlayerController = {
      state: 'idle',
      playerGroup: playerGroup,
      receiveHit: vi.fn().mockReturnValue(false),
    };

    enemyDef = {
      id: 'grunt_1',
      type: 'grunt',
      position: new THREE.Vector3(10, 0, 0), // Starts far away
      health: 30,
      maxHealth: 30,
      damage: 8,
      speed: 3.5,
      patrolPoints: [new THREE.Vector3(10, 0, 0), new THREE.Vector3(15, 0, 0)],
    };

    enemyAI = new EnemyAI(
      enemyDef,
      scene,
      mockParticles as any,
      playerGroup,
      mockPlayerController as any
    );
  });

  it('should start in patrol state', () => {
    expect(enemyAI.state).toBe('patrol');
  });

  it('should transition to chase when player is within chase range', () => {
    // Grunt chaseRange is 7.5. Put player at 5 units away.
    playerGroup.position.set(5, 0, 0);
    
    enemyAI.update(0.1);
    expect(enemyAI.state).toBe('chase');
  });

  it('should transition to windup and attack when player is within attack range', () => {
    // Put player right next to the enemy (1.0 unit away)
    playerGroup.position.set(9.0, 0, 0);

    // Update once to trigger transition from patrol/chase to chase
    enemyAI.update(0.1);
    
    // Update again to transition from chase to windup
    enemyAI.update(0.1);
    expect(enemyAI.state).toBe('windup');

    // Windup lasts for 0.5s for grunts. Let's update past it (0.55s) to trigger the attack
    enemyAI.update(0.55);
    expect(enemyAI.state).toBe('attack');
  });

  it('should decrease health when taking damage', () => {
    expect((enemyAI as any).health).toBe(30);
    enemyAI.takeDamage(10);
    expect((enemyAI as any).health).toBe(20);
    expect(enemyAI.state).toBe('stagger'); // Should transition to stagger state
  });

  it('should transition to dead when health reaches zero', () => {
    enemyAI.takeDamage(30);
    expect(enemyAI.state).toBe('dead');
  });

  it('should slow down in slow zones and recover properly', () => {
    expect(enemyAI.speedModifier).toBe(1.0);
    
    // Apply speed slow
    enemyAI.speedModifier = 0.4;
    
    // During update, the speedModifier will recover back towards 1.0 slowly if not refreshed
    enemyAI.update(1.0);
    expect(enemyAI.speedModifier).toBeGreaterThan(0.4);
  });
});
