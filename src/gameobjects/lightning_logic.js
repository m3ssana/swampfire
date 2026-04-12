/**
 * lightning_logic.js — Pure lightning-system calculations (no Phaser dependency)
 *
 * Extracted so these constants and functions can be unit-tested without a Phaser runtime.
 * StormManager imports from here to drive actual rendering.
 *
 * Acceptance criteria (issue #114):
 *  - Phase 2 every 20-30 s, Phase 3 every 10-20 s, Phase 4 every 5-15 s
 *  - Shake: distant = 0.003 / 200 ms, close = 0.008 / 400 ms
 *  - Thunder delay: 200-800 ms (distance simulation)
 *  - Procedural bolt via generateBoltPoints (jagged segments, x-jitter)
 */

// ── Interval tables (milliseconds) ──────────────────────────────────────────

/**
 * Per-phase lightning interval ranges (in ms).
 * Phase 1 has no entry — no lightning before Evacuation phase.
 */
export const LIGHTNING_INTERVALS = {
  2: { min: 20000, max: 30000 },
  3: { min: 10000, max: 20000 },
  4: { min:  5000, max: 15000 },
};

/**
 * Returns the { min, max } interval for the given phase, or null if phase has no lightning.
 * @param {number} phase
 * @returns {{ min: number, max: number } | null}
 */
export function getLightningInterval(phase) {
  return LIGHTNING_INTERVALS[phase] ?? null;
}

// ── Shake profiles ───────────────────────────────────────────────────────────

/**
 * Camera shake magnitudes per lightning proximity type.
 * Distant = bolt far away, close = bolt near the player.
 */
export const SHAKE_PROFILES = {
  distant: { intensity: 0.003, duration: 200 },
  close:   { intensity: 0.008, duration: 400 },
};

/**
 * Returns the shake profile for the given type.
 * Falls back to 'distant' for any unknown / falsy type.
 * @param {string} type — 'distant' | 'close'
 * @returns {{ intensity: number, duration: number }}
 */
export function getShakeProfile(type) {
  return SHAKE_PROFILES[type] ?? SHAKE_PROFILES.distant;
}

// ── Thunder delay ────────────────────────────────────────────────────────────

/** Thunder sound delay range (ms) — simulates bolt distance. */
export const THUNDER_DELAY_MS = { MIN: 200, MAX: 800 };

/**
 * Returns a random thunder delay in [THUNDER_DELAY_MS.MIN, THUNDER_DELAY_MS.MAX].
 * Formula: MIN + Math.random() * (MAX - MIN)
 * @returns {number} ms
 */
export function getThunderDelay() {
  return THUNDER_DELAY_MS.MIN + Math.random() * (THUNDER_DELAY_MS.MAX - THUNDER_DELAY_MS.MIN);
}

// ── Bolt geometry ────────────────────────────────────────────────────────────

/**
 * Generates a jagged bolt path from (startX, startY) to (startX±jitter, endY).
 *
 * Returns numSegments+1 {x, y} points.  Each intermediate vertex has a random
 * x-offset in [-maxJitter, +maxJitter]; y-values are evenly distributed.
 *
 * @param {number} startX       — bolt origin x (world coords)
 * @param {number} startY       — bolt origin y (usually top of viewport)
 * @param {number} endY         — bolt terminus y
 * @param {number} numSegments  — number of zigzag segments (≥ 1)
 * @param {number} maxJitter    — max horizontal offset per segment (px)
 * @returns {{ x: number, y: number }[]}
 */
export function generateBoltPoints(startX, startY, endY, numSegments, maxJitter) {
  const points = [{ x: startX, y: startY }];
  const segmentHeight = (endY - startY) / numSegments;

  for (let i = 1; i < numSegments; i++) {
    const y = startY + segmentHeight * i;
    const x = startX + (Math.random() - 0.5) * 2 * maxJitter;
    points.push({ x, y });
  }

  // Terminal point — small final jitter so the bolt tip isn't perfectly centred
  const terminalX = startX + (Math.random() - 0.5) * 2 * maxJitter * 0.3;
  points.push({ x: terminalX, y: endY });

  return points;
}

// ── Phase gating ─────────────────────────────────────────────────────────────

/**
 * Returns true if the given storm phase should have lightning activity.
 * Lightning starts at Phase 2 (Evacuation) and intensifies through Phase 4.
 * @param {number} phase
 * @returns {boolean}
 */
export function isLightningPhase(phase) {
  return typeof phase === 'number' && phase >= 2;
}

// ── Interval picker ──────────────────────────────────────────────────────────

/**
 * Returns a random interval (ms) for the next lightning strike at the given phase,
 * or null if the phase has no lightning.
 *
 * @param {number} phase
 * @returns {number | null}
 */
export function pickInterval(phase) {
  const range = getLightningInterval(phase);
  if (!range) return null;
  return range.min + Math.random() * (range.max - range.min);
}
