/**
 * Near-Miss Logic Tests
 *
 * Pure-logic tests for the near-miss feedback system (issue #93).
 * All constants and functions live in src/gameobjects/near_miss_logic.js
 * (no Phaser dependency — safe to import in Vitest jsdom).
 *
 * Acceptance Criteria (from issue #93):
 * - Near-miss triggers 200ms slow-motion (0.5x timescale)
 * - Green screen-edge pulse effect on near-miss
 * - +15 XP awarded with green XP popup
 * - Whoosh + heartbeat thump SFX plays
 * - Near-miss feeds into combo system (counts as a pickup for combo chain)
 * - Works for all hazard types: rattlesnakes, power lines, looters
 */

import { describe, it, expect } from 'vitest';
import {
  // ── Constants ─────────────────────────────────────────────────────────────
  NEAR_MISS_XP,
  SLOW_MO_DURATION_MS,
  SLOW_MO_TIMESCALE,
  PULSE_COLOR,
  PULSE_DURATION_MS,
  SFX_WHOOSH_KEY,
  SFX_HEARTBEAT_KEY,
  DEBOUNCE_WINDOW_MS,
  HAZARD_LABELS,
  COMBO_FEED_ENABLED,
  NEAR_MISS_SHAKE_INTENSITY,
  NEAR_MISS_SHAKE_DURATION_MS,
  // ── Functions ─────────────────────────────────────────────────────────────
  isNearMissHazard,
  shouldAwardXP,
  getNearMissEffects,
  computeNearMissXp,
} from '../src/gameobjects/near_miss_logic.js';

// ── Slow-motion constants ─────────────────────────────────────────────────────

describe('Slow-motion on near-miss', () => {
  it('slow-motion duration is 200ms', () => {
    expect(SLOW_MO_DURATION_MS).toBe(200);
  });

  it('slow-motion timescale is 0.5x (half speed)', () => {
    expect(SLOW_MO_TIMESCALE).toBe(0.5);
  });
});

// ── XP award ──────────────────────────────────────────────────────────────────

describe('Near-miss XP award', () => {
  it('awards exactly 15 XP per near-miss event', () => {
    expect(NEAR_MISS_XP).toBe(15);
  });

  it('shouldAwardXP returns true when debounce is not active', () => {
    expect(shouldAwardXP(false)).toBe(true);
  });

  it('shouldAwardXP returns false when debounce is active (already fired)', () => {
    expect(shouldAwardXP(true)).toBe(false);
  });
});

// ── Green screen-edge pulse ───────────────────────────────────────────────────

describe('Green screen-edge pulse effect', () => {
  it('pulse colour is green (0x44ff88)', () => {
    expect(PULSE_COLOR).toBe(0x44ff88);
  });

  it('pulse colour is not red, white, or yellow (distinct from other FX)', () => {
    expect(PULSE_COLOR).not.toBe(0xff0000); // red (damage)
    expect(PULSE_COLOR).not.toBe(0xffffff); // white (flash)
    expect(PULSE_COLOR).not.toBe(0xffee00); // yellow (power line warn)
  });

  it('pulse duration is a positive number in ms', () => {
    expect(PULSE_DURATION_MS).toBeGreaterThan(0);
  });

  it('pulse duration is short enough to feel snappy (≤ 300ms)', () => {
    expect(PULSE_DURATION_MS).toBeLessThanOrEqual(300);
  });
});

// ── SFX keys ──────────────────────────────────────────────────────────────────

describe('Near-miss SFX keys', () => {
  it('whoosh SFX key is "nearmiss_whoosh"', () => {
    expect(SFX_WHOOSH_KEY).toBe('nearmiss_whoosh');
  });

  it('heartbeat SFX key is "nearmiss_heartbeat"', () => {
    expect(SFX_HEARTBEAT_KEY).toBe('nearmiss_heartbeat');
  });

  it('whoosh and heartbeat are distinct SFX keys', () => {
    expect(SFX_WHOOSH_KEY).not.toBe(SFX_HEARTBEAT_KEY);
  });
});

// ── Combo system feed ─────────────────────────────────────────────────────────

describe('Near-miss feeds into combo system', () => {
  it('COMBO_FEED_ENABLED is true — near-miss counts as a pickup for combo chain', () => {
    expect(COMBO_FEED_ENABLED).toBe(true);
  });
});

// ── Debounce window ───────────────────────────────────────────────────────────

describe('Near-miss debounce window', () => {
  it('debounce window is a positive number in ms', () => {
    expect(DEBOUNCE_WINDOW_MS).toBeGreaterThan(0);
  });

  it('debounce window prevents re-triggering within the window (≥ 500ms)', () => {
    // Must be long enough for the player to move away from the hazard sensor
    expect(DEBOUNCE_WINDOW_MS).toBeGreaterThanOrEqual(500);
  });

  it('debounce window is not excessively long (≤ 3000ms)', () => {
    // Must not lock out the player for too long — they might encounter multiple hazards
    expect(DEBOUNCE_WINDOW_MS).toBeLessThanOrEqual(3000);
  });
});

// ── Hazard label set ──────────────────────────────────────────────────────────

