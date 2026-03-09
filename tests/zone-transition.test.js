/**
 * Zone Transition Tests
 *
 * Validates the exit-detection logic and transition lock behaviour that caused
 * bugs #24 and #27 (Juan stuck in Zone 1, north exit unresponsive).
 *
 * These tests exercise the pure logic extracted from game.js — no Phaser runtime
 * needed. We mock just enough of the scene/player/zone to drive checkExitZones()
 * and transitionToZone().
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// isZoneDefined cannot be imported directly from zone_manager.js because that
// module transitively imports SearchableContainer → DroppedItem → Phaser, which
// is unavailable in the Vitest node/jsdom environment.  Mirror the logic inline
// from the ZONES catalogue in zone_manager.js.
const DEFINED_ZONE_IDS = new Set([0, 1, 2, 3, 4]);
function isZoneDefined(id) { return DEFINED_ZONE_IDS.has(id); }

const MAPS_DIR = resolve(import.meta.dirname, '../public/assets/maps');

function loadZoneMap(filename) {
  return JSON.parse(readFileSync(resolve(MAPS_DIR, filename), 'utf-8'));
}

// ── Extracted constants from zone maps ──────────────────────────────────────

const ZONE0_SOUTH_EXIT = { x: 1632, y: 2736, width: 624, height: 144, targetZone: 1 };
const ZONE0_WEST_EXIT  = { x: 0,    y: 1248, width: 144, height: 432, targetZone: 3 };
const ZONE1_NORTH_EXIT = { x: 1632, y: 0,    width: 624, height: 144, targetZone: 0 };
const ZONE1_SOUTH_EXIT = { x: 1632, y: 2736, width: 624, height: 144, targetZone: 4 };
const ZONE1_EAST_EXIT  = { x: 3696, y: 1200, width: 144, height: 528, targetZone: 2 };
const ZONE2_WEST_EXIT  = { x: 0,    y: 1200, width: 144, height: 528, targetZone: 1 };
const ZONE3_EAST_EXIT  = { x: 3696, y: 1248, width: 144, height: 432, targetZone: 0 };
const ZONE4_NORTH_EXIT = { x: 1632, y: 0,    width: 624, height: 144, targetZone: 1 };

// Entry point when arriving in Zone 1 from Zone 0 (row 12)
const ZONE1_ENTRY_FROM_Z0 = { x: 40 * 48, y: 12 * 48 };   // (1920, 576)
// Entry point when arriving in Zone 0 from Zone 1 (row 52)
const ZONE0_ENTRY_FROM_Z1 = { x: 40 * 48, y: 52 * 48 };   // (1920, 2496)

// ── AABB overlap (mirrors checkExitZones logic in game.js) ──────────────────

function isInsideExit(px, py, exit) {
  return px >= exit.x && px <= exit.x + exit.width &&
         py >= exit.y && py <= exit.y + exit.height;
}

// ── Mock scene ──────────────────────────────────────────────────────────────

function createMockScene() {
  const transitionLog = [];

  const scene = {
    _transitioning: false,
    player: { sprite: { x: 0, y: 0 }, locked: false },
    zone: { exits: [] },
    nearbyInteractable: null,

    /** Mirrors checkExitZones() from game.js lines 343-357 */
    checkExitZones() {
      if (this._transitioning || !this.player?.sprite) return null;

      const px = this.player.sprite.x;
      const py = this.player.sprite.y;

      for (const exit of (this.zone.exits ?? [])) {
        if (isInsideExit(px, py, exit)) {
          this.transitionToZone(exit.targetZone);
          return exit.targetZone;
        }
      }
      return null;
    },

    /** Simplified transitionToZone — records the call and sets lock */
    transitionToZone(targetZoneId) {
      if (this._transitioning) return;
      this._transitioning = true;
      this.player.locked = true;
      this.nearbyInteractable = null;
      transitionLog.push(targetZoneId);
    },

    /** Simulate the 300ms timer completing (unlock) */
    completeTransition() {
      this.player.locked = false;
      this._transitioning = false;
    },

    getTransitionLog() { return transitionLog; },
  };

  return scene;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Exit zone AABB detection', () => {
  it('detects player inside Zone 1 north exit', () => {
    expect(isInsideExit(1920, 72, ZONE1_NORTH_EXIT)).toBe(true);
  });

  it('detects player at exact exit boundaries', () => {
    // Top-left corner
    expect(isInsideExit(1632, 0, ZONE1_NORTH_EXIT)).toBe(true);
    // Bottom-right corner
    expect(isInsideExit(2256, 144, ZONE1_NORTH_EXIT)).toBe(true);
  });

  it('rejects player outside exit rectangle', () => {
    // Just above (negative y)
    expect(isInsideExit(1920, -1, ZONE1_NORTH_EXIT)).toBe(false);
    // Just below
    expect(isInsideExit(1920, 145, ZONE1_NORTH_EXIT)).toBe(false);
    // Just left
    expect(isInsideExit(1631, 72, ZONE1_NORTH_EXIT)).toBe(false);
    // Just right
    expect(isInsideExit(2257, 72, ZONE1_NORTH_EXIT)).toBe(false);
  });

  it('rejects player at Zone 1 entry point (should NOT re-trigger exit)', () => {
    // Entry point from Zone 0: (1920, 576) — must be outside north exit (y=0..144)
    expect(isInsideExit(ZONE1_ENTRY_FROM_Z0.x, ZONE1_ENTRY_FROM_Z0.y, ZONE1_NORTH_EXIT))
      .toBe(false);
  });

  it('rejects player at Zone 0 entry point (should NOT re-trigger south exit)', () => {
    // Entry point from Zone 1: (1920, 2496) — must be outside south exit (y=2736..2880)
    expect(isInsideExit(ZONE0_ENTRY_FROM_Z1.x, ZONE0_ENTRY_FROM_Z1.y, ZONE0_SOUTH_EXIT))
      .toBe(false);
  });
});

