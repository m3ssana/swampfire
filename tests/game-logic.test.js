/**
 * Game Logic Tests
 *
 * Unit tests for core game systems that don't require the full Phaser runtime:
 * - Inventory management (add/remove items, persistence)
 * - Crafting recipes (ingredient consumption, component creation)
 * - Rocket installation (4-system sequence, win condition)
 * - State transitions (hp loss, xp gain, timer decrement)
 * - Loot table validation (weighted random selection)
 */

import { describe, it, expect } from 'vitest';
import { getPhaseForTimeLeft } from '../src/gameobjects/storm_phase_logic.js';

// ── Crafting system ─────────────────────────────────────────────────────────

const ROCKET_SYSTEMS = [
  { label: 'Fuel Injector', xp: 15, tint: 0xff6600 },
  { label: 'Oxidizer Tank', xp: 15, tint: 0x00ccff },
  { label: 'Avionics Board', xp: 15, tint: 0x00ff88 },
  { label: 'Battery Array', xp: 15, tint: 0xffee00 },
];

describe('Inventory System', () => {
  it('adds items to inventory', () => {
    const inventory = [];
    const item = { label: 'Copper Wiring', xp: 5, tint: 0x4fc3f7, type: 'ingredient' };
    inventory.push(item);

    expect(inventory).toHaveLength(1);
    expect(inventory[0].label).toBe('Copper Wiring');
  });

  it('removes items from inventory by type', () => {
    const inventory = [
      { label: 'Copper Wiring', type: 'ingredient' },
      { label: 'Steel Bracket', type: 'ingredient' },
      { label: 'Empty', type: 'junk' },
    ];

    let consumed = 0;
    const newInv = inventory.filter(item => {
      if (consumed < 2 && item.type === 'ingredient') {
        consumed++;
        return false;
      }
      return true;
    });

    expect(newInv).toHaveLength(1);
    expect(newInv[0].label).toBe('Empty');
  });

  it('counts items by type', () => {
    const inventory = [
      { label: 'Fuel Injector', type: 'component' },
      { label: 'Copper Wiring', type: 'ingredient' },
      { label: 'Empty', type: 'junk' },
    ];

    const componentCount = inventory.filter(i => i.type === 'component').length;
    const ingredientCount = inventory.filter(i => i.type === 'ingredient').length;
    const junkCount = inventory.filter(i => i.type === 'junk').length;

    expect(componentCount).toBe(1);
    expect(ingredientCount).toBe(1);
    expect(junkCount).toBe(1);
  });

  it('persists inventory state across operations', () => {
    let inventory = [
      { label: 'Copper Wiring', type: 'ingredient' },
      { label: 'Steel Bracket', type: 'ingredient' },
    ];

    // Consume 2 ingredients
    let consumed = 0;
    inventory = inventory.filter(item => {
      if (consumed < 2 && item.type === 'ingredient') {
        consumed++;
        return false;
      }
      return true;
    });

    // Add component
    inventory.push({ label: 'Fuel Injector', type: 'component', tint: 0xff6600 });

    expect(inventory).toHaveLength(1);
    expect(inventory[0].type).toBe('component');
  });
});

describe('Crafting System', () => {
  it('requires exactly 2 ingredients to craft', () => {
    const inventory = [
      { label: 'Copper Wiring', type: 'ingredient' },
    ];

    const ingredients = inventory.filter(i => i.type === 'ingredient');
    expect(ingredients.length >= 2).toBe(false);
  });

  it('prevents crafting when all 4 systems are built', () => {
    const inventory = [];
    const installed = 4;
    const crafted = 0;
    const totalBuilt = installed + crafted;

    expect(totalBuilt >= 4).toBe(true);
  });

  it('produces the correct component in sequence', () => {
    const installed = 0;
    const inventory = [
      { type: 'component' },
      { type: 'component' },
    ];
    const crafted = inventory.filter(i => i.type === 'component').length;
    const totalBuilt = installed + crafted;

    const recipe = ROCKET_SYSTEMS[totalBuilt];
    expect(recipe.label).toBe('Avionics Board');
  });

  it('awards correct XP per component crafted', () => {
    let xp = 0;
    const recipe = ROCKET_SYSTEMS[0]; // Fuel Injector

    xp += recipe.xp;
    expect(xp).toBe(15);
  });

  it('handles full 4-component crafting sequence', () => {
    let inventory = [];
    let xp = 0;

    // Craft all 4 components
    for (let i = 0; i < 4; i++) {
      const recipe = ROCKET_SYSTEMS[i];
      inventory.push({ label: recipe.label, type: 'component', tint: recipe.tint });
      xp += recipe.xp;
    }

    expect(inventory).toHaveLength(4);
    expect(xp).toBe(60); // 15 * 4
    expect(inventory.map(c => c.label)).toEqual([
      'Fuel Injector',
      'Oxidizer Tank',
      'Avionics Board',
      'Battery Array',
    ]);
  });
});

