/**
 * Lightning Logic Tests
 *
 * Pure-logic tests for the lightning system (9.1.1).
 * Lightning intervals, shake profiles, thunder delay, bolt generation, and phase gating.
 *
 * All functions live in src/gameobjects/lightning_logic.js (no Phaser dependency).
 *
 * Acceptance Criteria (from issue #114):
 * - Lightning intervals: Phase 2 every 20-30s, Phase 3 every 10-20s, Phase 4 every 5-15s
 * - Camera flash white 100ms on strike
 * - Screen shake: distant 0.003/200ms, close 0.008/400ms
 * - Thunder delay 200-800ms (distance simulation)
 * - Procedural bolt via Graphics with jagged segments
 */

import { describe, it, expect } from 'vitest';
import {
  LIGHTNING_INTERVALS,
  THUNDER_DELAY_MS,
  SHAKE_PROFILES,
  getLightningInterval,
  getShakeProfile,
  getThunderDelay,
  generateBoltPoints,
  isLightningPhase,
  pickInterval,
} from '../src/gameobjects/lightning_logic.js';

// ── Interval configuration ──────────────────────────────────────────────────

describe('LIGHTNING_INTERVALS constant', () => {
  it('has entries for phases 2, 3, and 4', () => {
    expect(LIGHTNING_INTERVALS).toHaveProperty('2');
    expect(LIGHTNING_INTERVALS).toHaveProperty('3');
    expect(LIGHTNING_INTERVALS).toHaveProperty('4');
  });

  it('Phase 2 interval is 20-30 seconds (ms units)', () => {
    expect(LIGHTNING_INTERVALS[2].min).toBe(20000);
    expect(LIGHTNING_INTERVALS[2].max).toBe(30000);
  });

  it('Phase 3 interval is 10-20 seconds (ms units)', () => {
    expect(LIGHTNING_INTERVALS[3].min).toBe(10000);
    expect(LIGHTNING_INTERVALS[3].max).toBe(20000);
  });

  it('Phase 4 interval is 5-15 seconds (ms units)', () => {
    expect(LIGHTNING_INTERVALS[4].min).toBe(5000);
    expect(LIGHTNING_INTERVALS[4].max).toBe(15000);
  });

  it('each phase interval has min < max', () => {
    for (const phase of [2, 3, 4]) {
      const { min, max } = LIGHTNING_INTERVALS[phase];
      expect(min).toBeLessThan(max);
    }
  });

  it('higher phases have shorter intervals than lower phases', () => {
    expect(LIGHTNING_INTERVALS[3].min).toBeLessThan(LIGHTNING_INTERVALS[2].min);
    expect(LIGHTNING_INTERVALS[4].min).toBeLessThan(LIGHTNING_INTERVALS[3].min);
    expect(LIGHTNING_INTERVALS[3].max).toBeLessThan(LIGHTNING_INTERVALS[2].max);
    expect(LIGHTNING_INTERVALS[4].max).toBeLessThan(LIGHTNING_INTERVALS[3].max);
  });
});

describe('getLightningInterval(phase)', () => {
  it('returns the correct interval object for Phase 2', () => {
    const interval = getLightningInterval(2);
    expect(interval).toEqual({ min: 20000, max: 30000 });
  });

  it('returns the correct interval object for Phase 3', () => {
    const interval = getLightningInterval(3);
    expect(interval).toEqual({ min: 10000, max: 20000 });
  });

  it('returns the correct interval object for Phase 4', () => {
    const interval = getLightningInterval(4);
    expect(interval).toEqual({ min: 5000, max: 15000 });
  });

  it('returns null for Phase 1 — no lightning in calm conditions', () => {
    expect(getLightningInterval(1)).toBeNull();
  });

  it('returns null for phase 0 (before game start)', () => {
    expect(getLightningInterval(0)).toBeNull();
  });

  it('returns null for undefined phase', () => {
    expect(getLightningInterval(undefined)).toBeNull();
  });
});

// ── Shake profiles ──────────────────────────────────────────────────────────

