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

    // 9 registry keys — inlined from src/scenes/transition.js loadNext() — keep in sync
    hp: 3,
    xp: 450,
    timeLeft: 2100,          // 35 minutes remaining (seconds)
    timerExpired: false,
    inventory: ['branch', 'copper_wire', 'capacitor'],
    systemsInstalled: 2,
    stormPhase: 2,
    npcQuests: { harvey: true, maria: false, dale: false, reeves: false },
    visitedZones: [0, 1, 2],

    // Achievements (stored separately in localStorage by achievement_manager,
    // but the save system snapshots progress for continuity)
    achievements: ['first_loot', 'first_craft', 'explorer'],
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

  it('SAVE_VERSION is 1', () => {
    // inlined from src/gameobjects/save_logic.js — keep in sync
    expect(SAVE_VERSION).toBe(1);
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
    expect(parsed.version).toBe(1);
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
    expect(restored.inventory).toEqual(['branch', 'copper_wire', 'capacitor']);
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

  it('preserves achievements array', () => {
    expect(restored.achievements).toEqual(['first_loot', 'first_craft', 'explorer']);
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
    state.inventory = Array.from({ length: 50 }, (_, i) => `item_${i}`);

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