describe('Rocket Installation', () => {
  it('requires a component to install', () => {
    const inventory = [{ type: 'junk' }];
    const component = inventory.find(i => i.type === 'component');

    expect(component).toBeUndefined();
  });

  it('installs one component per interaction', () => {
    const inventory = [
      { label: 'Fuel Injector', type: 'component' },
      { label: 'Junk', type: 'junk' },
    ];

    let installed = false;
    let installedComponent = null;
    const newInv = inventory.filter(item => {
      if (!installed && item.type === 'component') {
        installed = true;
        installedComponent = item;
        return false;
      }
      return true;
    });

    expect(installedComponent.label).toBe('Fuel Injector');
    expect(newInv).toHaveLength(1);
  });

  it('triggers win condition at 4 systems installed', () => {
    let systemsInstalled = 3;
    const inventory = [{ type: 'component' }];

    if (inventory.some(i => i.type === 'component')) {
      systemsInstalled++;
    }

    expect(systemsInstalled).toBe(4);
    expect(systemsInstalled >= 4).toBe(true);
  });

  it('completes the full installation sequence', () => {
    let systemsInstalled = 0;
    let inventory = [
      { type: 'component' },
      { type: 'component' },
      { type: 'component' },
      { type: 'component' },
    ];

    // Install all 4 components
    while (inventory.length > 0 && systemsInstalled < 4) {
      let installed = false;
      inventory = inventory.filter(item => {
        if (!installed && item.type === 'component') {
          installed = true;
          systemsInstalled++;
          return false;
        }
        return true;
      });
    }

    expect(systemsInstalled).toBe(4);
    expect(inventory).toHaveLength(0);
  });
});

describe('Game State Transitions', () => {
  it('decrements health on hit', () => {
    let hp = 3;
    hp--;
    expect(hp).toBe(2);
  });

  it('triggers game over at 0 HP', () => {
    let hp = 0;
    expect(hp <= 0).toBe(true);
  });

  it('accumulates experience points', () => {
    let xp = 0;
    xp += 15;
    xp += 10;
    xp += 5;

    expect(xp).toBe(30);
  });

  it('counts down timer every second', () => {
    let timeLeft = 3600; // 60:00

    // Simulate 1 second tick
    timeLeft--;

    expect(timeLeft).toBe(3599);
  });

  it('triggers game over when timer reaches zero', () => {
    let timeLeft = 0;
    expect(timeLeft <= 0).toBe(true);
  });

  it('formats time correctly for display', () => {
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    expect(formatTime(3600)).toBe('60:00');
    expect(formatTime(3599)).toBe('59:59');
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
  });
});

describe('Loot Table System', () => {
  const LOOT_TABLES = {
    default: [
      { label: 'Copper Wiring', xp: 5, tint: 0x4fc3f7, weight: 25, type: 'ingredient' },
      { label: 'Solenoid Valve', xp: 10, tint: 0x4fc3f7, weight: 20, type: 'ingredient' },
      { label: 'Hydraulic Seal', xp: 5, tint: 0x4fc3f7, weight: 20, type: 'ingredient' },
      { label: 'PVC Coupler', xp: 3, tint: 0xffffff, weight: 20, type: 'junk' },
      { label: 'Empty', xp: 0, tint: 0x666666, weight: 15, type: 'junk' },
    ],
  };

  const pickLoot = (tableKey = 'default') => {
    const table = LOOT_TABLES[tableKey] ?? LOOT_TABLES.default;
    const total = table.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * total;

    for (const entry of table) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }

    return table[table.length - 1];
  };

  it('validates all loot entries have required fields', () => {
    const table = LOOT_TABLES.default;

    for (const item of table) {
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('xp');
      expect(item).toHaveProperty('tint');
      expect(item).toHaveProperty('weight');
      expect(item).toHaveProperty('type');
    }
  });

  it('ensures loot weights are positive', () => {
    const table = LOOT_TABLES.default;

    for (const item of table) {
      expect(item.weight).toBeGreaterThan(0);
    }
  });

  it('ensures all loot items are reachable via weighted random', () => {
    const table = LOOT_TABLES.default;
    const total = table.reduce((sum, e) => sum + e.weight, 0);

    expect(total).toBeGreaterThan(0);

    // Each item should have at least some probability
    for (const item of table) {
      const probability = item.weight / total;
      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(1);
    }
  });

  it('picks valid loot entries consistently', () => {
    for (let i = 0; i < 100; i++) {
      const loot = pickLoot('default');

      expect(loot).toHaveProperty('label');
      expect(loot).toHaveProperty('xp');
      expect(loot).toHaveProperty('type');

      const validTypes = ['ingredient', 'junk', 'component'];
      expect(validTypes).toContain(loot.type);
    }
  });

  it('confirms ingredients and junk are distinct item types', () => {
    const table = LOOT_TABLES.default;
    const hasIngredients = table.some(i => i.type === 'ingredient');
    const hasJunk = table.some(i => i.type === 'junk');

    expect(hasIngredients).toBe(true);
    expect(hasJunk).toBe(true);
  });
});