describe('SHAKE_PROFILES constant', () => {
  it('has distant and close profiles', () => {
    expect(SHAKE_PROFILES).toHaveProperty('distant');
    expect(SHAKE_PROFILES).toHaveProperty('close');
  });

  it('distant profile: intensity 0.003, duration 200ms', () => {
    expect(SHAKE_PROFILES.distant.intensity).toBe(0.003);
    expect(SHAKE_PROFILES.distant.duration).toBe(200);
  });

  it('close profile: intensity 0.008, duration 400ms', () => {
    expect(SHAKE_PROFILES.close.intensity).toBe(0.008);
    expect(SHAKE_PROFILES.close.duration).toBe(400);
  });

  it('close profile is more intense than distant', () => {
    expect(SHAKE_PROFILES.close.intensity).toBeGreaterThan(SHAKE_PROFILES.distant.intensity);
    expect(SHAKE_PROFILES.close.duration).toBeGreaterThan(SHAKE_PROFILES.distant.duration);
  });
});

describe('getShakeProfile(type)', () => {
  it('returns distant profile for "distant"', () => {
    expect(getShakeProfile('distant')).toEqual({ intensity: 0.003, duration: 200 });
  });

  it('returns close profile for "close"', () => {
    expect(getShakeProfile('close')).toEqual({ intensity: 0.008, duration: 400 });
  });

  it('falls back to distant profile for unknown type', () => {
    expect(getShakeProfile('unknown')).toEqual(SHAKE_PROFILES.distant);
  });

  it('falls back to distant profile for null', () => {
    expect(getShakeProfile(null)).toEqual(SHAKE_PROFILES.distant);
  });

  it('falls back to distant profile for undefined', () => {
    expect(getShakeProfile(undefined)).toEqual(SHAKE_PROFILES.distant);
  });
});

// ── Thunder delay ───────────────────────────────────────────────────────────

describe('THUNDER_DELAY_MS constant', () => {
  it('has MIN of 200ms', () => {
    expect(THUNDER_DELAY_MS.MIN).toBe(200);
  });

  it('has MAX of 800ms', () => {
    expect(THUNDER_DELAY_MS.MAX).toBe(800);
  });

  it('MIN < MAX', () => {
    expect(THUNDER_DELAY_MS.MIN).toBeLessThan(THUNDER_DELAY_MS.MAX);
  });
});

describe('getThunderDelay()', () => {
  // Test the formula boundary, not Math.random() directly.
  // Formula: THUNDER_DELAY_MS.MIN + Math.random() * (THUNDER_DELAY_MS.MAX - THUNDER_DELAY_MS.MIN)
  // Min possible (random=0): 200 + 0 * 600 = 200
  // Max possible (random=1): 200 + 1 * 600 = 800

  it('returns value at or above minimum delay (200ms) — 1000 samples', () => {
    for (let i = 0; i < 1000; i++) {
      expect(getThunderDelay()).toBeGreaterThanOrEqual(THUNDER_DELAY_MS.MIN);
    }
  });

  it('returns value at or below maximum delay (800ms) — 1000 samples', () => {
    for (let i = 0; i < 1000; i++) {
      expect(getThunderDelay()).toBeLessThanOrEqual(THUNDER_DELAY_MS.MAX);
    }
  });

  it('returns a number', () => {
    expect(typeof getThunderDelay()).toBe('number');
  });
});

// ── Bolt point generation ───────────────────────────────────────────────────

