/**
 * objective-logic.test.js
 *
 * Failing tests for Issue #97 — Objective Banner (always-visible HUD goal).
 *
 * Tests the pure-logic module at src/gameobjects/objective_logic.js which
 * determines the current objective text, item, location hint, and pulse state.
 * NO Phaser imports — this module is pure JS.
 */

import { describe, it, expect } from 'vitest';
import {
  getNextObjective,
  hasObjectiveChanged,
  ROCKET_SYSTEMS,
  ZONE_NAMES,
  SYSTEM_ZONE_HINTS,
  PULSE_DURATION_MS,
  COMPLETED_TEXT,
} from '../src/gameobjects/objective_logic.js';

// ── Inlined constants for sync-drift detection ───────────────────────────────

// inlined from src/gameobjects/workbench.js — keep in sync
const EXPECTED_ROCKET_SYSTEMS = [
  { label: 'Fuel Injector' },
  { label: 'Oxidizer Tank' },
  { label: 'Avionics Board' },
  { label: 'Battery Array' },
  { label: 'Pressure Regulator' },
];

// inlined from src/gameobjects/zone_manager.js — keep in sync
const EXPECTED_ZONE_NAMES = {
  0: 'Cypress Creek Preserve',
  1: 'US-41 Corridor',
  2: 'Collier Commons',
  3: 'Conner Preserve',
  4: 'LOLHS / SR-54',
};

// ── Sync-drift assertions ────────────────────────────────────────────────────

describe('objective_logic — constant sync', () => {
  it('ROCKET_SYSTEMS labels match workbench.js (5 systems)', () => {
    expect(ROCKET_SYSTEMS).toHaveLength(5);
    ROCKET_SYSTEMS.forEach((sys, i) => {
      expect(sys.label).toBe(EXPECTED_ROCKET_SYSTEMS[i].label);
    });
  });

  it('ROCKET_SYSTEMS[0].label is literally "Fuel Injector"', () => {
    // Literal assertion catches drift even if both sides change together
    expect(ROCKET_SYSTEMS[0].label).toBe('Fuel Injector');
  });

  it('ROCKET_SYSTEMS[4].label is literally "Pressure Regulator"', () => {
    expect(ROCKET_SYSTEMS[4].label).toBe('Pressure Regulator');
  });

  it('ZONE_NAMES matches zone_manager.js (5 zones)', () => {
    expect(Object.keys(ZONE_NAMES)).toHaveLength(5);
    for (const [id, name] of Object.entries(EXPECTED_ZONE_NAMES)) {
      expect(ZONE_NAMES[id]).toBe(name);
    }
  });

  it('ZONE_NAMES[1] is literally "US-41 Corridor"', () => {
    expect(ZONE_NAMES[1]).toBe('US-41 Corridor');
  });

  it('SYSTEM_ZONE_HINTS has an entry for every rocket system', () => {
    expect(Object.keys(SYSTEM_ZONE_HINTS)).toHaveLength(5);
    ROCKET_SYSTEMS.forEach(sys => {
      expect(SYSTEM_ZONE_HINTS).toHaveProperty(sys.label);
    });
  });

  it('each SYSTEM_ZONE_HINTS value is a valid zone ID (0-4)', () => {
    Object.values(SYSTEM_ZONE_HINTS).forEach(zoneId => {
      expect(zoneId).toBeGreaterThanOrEqual(0);
      expect(zoneId).toBeLessThanOrEqual(4);
    });
  });

  it('PULSE_DURATION_MS is a positive number', () => {
    expect(PULSE_DURATION_MS).toBeGreaterThan(0);
    expect(typeof PULSE_DURATION_MS).toBe('number');
  });

  it('COMPLETED_TEXT is "Launch the rocket!"', () => {
    expect(COMPLETED_TEXT).toBe('Launch the rocket!');
  });
});

// ── getNextObjective — basic state progression ────────────────────────────────