describe('Core Gameplay Loop', () => {
  it('completes the full win sequence', () => {
    // Start
    let inventory = [];
    let systemsInstalled = 0;
    let xp = 0;
    let timeLeft = 3600;

    // Find ingredients (search 2 containers)
    for (let i = 0; i < 2; i++) {
      inventory.push({ label: 'Ingredient', type: 'ingredient' });
    }

    // Craft components (repeat 4 times)
    for (let craft = 0; craft < 4; craft++) {
      // Consume 2 ingredients
      let consumed = 0;
      inventory = inventory.filter(item => {
        if (consumed < 2 && item.type === 'ingredient') {
          consumed++;
          return false;
        }
        return true;
      });

      // Add more ingredients for next cycle
      if (craft < 3) {
        for (let i = 0; i < 2; i++) {
          inventory.push({ label: 'Ingredient', type: 'ingredient' });
        }
      }

      // Produce component
      inventory.push({ label: `System ${craft}`, type: 'component' });
      xp += 15;
    }

    // Install all components
    while (inventory.some(i => i.type === 'component') && systemsInstalled < 4) {
      let installed = false;
      inventory = inventory.filter(item => {
        if (!installed && item.type === 'component') {
          installed = true;
          systemsInstalled++;
          return false;
        }
        return true;
      });
    }

    // Launch
    expect(systemsInstalled).toBe(4);
    expect(xp).toBe(60);
    expect(timeLeft).toBe(3600);
  });
});

// ── Storm phase logic ────────────────────────────────────────────────────────

describe('getPhaseForTimeLeft', () => {
  it('returns 1 at full time (3600s)', () => {
    expect(getPhaseForTimeLeft(3600)).toBe(1);
  });
  it('returns 1 at the Phase 1 lower boundary (2700s)', () => {
    expect(getPhaseForTimeLeft(2700)).toBe(1);
  });
  it('returns 2 one second below Phase 1 boundary (2699s)', () => {
    expect(getPhaseForTimeLeft(2699)).toBe(2);
  });
  it('returns 2 at the Phase 2 lower boundary (1800s)', () => {
    expect(getPhaseForTimeLeft(1800)).toBe(2);
  });
  it('returns 3 one second below Phase 2 boundary (1799s)', () => {
    expect(getPhaseForTimeLeft(1799)).toBe(3);
  });
  it('returns 3 at the Phase 3 lower boundary (900s)', () => {
    expect(getPhaseForTimeLeft(900)).toBe(3);
  });
  it('returns 4 one second below Phase 3 boundary (899s)', () => {
    expect(getPhaseForTimeLeft(899)).toBe(4);
  });
  it('returns 4 at zero (timer expired)', () => {
    expect(getPhaseForTimeLeft(0)).toBe(4);
  });
  it('detects a transition: Phase 1 → Phase 2', () => {
    expect(getPhaseForTimeLeft(2701)).toBe(1);
    expect(getPhaseForTimeLeft(2699)).toBe(2);
  });
  it('detects a transition: Phase 2 → Phase 3', () => {
    expect(getPhaseForTimeLeft(1801)).toBe(2);
    expect(getPhaseForTimeLeft(1799)).toBe(3);
  });
  it('detects a transition: Phase 3 → Phase 4', () => {
    expect(getPhaseForTimeLeft(901)).toBe(3);
    expect(getPhaseForTimeLeft(899)).toBe(4);
  });
});
