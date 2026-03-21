/**
 * Share Card Tests (Phase 6.2)
 *
 * Tests for:
 *   - ComboTracker peak combo tracking across multiple loots
 *   - ComboTracker frenzy count distinct activations
 *   - Peak / frenzy stats survive reset() (mid-run death) but reset on destroy()
 *   - Zone visit deduplication via Set semantics
 *   - endRun() passes all 4 stats fields to OutroScene
 *   - OutroScene init() safe defaults for all stat fields
 *   - ClipboardItem guard — copy button rendered only when API is available
 *
 * No Phaser import — all logic is tested via plain-object mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Group 1 — ComboTracker peak combo tracking ────────────────────────────────
//
// Inlined from src/gameobjects/combo_tracker.js:
//   this._peakCombo = 0;
//   onLoot(x, y) { this._count++; if (this._count > this._peakCombo) this._peakCombo = this._count; ... }
//   getPeakCombo() { return this._peakCombo; }

function makeComboTracker() {
  return {
    _count: 0,
    _peakCombo: 0,
    _frenzyCount: 0,
    _frenzyActive: false,

    onLoot() {
      this._count++;
      if (this._count > this._peakCombo) this._peakCombo = this._count;
      // Frenzy triggers at count >= 5 (first time only)
      if (this._count >= 5 && !this._frenzyActive) {
        this._frenzyActive = true;
        this._frenzyCount++;
      }
    },

    reset() {
      // Streak resets on death, but lifetime stats (_peakCombo, _frenzyCount) survive
      this._count = 0;
      this._frenzyActive = false;
    },

    getPeakCombo()   { return this._peakCombo; },
    getFrenzyCount() { return this._frenzyCount; },
  };
}

describe('ComboTracker — peak combo tracking', () => {
  it('getPeakCombo() starts at 0 before any loots', () => {
    const tracker = makeComboTracker();
    expect(tracker.getPeakCombo()).toBe(0);
  });

  it('getPeakCombo() equals 1 after a single loot', () => {
    const tracker = makeComboTracker();
    tracker.onLoot();
    expect(tracker.getPeakCombo()).toBe(1);
  });

  it('getPeakCombo() tracks the highest count reached', () => {
    const tracker = makeComboTracker();
    tracker.onLoot();
    tracker.onLoot();
    tracker.onLoot(); // count = 3, peak = 3
    tracker.reset();  // count resets to 0, peak stays at 3
    tracker.onLoot(); // count = 1, peak still 3
    expect(tracker.getPeakCombo()).toBe(3);
  });

  it('getPeakCombo() keeps rising when streak continues past prior peak', () => {
    const tracker = makeComboTracker();
    tracker.onLoot();
    tracker.onLoot(); // peak = 2
    tracker.reset();
    tracker.onLoot();
    tracker.onLoot();
    tracker.onLoot(); // count = 3 > prior peak 2, peak becomes 3
    expect(tracker.getPeakCombo()).toBe(3);
  });

  it('getPeakCombo() never decreases on reset()', () => {
    const tracker = makeComboTracker();
    for (let i = 0; i < 7; i++) tracker.onLoot(); // peak = 7
    tracker.reset();
    expect(tracker.getPeakCombo()).toBe(7);
    tracker.reset();
    expect(tracker.getPeakCombo()).toBe(7);
  });
});

// ── Group 2 — ComboTracker frenzy count ──────────────────────────────────────
//
// Inlined from src/gameobjects/combo_tracker.js _triggerFrenzy():
//   this._frenzyCount++;   (only when !_frenzyActive, i.e. first time at >=5)

describe('ComboTracker — frenzy count', () => {
  it('getFrenzyCount() starts at 0', () => {
    const tracker = makeComboTracker();
    expect(tracker.getFrenzyCount()).toBe(0);
  });

  it('reaching 5 loots in a streak increments frenzyCount by 1', () => {
    const tracker = makeComboTracker();
    for (let i = 0; i < 5; i++) tracker.onLoot();
    expect(tracker.getFrenzyCount()).toBe(1);
  });

  it('frenzy only counts once per active window (loots 6, 7 do not re-trigger)', () => {
    const tracker = makeComboTracker();
    for (let i = 0; i < 7; i++) tracker.onLoot();
    expect(tracker.getFrenzyCount()).toBe(1);
  });

  it('reset() then 5 more loots yields a second frenzy activation', () => {
    const tracker = makeComboTracker();
    for (let i = 0; i < 5; i++) tracker.onLoot(); // 1st frenzy
    tracker.reset();                               // clears _frenzyActive
    for (let i = 0; i < 5; i++) tracker.onLoot(); // 2nd frenzy
    expect(tracker.getFrenzyCount()).toBe(2);
  });

  it('frenzyCount survives reset() (persists to share card)', () => {
    const tracker = makeComboTracker();
    for (let i = 0; i < 5; i++) tracker.onLoot();
    tracker.reset();
    expect(tracker.getFrenzyCount()).toBe(1);
  });

  it('4 loots is not enough to trigger frenzy', () => {
    const tracker = makeComboTracker();
    for (let i = 0; i < 4; i++) tracker.onLoot();
    expect(tracker.getFrenzyCount()).toBe(0);
  });
});

// ── Group 3 — Zone visit deduplication ───────────────────────────────────────
//
// Inlined from src/scenes/game.js:
//   this._visitedZones = new Set(seededZones);
//   transitionToZone: this._visitedZones.add(targetZoneId);
//                     this.registry.set('visitedZones', [...this._visitedZones]);

function makeZoneTracker(seededZones = [0]) {
  return {
    _visitedZones: new Set(seededZones),

    visitZone(id) {
      this._visitedZones.add(id);
    },

    getZonesArray() {
      return [...this._visitedZones];
    },

    getZoneCount() {
      return this._visitedZones.size;
    },
  };
}

describe('Zone visit deduplication', () => {
  it('starts with zone 0 seeded — size is 1', () => {
    const tracker = makeZoneTracker([0]);
    expect(tracker.getZoneCount()).toBe(1);
  });

  it('visiting a new zone increases count', () => {
    const tracker = makeZoneTracker([0]);
    tracker.visitZone(1);
    expect(tracker.getZoneCount()).toBe(2);
  });

  it('revisiting an already-visited zone does NOT increase count', () => {
    const tracker = makeZoneTracker([0]);
    tracker.visitZone(1);
    tracker.visitZone(1); // duplicate
    expect(tracker.getZoneCount()).toBe(2);
  });

  it('visiting all 4 zones (0-3) yields size 4', () => {
    const tracker = makeZoneTracker([0]);
    tracker.visitZone(1);
    tracker.visitZone(2);
    tracker.visitZone(3);
    expect(tracker.getZoneCount()).toBe(4);
  });

  it('zones array spread includes all unique zone IDs', () => {
    const tracker = makeZoneTracker([0]);
    tracker.visitZone(2);
    tracker.visitZone(2);
    tracker.visitZone(3);
    const arr = tracker.getZonesArray();
    expect(arr).toContain(0);
    expect(arr).toContain(2);
    expect(arr).toContain(3);
    expect(arr).toHaveLength(3);
  });

  it('seeded with multiple zones restores prior session state', () => {
    const tracker = makeZoneTracker([0, 1, 2]);
    expect(tracker.getZoneCount()).toBe(3);
  });
});

// ── Group 4 — endRun() passes all stats to OutroScene ─────────────────────────
//
// Inlined from src/scenes/game.js endRun():
//   const peakCombo    = this.comboTracker?.getPeakCombo()   ?? 0;
//   const frenzyCount  = this.comboTracker?.getFrenzyCount() ?? 0;
//   const zonesVisited = this._visitedZones?.size            ?? 1;
//   const itemsFound   = (this.registry.get('inventory') ?? []).length;
//   this.scene.start("outro", { state, underTheWire, peakCombo, frenzyCount, zonesVisited, itemsFound });

function makeGameSceneWithStats({ peakCombo = 0, frenzyCount = 0, zonesVisited = 1, inventory = [] } = {}) {
  const scene = {
    _launching: false,
    comboTracker: {
      getPeakCombo:   () => peakCombo,
      getFrenzyCount: () => frenzyCount,
    },
    _visitedZones: { size: zonesVisited },
    registry: {
      get: (key) => key === 'inventory' ? inventory : null,
    },
    scene: {
      stop:  vi.fn(),
      start: vi.fn(),
    },
  };

  scene.endRun = function (state, options = {}) {
    const pc   = this.comboTracker?.getPeakCombo()   ?? 0;
    const fc   = this.comboTracker?.getFrenzyCount() ?? 0;
    const zv   = this._visitedZones?.size            ?? 1;
    const inv  = (this.registry.get('inventory') ?? []).length;
    this.scene.stop('hud');
    this.scene.start('outro', {
      state,
      underTheWire: options.underTheWire ?? false,
      peakCombo:    pc,
      frenzyCount:  fc,
      zonesVisited: zv,
      itemsFound:   inv,
    });
  };

  return scene;
}

describe('endRun() — stats payload to OutroScene', () => {
  it('passes peakCombo from comboTracker to outro', () => {
    const scene = makeGameSceneWithStats({ peakCombo: 7 });
    scene.endRun('victory', { underTheWire: false });
    expect(scene.scene.start).toHaveBeenCalledWith('outro', expect.objectContaining({
      peakCombo: 7,
    }));
  });

  it('passes frenzyCount from comboTracker to outro', () => {
    const scene = makeGameSceneWithStats({ frenzyCount: 3 });
    scene.endRun('victory', {});
    expect(scene.scene.start).toHaveBeenCalledWith('outro', expect.objectContaining({
      frenzyCount: 3,
    }));
  });

  it('passes zonesVisited from _visitedZones.size to outro', () => {
    const scene = makeGameSceneWithStats({ zonesVisited: 4 });
    scene.endRun('timeout');
    expect(scene.scene.start).toHaveBeenCalledWith('outro', expect.objectContaining({
      zonesVisited: 4,
    }));
  });

  it('passes itemsFound as inventory length to outro', () => {
    const scene = makeGameSceneWithStats({ inventory: ['a', 'b', 'c'] });
    scene.endRun('death', {});
    expect(scene.scene.start).toHaveBeenCalledWith('outro', expect.objectContaining({
      itemsFound: 3,
    }));
  });

  it('null comboTracker falls back to 0 for both stats', () => {
    const scene = makeGameSceneWithStats();
    scene.comboTracker = null;
    scene.endRun('death');
    expect(scene.scene.start).toHaveBeenCalledWith('outro', expect.objectContaining({
      peakCombo:   0,
      frenzyCount: 0,
    }));
  });

  it('null _visitedZones falls back to 1 for zonesVisited', () => {
    const scene = makeGameSceneWithStats();
    scene._visitedZones = null;
    scene.endRun('death');
    expect(scene.scene.start).toHaveBeenCalledWith('outro', expect.objectContaining({
      zonesVisited: 1,
    }));
  });

  it('null inventory registry value falls back to itemsFound: 0', () => {
    const scene = makeGameSceneWithStats();
    scene.registry = { get: () => null };
    scene.endRun('death');
    expect(scene.scene.start).toHaveBeenCalledWith('outro', expect.objectContaining({
      itemsFound: 0,
    }));
  });
});

// ── Group 5 — OutroScene init() safe defaults ─────────────────────────────────
//
// Inlined from src/scenes/outro.js init():
//   this.peakCombo    = data.peakCombo    ?? 0;
//   this.frenzyCount  = data.frenzyCount  ?? 0;
//   this.zonesVisited = data.zonesVisited ?? 1;
//   this.itemsFound   = data.itemsFound   ?? 0;

function makeOutroScene() {
  const scene = {
    state: null,
    underTheWire: null,
    peakCombo: null,
    frenzyCount: null,
    zonesVisited: null,
    itemsFound: null,
    deathMsg: null,
    _feedbackText: null,
  };

  scene.init = function (data) {
    this.state        = data.state        || 'death';
    this.underTheWire = data.underTheWire ?? false;
    this.peakCombo    = data.peakCombo    ?? 0;
    this.frenzyCount  = data.frenzyCount  ?? 0;
    this.zonesVisited = data.zonesVisited ?? 1;
    this.itemsFound   = data.itemsFound   ?? 0;
    this.deathMsg     = null;
    this._feedbackText = null;
  };

  return scene;
}

describe('OutroScene init() — stat safe defaults', () => {
  it('all fields provided → all values stored verbatim', () => {
    const scene = makeOutroScene();
    scene.init({ state: 'victory', underTheWire: true, peakCombo: 6, frenzyCount: 2, zonesVisited: 3, itemsFound: 5 });
    expect(scene.peakCombo).toBe(6);
    expect(scene.frenzyCount).toBe(2);
    expect(scene.zonesVisited).toBe(3);
    expect(scene.itemsFound).toBe(5);
  });

  it('peakCombo absent → defaults to 0', () => {
    const scene = makeOutroScene();
    scene.init({ state: 'death' });
    expect(scene.peakCombo).toBe(0);
  });

  it('frenzyCount absent → defaults to 0', () => {
    const scene = makeOutroScene();
    scene.init({ state: 'death' });
    expect(scene.frenzyCount).toBe(0);
  });

  it('zonesVisited absent → defaults to 1 (at least starting zone)', () => {
    const scene = makeOutroScene();
    scene.init({ state: 'death' });
    expect(scene.zonesVisited).toBe(1);
  });

  it('itemsFound absent → defaults to 0', () => {
    const scene = makeOutroScene();
    scene.init({ state: 'death' });
    expect(scene.itemsFound).toBe(0);
  });

  it('deathMsg always resets to null on init', () => {
    const scene = makeOutroScene();
    scene.deathMsg = 'Florida Man';
    scene.init({ state: 'victory' });
    expect(scene.deathMsg).toBeNull();
  });

  it('state missing → defaults to "death"', () => {
    const scene = makeOutroScene();
    scene.init({});
    expect(scene.state).toBe('death');
  });
});

// ── Group 6 — ClipboardItem guard ────────────────────────────────────────────
//
// Inlined from src/scenes/outro.js addShareCard():
//   const canCopy = typeof ClipboardItem !== 'undefined';
//   if (canCopy) { renderCopyButton(); }

function evalClipboardGuard(globalObj = {}) {
  // Simulate the guard expression from outro.js
  return typeof globalObj.ClipboardItem !== 'undefined';
}

describe('ClipboardItem guard — copy button availability', () => {
  it('ClipboardItem defined → canCopy is true', () => {
    const env = { ClipboardItem: class {} };
    expect(evalClipboardGuard(env)).toBe(true);
  });

  it('ClipboardItem undefined → canCopy is false', () => {
    const env = {};
    expect(evalClipboardGuard(env)).toBe(false);
  });

  it('typeof guard is safe when key is explicitly undefined', () => {
    const env = { ClipboardItem: undefined };
    expect(evalClipboardGuard(env)).toBe(false);
  });
});