describe('generateBoltPoints(startX, startY, endY, numSegments, maxJitter)', () => {
  it('returns numSegments + 1 points total', () => {
    const points = generateBoltPoints(100, 0, 200, 6, 20);
    expect(points).toHaveLength(7); // 6 segments = 7 vertices
  });

  it('returns numSegments + 1 points for other segment counts', () => {
    expect(generateBoltPoints(0, 0, 100, 4, 10)).toHaveLength(5);
    expect(generateBoltPoints(0, 0, 100, 8, 10)).toHaveLength(9);
    expect(generateBoltPoints(0, 0, 100, 10, 10)).toHaveLength(11);
  });

  it('first point has y equal to startY', () => {
    const points = generateBoltPoints(100, 50, 300, 6, 20);
    expect(points[0].y).toBe(50);
  });

  it('last point has y equal to endY', () => {
    const points = generateBoltPoints(100, 50, 300, 6, 20);
    expect(points[points.length - 1].y).toBe(300);
  });

  it('intermediate y values are evenly spaced between startY and endY', () => {
    const startY = 0;
    const endY = 120;
    const numSegments = 6;
    const segmentHeight = (endY - startY) / numSegments;

    const points = generateBoltPoints(100, startY, endY, numSegments, 0);

    // Skip first (index 0) and last (index numSegments) — test middle points
    for (let i = 1; i < numSegments; i++) {
      const expectedY = startY + segmentHeight * i;
      expect(points[i].y).toBeCloseTo(expectedY, 5);
    }
  });

  it('all points have x and y properties', () => {
    const points = generateBoltPoints(200, 10, 400, 5, 30);
    for (const pt of points) {
      expect(pt).toHaveProperty('x');
      expect(pt).toHaveProperty('y');
      expect(typeof pt.x).toBe('number');
      expect(typeof pt.y).toBe('number');
    }
  });

  it('with maxJitter=0, all x values equal startX', () => {
    const startX = 150;
    const points = generateBoltPoints(startX, 0, 300, 6, 0);
    for (const pt of points) {
      // x offset is (Math.random() - 0.5) * 2 * 0 = 0, so x stays at startX
      expect(pt.x).toBeCloseTo(startX, 5);
    }
  });

  it('works for minimum segment count of 1', () => {
    const points = generateBoltPoints(100, 0, 100, 1, 20);
    expect(points).toHaveLength(2);
    expect(points[0].y).toBe(0);
    expect(points[1].y).toBe(100);
  });
});

// ── Phase gating ────────────────────────────────────────────────────────────

describe('isLightningPhase(phase)', () => {
  it('returns false for Phase 1 — no lightning until storm escalates', () => {
    expect(isLightningPhase(1)).toBe(false);
  });

  it('returns true for Phase 2 — lightning begins at Evacuation phase', () => {
    expect(isLightningPhase(2)).toBe(true);
  });

  it('returns true for Phase 3', () => {
    expect(isLightningPhase(3)).toBe(true);
  });

  it('returns true for Phase 4 (Landfall) — most intense', () => {
    expect(isLightningPhase(4)).toBe(true);
  });

  it('returns false for phase 0', () => {
    expect(isLightningPhase(0)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isLightningPhase(undefined)).toBe(false);
  });
});

// ── pickInterval ────────────────────────────────────────────────────────────

describe('pickInterval(phase)', () => {
  it('returns null for Phase 1', () => {
    expect(pickInterval(1)).toBeNull();
  });

  it('returns a number (ms) for Phase 2', () => {
    const result = pickInterval(2);
    expect(typeof result).toBe('number');
  });

  it('Phase 2 result is within [20000, 30000] — 1000 samples', () => {
    for (let i = 0; i < 1000; i++) {
      const ms = pickInterval(2);
      expect(ms).toBeGreaterThanOrEqual(20000);
      expect(ms).toBeLessThanOrEqual(30000);
    }
  });

  it('Phase 3 result is within [10000, 20000] — 1000 samples', () => {
    for (let i = 0; i < 1000; i++) {
      const ms = pickInterval(3);
      expect(ms).toBeGreaterThanOrEqual(10000);
      expect(ms).toBeLessThanOrEqual(20000);
    }
  });

  it('Phase 4 result is within [5000, 15000] — 1000 samples', () => {
    for (let i = 0; i < 1000; i++) {
      const ms = pickInterval(4);
      expect(ms).toBeGreaterThanOrEqual(5000);
      expect(ms).toBeLessThanOrEqual(15000);
    }
  });

  it('Phase 4 picks shorter intervals than Phase 2 on average', () => {
    // Average of 1000 samples from each phase should reflect the spec
    let sum2 = 0;
    let sum4 = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      sum2 += pickInterval(2);
      sum4 += pickInterval(4);
    }
    // Phase 2 mean ~25000, Phase 4 mean ~10000
    expect(sum4 / N).toBeLessThan(sum2 / N);
  });
});
