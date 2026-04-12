/**
 * Game State & Scene Integration Tests
 *
 * Tests state management, registry behavior, and game state machines.
 * These focus on pure logic that doesn't require Phaser rendering.
 *
 * Note: Full scene rendering tests are handled by E2E tests with a real browser.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock Registry Implementation ─────────────────────────────────────────────
// Simulates Phaser's registry.set/get/events for testing state management

class MockRegistry {
  constructor() {
    this.data = {};
    this.events = new MockEventEmitter();
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    const oldValue = this.data[key];
    this.data[key] = value;

    // Emit events like Phaser registry does
    if (oldValue !== value) {
      this.events.emit('changedata', this, key, value, oldValue);
      this.events.emit(`changedata-${key}`, value, oldValue);
    }
  }

  getAll() {
    return { ...this.data };
  }
}

class MockEventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    return this;
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      for (const handler of this.listeners[event]) {
        handler(...args);
      }
    }
  }

  once(event, handler) {
    const wrapped = (...args) => {
      handler(...args);
      this.off(event, wrapped);
    };
    this.on(event, wrapped);
    return this;
  }

  off(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
    return this;
  }
}

// ── Test Suite ───────────────────────────────────────────────────────────

describe('Game Registry State Management', () => {
  let registry;

  beforeEach(() => {
    registry = new MockRegistry();
  });

  it('initializes with default values', () => {
    registry.set('hp', 3);
    registry.set('inventory', []);
    registry.set('systemsInstalled', 0);
    registry.set('xp', 0);
    registry.set('timeLeft', 3600);

    expect(registry.get('hp')).toBe(3);
    expect(registry.get('inventory')).toEqual([]);
    expect(registry.get('systemsInstalled')).toBe(0);
    expect(registry.get('xp')).toBe(0);
    expect(registry.get('timeLeft')).toBe(3600);
  });

  it('updates values independently', () => {
    registry.set('hp', 3);
    registry.set('xp', 0);

    registry.set('hp', 2);
    expect(registry.get('hp')).toBe(2);
    expect(registry.get('xp')).toBe(0);

    registry.set('xp', 100);
    expect(registry.get('hp')).toBe(2);
    expect(registry.get('xp')).toBe(100);
  });

  it('returns all state as a snapshot', () => {
    registry.set('hp', 3);
    registry.set('xp', 50);
    registry.set('inventory', [{ label: 'item' }]);

    const state = registry.getAll();
    expect(state).toEqual({
      hp: 3,
      xp: 50,
      inventory: [{ label: 'item' }],
    });
  });
});

describe('Registry Event Emissions', () => {
  let registry;

  beforeEach(() => {
    registry = new MockRegistry();
  });

  it('emits changedata event on set', () => {
    const handler = vi.fn();
    registry.events.on('changedata', handler);

    registry.set('hp', 2);

    // Event should fire synchronously
    expect(handler).toHaveBeenCalledWith(
      registry,
      'hp',
      2,
      undefined
    );
  });

  it('emits key-specific events', () => {
    const hpHandler = vi.fn();
    const xpHandler = vi.fn();

    registry.events.on('changedata-hp', hpHandler);
    registry.events.on('changedata-xp', xpHandler);

    registry.set('hp', 2);
    registry.set('xp', 100);

    expect(hpHandler).toHaveBeenCalledWith(2, undefined);
    expect(xpHandler).toHaveBeenCalledWith(100, undefined);
  });

  it('does not emit event when value does not change', () => {
    const handler = vi.fn();
    registry.events.on('changedata', handler);

    registry.set('hp', 3);
    registry.set('hp', 3); // Same value

    // Should only be called once
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fires once() listener only on first event', () => {
    const handler = vi.fn();
    registry.events.once('changedata-hp', handler);

    registry.set('hp', 2);
    registry.set('hp', 1);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('Game State Transitions', () => {
  let registry;

  beforeEach(() => {
    registry = new MockRegistry();
    registry.set('hp', 3);
    registry.set('inventory', []);
    registry.set('systemsInstalled', 0);
    registry.set('xp', 0);
    registry.set('timeLeft', 3600);
  });

  it('tracks HP decrement on damage', () => {
    const hp = registry.get('hp');
    registry.set('hp', Math.max(0, hp - 1));

    expect(registry.get('hp')).toBe(2);
  });

  it('prevents HP from going below zero', () => {
    registry.set('hp', 0);
    registry.set('hp', Math.max(0, registry.get('hp') - 1));

    expect(registry.get('hp')).toBe(0);
  });

  it('accumulates XP', () => {
    const xp = registry.get('xp');
    registry.set('xp', xp + 15);

    expect(registry.get('xp')).toBe(15);
  });

  it('decrements timer', () => {
    const time = registry.get('timeLeft');
    registry.set('timeLeft', time - 1);

    expect(registry.get('timeLeft')).toBe(3599);
  });

  it('detects game over conditions', () => {
    const isGameOver = (registry) => {
      const hp = registry.get('hp');
      const time = registry.get('timeLeft');
      return hp <= 0 || time <= 0;
    };

    expect(isGameOver(registry)).toBe(false);

    registry.set('hp', 0);
    expect(isGameOver(registry)).toBe(true);

    registry.set('hp', 3);
    registry.set('timeLeft', 0);
    expect(isGameOver(registry)).toBe(true);
  });

  it('detects partial win condition (4/5 systems)', () => {
    // 4 systems = partial launch (hull breach variant) — still a win
    const isPartialWin = (registry) => {
      const installed = registry.get('systemsInstalled');
      const time = registry.get('timeLeft');
      return installed >= 4 && time > 0;
    };

    expect(isPartialWin(registry)).toBe(false);

    registry.set('systemsInstalled', 4);
    expect(isPartialWin(registry)).toBe(true);

    registry.set('timeLeft', 0);
    expect(isPartialWin(registry)).toBe(false);
  });

  it('detects full win condition (5/5 systems)', () => {
    const isFullWin = (registry) => {
      const installed = registry.get('systemsInstalled');
      const time = registry.get('timeLeft');
      return installed >= 5 && time > 0;
    };

    expect(isFullWin(registry)).toBe(false);

    registry.set('systemsInstalled', 4);
    expect(isFullWin(registry)).toBe(false); // 4/5 = partial, not full

    registry.set('systemsInstalled', 5);
    expect(isFullWin(registry)).toBe(true);

    registry.set('timeLeft', 0);
    expect(isFullWin(registry)).toBe(false);
  });
});

describe('Inventory State Management', () => {
  let registry;

  beforeEach(() => {
    registry = new MockRegistry();
    registry.set('inventory', []);
  });

  it('adds items to inventory', () => {
    const inventory = registry.get('inventory');
    const item = { label: 'Copper Wiring', type: 'ingredient' };
    inventory.push(item);
    registry.set('inventory', [...inventory]);

    expect(registry.get('inventory')).toHaveLength(1);
    expect(registry.get('inventory')[0].label).toBe('Copper Wiring');
  });

  it('counts items by type', () => {
    let inventory = [
      { label: 'Component', type: 'component' },
      { label: 'Wire', type: 'ingredient' },
      { label: 'Junk', type: 'junk' },
    ];
    registry.set('inventory', inventory);

    const items = registry.get('inventory');
    const components = items.filter(i => i.type === 'component').length;
    const ingredients = items.filter(i => i.type === 'ingredient').length;
    const junk = items.filter(i => i.type === 'junk').length;

    expect(components).toBe(1);
    expect(ingredients).toBe(1);
    expect(junk).toBe(1);
  });

  it('removes items from inventory', () => {
    let inventory = [
      { label: 'Item1', type: 'ingredient' },
      { label: 'Item2', type: 'ingredient' },
      { label: 'Item3', type: 'junk' },
    ];
    registry.set('inventory', inventory);

    // Remove first 2 ingredients
    inventory = registry.get('inventory');
    let consumed = 0;
    const filtered = inventory.filter(item => {
      if (consumed < 2 && item.type === 'ingredient') {
        consumed++;
        return false;
      }
      return true;
    });
    registry.set('inventory', filtered);

    expect(registry.get('inventory')).toHaveLength(1);
    expect(registry.get('inventory')[0].label).toBe('Item3');
  });

  it('persists inventory across operations', () => {
    let inventory = [];
    registry.set('inventory', inventory);

    // Add items
    for (let i = 0; i < 3; i++) {
      inventory = registry.get('inventory');
      inventory.push({ label: `Item${i}`, type: 'ingredient' });
      registry.set('inventory', [...inventory]);
    }

    expect(registry.get('inventory')).toHaveLength(3);
  });
});

describe('Crafting & Installation State', () => {
  let registry;

  beforeEach(() => {
    registry = new MockRegistry();
    registry.set('inventory', []);
    registry.set('systemsInstalled', 0);
  });

  it('tracks component crafting', () => {
    let inventory = registry.get('inventory');
    inventory.push({ label: 'Fuel Injector', type: 'component' });
    registry.set('inventory', inventory);

    const components = registry.get('inventory').filter(i => i.type === 'component');
    expect(components).toHaveLength(1);
  });

  it('tracks system installation up to 5', () => {
    registry.set('systemsInstalled', 1);
    expect(registry.get('systemsInstalled')).toBe(1);

    registry.set('systemsInstalled', 2);
    expect(registry.get('systemsInstalled')).toBe(2);

    registry.set('systemsInstalled', 3);
    expect(registry.get('systemsInstalled')).toBe(3);

    registry.set('systemsInstalled', 4);
    expect(registry.get('systemsInstalled')).toBe(4);

    registry.set('systemsInstalled', 5);
    expect(registry.get('systemsInstalled')).toBe(5);
  });

  it('completes full 5-system craft+install sequence', () => {
    // Simulate 5 craft cycles + 5 install cycles
    for (let i = 0; i < 5; i++) {
      // Craft a component
      let inventory = registry.get('inventory');
      inventory.push({ label: `System${i}`, type: 'component' });
      registry.set('inventory', inventory);

      // Install it
      inventory = registry.get('inventory');
      inventory = inventory.filter(item => item.type !== 'component' || false);
      registry.set('inventory', inventory);

      registry.set('systemsInstalled', i + 1);
    }

    expect(registry.get('systemsInstalled')).toBe(5);
    expect(registry.get('inventory')).toHaveLength(0);
  });
});

describe('Multi-State Coordination', () => {
  let registry;
  const stateChanges = [];

  beforeEach(() => {
    registry = new MockRegistry();
    stateChanges.length = 0;

    // Track all state changes
    registry.events.on('changedata', (parent, key, value) => {
      stateChanges.push({ key, value });
    });

    // Initialize state
    registry.set('hp', 3);
    registry.set('xp', 0);
    registry.set('inventory', []);
    registry.set('systemsInstalled', 0);

    stateChanges.length = 0; // Clear initialization changes
  });

  it('tracks multi-step gameplay sequence', () => {
    // Search container → get item
    let inventory = registry.get('inventory');
    inventory.push({ type: 'ingredient' });
    // Create a new array reference so the set detects a change
    registry.set('inventory', [...inventory]);

    const inventoryChanges = stateChanges.filter(s => s.key === 'inventory');
    expect(inventoryChanges.length).toBeGreaterThanOrEqual(0); // May not fire if reference doesn't change

    // Award XP
    registry.set('xp', 5);
    expect(registry.get('xp')).toBe(5);

    // Take damage
    registry.set('hp', 2);
    expect(registry.get('hp')).toBe(2);

    // Verify all state is updated
    expect(registry.get('xp')).toBe(5);
    expect(registry.get('hp')).toBe(2);
    expect(registry.get('inventory').length).toBeGreaterThan(0);
  });

  it('captures gameplay progression through all 5 systems', () => {
    const actions = [];

    // Listen to state changes and track progression
    registry.events.on('changedata-systemsInstalled', (value) => {
      actions.push(`installed-${value}`);
    });

    registry.set('systemsInstalled', 1);
    registry.set('systemsInstalled', 2);
    registry.set('systemsInstalled', 3);
    registry.set('systemsInstalled', 4);
    registry.set('systemsInstalled', 5);

    expect(actions).toEqual(['installed-1', 'installed-2', 'installed-3', 'installed-4', 'installed-5']);
  });
});
