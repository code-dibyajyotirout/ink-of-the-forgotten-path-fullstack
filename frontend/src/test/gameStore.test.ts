import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../stores/gameStore';

describe('GameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('should initialize with correct default state', () => {
    const state = useGameStore.getState();
    expect(state.isLoaded).toBe(false);
    expect(state.player.health.current).toBe(100);
    expect(state.player.qi.current).toBe(50);
    expect(state.player.stamina.current).toBe(100);
    expect(state.player.stance).toBe('flowing_wind');
  });

  it('should handle damage correctly and trigger death screen at 0 HP', () => {
    const store = useGameStore.getState();
    
    // Take minor damage
    store.takeDamage(30);
    expect(useGameStore.getState().player.health.current).toBe(70);
    expect(useGameStore.getState().ui.showDeathScreen).toBe(false);

    // Take fatal damage
    store.takeDamage(80);
    expect(useGameStore.getState().player.health.current).toBe(0);
    expect(useGameStore.getState().ui.showDeathScreen).toBe(true);
  });

  it('should heal correctly but not exceed max HP', () => {
    const store = useGameStore.getState();
    
    store.takeDamage(50);
    expect(useGameStore.getState().player.health.current).toBe(50);

    store.heal(30);
    expect(useGameStore.getState().player.health.current).toBe(80);

    store.heal(50);
    expect(useGameStore.getState().player.health.current).toBe(100); // capped at max
  });

  it('should manage stamina consumption and regeneration', () => {
    const store = useGameStore.getState();

    // Consume stamina
    const success1 = store.useStamina(40);
    expect(success1).toBe(true);
    expect(useGameStore.getState().player.stamina.current).toBe(60);

    // Try to consume more than available
    const success2 = store.useStamina(80);
    expect(success2).toBe(false);
    expect(useGameStore.getState().player.stamina.current).toBe(60);

    // Regenerate
    store.regenStamina(20);
    expect(useGameStore.getState().player.stamina.current).toBe(80);
  });

  it('should manage Qi consumption and regeneration', () => {
    const store = useGameStore.getState();

    const success1 = store.useQi(20);
    expect(success1).toBe(true);
    expect(useGameStore.getState().player.qi.current).toBe(30);

    const success2 = store.useQi(40);
    expect(success2).toBe(false);
    expect(useGameStore.getState().player.qi.current).toBe(30);

    store.regenQi(10);
    expect(useGameStore.getState().player.qi.current).toBe(40);
  });

  it('should cycle stance correctly', () => {
    const store = useGameStore.getState();
    expect(store.player.stance).toBe('flowing_wind');

    // Cycle forward
    store.cycleStance(1);
    expect(useGameStore.getState().player.stance).toBe('thunderclap');

    store.cycleStance(1);
    expect(useGameStore.getState().player.stance).toBe('iron_body');

    store.cycleStance(1);
    expect(useGameStore.getState().player.stance).toBe('flowing_wind');

    // Cycle backward
    store.cycleStance(-1);
    expect(useGameStore.getState().player.stance).toBe('iron_body');
  });

  it('should manage inventory items correctly', () => {
    const store = useGameStore.getState();

    const item = {
      id: 'test_item',
      name: 'Test Item',
      type: 'scroll' as const,
      quantity: 1,
      description: 'A test item'
    };

    store.addItem(item);
    expect(useGameStore.getState().player.inventory).toHaveLength(1);
    expect(useGameStore.getState().player.inventory[0].quantity).toBe(1);

    // Add same item again to increase quantity
    store.addItem(item);
    expect(useGameStore.getState().player.inventory).toHaveLength(1);
    expect(useGameStore.getState().player.inventory[0].quantity).toBe(2);

    // Remove quantity
    store.removeItem('test_item', 1);
    expect(useGameStore.getState().player.inventory[0].quantity).toBe(1);

    // Remove fully
    store.removeItem('test_item', 1);
    expect(useGameStore.getState().player.inventory).toHaveLength(0);
  });
});