describe('Hazard labels that trigger near-miss', () => {
  it('HAZARD_LABELS is a Set', () => {
    expect(HAZARD_LABELS).toBeInstanceOf(Set);
  });

  it('includes rattlesnake_warn label', () => {
    expect(HAZARD_LABELS.has('rattlesnake_warn')).toBe(true);
  });

  it('includes looter_warn label', () => {
    expect(HAZARD_LABELS.has('looter_warn')).toBe(true);
  });

  it('includes powerline_warn label', () => {
    expect(HAZARD_LABELS.has('powerline_warn')).toBe(true);
  });

  it('contains exactly 3 hazard labels (one per hazard type)', () => {
    expect(HAZARD_LABELS.size).toBe(3);
  });

  it('does NOT include damage labels (those kill, not near-miss)', () => {
    expect(HAZARD_LABELS.has('rattlesnake')).toBe(false);
    expect(HAZARD_LABELS.has('looter')).toBe(false);
    expect(HAZARD_LABELS.has('powerline_hit')).toBe(false);
  });
});

// ── isNearMissHazard() ────────────────────────────────────────────────────────

describe('isNearMissHazard(label)', () => {
  it('returns true for "rattlesnake_warn"', () => {
    expect(isNearMissHazard('rattlesnake_warn')).toBe(true);
  });

  it('returns true for "looter_warn"', () => {
    expect(isNearMissHazard('looter_warn')).toBe(true);
  });

  it('returns true for "powerline_warn"', () => {
    expect(isNearMissHazard('powerline_warn')).toBe(true);
  });

  it('returns false for damage labels', () => {
    expect(isNearMissHazard('rattlesnake')).toBe(false);
    expect(isNearMissHazard('looter')).toBe(false);
    expect(isNearMissHazard('powerline_hit')).toBe(false);
  });

  it('returns false for unrelated labels', () => {
    expect(isNearMissHazard('player')).toBe(false);
    expect(isNearMissHazard('tile')).toBe(false);
    expect(isNearMissHazard('')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isNearMissHazard(null)).toBe(false);
    expect(isNearMissHazard(undefined)).toBe(false);
  });
});

// ── getNearMissEffects() ──────────────────────────────────────────────────────

describe('getNearMissEffects()', () => {
  it('returns an object with all expected effect keys', () => {
    const effects = getNearMissEffects();
    expect(effects).toHaveProperty('xp');
    expect(effects).toHaveProperty('slowMoDuration');
    expect(effects).toHaveProperty('slowMoTimescale');
    expect(effects).toHaveProperty('pulseColor');
    expect(effects).toHaveProperty('pulseDuration');
    expect(effects).toHaveProperty('sfxWhoosh');
    expect(effects).toHaveProperty('sfxHeartbeat');
    expect(effects).toHaveProperty('feedsCombo');
  });

  it('xp value matches NEAR_MISS_XP constant (15)', () => {
    const effects = getNearMissEffects();
    expect(effects.xp).toBe(15);
  });

  it('slowMoDuration matches SLOW_MO_DURATION_MS (200)', () => {
    const effects = getNearMissEffects();
    expect(effects.slowMoDuration).toBe(200);
  });

  it('slowMoTimescale matches SLOW_MO_TIMESCALE (0.5)', () => {
    const effects = getNearMissEffects();
    expect(effects.slowMoTimescale).toBe(0.5);
  });

  it('pulseColor matches PULSE_COLOR (green)', () => {
    const effects = getNearMissEffects();
    expect(effects.pulseColor).toBe(0x44ff88);
  });

  it('sfxWhoosh matches SFX_WHOOSH_KEY', () => {
    const effects = getNearMissEffects();
    expect(effects.sfxWhoosh).toBe('nearmiss_whoosh');
  });

  it('sfxHeartbeat matches SFX_HEARTBEAT_KEY', () => {
    const effects = getNearMissEffects();
    expect(effects.sfxHeartbeat).toBe('nearmiss_heartbeat');
  });

  it('feedsCombo matches COMBO_FEED_ENABLED (true)', () => {
    const effects = getNearMissEffects();
    expect(effects.feedsCombo).toBe(true);
  });
});

// ── computeNearMissXp() — combo-aware XP calculation ──────────────────────────

describe('computeNearMissXp(multiplier)', () => {
  it('returns 15 XP at 1.0× multiplier (no combo)', () => {
    expect(computeNearMissXp(1.0)).toBe(15);
  });

  it('returns 23 XP at 1.5× multiplier (FRENZY) via Math.round', () => {
    // 15 * 1.5 = 22.5 → Math.round → 23
    expect(computeNearMissXp(1.5)).toBe(23);
  });

  it('returns 30 XP at 2.0× multiplier', () => {
    expect(computeNearMissXp(2.0)).toBe(30);
  });

  it('guards undefined multiplier — falls back to 15', () => {
    expect(computeNearMissXp(undefined)).toBe(15);
  });

  it('guards 0 multiplier — falls back to 15 (never award 0 XP)', () => {
    expect(computeNearMissXp(0)).toBe(15);
  });

  it('guards null multiplier — falls back to 15', () => {
    expect(computeNearMissXp(null)).toBe(15);
  });

  it('guards negative multiplier — falls back to 15', () => {
    expect(computeNearMissXp(-1)).toBe(15);
  });
});

// ── Near-miss camera shake constants (SPEC §6.4) ─────────────────────────────

describe('Near-miss camera shake (SPEC §6.4)', () => {
  it('shake intensity is 0.002', () => {
    expect(NEAR_MISS_SHAKE_INTENSITY).toBe(0.002);
  });

  it('shake duration is 100ms', () => {
    expect(NEAR_MISS_SHAKE_DURATION_MS).toBe(100);
  });
});