describe('objective_logic — getNextObjective progression', () => {
  it('with 0 systems installed, targets Fuel Injector', () => {
    const result = getNextObjective({ systemsInstalled: 0, inventory: [] });
    expect(result.item).toBe('Fuel Injector');
    expect(result.isComplete).toBe(false);
  });

  it('with 1 system installed, targets Oxidizer Tank', () => {
    const result = getNextObjective({ systemsInstalled: 1, inventory: [] });
    expect(result.item).toBe('Oxidizer Tank');
    expect(result.isComplete).toBe(false);
  });

  it('with 2 systems installed, targets Avionics Board', () => {
    const result = getNextObjective({ systemsInstalled: 2, inventory: [] });
    expect(result.item).toBe('Avionics Board');
    expect(result.isComplete).toBe(false);
  });

  it('with 3 systems installed, targets Battery Array', () => {
    const result = getNextObjective({ systemsInstalled: 3, inventory: [] });
    expect(result.item).toBe('Battery Array');
    expect(result.isComplete).toBe(false);
  });

  it('with 4 systems installed, targets Pressure Regulator', () => {
    const result = getNextObjective({ systemsInstalled: 4, inventory: [] });
    expect(result.item).toBe('Pressure Regulator');
    expect(result.isComplete).toBe(false);
  });

  it('with all 5 systems installed, returns completed state', () => {
    const result = getNextObjective({ systemsInstalled: 5, inventory: [] });
    expect(result.isComplete).toBe(true);
    expect(result.text).toBe('Launch the rocket!');
    expect(result.item).toBeNull();
    expect(result.location).toBeNull();
  });
});

// ── getNextObjective — text format ────────────────────────────────────────────

describe('objective_logic — text format', () => {
  it('returns text in format "Find [item] — check [location]"', () => {
    const result = getNextObjective({ systemsInstalled: 0, inventory: [] });
    // Format: "Find Fuel Injector — check <zone name>"
    expect(result.text).toMatch(/^Find .+ — check .+$/);
  });

  it('text contains the target item name', () => {
    const result = getNextObjective({ systemsInstalled: 2, inventory: [] });
    expect(result.text).toContain('Avionics Board');
  });

  it('text contains a real zone name from ZONE_NAMES', () => {
    const result = getNextObjective({ systemsInstalled: 0, inventory: [] });
    const zoneNames = Object.values(EXPECTED_ZONE_NAMES);
    const containsZone = zoneNames.some(name => result.text.includes(name));
    expect(containsZone).toBe(true);
  });

  it('location field is a human-readable zone name string', () => {
    const result = getNextObjective({ systemsInstalled: 0, inventory: [] });
    const zoneNames = Object.values(EXPECTED_ZONE_NAMES);
    expect(zoneNames).toContain(result.location);
  });

  it('zoneId field is the numeric zone ID for the hint', () => {
    const result = getNextObjective({ systemsInstalled: 0, inventory: [] });
    expect(typeof result.zoneId).toBe('number');
    expect(result.zoneId).toBeGreaterThanOrEqual(0);
    expect(result.zoneId).toBeLessThanOrEqual(4);
  });

  it('completed text has no location suffix', () => {
    const result = getNextObjective({ systemsInstalled: 5, inventory: [] });
    expect(result.text).toBe('Launch the rocket!');
    expect(result.text).not.toContain('check');
  });
});

// ── getNextObjective — inventory awareness ────────────────────────────────────

describe('objective_logic — inventory awareness', () => {
  it('if next component is already crafted in inventory, skips to ingredients hint', () => {
    // Player has Fuel Injector component in inventory but hasn't installed it yet
    const inventory = [{ label: 'Fuel Injector', type: 'component' }];
    const result = getNextObjective({ systemsInstalled: 0, inventory });
    // Should tell them to install the component they already have
    expect(result.text).toContain('Fuel Injector');
    // When component is in inventory, hint should be to install (go to rocket)
    expect(result.text).toMatch(/install|rocket/i);
  });

  it('with component in inventory, location hints at Zone 0 (rocket location)', () => {
    const inventory = [{ label: 'Fuel Injector', type: 'component' }];
    const result = getNextObjective({ systemsInstalled: 0, inventory });
    // Rocket is in Zone 0 — Cypress Creek Preserve
    expect(result.location).toBe('Cypress Creek Preserve');
    expect(result.zoneId).toBe(0);
  });

  it('with 2+ ingredients in inventory, hints to craft at workbench', () => {
    const inventory = [
      { label: 'Copper Wiring', type: 'ingredient' },
      { label: 'Solenoid Valve', type: 'ingredient' },
    ];
    const result = getNextObjective({ systemsInstalled: 0, inventory });
    // Should suggest crafting since they have enough ingredients
    expect(result.text).toMatch(/craft|workbench/i);
  });

  it('with fewer than 2 ingredients and no component, suggests scavenging', () => {
    const inventory = [{ label: 'Copper Wiring', type: 'ingredient' }];
    const result = getNextObjective({ systemsInstalled: 0, inventory });
    // Should point to a zone to find more ingredients
    expect(result.text).toMatch(/^Find .+ — check .+$/);
  });
});

