/**
 * Near-Miss Logic — pure constants and utility functions.
 *
 * This module contains ZERO Phaser dependencies so it can be imported
 * directly in Vitest unit tests. The actual Phaser-side behaviour
 * (slow-mo, screen pulse, SFX) lives in GameScene.triggerNearMiss().
 *
 * Issue #93 — Near-miss feedback system.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** XP awarded per near-miss event. */
export const NEAR_MISS_XP = 15;

/** Duration of the slow-motion effect in milliseconds. */
export const SLOW_MO_DURATION_MS = 200;

/** Timescale during slow-motion (0.5 = half speed). */
export const SLOW_MO_TIMESCALE = 0.5;

/** Green pulse colour for the screen-edge effect. */
export const PULSE_COLOR = 0x44ff88;

/** Duration of the green screen-edge pulse fade-out in ms. */
export const PULSE_DURATION_MS = 250;

/** Audio key for the near-miss whoosh SFX. */
export const SFX_WHOOSH_KEY = 'nearmiss_whoosh';

/** Audio key for the near-miss heartbeat thump SFX. */
export const SFX_HEARTBEAT_KEY = 'nearmiss_heartbeat';

/** Debounce window — prevents re-triggering within this period (ms). */
export const DEBOUNCE_WINDOW_MS = 1500;

/** Set of Matter body labels that represent near-miss warning sensors. */
export const HAZARD_LABELS = new Set([
  'rattlesnake_warn',
  'looter_warn',
  'powerline_warn',
]);

/** Whether a near-miss event feeds into the combo streak system. */
export const COMBO_FEED_ENABLED = true;

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the given body label is a near-miss hazard sensor.
 * Handles null/undefined gracefully.
 *
 * @param {string|null|undefined} label
 * @returns {boolean}
 */
export function isNearMissHazard(label) {
  if (!label) return false;
  return HAZARD_LABELS.has(label);
}

/**
 * Returns true when XP should be awarded (debounce is NOT active).
 *
 * @param {boolean} debounceActive - true if the debounce window is still open
 * @returns {boolean}
 */
export function shouldAwardXP(debounceActive) {
  return !debounceActive;
}

/**
 * Returns a snapshot of all near-miss effect parameters.
 * Used by the GameScene to apply the full feedback package.
 *
 * @returns {{
 *   xp: number,
 *   slowMoDuration: number,
 *   slowMoTimescale: number,
 *   pulseColor: number,
 *   pulseDuration: number,
 *   sfxWhoosh: string,
 *   sfxHeartbeat: string,
 *   feedsCombo: boolean
 * }}
 */
export function getNearMissEffects() {
  return {
    xp: NEAR_MISS_XP,
    slowMoDuration: SLOW_MO_DURATION_MS,
    slowMoTimescale: SLOW_MO_TIMESCALE,
    pulseColor: PULSE_COLOR,
    pulseDuration: PULSE_DURATION_MS,
    sfxWhoosh: SFX_WHOOSH_KEY,
    sfxHeartbeat: SFX_HEARTBEAT_KEY,
    feedsCombo: COMBO_FEED_ENABLED,
  };
}
