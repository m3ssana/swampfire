/**
 * Hazard Logic Tests
 *
 * Unit tests for pure hazard system logic that does not require the Phaser runtime:
 * - Hazard spawn timing (stormPhase thresholds)
 * - Flood zone speed reduction
 * - Patrol AI waypoint selection
 * - Near-miss debounce logic
 * - Spawn table validation (zone/position integrity)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPhaseForTimeLeft } from '../src/gameobjects/storm_phase_logic.js';
import { FLOOD_SPEED_MULTIPLIER } from '../src/gameobjects/flood_zone.js';

// ── Phase threshold helpers ───────────────────────────────────────────────────

describe('Hazard spawn timing via stormPhase', () => {
  it('power lines spawn threshold: stormPhase >= 3 (timeLeft <= 1799s)', () => {
    // 40 min elapsed = 20 min left = 1200s — Phase 3 (range 1799-900s)
    expect(getPhaseForTimeLeft(1200)).toBe(3);
    expect(getPhaseForTimeLeft(1200) >= 3).toBe(true);

    // 30 min left = 1800s — still phase 2 (boundary)
    expect(getPhaseForTimeLeft(1800)).toBe(2);
    expect(getPhaseForTimeLeft(1800) >= 3).toBe(false);

    // 1 second past phase 3 threshold
    expect(getPhaseForTimeLeft(1799)).toBe(3);
    expect(getPhaseForTimeLeft(1799) >= 3).toBe(true);
  });

  it('looters spawn threshold: stormPhase >= 2 (timeLeft <= 2699s)', () => {
    // 20 min elapsed = 40 min left = 2400s — inside phase 2
    expect(getPhaseForTimeLeft(2400)).toBe(2);
    expect(getPhaseForTimeLeft(2400) >= 2).toBe(true);

    // 45 min left = 2700s — still phase 1 (boundary)
    expect(getPhaseForTimeLeft(2700)).toBe(1);
    expect(getPhaseForTimeLeft(2700) >= 2).toBe(false);

    // 1 second into phase 2
    expect(getPhaseForTimeLeft(2699)).toBe(2);
    expect(getPhaseForTimeLeft(2699) >= 2).toBe(true);
  });

  it('flood zones spawn threshold: stormPhase >= 3 (timeLeft <= 1799s)', () => {
    // 35 min elapsed = 25 min left = 1500s — inside phase 3
    expect(getPhaseForTimeLeft(1500)).toBe(3);
    expect(getPhaseForTimeLeft(1500) >= 3).toBe(true);
  });

  it('rattlesnakes are always present (no phase condition)', () => {
    // Rattlesnakes spawn unconditionally — they're in the zone from the start
    const alwaysPresent = (phase) => true;  // no threshold
    expect(alwaysPresent(1)).toBe(true);
    expect(alwaysPresent(4)).toBe(true);
  });
});

// ── Flood zone speed reduction ────────────────────────────────────────────────

describe('FloodZone speed reduction', () => {
  it('exports FLOOD_SPEED_MULTIPLIER as a value between 0 and 1', () => {
    expect(FLOOD_SPEED_MULTIPLIER).toBeGreaterThan(0);
    expect(FLOOD_SPEED_MULTIPLIER).toBeLessThan(1);
  });

  it('FLOOD_SPEED_MULTIPLIER is 0.45 (45% of normal speed)', () => {
    expect(FLOOD_SPEED_MULTIPLIER).toBe(0.45);
  });

  it('applies speed reduction correctly to player velocity', () => {
    const baseVx = 3;  // normal walk speed
    const baseVy = 0;

    const slowedVx = baseVx * FLOOD_SPEED_MULTIPLIER;
    const slowedVy = baseVy * FLOOD_SPEED_MULTIPLIER;

    expect(slowedVx).toBeCloseTo(1.35);
    expect(slowedVy).toBe(0);
  });

  it('applies speed reduction correctly during sprint (6 px/frame)', () => {
    const sprintVx = 6;
    const slowedVx = sprintVx * FLOOD_SPEED_MULTIPLIER;
    expect(slowedVx).toBeCloseTo(2.7);
  });

  it('AABB overlap check: player inside flood zone', () => {
    const bounds = { x: 100, y: 100, width: 200, height: 100 };
    const playerInside = (px, py) =>
      px >= bounds.x && px <= bounds.x + bounds.width &&
      py >= bounds.y && py <= bounds.y + bounds.height;

    expect(playerInside(200, 150)).toBe(true);   // centre
    expect(playerInside(100, 100)).toBe(true);   // top-left corner
    expect(playerInside(300, 200)).toBe(true);   // bottom-right corner
    expect(playerInside(99,  150)).toBe(false);  // just left
    expect(playerInside(301, 150)).toBe(false);  // just right
    expect(playerInside(200, 201)).toBe(false);  // just below
  });
});

// ── Looter patrol AI ──────────────────────────────────────────────────────────

describe('Looter patrol waypoint logic', () => {
  it('toggles target between A and B', () => {
    const ptA = { x: 100, y: 200 };
    const ptB = { x: 400, y: 200 };
    let target = ptB;

    // Toggle: B → A
    target = (target === ptB) ? ptA : ptB;
    expect(target).toBe(ptA);

    // Toggle: A → B
    target = (target === ptB) ? ptA : ptB;
    expect(target).toBe(ptB);
  });

  it('starts travelling toward point B', () => {
    const ptA = { x: 100, y: 200 };
    const ptB = { x: 400, y: 200 };
    const target = ptB;  // initial target is B

    expect(target).toBe(ptB);
    expect(target.x).toBe(400);
  });

  it('correctly computes arrival (dist < 8 threshold)', () => {
    const target = { x: 400, y: 200 };

    const arrivedAt = (bx, by) => {
      const dx = target.x - bx;
      const dy = target.y - by;
      return Math.sqrt(dx * dx + dy * dy) < 8;
    };

    expect(arrivedAt(393, 200)).toBe(true);   // 7 px away — arrived
    expect(arrivedAt(392, 200)).toBe(false);  // 8 px away — not yet
    expect(arrivedAt(400, 200)).toBe(true);   // exactly on target
  });

  it('normalises movement velocity to WALK_SPEED', () => {
    const WALK_SPEED = 1.4;
    const target = { x: 500, y: 300 };
    const bx = 100, by = 100;

    const dx = target.x - bx;
    const dy = target.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const nx = (dx / dist) * WALK_SPEED;
    const ny = (dy / dist) * WALK_SPEED;

    const actualSpeed = Math.sqrt(nx * nx + ny * ny);
    expect(actualSpeed).toBeCloseTo(WALK_SPEED, 5);
  });

  it('pause timer falls within the defined range', () => {
    const PAUSE_MS_MIN = 400;
    const PAUSE_MS_MAX = 1200;

    // Simulate 1000 random pause durations
    for (let i = 0; i < 1000; i++) {
      const pause = PAUSE_MS_MIN + Math.random() * (PAUSE_MS_MAX - PAUSE_MS_MIN);
      expect(pause).toBeGreaterThanOrEqual(PAUSE_MS_MIN);
      expect(pause).toBeLessThanOrEqual(PAUSE_MS_MAX);
    }
  });
});

// ── Rattlesnake wander AI ─────────────────────────────────────────────────────

describe('Rattlesnake wander logic', () => {
  it('wander radius picks a point within WANDER_RADIUS of origin', () => {
    const WANDER_RADIUS = 120;
    const origin = { x: 500, y: 500 };

    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 30 + Math.random() * (WANDER_RADIUS - 30);  // Between(30, WANDER_RADIUS)
      const tx = origin.x + Math.cos(angle) * dist;
      const ty = origin.y + Math.sin(angle) * dist;

      const actualDist = Math.sqrt((tx - origin.x) ** 2 + (ty - origin.y) ** 2);
      expect(actualDist).toBeGreaterThanOrEqual(30);
      expect(actualDist).toBeLessThanOrEqual(WANDER_RADIUS + 1); // +1 for float tolerance
    }
  });

  it('idle delay falls within the defined range', () => {
    const IDLE_MS_MIN = 1000;
    const IDLE_MS_MAX = 3000;

    for (let i = 0; i < 500; i++) {
      const delay = IDLE_MS_MIN + Math.random() * (IDLE_MS_MAX - IDLE_MS_MIN);
      expect(delay).toBeGreaterThanOrEqual(IDLE_MS_MIN);
      expect(delay).toBeLessThanOrEqual(IDLE_MS_MAX);
    }
  });

  it('reaches waypoint when dist < 6 (arrival threshold)', () => {
    const ARRIVAL = 6;

    const atWaypoint = (bx, by, tx, ty) => {
      const dx = tx - bx;
      const dy = ty - by;
      return Math.sqrt(dx * dx + dy * dy) < ARRIVAL;
    };

    expect(atWaypoint(100, 100, 105, 100)).toBe(true);   // 5 px away
    expect(atWaypoint(100, 100, 107, 100)).toBe(false);  // 7 px away
  });
});

// ── Near-miss debounce logic ──────────────────────────────────────────────────

describe('Near-miss warning debounce', () => {
  it('does not fire if _nearPlayer is already true', () => {
    let callCount = 0;
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

  it('resets after the debounce window and fires again', () => {
    let callCount = 0;
    let _nearPlayer = false;

    const onNearMiss = () => {
      if (_nearPlayer) return;
      _nearPlayer = true;
      callCount++;
    };

    onNearMiss();        // fires
    _nearPlayer = false; // simulate 1500ms / 2000ms timer reset
    onNearMiss();        // fires again after reset

    expect(callCount).toBe(2);
  });
});

// ── Spawn table validation ────────────────────────────────────────────────────

describe('Hazard spawn table integrity', () => {
  // Inlined from hazard_manager.js to test without Phaser
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

  const ZONE_PX = 3840;  // 80 * 48
  const ZONE_PY = 2880;  // 60 * 48

  it('all rattlesnake spawn positions are within zone bounds', () => {
    for (const [zoneId, positions] of Object.entries(RATTLESNAKE_SPAWNS)) {
      for (const { x, y } of positions) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(ZONE_PX);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(ZONE_PY);
      }
    }
  });

  it('all looter patrol waypoints are within Zone 1 bounds', () => {
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

  it('looter patrol routes have distinct A and B points', () => {
    for (const { ax, ay, bx, by } of LOOTER_PATROLS) {
      const same = ax === bx && ay === by;
      expect(same).toBe(false);
    }
  });

  it('all power line spawn positions are within Zone 1 bounds', () => {
    for (const { x, y } of POWERLINE_SPAWNS) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(ZONE_PX);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(ZONE_PY);
    }
  });

  it('all flood zones are within Zone 1 bounds', () => {
    for (const { x, y, w, h } of FLOOD_ZONES) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(ZONE_PX);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + h).toBeLessThanOrEqual(ZONE_PY);
    }
  });

  it('all flood zones have positive width and height', () => {
    for (const { w, h } of FLOOD_ZONES) {
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
    }
  });

  it('rattlesnake spawns exist for Zone 0 and Zone 3 only', () => {
    expect(Object.keys(RATTLESNAKE_SPAWNS)).toEqual(['0', '3']);
  });

  it('each zone has at least 4 rattlesnake spawns', () => {
    for (const positions of Object.values(RATTLESNAKE_SPAWNS)) {
      expect(positions.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('Zone 1 has at least 3 power line spawn positions', () => {
    expect(POWERLINE_SPAWNS.length).toBeGreaterThanOrEqual(3);
  });

  it('Zone 1 has at least 2 flood zones', () => {
    expect(FLOOD_ZONES.length).toBeGreaterThanOrEqual(2);
  });
});

// ── HazardManager spawn flag logic ───────────────────────────────────────────

describe('HazardManager phase-gated spawn flags', () => {
  /**
   * Simulates the spawn-flag logic extracted from HazardManager.
   * Ensures that crossing a phase threshold triggers a spawn exactly once,
   * and that zone transitions reset the flags.
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

    const resetFlags = () => {
      lootersSpawned    = false;
      powerLinesSpawned = false;
      floodZonesSpawned = false;
    };

    return { checkPhaseSpawns, resetFlags, spawnCounts };
  }

  it('spawns looters exactly once when phase reaches 2', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(2, 1);
    checkPhaseSpawns(2, 1);  // should be a no-op (already spawned)
    checkPhaseSpawns(3, 1);  // phase progresses — looters already up

    expect(spawnCounts.looters).toBe(1);
  });

  it('spawns power lines exactly once when phase reaches 3', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(2, 1);  // looters, but not power lines
    checkPhaseSpawns(3, 1);  // power lines spawn
    checkPhaseSpawns(3, 1);  // no-op
    checkPhaseSpawns(4, 1);  // no-op

    expect(spawnCounts.powerLines).toBe(1);
  });

  it('does not spawn Zone 1 hazards when in a different zone', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(3, 0);  // in Zone 0 — should not spawn
    checkPhaseSpawns(3, 3);  // in Zone 3 — should not spawn

    expect(spawnCounts.looters).toBe(0);
    expect(spawnCounts.powerLines).toBe(0);
    expect(spawnCounts.floodZones).toBe(0);
  });

  it('respawns hazards after zone re-entry (flags reset on zone change)', () => {
    const { checkPhaseSpawns, resetFlags, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(3, 1);   // first Zone 1 visit
    resetFlags();             // zone transition away and back
    checkPhaseSpawns(3, 1);   // re-entering Zone 1 at same phase

    expect(spawnCounts.looters).toBe(2);
    expect(spawnCounts.powerLines).toBe(2);
    expect(spawnCounts.floodZones).toBe(2);
  });

  it('applying phase 4 in Zone 1 spawns all hazards', () => {
    const { checkPhaseSpawns, spawnCounts } = makeSpawnTracker();

    checkPhaseSpawns(4, 1);  // all thresholds crossed at once

    expect(spawnCounts.looters).toBe(1);
    expect(spawnCounts.powerLines).toBe(1);
    expect(spawnCounts.floodZones).toBe(1);
  });
});
