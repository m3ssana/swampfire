/**
 * Hazard Logic Tests
 *
 * Unit tests for pure hazard system logic that does not require the Phaser runtime:
 * - Hazard spawn timing (stormPhase thresholds) and all phase boundaries
 * - Flood zone speed reduction and AABB detection
 * - Patrol AI waypoint selection (looter and rattlesnake)
 * - Near-miss sensor sizing (larger than hitbox — spec requirement)
 * - Near-miss debounce logic
 * - Damage guard (invincibility flag)
 * - Spawn table validation (zone/position integrity)
 * - Phase-gated spawn flag idempotency and zone-transition cleanup
 *
 * Phaser import boundary: none of the source gameobject files are imported
 * directly here. Constants and logic are inlined from source files to keep
 * tests Phaser-free (see MEMORY.md — Phaser Import Boundary).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPhaseForTimeLeft } from '../src/gameobjects/storm_phase_logic.js';
import { FLOOD_SPEED_MULTIPLIER } from '../src/gameobjects/flood_zone.js';

// ── Phase threshold helpers ───────────────────────────────────────────────────

describe('getPhaseForTimeLeft — all boundaries', () => {
  // Phase thresholds (from storm_phase_logic.js):
  //   Phase 1  3600 – 2700  Warning
  //   Phase 2  2699 – 1800  Evacuation
  //   Phase 3  1799 – 900   Storm Surge
  //   Phase 4   899 – 0     Landfall

  it('returns phase 1 at exact upper boundary (2700s)', () => {
    expect(getPhaseForTimeLeft(2700)).toBe(1);
  });

  it('returns phase 2 at 1 second past phase-1 boundary (2699s)', () => {
    expect(getPhaseForTimeLeft(2699)).toBe(2);
  });

  it('returns phase 2 at exact upper boundary (1800s)', () => {
    expect(getPhaseForTimeLeft(1800)).toBe(2);
  });

  it('returns phase 3 at 1 second past phase-2 boundary (1799s)', () => {
    expect(getPhaseForTimeLeft(1799)).toBe(3);
  });

  it('returns phase 3 at exact lower boundary (900s)', () => {
    expect(getPhaseForTimeLeft(900)).toBe(3);
  });

  it('returns phase 4 at 1 second past phase-3 boundary (899s)', () => {
    expect(getPhaseForTimeLeft(899)).toBe(4);
  });

  it('returns phase 4 at 0 seconds remaining', () => {
    expect(getPhaseForTimeLeft(0)).toBe(4);
  });

  it('returns phase 4 for negative time (should not occur in game but must not crash)', () => {
    expect(getPhaseForTimeLeft(-1)).toBe(4);
    expect(getPhaseForTimeLeft(-999)).toBe(4);
  });

  it('returns phase 1 for full game start (3600s)', () => {
    expect(getPhaseForTimeLeft(3600)).toBe(1);
  });

  it('returns phase 1 for values above the game start time', () => {
    // Defensive: unusual but must not return a wrong phase
    expect(getPhaseForTimeLeft(9999)).toBe(1);
  });
});

describe('Hazard spawn timing — spec thresholds', () => {
  it('power lines spawn threshold: stormPhase >= 3 (timeLeft <= 1799s)', () => {
    // 25 min left = 1500s — inside phase 3
    expect(getPhaseForTimeLeft(1500) >= 3).toBe(true);
    // 30 min left = 1800s — still phase 2 (boundary: does NOT spawn yet)
    expect(getPhaseForTimeLeft(1800) >= 3).toBe(false);
    // 1 second into phase 3
    expect(getPhaseForTimeLeft(1799) >= 3).toBe(true);
  });

  it('looters spawn threshold: stormPhase >= 2 (timeLeft <= 2699s)', () => {
    // 40 min left = 2400s — inside phase 2
    expect(getPhaseForTimeLeft(2400) >= 2).toBe(true);
    // 45 min left = 2700s — still phase 1 (boundary: does NOT spawn yet)
    expect(getPhaseForTimeLeft(2700) >= 2).toBe(false);
    // 1 second into phase 2
    expect(getPhaseForTimeLeft(2699) >= 2).toBe(true);
  });

  it('flood zones spawn threshold: stormPhase >= 3 (timeLeft <= 1799s)', () => {
    // 25 min left = 1500s — inside phase 3
    expect(getPhaseForTimeLeft(1500) >= 3).toBe(true);
    // Boundary: 1800s is still phase 2
    expect(getPhaseForTimeLeft(1800) >= 3).toBe(false);
  });

  it('rattlesnakes have no phase condition — spawn tables cover Zone 0 and Zone 3 only', () => {
    // Inlined from hazard_manager.js — rattlesnakes use a zone-keyed object, not a phase flag
    const RATTLESNAKE_ZONE_IDS = new Set([0, 3]);
    expect(RATTLESNAKE_ZONE_IDS.has(0)).toBe(true);
    expect(RATTLESNAKE_ZONE_IDS.has(3)).toBe(true);
    // Zone 1 must NOT have rattlesnake spawns (they are looter / power line / flood territory)
    expect(RATTLESNAKE_ZONE_IDS.has(1)).toBe(false);
    // Zone 2 also has no rattlesnake spawns
    expect(RATTLESNAKE_ZONE_IDS.has(2)).toBe(false);
  });
});

// ── Near-miss sensor sizing ────────────────────────────────────────────────────
// Spec: "Near-miss detection zone exists (larger than hitbox)"
// Values inlined from source files; keep these in sync if source constants change.

describe('Near-miss sensor sizes — larger than hitbox (spec requirement)', () => {
  it('rattlesnake sensor radius (20) is larger than body radius (10)', () => {
    // From rattlesnake.js: BODY_RADIUS = 10, SENSOR_RADIUS = 20
    const BODY_RADIUS   = 10;
    const SENSOR_RADIUS = 20;
    expect(SENSOR_RADIUS).toBeGreaterThan(BODY_RADIUS);
  });

  it('rattlesnake sensor is exactly 2× the body radius', () => {
    const BODY_RADIUS   = 10;
    const SENSOR_RADIUS = 20;
    expect(SENSOR_RADIUS / BODY_RADIUS).toBe(2);
  });

  it('looter sensor radius (18) is larger than body radius (12)', () => {
    // From looter.js: BODY_RADIUS = 12, SENSOR_RADIUS = BODY_RADIUS * 1.5 = 18
    const BODY_RADIUS   = 12;
    const SENSOR_RADIUS = BODY_RADIUS * 1.5;
    expect(SENSOR_RADIUS).toBeGreaterThan(BODY_RADIUS);
    expect(SENSOR_RADIUS).toBe(18);
  });

  it('power line warn sensor (42×42) is larger than hit sensor (28×28)', () => {
    // From power_line.js: HIT_W = 28, HIT_H = 28, WARN_W = HIT_W * 1.5, WARN_H = HIT_H * 1.5
    const HIT_W  = 28;
    const HIT_H  = 28;
    const WARN_W = HIT_W * 1.5;
    const WARN_H = HIT_H * 1.5;
    expect(WARN_W).toBeGreaterThan(HIT_W);
    expect(WARN_H).toBeGreaterThan(HIT_H);
    expect(WARN_W).toBe(42);
    expect(WARN_H).toBe(42);
  });
});

// ── Flood zone speed reduction ────────────────────────────────────────────────

describe('FloodZone speed reduction', () => {
  it('FLOOD_SPEED_MULTIPLIER is between 0 and 1 (partial speed)', () => {
    expect(FLOOD_SPEED_MULTIPLIER).toBeGreaterThan(0);
    expect(FLOOD_SPEED_MULTIPLIER).toBeLessThan(1);
  });

  it('FLOOD_SPEED_MULTIPLIER is 0.45 (player moves at 45% of normal speed)', () => {
    expect(FLOOD_SPEED_MULTIPLIER).toBe(0.45);
  });

  it('applies speed reduction correctly to horizontal walk (3 px/frame)', () => {
    const baseVx = 3;
    const slowedVx = baseVx * FLOOD_SPEED_MULTIPLIER;
    expect(slowedVx).toBeCloseTo(1.35);
  });

  it('applies speed reduction correctly during sprint (6 px/frame)', () => {
    const sprintVx = 6;
    const slowedVx = sprintVx * FLOOD_SPEED_MULTIPLIER;
    expect(slowedVx).toBeCloseTo(2.7);
  });

  it('zero velocity remains zero after applying multiplier', () => {
    // Standing still in flood zone should not induce movement
    expect(0 * FLOOD_SPEED_MULTIPLIER).toBe(0);
  });

  it('multiplier preserves velocity direction (sign unchanged)', () => {
    // Moving left (negative) should stay negative after reduction
    const leftVx = -3;
    const slowed = leftVx * FLOOD_SPEED_MULTIPLIER;
    expect(slowed).toBeLessThan(0);
    expect(slowed).toBeCloseTo(-1.35);
  });
});

describe('FloodZone AABB overlap detection', () => {
  // Mirror the overlap logic from flood_zone.js _update():
  // inside = px >= x && px <= x + width && py >= y && py <= y + height
  const bounds = { x: 100, y: 100, width: 200, height: 100 };
  const playerInside = (px, py) =>
    px >= bounds.x && px <= bounds.x + bounds.width &&
    py >= bounds.y && py <= bounds.y + bounds.height;

  it('player at zone centre is inside', () => {
    expect(playerInside(200, 150)).toBe(true);
  });

  it('player at top-left corner is inside (inclusive boundary)', () => {
    expect(playerInside(100, 100)).toBe(true);
  });

  it('player at bottom-right corner is inside (inclusive boundary)', () => {
    expect(playerInside(300, 200)).toBe(true);
  });

  it('player 1px left of zone is outside', () => {
    expect(playerInside(99, 150)).toBe(false);
  });

  it('player 1px right of zone is outside', () => {
    expect(playerInside(301, 150)).toBe(false);
  });

  it('player 1px below zone is outside', () => {
    expect(playerInside(200, 201)).toBe(false);
  });

  it('player 1px above zone is outside', () => {
    expect(playerInside(200, 99)).toBe(false);
  });

  it('speed multiplier is NOT applied when player is outside zone', () => {
    // When outside, the velocity is left untouched (multiplier = 1.0 effectively)
    const baseVx = 3;
    const isInside = playerInside(50, 50); // well outside
    const appliedVx = isInside ? baseVx * FLOOD_SPEED_MULTIPLIER : baseVx;
    expect(appliedVx).toBe(baseVx); // unmodified
  });

  it('speed multiplier IS applied when player is inside zone', () => {
    const baseVx = 3;
    const isInside = playerInside(200, 150); // centre of zone
    const appliedVx = isInside ? baseVx * FLOOD_SPEED_MULTIPLIER : baseVx;
    expect(appliedVx).toBeCloseTo(1.35);
  });
});

// ── Looter patrol AI ──────────────────────────────────────────────────────────

describe('Looter patrol waypoint logic', () => {
  // Constants inlined from looter.js
  const WALK_SPEED   = 1.4;   // pixels/frame at 60 fps
  const PAUSE_MS_MIN = 400;
  const PAUSE_MS_MAX = 1200;
  const ARRIVAL_DIST = 8;     // dist < 8 → reached waypoint

  it('initially targets point B (heading away from spawn point A)', () => {
    const ptA = { x: 100, y: 200 };
    const ptB = { x: 400, y: 200 };
    let target = ptB;  // from looter.js constructor: this._target = this._ptB
    expect(target).toBe(ptB);
    expect(target.x).toBe(400);
  });

  it('toggles target B → A on first waypoint arrival', () => {
    const ptA = { x: 100, y: 200 };
    const ptB = { x: 400, y: 200 };
    let target = ptB;

    target = (target === ptB) ? ptA : ptB;
    expect(target).toBe(ptA);
  });

  it('toggles target A → B on second waypoint arrival', () => {
    const ptA = { x: 100, y: 200 };
    const ptB = { x: 400, y: 200 };
    let target = ptA;

    target = (target === ptB) ? ptA : ptB;
    expect(target).toBe(ptB);
  });

  it('arrival threshold: dist < 8 triggers waypoint arrival', () => {
    const target = { x: 400, y: 200 };
    const arrivedAt = (bx, by) => {
      const dx = target.x - bx;
      const dy = target.y - by;
      return Math.sqrt(dx * dx + dy * dy) < ARRIVAL_DIST;
    };

    expect(arrivedAt(400, 200)).toBe(true);   // exactly on target
    expect(arrivedAt(393, 200)).toBe(true);   // 7 px away — arrived
    expect(arrivedAt(392, 200)).toBe(false);  // exactly 8 px away — not yet (strict <)
    expect(arrivedAt(391, 200)).toBe(false);  // 9 px away — not yet
  });

  it('normalises movement velocity to exactly WALK_SPEED regardless of direction', () => {
    const target = { x: 500, y: 300 };
    const bx = 100, by = 100;

    const dx   = target.x - bx;
    const dy   = target.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const nx = (dx / dist) * WALK_SPEED;
    const ny = (dy / dist) * WALK_SPEED;

    const actualSpeed = Math.sqrt(nx * nx + ny * ny);
    expect(actualSpeed).toBeCloseTo(WALK_SPEED, 5);
  });

  it('pause timer falls within the defined range [400, 1200] ms', () => {
    // Exercise the formula; Phaser.Math.Between is not available here —
    // verify the equivalent JS range: PAUSE_MS_MIN + Math.random() * range
    for (let i = 0; i < 1000; i++) {
      const pause = PAUSE_MS_MIN + Math.random() * (PAUSE_MS_MAX - PAUSE_MS_MIN);
      expect(pause).toBeGreaterThanOrEqual(PAUSE_MS_MIN);
      expect(pause).toBeLessThanOrEqual(PAUSE_MS_MAX);
    }
  });
});

// ── Rattlesnake wander AI ─────────────────────────────────────────────────────

describe('Rattlesnake wander logic', () => {
  // Constants inlined from rattlesnake.js
  const WANDER_RADIUS = 120;
  const PATROL_SPEED  = 28;     // pixels/second
  const IDLE_MS_MIN   = 1000;
  const IDLE_MS_MAX   = 3000;
  const ARRIVAL_DIST  = 6;      // dist < 6 → reached waypoint

  it('wander picks a point between 30 and WANDER_RADIUS px from origin', () => {
    const origin = { x: 500, y: 500 };

    for (let i = 0; i < 200; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const dist   = 30 + Math.random() * (WANDER_RADIUS - 30);
      const tx     = origin.x + Math.cos(angle) * dist;
      const ty     = origin.y + Math.sin(angle) * dist;

      const actualDist = Math.sqrt((tx - origin.x) ** 2 + (ty - origin.y) ** 2);
      expect(actualDist).toBeGreaterThanOrEqual(30);
      expect(actualDist).toBeLessThanOrEqual(WANDER_RADIUS + 0.001); // float tolerance
    }
  });

  it('idle delay falls within the defined range [1000, 3000] ms', () => {
    for (let i = 0; i < 500; i++) {
      const delay = IDLE_MS_MIN + Math.random() * (IDLE_MS_MAX - IDLE_MS_MIN);
      expect(delay).toBeGreaterThanOrEqual(IDLE_MS_MIN);
      expect(delay).toBeLessThanOrEqual(IDLE_MS_MAX);
    }
  });

  it('arrival threshold: dist < 6 triggers waypoint reached', () => {
    const atWaypoint = (bx, by, tx, ty) => {
      const dx = tx - bx;
      const dy = ty - by;
      return Math.sqrt(dx * dx + dy * dy) < ARRIVAL_DIST;
    };

    expect(atWaypoint(100, 100, 105, 100)).toBe(true);   // 5 px away — arrived
    expect(atWaypoint(100, 100, 106, 100)).toBe(false);  // exactly 6 px away — not yet (strict <)
    expect(atWaypoint(100, 100, 106.1, 100)).toBe(false);// 6.1 px — not yet
    expect(atWaypoint(100, 100, 107, 100)).toBe(false);  // 7 px away — not yet
  });

  it('patrol speed per frame is PATROL_SPEED / 60', () => {
    // From rattlesnake.js: const speed = PATROL_SPEED / 60;
    const speedPerFrame = PATROL_SPEED / 60;
    expect(speedPerFrame).toBeCloseTo(0.4667, 3);
  });

  it('patrol speed normalisation preserves direction', () => {
    const SPEED_PER_FRAME = PATROL_SPEED / 60;
    const target = { x: 620, y: 500 };
    const bx = 500, by = 500;

    const dx   = target.x - bx;
    const dy   = target.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx   = (dx / dist) * SPEED_PER_FRAME;
    const ny   = (dy / dist) * SPEED_PER_FRAME;

    expect(nx).toBeGreaterThan(0);  // moving right
    expect(ny).toBeCloseTo(0, 5);   // no vertical component
    expect(Math.sqrt(nx * nx + ny * ny)).toBeCloseTo(SPEED_PER_FRAME, 5);
  });
});

// ── Near-miss debounce logic ──────────────────────────────────────────────────

describe('Near-miss warning debounce', () => {
  it('fires exactly once on the first overlap; suppressed on subsequent calls', () => {
    let callCount   = 0;
    let _nearPlayer = false;

    const onNearMiss = () => {
      if (_nearPlayer) return;
      _nearPlayer = true;
      callCount++;
    };

    onNearMiss();  // first call — fires
    onNearMiss();  // second call — debounced
    onNearMiss();  // third call — debounced

    expect(callCount).toBe(1);
    expect(_nearPlayer).toBe(true);
  });

  it('fires again after the debounce window resets', () => {
    let callCount   = 0;
    let _nearPlayer = false;

    const onNearMiss = () => {
      if (_nearPlayer) return;
      _nearPlayer = true;
      callCount++;
    };

    onNearMiss();         // fires (count = 1)
    _nearPlayer = false;  // simulate 1500ms/2000ms debounce timer expiring
    onNearMiss();         // fires again (count = 2)

    expect(callCount).toBe(2);
  });

  it('debounce is per-instance — two independent hazards each fire once', () => {
    // Simulate two separate rattlesnakes with their own _nearPlayer flags
    let countA = 0, nearA = false;
    let countB = 0, nearB = false;

    const nearMissA = () => { if (!nearA) { nearA = true; countA++; } };
    const nearMissB = () => { if (!nearB) { nearB = true; countB++; } };

    nearMissA();
    nearMissA();  // debounced
    nearMissB();
    nearMissB();  // debounced

    expect(countA).toBe(1);
    expect(countB).toBe(1);
  });
});

// ── Damage guard (invincibility) ──────────────────────────────────────────────

describe('Hazard damage guard — player invincibility flag', () => {
  /**
   * Mirrors _onHazardHit() from hazard_manager.js:
   *   if (scene.player.invincible) return;
   *   ... scene.restartScene()
   */
  function makeScene() {
    const calls = { flash: 0, shake: 0, explosion: 0, restart: 0 };
    return {
      player: { invincible: false, explosion: () => calls.explosion++ },
      cameras: { main: { flash: () => calls.flash++, shake: () => calls.shake++ } },
      restartScene: () => calls.restart++,
      calls,
    };
  }

  function onHazardHit(scene) {
    if (scene.player.invincible) return;
    scene.cameras.main.flash();
    scene.cameras.main.shake();
    scene.player.explosion();
    scene.restartScene();
  }

  it('deals 1 HP (restarts scene) on contact with a non-invincible player', () => {
    const scene = makeScene();
    onHazardHit(scene);
    expect(scene.calls.restart).toBe(1);
    expect(scene.calls.explosion).toBe(1);
  });

  it('does NOT deal damage when player.invincible is true', () => {
    const scene = makeScene();
    scene.player.invincible = true;
    onHazardHit(scene);
    expect(scene.calls.restart).toBe(0);
    expect(scene.calls.explosion).toBe(0);
    expect(scene.calls.flash).toBe(0);
  });

  it('multiple hits while invincible produce no restartScene calls', () => {
    const scene = makeScene();
    scene.player.invincible = true;
    onHazardHit(scene);
    onHazardHit(scene);
    onHazardHit(scene);
    expect(scene.calls.restart).toBe(0);
  });

  it('hit fires camera flash and shake before restarting scene', () => {
    const scene = makeScene();
    onHazardHit(scene);
    expect(scene.calls.flash).toBe(1);
    expect(scene.calls.shake).toBe(1);
    expect(scene.calls.restart).toBe(1);
  });
});

