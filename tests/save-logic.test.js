/**
 * Save System Tests (Issue #98)
 *
 * Tests for the pure save_logic.js module that will own:
 *   - localStorage key name and schema version
 *   - serialize(state) → JSON string
 *   - deserialize(json) → state object (or null on failure)
 *   - isValidSave(obj) → boolean
 *   - hasSave(storage) → boolean
 *   - clearSave(storage) → void
 *   - AUTOSAVE_INTERVAL_MS constant (5 minutes = 300000ms)
 *   - AUTOSAVE_TRIGGERS enum of trigger reasons
 *   - SAVE_KEY constant (localStorage key name)
 *   - SAVE_VERSION constant (schema version number)
 *
 * All functions accept an injectable storage object (fake localStorage)
 * so tests never need a real browser environment.
 *
 * No Phaser import — pure JS module.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  serialize,
  deserialize,
  isValidSave,
  hasSave,
  clearSave,
  resolveSpawnPosition,
  resolveInitialZone,
  AUTOSAVE_INTERVAL_MS,
  AUTOSAVE_TRIGGERS,
  SAVE_KEY,
  SAVE_VERSION,
} from '../src/gameobjects/save_logic.js';

// Import storm_phase_logic.js — it is Phaser-free and safe to import in Vitest
import { getPhaseForTimeLeft } from '../src/gameobjects/storm_phase_logic.js';

// ── Fake localStorage factory ─────────────────────────────────────────────────

function makeFakeStorage() {
  const store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    _store: store,
  };
}

// ── Full game state fixture ───────────────────────────────────────────────────
// Represents all data the save system must persist (9 registry keys + position + zone)

function makeFullState() {
  return {
    // Player position
    position: { x: 1920, y: 2496 },
    zone: 0,

    // Registry keys — inlined from src/scenes/transition.js loadNext() — keep in sync
    hp: 3,
    xp: 450,
    timeLeft: 2100,          // 35 minutes remaining (seconds)
    timerExpired: false,
    inventory: [
      { label: 'Copper Wiring', type: 'ingredient' },
      { label: 'Solenoid Valve', type: 'ingredient' },
      { label: 'Energy Drink', type: 'junk' },
    ],
    systemsInstalled: 2,
    stormPhase: 2,
    npcQuests: { harvey: true, maria: false, dale: false, reeves: false },
    visitedZones: [0, 1, 2],

    // Fix 1: searched container IDs per zone (Tiled object.id)
    searchedContainers: { '0': [5, 8, 12], '1': [3, 7] },

    // Fix 4: run stats that survive reload
    craftCount: 4,
    frenzyCount: 1,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group 1 — Constants
// ═══════════════════════════════════════════════════════════════════════════════

describe('Save system constants', () => {
  it('SAVE_KEY is "swampfire_save"', () => {
    // inlined from src/gameobjects/save_logic.js — keep in sync
    expect(SAVE_KEY).toBe('swampfire_save');
  });

  it('SAVE_VERSION is 2', () => {
    // inlined from src/gameobjects/save_logic.js — keep in sync
    expect(SAVE_VERSION).toBe(2);
  });

  it('AUTOSAVE_INTERVAL_MS is exactly 300000 (5 minutes in milliseconds)', () => {
    // 5 min × 60 sec × 1000 ms = 300000
    expect(AUTOSAVE_INTERVAL_MS).toBe(300000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 2 — Autosave trigger reasons
// ═══════════════════════════════════════════════════════════════════════════════

describe('AUTOSAVE_TRIGGERS enum', () => {
  it('includes ZONE_0_RETURN trigger', () => {
    expect(AUTOSAVE_TRIGGERS.ZONE_0_RETURN).toBe('zone_0_return');
  });

  it('includes SYSTEM_INSTALLED trigger', () => {
    expect(AUTOSAVE_TRIGGERS.SYSTEM_INSTALLED).toBe('system_installed');
  });

  it('includes PHASE_TRANSITION trigger', () => {
    expect(AUTOSAVE_TRIGGERS.PHASE_TRANSITION).toBe('phase_transition');
  });

  it('includes INTERVAL trigger (5-minute periodic)', () => {
    expect(AUTOSAVE_TRIGGERS.INTERVAL).toBe('interval');
  });

  it('has exactly 4 trigger reasons', () => {
    expect(Object.keys(AUTOSAVE_TRIGGERS)).toHaveLength(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 3 — serialize() round-trip fidelity
// ═══════════════════════════════════════════════════════════════════════════════

describe('serialize(state)', () => {
  it('returns a JSON string', () => {
    const state = makeFullState();
    const json = serialize(state);
    expect(typeof json).toBe('string');
    // Must be valid JSON
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes the schema version in serialized output', () => {
    const state = makeFullState();
    const json = serialize(state);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(2);
  });

  it('includes a timestamp in serialized output', () => {
    const before = Date.now();
    const state = makeFullState();
    const json = serialize(state);
    const after = Date.now();
    const parsed = JSON.parse(json);
    expect(parsed.timestamp).toBeGreaterThanOrEqual(before);
    expect(parsed.timestamp).toBeLessThanOrEqual(after);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 4 — deserialize() round-trip fidelity for all registry keys
// ═══════════════════════════════════════════════════════════════════════════════

describe('deserialize(json) — round-trip fidelity', () => {
  let state;
  let restored;

  beforeEach(() => {
    state = makeFullState();
    const json = serialize(state);
    restored = deserialize(json);
  });

  it('preserves player position x and y', () => {
    expect(restored.position.x).toBe(1920);
    expect(restored.position.y).toBe(2496);
  });

  it('preserves zone id', () => {
    expect(restored.zone).toBe(0);
  });

  it('preserves hp (registry key: hp)', () => {
    expect(restored.hp).toBe(3);
  });

  it('preserves xp (registry key: xp)', () => {
    expect(restored.xp).toBe(450);
  });

  it('preserves timeLeft (registry key: timeLeft)', () => {
    expect(restored.timeLeft).toBe(2100);
  });

  it('preserves timerExpired (registry key: timerExpired)', () => {
    expect(restored.timerExpired).toBe(false);
  });

  it('preserves inventory array (registry key: inventory)', () => {
    expect(restored.inventory).toEqual([
      { label: 'Copper Wiring', type: 'ingredient' },
      { label: 'Solenoid Valve', type: 'ingredient' },
      { label: 'Energy Drink', type: 'junk' },
    ]);
  });

  it('preserves systemsInstalled (registry key: systemsInstalled)', () => {
    expect(restored.systemsInstalled).toBe(2);
  });

  it('preserves stormPhase (registry key: stormPhase)', () => {
    expect(restored.stormPhase).toBe(2);
  });

  it('preserves npcQuests object (registry key: npcQuests)', () => {
    expect(restored.npcQuests).toEqual({
      harvey: true,
      maria: false,
      dale: false,
      reeves: false,
    });
  });

  it('preserves visitedZones array (registry key: visitedZones)', () => {
    expect(restored.visitedZones).toEqual([0, 1, 2]);
  });

  it('preserves searchedContainers map', () => {
    expect(restored.searchedContainers).toEqual({ '0': [5, 8, 12], '1': [3, 7] });
  });

  it('preserves craftCount', () => {
    expect(restored.craftCount).toBe(4);
  });

  it('preserves frenzyCount', () => {
    expect(restored.frenzyCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 5 — deserialize() error handling
// ═══════════════════════════════════════════════════════════════════════════════

describe('deserialize(json) — error handling', () => {
  it('returns null for invalid JSON string', () => {
    expect(deserialize('not valid json {')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(deserialize('')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(deserialize(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(deserialize(undefined)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 6 — isValidSave() validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('isValidSave(obj)', () => {
  it('returns true for a valid full state object with correct version', () => {
    const state = makeFullState();
    const json = serialize(state);
    const parsed = JSON.parse(json);
    expect(isValidSave(parsed)).toBe(true);
  });

  it('returns false for wrong schema version (version 99)', () => {
    const state = makeFullState();
    const json = serialize(state);
    const parsed = JSON.parse(json);
    parsed.version = 99;
    expect(isValidSave(parsed)).toBe(false);
  });

  it('returns false for missing version field', () => {
    const state = makeFullState();
    const json = serialize(state);
    const parsed = JSON.parse(json);
    delete parsed.version;
    expect(isValidSave(parsed)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidSave(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidSave(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isValidSave({})).toBe(false);
  });

  it('returns false when hp is missing', () => {
    const state = makeFullState();
    const json = serialize(state);
    const parsed = JSON.parse(json);
    delete parsed.state.hp;
    expect(isValidSave(parsed)).toBe(false);
  });

  it('returns false when position is missing', () => {
    const state = makeFullState();
    const json = serialize(state);
    const parsed = JSON.parse(json);
    delete parsed.state.position;
    expect(isValidSave(parsed)).toBe(false);
  });

  it('returns false when timeLeft is missing', () => {
    const state = makeFullState();
    const json = serialize(state);
    const parsed = JSON.parse(json);
    delete parsed.state.timeLeft;
    expect(isValidSave(parsed)).toBe(false);
  });

  it('returns false when inventory is not an array', () => {
    const state = makeFullState();
    const json = serialize(state);
    const parsed = JSON.parse(json);
    parsed.state.inventory = 'not_an_array';
    expect(isValidSave(parsed)).toBe(false);
  });

  it('returns false for corrupt nested data (npcQuests is a string)', () => {
    const state = makeFullState();
    const json = serialize(state);
    const parsed = JSON.parse(json);
    parsed.state.npcQuests = 'corrupt';
    expect(isValidSave(parsed)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 7 — hasSave(storage) and clearSave(storage)
// ═══════════════════════════════════════════════════════════════════════════════

describe('hasSave(storage)', () => {
  it('returns false when storage has no save data', () => {
    const storage = makeFakeStorage();
    expect(hasSave(storage)).toBe(false);
  });

  it('returns true when storage has valid save data', () => {
    const storage = makeFakeStorage();
    const state = makeFullState();
    storage.setItem('swampfire_save', serialize(state));
    expect(hasSave(storage)).toBe(true);
  });

  it('returns false when storage has corrupt save data', () => {
    const storage = makeFakeStorage();
    storage.setItem('swampfire_save', 'not valid json {{{');
    expect(hasSave(storage)).toBe(false);
  });

  it('returns false when storage has wrong-version save data', () => {
    const storage = makeFakeStorage();
    const state = makeFullState();
    const json = serialize(state);
    const parsed = JSON.parse(json);
    parsed.version = 99;
    storage.setItem('swampfire_save', JSON.stringify(parsed));
    expect(hasSave(storage)).toBe(false);
  });
});

describe('clearSave(storage)', () => {
  it('removes save data from storage', () => {
    const storage = makeFakeStorage();
    storage.setItem('swampfire_save', serialize(makeFullState()));
    expect(hasSave(storage)).toBe(true);

    clearSave(storage);
    expect(hasSave(storage)).toBe(false);
  });

  it('does not throw when no save exists', () => {
    const storage = makeFakeStorage();
    expect(() => clearSave(storage)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 8 — Storm phase recomputation from restored timeLeft
// ═══════════════════════════════════════════════════════════════════════════════

describe('Weather system recalculates from saved timer value', () => {
  // The weather system must recompute visual state from the saved timeLeft
  // using getPhaseForTimeLeft from storm_phase_logic.js

  it('timeLeft=3600 (full clock) → storm phase 1', () => {
    const state = { ...makeFullState(), timeLeft: 3600 };
    const json = serialize(state);
    const restored = deserialize(json);
    const phase = getPhaseForTimeLeft(restored.timeLeft);
    expect(phase).toBe(1);
  });

  it('timeLeft=2700 (boundary) → storm phase 1', () => {
    const state = { ...makeFullState(), timeLeft: 2700 };
    const json = serialize(state);
    const restored = deserialize(json);
    const phase = getPhaseForTimeLeft(restored.timeLeft);
    expect(phase).toBe(1);
  });

  it('timeLeft=2699 → storm phase 2', () => {
    const state = { ...makeFullState(), timeLeft: 2699 };
    const json = serialize(state);
    const restored = deserialize(json);
    const phase = getPhaseForTimeLeft(restored.timeLeft);
    expect(phase).toBe(2);
  });

  it('timeLeft=1800 → storm phase 2', () => {
    const state = { ...makeFullState(), timeLeft: 1800 };
    const json = serialize(state);
    const restored = deserialize(json);
    const phase = getPhaseForTimeLeft(restored.timeLeft);
    expect(phase).toBe(2);
  });

  it('timeLeft=1799 → storm phase 3', () => {
    const state = { ...makeFullState(), timeLeft: 1799 };
    const json = serialize(state);
    const restored = deserialize(json);
    const phase = getPhaseForTimeLeft(restored.timeLeft);
    expect(phase).toBe(3);
  });

  it('timeLeft=900 → storm phase 3', () => {
    const state = { ...makeFullState(), timeLeft: 900 };
    const json = serialize(state);
    const restored = deserialize(json);
    const phase = getPhaseForTimeLeft(restored.timeLeft);
    expect(phase).toBe(3);
  });

  it('timeLeft=899 → storm phase 4', () => {
    const state = { ...makeFullState(), timeLeft: 899 };
    const json = serialize(state);
    const restored = deserialize(json);
    const phase = getPhaseForTimeLeft(restored.timeLeft);
    expect(phase).toBe(4);
  });

  it('timeLeft=0 (timer expired) → storm phase 4', () => {
    const state = { ...makeFullState(), timeLeft: 0 };
    const json = serialize(state);
    const restored = deserialize(json);
    const phase = getPhaseForTimeLeft(restored.timeLeft);
    expect(phase).toBe(4);
  });

  it('restored stormPhase matches recomputed phase from timeLeft', () => {
    // Save a state where stormPhase=2 and timeLeft=2100 (which is phase 2)
    const state = { ...makeFullState(), timeLeft: 2100, stormPhase: 2 };
    const json = serialize(state);
    const restored = deserialize(json);
    const recomputed = getPhaseForTimeLeft(restored.timeLeft);
    expect(recomputed).toBe(2);
    expect(restored.stormPhase).toBe(recomputed);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 9 — Performance: serialize+deserialize under 50ms
// ═══════════════════════════════════════════════════════════════════════════════

describe('Save/load performance', () => {
  it('serialize+deserialize cycle completes in under 50ms', () => {
    const state = makeFullState();

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const json = serialize(state);
      deserialize(json);
    }
    const elapsed = performance.now() - start;

    // 100 cycles must complete in under 5000ms (= 50ms per cycle average)
    // But really testing single-cycle; 100 iterations for statistical stability
    const perCycle = elapsed / 100;
    expect(perCycle).toBeLessThan(50);
  });

  it('single serialize+deserialize cycle under 50ms even with large inventory', () => {
    const state = makeFullState();
    // Stress: 50 items in inventory (more than any real gameplay)
    state.inventory = Array.from({ length: 50 }, (_, i) => ({ label: `item_${i}`, type: 'ingredient' }));

    const start = performance.now();
    const json = serialize(state);
    deserialize(json);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 10 — Edge cases and defensive behaviour
// ═══════════════════════════════════════════════════════════════════════════════

describe('Save system edge cases', () => {
  it('serialize handles empty inventory', () => {
    const state = { ...makeFullState(), inventory: [] };
    const json = serialize(state);
    const restored = deserialize(json);
    expect(restored.inventory).toEqual([]);
  });

  it('serialize handles max systems installed (5)', () => {
    const state = { ...makeFullState(), systemsInstalled: 5 };
    const json = serialize(state);
    const restored = deserialize(json);
    expect(restored.systemsInstalled).toBe(5);
  });

  it('serialize handles all NPCs quest-complete', () => {
    const state = {
      ...makeFullState(),
      npcQuests: { harvey: true, maria: true, dale: true, reeves: true },
    };
    const json = serialize(state);
    const restored = deserialize(json);
    expect(restored.npcQuests).toEqual({
      harvey: true,
      maria: true,
      dale: true,
      reeves: true,
    });
  });

  it('serialize handles all zones visited', () => {
    const state = { ...makeFullState(), visitedZones: [0, 1, 2, 3, 4] };
    const json = serialize(state);
    const restored = deserialize(json);
    expect(restored.visitedZones).toEqual([0, 1, 2, 3, 4]);
  });

  it('serialize handles timerExpired=true', () => {
    const state = { ...makeFullState(), timerExpired: true, timeLeft: 0 };
    const json = serialize(state);
    const restored = deserialize(json);
    expect(restored.timerExpired).toBe(true);
  });

  it('serialize handles xp=0 (fresh start)', () => {
    const state = { ...makeFullState(), xp: 0 };
    const json = serialize(state);
    const restored = deserialize(json);
    expect(restored.xp).toBe(0);
  });

  it('hasSave uses SAVE_KEY constant for storage lookup', () => {
    const storage = makeFakeStorage();
    // Manually write under the exact expected key
    storage.setItem('swampfire_save', serialize(makeFullState()));
    expect(hasSave(storage)).toBe(true);

    // Writing under a different key should NOT make hasSave true
    const storage2 = makeFakeStorage();
    storage2.setItem('wrong_key', serialize(makeFullState()));
    expect(hasSave(storage2)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 11 — resolveInitialZone (zone-routing fix for CONTINUE)
// ═══════════════════════════════════════════════════════════════════════════════

describe('resolveInitialZone', () => {
  it('passes through valid zone 0', () => {
    expect(resolveInitialZone(0)).toBe(0);
  });

  it('passes through valid zone 1', () => {
    expect(resolveInitialZone(1)).toBe(1);
  });

  it('passes through valid zone 2', () => {
    expect(resolveInitialZone(2)).toBe(2);
  });

  it('passes through valid zone 3', () => {
    expect(resolveInitialZone(3)).toBe(3);
  });

  it('passes through valid zone 4', () => {
    expect(resolveInitialZone(4)).toBe(4);
  });

  it('falls back to 0 for negative zone id (-1)', () => {
    expect(resolveInitialZone(-1)).toBe(0);
  });

  it('falls back to 0 for out-of-range zone id (42)', () => {
    expect(resolveInitialZone(42)).toBe(0);
  });

  it('falls back to 0 for null', () => {
    expect(resolveInitialZone(null)).toBe(0);
  });

  it('falls back to 0 for undefined', () => {
    expect(resolveInitialZone(undefined)).toBe(0);
  });

  it('coerces numeric string "2" to zone 2', () => {
    expect(resolveInitialZone("2")).toBe(2);
  });

  it('coerces numeric string "0" to zone 0', () => {
    expect(resolveInitialZone("0")).toBe(0);
  });

  it('coerces numeric string "4" to zone 4', () => {
    expect(resolveInitialZone("4")).toBe(4);
  });

  it('falls back to 0 for NaN', () => {
    expect(resolveInitialZone(NaN)).toBe(0);
  });

  it('falls back to 0 for Infinity', () => {
    expect(resolveInitialZone(Infinity)).toBe(0);
  });

  it('falls back to 0 for non-numeric string "abc"', () => {
    expect(resolveInitialZone("abc")).toBe(0);
  });

  it('falls back to 0 for floating point 2.5 (not an integer zone id)', () => {
    expect(resolveInitialZone(2.5)).toBe(0);
  });

  it('falls back to 0 for empty string ""', () => {
    expect(resolveInitialZone("")).toBe(0);
  });

  it('coerces boolean true to zone 1 (Number(true) = 1, which is valid)', () => {
    expect(resolveInitialZone(true)).toBe(1);
  });

  it('falls back to 0 for zone id 5 (one beyond max)', () => {
    expect(resolveInitialZone(5)).toBe(0);
  });
});

/**
 * resolveSpawnPosition — where the player materialises on scene create.
 *
 * Regression guard for the CONTINUE flow (#115 -> #98): MenuScene passed
 * savedPosition into GameScene but nothing consumed it, so a resumed run
 * dropped the player at the zone's default spawn instead of where they saved.
 */