// ── hasObjectiveChanged — pulse detection ─────────────────────────────────────

describe('objective_logic — hasObjectiveChanged (pulse detection)', () => {
  it('returns true when objective text differs between prev and current', () => {
    const prev = getNextObjective({ systemsInstalled: 0, inventory: [] });
    const current = getNextObjective({ systemsInstalled: 1, inventory: [] });
    expect(hasObjectiveChanged(prev, current)).toBe(true);
  });

  it('returns false when objective text is the same', () => {
    const a = getNextObjective({ systemsInstalled: 0, inventory: [] });
    const b = getNextObjective({ systemsInstalled: 0, inventory: [] });
    expect(hasObjectiveChanged(a, b)).toBe(false);
  });

  it('returns true when transitioning from incomplete to complete', () => {
    const prev = getNextObjective({ systemsInstalled: 4, inventory: [] });
    const current = getNextObjective({ systemsInstalled: 5, inventory: [] });
    expect(hasObjectiveChanged(prev, current)).toBe(true);
  });

  it('returns false for two completed states', () => {
    const a = getNextObjective({ systemsInstalled: 5, inventory: [] });
    const b = getNextObjective({ systemsInstalled: 5, inventory: [] });
    expect(hasObjectiveChanged(a, b)).toBe(false);
  });

  it('returns true when inventory changes objective (e.g. enough to craft)', () => {
    const prev = getNextObjective({ systemsInstalled: 0, inventory: [] });
    const current = getNextObjective({
      systemsInstalled: 0,
      inventory: [
        { label: 'Copper Wiring', type: 'ingredient' },
        { label: 'Solenoid Valve', type: 'ingredient' },
      ],
    });
    expect(hasObjectiveChanged(prev, current)).toBe(true);
  });

  it('handles null/undefined prev gracefully (first render = changed)', () => {
    const current = getNextObjective({ systemsInstalled: 0, inventory: [] });
    expect(hasObjectiveChanged(null, current)).toBe(true);
    expect(hasObjectiveChanged(undefined, current)).toBe(true);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('objective_logic — edge cases', () => {
  it('handles undefined inventory gracefully', () => {
    const result = getNextObjective({ systemsInstalled: 0, inventory: undefined });
    expect(result.item).toBe('Fuel Injector');
    expect(result.isComplete).toBe(false);
  });

  it('handles missing systemsInstalled (defaults to 0)', () => {
    const result = getNextObjective({ inventory: [] });
    expect(result.item).toBe('Fuel Injector');
  });

  it('handles systemsInstalled > 5 gracefully (still complete)', () => {
    const result = getNextObjective({ systemsInstalled: 6, inventory: [] });
    expect(result.isComplete).toBe(true);
    expect(result.text).toBe('Launch the rocket!');
  });

  it('returns an object with all expected fields', () => {
    const result = getNextObjective({ systemsInstalled: 0, inventory: [] });
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('item');
    expect(result).toHaveProperty('location');
    expect(result).toHaveProperty('zoneId');
    expect(result).toHaveProperty('isComplete');
  });

  it('multiple crafted components in inventory advances the target correctly', () => {
    // 1 installed, 2 crafted components in inventory → total 3 built
    // Next target should be index 3 = Battery Array
    const inventory = [
      { label: 'Oxidizer Tank', type: 'component' },
      { label: 'Avionics Board', type: 'component' },
    ];
    const result = getNextObjective({ systemsInstalled: 1, inventory });
    // With 2 components ready to install, should suggest installing
    expect(result.text).toMatch(/install|rocket/i);
  });
});