describe('Entry point clearance from exit triggers', () => {
  it('Zone 1 entry from Z0 has >= 240px clearance from north exit', () => {
    const exitBottom = ZONE1_NORTH_EXIT.y + ZONE1_NORTH_EXIT.height; // 144
    const entryY = ZONE1_ENTRY_FROM_Z0.y;                            // 576
    expect(entryY - exitBottom).toBeGreaterThanOrEqual(240);
  });

  it('Zone 0 entry from Z1 has >= 240px clearance from south exit', () => {
    const exitTop = ZONE0_SOUTH_EXIT.y;                               // 2736
    const entryY = ZONE0_ENTRY_FROM_Z1.y;                             // 2496
    expect(exitTop - entryY).toBeGreaterThanOrEqual(240);
  });
});

describe('checkExitZones — transition lock', () => {
  let scene;

  beforeEach(() => {
    scene = createMockScene();
    scene.zone.exits = [ZONE1_NORTH_EXIT, ZONE1_SOUTH_EXIT, ZONE1_EAST_EXIT];
  });

  it('triggers transition when player walks into north exit', () => {
    scene.player.sprite.x = 1920;
    scene.player.sprite.y = 72;

    const result = scene.checkExitZones();
    expect(result).toBe(0); // target: Zone 0
    expect(scene._transitioning).toBe(true);
    expect(scene.player.locked).toBe(true);
  });

  it('does NOT trigger when _transitioning is true', () => {
    scene._transitioning = true;
    scene.player.sprite.x = 1920;
    scene.player.sprite.y = 72;

    const result = scene.checkExitZones();
    expect(result).toBeNull();
    expect(scene.getTransitionLog()).toHaveLength(0);
  });

  it('does NOT trigger when player sprite is null', () => {
    scene.player.sprite = null;
    const result = scene.checkExitZones();
    expect(result).toBeNull();
  });

  it('does NOT double-trigger on consecutive frames', () => {
    scene.player.sprite.x = 1920;
    scene.player.sprite.y = 72;

    scene.checkExitZones(); // first frame — triggers
    scene.checkExitZones(); // second frame — _transitioning blocks it

    expect(scene.getTransitionLog()).toEqual([0]); // only one transition
  });
});