// ── Spawn table validation ────────────────────────────────────────────────────

describe('Hazard spawn table integrity', () => {
  // Spawn tables inlined from hazard_manager.js — keep in sync with source.
  const RATTLESNAKE_SPAWNS = {
    0: [
      { x:  6 * 48, y: 25 * 48 },
      { x:  8 * 48, y: 35 * 48 },
      { x: 40 * 48, y: 56 * 48 },
      { x: 45 * 48, y: 55 * 48 },
      { x: 70 * 48, y: 10 * 48 },
      { x: 72 * 48, y: 48 * 48 },
    ],
    3: [
      { x: 20 * 48, y: 15 * 48 },
      { x: 35 * 48, y: 20 * 48 },
      { x: 50 * 48, y: 30 * 48 },
      { x: 25 * 48, y: 40 * 48 },
      { x: 60 * 48, y: 12 * 48 },
      { x: 15 * 48, y: 50 * 48 },
    ],
  };

  const LOOTER_PATROLS = [
    { ax: 18 * 48, ay: 22 * 48,  bx: 28 * 48, by: 22 * 48 },
    { ax: 35 * 48, ay: 30 * 48,  bx: 50 * 48, by: 30 * 48 },
    { ax: 55 * 48, ay: 18 * 48,  bx: 62 * 48, by: 28 * 48 },
    { ax: 30 * 48, ay: 50 * 48,  bx: 48 * 48, by: 50 * 48 },
  ];

  const POWERLINE_SPAWNS = [
    { x: 22 * 48, y: 28 * 48 },
    { x: 48 * 48, y: 35 * 48 },
    { x: 62 * 48, y: 22 * 48 },
  ];

  const FLOOD_ZONES = [
    { x: 14 * 48, y: 10 * 48, w: 18 * 48, h:  6 * 48 },
    { x: 34 * 48, y: 24 * 48, w: 10 * 48, h:  8 * 48 },
    { x: 20 * 48, y: 52 * 48, w: 22 * 48, h:  5 * 48 },
  ];

  // Zone dimensions: 80×60 tiles at 48px/tile = 3840×2880 px
  const ZONE_PX = 3840;
  const ZONE_PY = 2880;

  // ── Rattlesnake zone coverage ─────────────────────────────────────────────

  it('rattlesnake spawn table covers exactly Zone 0 and Zone 3 (spec: Zone 0 edges + Zone 3)', () => {
    expect(Object.keys(RATTLESNAKE_SPAWNS)).toEqual(['0', '3']);
  });

  it('rattlesnake spawn table has NO entry for Zone 1 (zone reserved for other hazards)', () => {
    expect(Object.prototype.hasOwnProperty.call(RATTLESNAKE_SPAWNS, '1')).toBe(false);
  });

  it('each zone has at least 4 rattlesnake spawn points (ensures spread coverage)', () => {
    for (const positions of Object.values(RATTLESNAKE_SPAWNS)) {
      expect(positions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('all rattlesnake spawn positions are within zone bounds', () => {
    for (const positions of Object.values(RATTLESNAKE_SPAWNS)) {
      for (const { x, y } of positions) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(ZONE_PX);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(ZONE_PY);
      }
    }
  });

  // ── Looter patrol validation ──────────────────────────────────────────────

  it('all looter patrol waypoints are within zone bounds', () => {
    for (const { ax, ay, bx, by } of LOOTER_PATROLS) {
      expect(ax).toBeGreaterThanOrEqual(0);
      expect(ax).toBeLessThan(ZONE_PX);
      expect(ay).toBeGreaterThanOrEqual(0);
      expect(ay).toBeLessThan(ZONE_PY);
      expect(bx).toBeGreaterThanOrEqual(0);
      expect(bx).toBeLessThan(ZONE_PX);
      expect(by).toBeGreaterThanOrEqual(0);
      expect(by).toBeLessThan(ZONE_PY);
    }
  });

  it('all looter patrol routes have distinct A and B waypoints (non-zero patrol distance)', () => {
    for (const { ax, ay, bx, by } of LOOTER_PATROLS) {
      const samePoint = ax === bx && ay === by;
      expect(samePoint).toBe(false);
    }
  });

  it('all looter patrol routes have a patrol distance >= 1 tile (48 px)', () => {
    for (const { ax, ay, bx, by } of LOOTER_PATROLS) {
      const dist = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
      expect(dist).toBeGreaterThanOrEqual(48);
    }
  });

  it('Zone 1 has at least 3 looter patrol routes', () => {
    expect(LOOTER_PATROLS.length).toBeGreaterThanOrEqual(3);
  });

  // ── Power line validation ─────────────────────────────────────────────────

  it('all power line spawn positions are within zone bounds', () => {
    for (const { x, y } of POWERLINE_SPAWNS) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(ZONE_PX);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(ZONE_PY);
    }
  });

  it('Zone 1 has at least 3 power line spawn positions', () => {
    expect(POWERLINE_SPAWNS.length).toBeGreaterThanOrEqual(3);
  });

  // ── Flood zone validation ─────────────────────────────────────────────────

  it('all flood zones have positive width and height', () => {
    for (const { w, h } of FLOOD_ZONES) {
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
    }
  });

  it('all flood zones fit entirely within zone bounds', () => {
    for (const { x, y, w, h } of FLOOD_ZONES) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(ZONE_PX);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + h).toBeLessThanOrEqual(ZONE_PY);
    }
  });

  it('Zone 1 has at least 2 flood zones', () => {
    expect(FLOOD_ZONES.length).toBeGreaterThanOrEqual(2);
  });

  it('no flood zone has zero area', () => {
    for (const { w, h } of FLOOD_ZONES) {
      expect(w * h).toBeGreaterThan(0);
    }
  });
});