describe('resolveSpawnPosition', () => {
  const zoneSpawn = { x: 1920, y: 1440 };

  it('returns the saved position when resuming from a save', () => {
    const result = resolveSpawnPosition(zoneSpawn, { x: 640, y: 512 }, true);
    expect(result).toEqual({ x: 640, y: 512 });
  });

  it('returns the zone spawn on a fresh run even if a position is supplied', () => {
    const result = resolveSpawnPosition(zoneSpawn, { x: 640, y: 512 }, false);
    expect(result).toEqual({ x: 1920, y: 1440 });
  });

  it('falls back to the zone spawn when savedPosition is null', () => {
    expect(resolveSpawnPosition(zoneSpawn, null, true)).toEqual({ x: 1920, y: 1440 });
  });

  it('falls back to the zone spawn when a coordinate is missing', () => {
    expect(resolveSpawnPosition(zoneSpawn, { x: 640 }, true)).toEqual({ x: 1920, y: 1440 });
    expect(resolveSpawnPosition(zoneSpawn, { y: 512 }, true)).toEqual({ x: 1920, y: 1440 });
  });

  it('falls back to the zone spawn on non-finite coordinates from a corrupt save', () => {
    expect(resolveSpawnPosition(zoneSpawn, { x: NaN, y: 512 }, true)).toEqual({ x: 1920, y: 1440 });
    expect(resolveSpawnPosition(zoneSpawn, { x: Infinity, y: 512 }, true)).toEqual({ x: 1920, y: 1440 });
    expect(resolveSpawnPosition(zoneSpawn, { x: 'abc', y: 512 }, true)).toEqual({ x: 1920, y: 1440 });
  });

  it('accepts a legitimate origin position of 0,0 rather than treating it as falsy', () => {
    expect(resolveSpawnPosition(zoneSpawn, { x: 0, y: 0 }, true)).toEqual({ x: 0, y: 0 });
  });

  it('coerces numeric strings from a JSON round-trip', () => {
    expect(resolveSpawnPosition(zoneSpawn, { x: '640', y: '512' }, true)).toEqual({ x: 640, y: 512 });
  });

  it('does not mutate the inputs', () => {
    const saved = { x: 640, y: 512 };
    const zone  = { x: 1920, y: 1440 };
    resolveSpawnPosition(zone, saved, true);
    expect(saved).toEqual({ x: 640, y: 512 });
    expect(zone).toEqual({ x: 1920, y: 1440 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 12 — Fix 1: Searched container persistence helpers
// ═══════════════════════════════════════════════════════════════════════════════

import {
  markSearched,
  isSearched,
  getSearchedContainers,
} from '../src/gameobjects/save_logic.js';

describe('Searched container persistence (Fix 1)', () => {
  describe('markSearched(map, zoneId, containerId)', () => {
    it('adds a container id to the map for the given zone', () => {
      const map = {};
      const result = markSearched(map, 1, 7);
      expect(result['1']).toContain(7);
    });

    it('creates the zone array if not present', () => {
      const map = {};
      markSearched(map, 0, 3);
      expect(Array.isArray(map['0'])).toBe(true);
      expect(map['0']).toEqual([3]);
    });

    it('appends to existing zone array without duplicates', () => {
      const map = { '1': [3, 7] };
      markSearched(map, 1, 7);
      expect(map['1']).toEqual([3, 7]); // no duplicate
    });

    it('handles multiple zones independently', () => {
      const map = {};
      markSearched(map, 0, 5);
      markSearched(map, 1, 12);
      markSearched(map, 0, 8);
      expect(map['0']).toEqual([5, 8]);
      expect(map['1']).toEqual([12]);
    });

    it('returns the mutated map for chaining', () => {
      const map = {};
      const result = markSearched(map, 2, 10);
      expect(result).toBe(map);
    });
  });

  describe('isSearched(map, zoneId, containerId)', () => {
    it('returns true for a previously-marked container', () => {
      const map = { '1': [3, 7, 12] };
      expect(isSearched(map, 1, 7)).toBe(true);
    });

    it('returns false for a container not in the map', () => {
      const map = { '1': [3, 7, 12] };
      expect(isSearched(map, 1, 99)).toBe(false);
    });

    it('returns false for an unknown zone', () => {
      const map = { '1': [3, 7] };
      expect(isSearched(map, 4, 3)).toBe(false);
    });

    it('returns false for empty map', () => {
      expect(isSearched({}, 0, 5)).toBe(false);
    });

    it('returns false for null/undefined map (defensive)', () => {
      expect(isSearched(null, 0, 5)).toBe(false);
      expect(isSearched(undefined, 0, 5)).toBe(false);
    });
  });

  describe('getSearchedContainers(map, zoneId)', () => {
    it('returns the array of searched ids for a zone', () => {
      const map = { '2': [1, 4, 9] };
      expect(getSearchedContainers(map, 2)).toEqual([1, 4, 9]);
    });

    it('returns empty array for unknown zone', () => {
      expect(getSearchedContainers({}, 3)).toEqual([]);
    });

    it('returns empty array for null map', () => {
      expect(getSearchedContainers(null, 0)).toEqual([]);
    });
  });

  describe('searchedContainers in serialization round-trip', () => {
    it('survives serialize+deserialize', () => {
      const state = {
        ...makeFullState(),
        searchedContainers: { '0': [5, 8], '1': [3, 7, 12] },
      };
      const json = serialize(state);
      const restored = deserialize(json);
      expect(restored.searchedContainers).toEqual({ '0': [5, 8], '1': [3, 7, 12] });
    });

    it('handles empty searchedContainers map', () => {
      const state = { ...makeFullState(), searchedContainers: {} };
      const json = serialize(state);
      const restored = deserialize(json);
      expect(restored.searchedContainers).toEqual({});
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 12 — Fix 2: Strict type validation in isValidSave()
// ═══════════════════════════════════════════════════════════════════════════════

describe('isValidSave() strict type validation (Fix 2)', () => {
  function makeValidEnvelope() {
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      state: {
        ...makeFullState(),
        // Ensure inventory is the proper object format
        inventory: [{ label: 'Copper Wiring', type: 'ingredient' }],
        // Add searchedContainers (Fix 1 schema addition)
        searchedContainers: {},
      },
    };
  }

  it('rejects inventory containing null (crashes workbench .type filter)', () => {
    const env = makeValidEnvelope();
    env.state.inventory = [null];
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects inventory item missing label field', () => {
    const env = makeValidEnvelope();
    env.state.inventory = [{ type: 'ingredient' }]; // no label
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects inventory item missing type field', () => {
    const env = makeValidEnvelope();
    env.state.inventory = [{ label: 'Copper Wiring' }]; // no type
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects inventory item with non-string label', () => {
    const env = makeValidEnvelope();
    env.state.inventory = [{ label: 42, type: 'ingredient' }];
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects inventory item with non-string type', () => {
    const env = makeValidEnvelope();
    env.state.inventory = [{ label: 'Test', type: 123 }];
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects systemsInstalled: 99 (out of range, crashes ROCKET_SYSTEMS[99])', () => {
    const env = makeValidEnvelope();
    env.state.systemsInstalled = 99;
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects timeLeft: "abc" (NaN timer, storm pinned to Phase 4)', () => {
    const env = makeValidEnvelope();
    env.state.timeLeft = "abc";
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects xp: "0" (string concatenation corrupts XP total)', () => {
    const env = makeValidEnvelope();
    env.state.xp = "0";
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects hp as a string', () => {
    const env = makeValidEnvelope();
    env.state.hp = "3";
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects stormPhase as a string', () => {
    const env = makeValidEnvelope();
    env.state.stormPhase = "2";
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects zone as NaN', () => {
    const env = makeValidEnvelope();
    env.state.zone = NaN;
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects position.x as Infinity', () => {
    const env = makeValidEnvelope();
    env.state.position.x = Infinity;
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects position.y as a string', () => {
    const env = makeValidEnvelope();
    env.state.position.y = "100";
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects timerExpired as a string "false"', () => {
    const env = makeValidEnvelope();
    env.state.timerExpired = "false";
    expect(isValidSave(env)).toBe(false);
  });

  it('rejects timerExpired as 0 (number, not boolean)', () => {
    const env = makeValidEnvelope();
    env.state.timerExpired = 0;
    expect(isValidSave(env)).toBe(false);
  });

  it('accepts valid save with proper object inventory items', () => {
    const env = makeValidEnvelope();
    expect(isValidSave(env)).toBe(true);
  });

  it('accepts valid save with empty inventory array', () => {
    const env = makeValidEnvelope();
    env.state.inventory = [];
    expect(isValidSave(env)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 13 — Fix 3: clampState() defence in depth
// ═══════════════════════════════════════════════════════════════════════════════

import { clampState } from '../src/gameobjects/save_logic.js';

describe('clampState(state) — defence in depth (Fix 3)', () => {
  it('clamps hp to 0-3 range (too high)', () => {
    const state = { ...makeFullState(), hp: 99 };
    const clamped = clampState(state);
    expect(clamped.hp).toBe(3);
  });

  it('clamps hp to 0-3 range (negative)', () => {
    const state = { ...makeFullState(), hp: -1 };
    const clamped = clampState(state);
    expect(clamped.hp).toBe(0);
  });

  it('clamps timeLeft to 0-3600 range (too high)', () => {
    const state = { ...makeFullState(), timeLeft: 9999 };
    const clamped = clampState(state);
    expect(clamped.timeLeft).toBe(3600);
  });

  it('clamps timeLeft to 0-3600 range (negative)', () => {
    const state = { ...makeFullState(), timeLeft: -100 };
    const clamped = clampState(state);
    expect(clamped.timeLeft).toBe(0);
  });

  it('clamps systemsInstalled to 0-5 range (too high)', () => {
    const state = { ...makeFullState(), systemsInstalled: 99 };
    const clamped = clampState(state);
    expect(clamped.systemsInstalled).toBe(5);
  });

  it('clamps systemsInstalled to 0-5 range (negative)', () => {
    const state = { ...makeFullState(), systemsInstalled: -1 };
    const clamped = clampState(state);
    expect(clamped.systemsInstalled).toBe(0);
  });

  it('clamps stormPhase to 1-4 range (too high)', () => {
    const state = { ...makeFullState(), stormPhase: 7 };
    const clamped = clampState(state);
    expect(clamped.stormPhase).toBe(4);
  });

  it('clamps stormPhase to 1-4 range (too low)', () => {
    const state = { ...makeFullState(), stormPhase: 0 };
    const clamped = clampState(state);
    expect(clamped.stormPhase).toBe(1);
  });

  it('clamps zone to 0-4 range (too high)', () => {
    const state = { ...makeFullState(), zone: 10 };
    const clamped = clampState(state);
    expect(clamped.zone).toBe(4);
  });

  it('clamps zone to 0-4 range (negative)', () => {
    const state = { ...makeFullState(), zone: -1 };
    const clamped = clampState(state);
    expect(clamped.zone).toBe(0);
  });

  it('clamps xp to >= 0 (negative)', () => {
    const state = { ...makeFullState(), xp: -50 };
    const clamped = clampState(state);
    expect(clamped.xp).toBe(0);
  });

  it('does not modify valid values', () => {
    const state = { ...makeFullState(), hp: 2, timeLeft: 1800, systemsInstalled: 3, stormPhase: 2, zone: 1, xp: 100 };
    const clamped = clampState(state);
    expect(clamped.hp).toBe(2);
    expect(clamped.timeLeft).toBe(1800);
    expect(clamped.systemsInstalled).toBe(3);
    expect(clamped.stormPhase).toBe(2);
    expect(clamped.zone).toBe(1);
    expect(clamped.xp).toBe(100);
  });

  it('does not mutate the original state object', () => {
    const state = { ...makeFullState(), hp: 99 };
    clampState(state);
    expect(state.hp).toBe(99); // original unchanged
  });

  it('preserves non-clamped fields (inventory, position, etc.)', () => {
    const state = { ...makeFullState(), hp: 99, inventory: [{ label: 'Test', type: 'ingredient' }] };
    const clamped = clampState(state);
    expect(clamped.inventory).toEqual([{ label: 'Test', type: 'ingredient' }]);
    expect(clamped.position).toEqual(state.position);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 14 — Fix 4: getFullResetState() returns all registry keys
// ═══════════════════════════════════════════════════════════════════════════════

import { getFullResetState } from '../src/gameobjects/save_logic.js';

describe('getFullResetState(savedState) — missing key reset (Fix 4)', () => {
  it('returns all 14 registry keys that transition.loadNext() seeds', () => {
    const saved = makeFullState();
    const full = getFullResetState(saved);
    // All 14 keys from transition.js loadNext():
    expect(full).toHaveProperty('hp');
    expect(full).toHaveProperty('xp');
    expect(full).toHaveProperty('timeLeft');
    expect(full).toHaveProperty('timerExpired');
    expect(full).toHaveProperty('inventory');
    expect(full).toHaveProperty('systemsInstalled');
    expect(full).toHaveProperty('stormPhase');
    expect(full).toHaveProperty('hudToast');
    expect(full).toHaveProperty('npcQuests');
    expect(full).toHaveProperty('visitedZones');
    expect(full).toHaveProperty('craftCount');
    expect(full).toHaveProperty('frenzyCount');
    expect(full).toHaveProperty('achievementToast');
    // searchedContainers (Fix 1)
    expect(full).toHaveProperty('searchedContainers');
  });

  it('restores saved values for keys present in the save', () => {
    const saved = { ...makeFullState(), xp: 500, hp: 2 };
    const full = getFullResetState(saved);
    expect(full.xp).toBe(500);
    expect(full.hp).toBe(2);
  });

  it('resets hudToast to "" when not in save', () => {
    const saved = makeFullState();
    delete saved.hudToast;
    const full = getFullResetState(saved);
    expect(full.hudToast).toBe('');
  });

  it('resets achievementToast to "" when not in save', () => {
    const saved = makeFullState();
    delete saved.achievementToast;
    const full = getFullResetState(saved);
    expect(full.achievementToast).toBe('');
  });

  it('restores craftCount from save if present', () => {
    const saved = { ...makeFullState(), craftCount: 7 };
    const full = getFullResetState(saved);
    expect(full.craftCount).toBe(7);
  });

  it('resets craftCount to 0 when not in save', () => {
    const saved = makeFullState();
    delete saved.craftCount;
    const full = getFullResetState(saved);
    expect(full.craftCount).toBe(0);
  });

  it('restores frenzyCount from save if present', () => {
    const saved = { ...makeFullState(), frenzyCount: 3 };
    const full = getFullResetState(saved);
    expect(full.frenzyCount).toBe(3);
  });

  it('resets frenzyCount to 0 when not in save', () => {
    const saved = makeFullState();
    delete saved.frenzyCount;
    const full = getFullResetState(saved);
    expect(full.frenzyCount).toBe(0);
  });

  it('resets searchedContainers to {} when not in save', () => {
    const saved = makeFullState();
    delete saved.searchedContainers;
    const full = getFullResetState(saved);
    expect(full.searchedContainers).toEqual({});
  });

  it('restores searchedContainers from save if present', () => {
    const saved = { ...makeFullState(), searchedContainers: { '0': [1, 2] } };
    const full = getFullResetState(saved);
    expect(full.searchedContainers).toEqual({ '0': [1, 2] });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Group 15 — Fix 5: achievements field removed from schema
// ═══════════════════════════════════════════════════════════════════════════════

describe('achievements field removed from save schema (Fix 5)', () => {
  it('isValidSave accepts saves without achievements field', () => {
    const env = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      state: {
        ...makeFullState(),
        inventory: [{ label: 'Test', type: 'ingredient' }],
        searchedContainers: {},
        craftCount: 0,
        frenzyCount: 0,
      },
    };
    delete env.state.achievements;
    expect(isValidSave(env)).toBe(true);
  });

  it('SAVE_VERSION is bumped to 2 (schema shape changed)', () => {
    expect(SAVE_VERSION).toBe(2);
  });

  it('getFullResetState does NOT include achievements field', () => {
    const saved = makeFullState();
    const full = getFullResetState(saved);
    expect(full).not.toHaveProperty('achievements');
  });
});