describe('Full round-trip: Zone 0 → Zone 1 → Zone 0', () => {
  it('completes a full round-trip without getting stuck', () => {
    const scene = createMockScene();

    // ── Start in Zone 0, walk south ──
    scene.zone.exits = [ZONE0_SOUTH_EXIT];
    scene.player.sprite.x = 1920;
    scene.player.sprite.y = 2800; // inside south exit

    scene.checkExitZones();
    expect(scene.getTransitionLog()).toEqual([1]);
    expect(scene._transitioning).toBe(true);

    // ── Simulate transition completion (300ms timer fires) ──
    // Zone 1 exits are loaded, player repositioned at entry point
    scene.zone.exits = [ZONE1_NORTH_EXIT, ZONE1_SOUTH_EXIT, ZONE1_EAST_EXIT];
    scene.player.sprite.x = ZONE1_ENTRY_FROM_Z0.x;
    scene.player.sprite.y = ZONE1_ENTRY_FROM_Z0.y;
    scene.completeTransition();

    // Verify: player at entry point does NOT immediately re-trigger an exit
    expect(scene._transitioning).toBe(false);
    const accidentalTrigger = scene.checkExitZones();
    expect(accidentalTrigger).toBeNull();

    // ── Walk north to Zone 1 exit ──
    scene.player.sprite.y = 72; // inside north exit corridor

    const returnTrip = scene.checkExitZones();
    expect(returnTrip).toBe(0); // triggers return to Zone 0
    expect(scene._transitioning).toBe(true);
    expect(scene.getTransitionLog()).toEqual([1, 0]);

    // ── Complete return transition ──
    scene.zone.exits = [ZONE0_SOUTH_EXIT];
    scene.player.sprite.x = ZONE0_ENTRY_FROM_Z1.x;
    scene.player.sprite.y = ZONE0_ENTRY_FROM_Z1.y;
    scene.completeTransition();

    // Verify: back in Zone 0, not stuck
    expect(scene._transitioning).toBe(false);
    expect(scene.player.locked).toBe(false);
    expect(scene.checkExitZones()).toBeNull(); // not near any exit
  });
});

describe('Tilemap exit data integrity', () => {
  it('Zone 1 north exit targets Zone 0', () => {
    expect(ZONE1_NORTH_EXIT.targetZone).toBe(0);
  });

  it('Zone 0 south exit targets Zone 1', () => {
    expect(ZONE0_SOUTH_EXIT.targetZone).toBe(1);
  });

  it('exit rectangles have non-zero dimensions', () => {
    for (const exit of [ZONE0_SOUTH_EXIT, ZONE1_NORTH_EXIT, ZONE1_SOUTH_EXIT, ZONE1_EAST_EXIT]) {
      expect(exit.width).toBeGreaterThan(0);
      expect(exit.height).toBeGreaterThan(0);
    }
  });
});

// ── New zone connections ─────────────────────────────────────────────────────

describe('Zone 1 → Zone 2 transition (east exit)', () => {
  it('Zone 1 has an east exit targeting Zone 2', () => {
    expect(ZONE1_EAST_EXIT.targetZone).toBe(2);
    expect(ZONE1_EAST_EXIT.width).toBeGreaterThan(0);
    expect(ZONE1_EAST_EXIT.height).toBeGreaterThan(0);
  });

  it('Zone 2 entry point (col 4, row 30) is inside the cleared west corridor', () => {
    // The cleared corridor spans cols 0-2, rows 25-35.
    // Entry at col 4 is just east of the corridor — inside Zone 2, clear of the exit trigger.
    const entryX = 4 * 48;   // 192
    const entryY = 30 * 48;  // 1440
    const tileX = Math.floor(entryX / 48);
    const tileY = Math.floor(entryY / 48);
    expect(tileX).toBe(4);
    expect(tileY).toBe(30);
    // Row 30 is within the cleared corridor row range (25-35)
    expect(tileY).toBeGreaterThanOrEqual(25);
    expect(tileY).toBeLessThanOrEqual(35);
  });

  it('Zone 2 entry point is NOT inside the Zone 2 west exit rectangle', () => {
    const entryX = 4 * 48;   // 192
    const entryY = 30 * 48;  // 1440
    const inside = isInsideExit(entryX, entryY, ZONE2_WEST_EXIT);
    expect(inside).toBe(false);
  });

  it('Zone 2 entry point obstacle tile is passable (GID 0)', () => {
    const mapData = loadZoneMap('zone2.json');
    const obsLayer = mapData.layers.find(l => l.name === 'obstacles' && l.type === 'tilelayer');
    const tileX = Math.floor((4 * 48) / 48);   // 4
    const tileY = Math.floor((30 * 48) / 48);  // 30
    const gid = obsLayer.data[tileY * mapData.width + tileX];
    expect(gid).toBe(0);
  });
});

