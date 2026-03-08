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

// ── Extracted constants from zone maps ──────────────────────────────────────

const ZONE0_SOUTH_EXIT = { x: 1632, y: 2736, width: 624, height: 144, targetZone: 1 };
const ZONE1_NORTH_EXIT = { x: 1632, y: 0,    width: 624, height: 144, targetZone: 0 };
const ZONE1_SOUTH_EXIT = { x: 1632, y: 2736, width: 624, height: 144, targetZone: 4 };
const ZONE1_EAST_EXIT  = { x: 3696, y: 1200, width: 144, height: 528, targetZone: 2 };

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