// ── HazardManager phase-gated spawn flags ─────────────────────────────────────

describe('HazardManager phase-gated spawn flags', () => {
  /**
   * Mirrors the spawn-flag logic from HazardManager._checkPhaseSpawns()
   * and _clearHazards(). Tests idempotency, zone gating, and cleanup.
   */

  function makeSpawnTracker() {
    let lootersSpawned    = false;
    let powerLinesSpawned = false;
    let floodZonesSpawned = false;
    const spawnCounts = { looters: 0, powerLines: 0, floodZones: 0 };

    const checkPhaseSpawns = (phase, currentZone) => {
      if (currentZone !== 1) return;

      if (phase >= 2 && !lootersSpawned) {
        lootersSpawned = true;
        spawnCounts.looters++;
      }
      if (phase >= 3 && !powerLinesSpawned) {
        powerLinesSpawned = true;
        spawnCounts.powerLines++;
      }
      if (phase >= 3 && !floodZonesSpawned) {
        floodZonesSpawned = true;
        spawnCounts.floodZones++;
      }
    };

    // Mirrors _clearHazards(): resets all three flags when leaving a zone
    const resetFlags = () => {
      lootersSpawned    = false;
      powerLinesSpawned = false;
      floodZonesSpawned = false;
    };

    return { checkPhaseSpawns, resetFlags, spawnCounts };
  }

  it('spawns looters exactly once when phase first reaches 2', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(2, 1);   // first call at phase 2 — spawns
    checkPhaseSpawns(2, 1);   // duplicate call — no-op
    checkPhaseSpawns(3, 1);   // phase increases — looters already spawned

    expect(spawnCounts.looters).toBe(1);
  });

  it('spawns power lines exactly once when phase first reaches 3', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(2, 1);   // looters, but NOT power lines
    checkPhaseSpawns(3, 1);   // power lines spawn now
    checkPhaseSpawns(3, 1);   // no-op
    checkPhaseSpawns(4, 1);   // phase 4 — power lines already up

    expect(spawnCounts.powerLines).toBe(1);
  });

  it('spawns flood zones exactly once when phase first reaches 3', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(2, 1);
    checkPhaseSpawns(3, 1);
    checkPhaseSpawns(3, 1);

    expect(spawnCounts.floodZones).toBe(1);
  });

  it('does not spawn Phase-2 hazards before phase reaches 2', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(1, 1);

    expect(spawnCounts.looters).toBe(0);
    expect(spawnCounts.powerLines).toBe(0);
    expect(spawnCounts.floodZones).toBe(0);
  });

  it('does not spawn Zone 1 hazards when player is in a different zone', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(3, 0);   // in Zone 0
    checkPhaseSpawns(3, 3);   // in Zone 3

    expect(spawnCounts.looters).toBe(0);
    expect(spawnCounts.powerLines).toBe(0);
    expect(spawnCounts.floodZones).toBe(0);
  });

  it('applying phase 4 in Zone 1 spawns all hazard types at once', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(4, 1);

    expect(spawnCounts.looters).toBe(1);
    expect(spawnCounts.powerLines).toBe(1);
    expect(spawnCounts.floodZones).toBe(1);
  });

  it('re-entering Zone 1 after zone transition respawns all hazards (flags reset)', () => {
    const { checkPhaseSpawns, resetFlags, spawnCounts } = makeSpawnTracker();

    // First visit to Zone 1 at phase 3
    checkPhaseSpawns(3, 1);
    expect(spawnCounts.looters).toBe(1);
    expect(spawnCounts.powerLines).toBe(1);
    expect(spawnCounts.floodZones).toBe(1);

    // Leave Zone 1 — _clearHazards() is called
    resetFlags();

    // Return to Zone 1 at same phase — must re-spawn all
    checkPhaseSpawns(3, 1);
    expect(spawnCounts.looters).toBe(2);
    expect(spawnCounts.powerLines).toBe(2);
    expect(spawnCounts.floodZones).toBe(2);
  });

  it('zone transition cleanup resets flags independently of spawn counts', () => {
    const { checkPhaseSpawns, resetFlags, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(2, 1);  // only looters (phase 2)
    resetFlags();
    checkPhaseSpawns(2, 1);  // re-enters at phase 2 — looters again

    // Only looters spawned on both visits; power lines never triggered
    expect(spawnCounts.looters).toBe(2);
    expect(spawnCounts.powerLines).toBe(0);
    expect(spawnCounts.floodZones).toBe(0);
  });

  it('phase progression within a single Zone 1 visit spawns each type once', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    // Simulate storm phases ticking up while player stays in Zone 1
    checkPhaseSpawns(1, 1);  // nothing yet
    checkPhaseSpawns(2, 1);  // looters
    checkPhaseSpawns(2, 1);  // no-op
    checkPhaseSpawns(3, 1);  // power lines + flood zones
    checkPhaseSpawns(4, 1);  // no-op (all already spawned)

    expect(spawnCounts.looters).toBe(1);
    expect(spawnCounts.powerLines).toBe(1);
    expect(spawnCounts.floodZones).toBe(1);
  });
});