describe('Zone 0 → Zone 3 transition (west exit)', () => {
  it('Zone 0 has a west exit targeting Zone 3', () => {
    expect(ZONE0_WEST_EXIT.targetZone).toBe(3);
    expect(ZONE0_WEST_EXIT.width).toBeGreaterThan(0);
    expect(ZONE0_WEST_EXIT.height).toBeGreaterThan(0);
  });

  it('Zone 3 entry point (col 75, row 30) is inside the cleared east corridor', () => {
    // The cleared corridor spans cols 77-79, rows 26-34.
    // Entry at col 75 is just west of the corridor — inside Zone 3, clear of the exit trigger.
    const entryX = 75 * 48;  // 3600
    const entryY = 30 * 48;  // 1440
    const tileX = Math.floor(entryX / 48);
    const tileY = Math.floor(entryY / 48);
    expect(tileX).toBe(75);
    expect(tileY).toBe(30);
    // Row 30 is within the cleared corridor row range (26-34)
    expect(tileY).toBeGreaterThanOrEqual(26);
    expect(tileY).toBeLessThanOrEqual(34);
  });

  it('Zone 3 entry point is NOT inside the Zone 3 east exit rectangle', () => {
    const entryX = 75 * 48;  // 3600
    const entryY = 30 * 48;  // 1440
    const inside = isInsideExit(entryX, entryY, ZONE3_EAST_EXIT);
    expect(inside).toBe(false);
  });

  it('Zone 3 entry point obstacle tile is passable (GID 0)', () => {
    const mapData = loadZoneMap('zone3.json');
    const obsLayer = mapData.layers.find(l => l.name === 'obstacles' && l.type === 'tilelayer');
    const tileX = Math.floor((75 * 48) / 48);  // 75
    const tileY = Math.floor((30 * 48) / 48);  // 30
    const gid = obsLayer.data[tileY * mapData.width + tileX];
    expect(gid).toBe(0);
  });
});

describe('Zone 1 → Zone 4 transition (south exit)', () => {
  it('Zone 1 has a south exit targeting Zone 4', () => {
    expect(ZONE1_SOUTH_EXIT.targetZone).toBe(4);
    expect(ZONE1_SOUTH_EXIT.width).toBeGreaterThan(0);
    expect(ZONE1_SOUTH_EXIT.height).toBeGreaterThan(0);
  });

  it('Zone 4 entry point (col 40, row 10) is inside the cleared north corridor', () => {
    // The cleared corridor spans cols 34-46, rows 0-2.
    // Entry at row 10 is south of the corridor — inside Zone 4, clear of the exit trigger.
    const entryX = 40 * 48;  // 1920
    const entryY = 10 * 48;  // 480
    const tileX = Math.floor(entryX / 48);
    const tileY = Math.floor(entryY / 48);
    expect(tileX).toBe(40);
    expect(tileY).toBe(10);
    // Col 40 is within the cleared corridor col range (34-46)
    expect(tileX).toBeGreaterThanOrEqual(34);
    expect(tileX).toBeLessThanOrEqual(46);
  });

  it('Zone 4 entry point is NOT inside the Zone 4 north exit rectangle', () => {
    const entryX = 40 * 48;  // 1920
    const entryY = 10 * 48;  // 480
    const inside = isInsideExit(entryX, entryY, ZONE4_NORTH_EXIT);
    expect(inside).toBe(false);
  });

  it('Zone 4 entry point has >= 240px clearance from Zone 4 north exit', () => {
    const exitBottom = ZONE4_NORTH_EXIT.y + ZONE4_NORTH_EXIT.height;  // 144
    const entryY = 10 * 48;                                           // 480
    expect(entryY - exitBottom).toBeGreaterThanOrEqual(240);
  });

  it('Zone 4 entry point obstacle tile is passable (GID 0)', () => {
    const mapData = loadZoneMap('zone4.json');
    const obsLayer = mapData.layers.find(l => l.name === 'obstacles' && l.type === 'tilelayer');
    const tileX = Math.floor((40 * 48) / 48);  // 40
    const tileY = Math.floor((10 * 48) / 48);  // 10
    const gid = obsLayer.data[tileY * mapData.width + tileX];
    expect(gid).toBe(0);
  });
});

describe('isZoneDefined — zone catalogue coverage', () => {
  it('returns true for zones 0 through 4', () => {
    for (const id of [0, 1, 2, 3, 4]) {
      expect(isZoneDefined(id), `zone ${id} should be defined`).toBe(true);
    }
  });

  it('returns false for zone 5', () => {
    expect(isZoneDefined(5)).toBe(false);
  });

  it('returns false for zone 99', () => {
    expect(isZoneDefined(99)).toBe(false);
  });

  it('returns false for negative zone IDs', () => {
    expect(isZoneDefined(-1)).toBe(false);
  });
});
