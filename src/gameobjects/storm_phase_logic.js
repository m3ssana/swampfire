/**
 * Pure phase logic — no Phaser dependency.
 * Exported separately so unit tests can import it without pulling in
 * the Phaser-dependent StormManager class.
 *
 * Phase thresholds (timeLeft in seconds):
 *   Phase 1  3600 – 2700  Warning
 *   Phase 2  2699 – 1800  Evacuation
 *   Phase 3  1799 – 900   Storm Surge
 *   Phase 4   899 – 0     Landfall
 */
export function getPhaseForTimeLeft(seconds) {
  if (seconds >= 2700) return 1;
  if (seconds >= 1800) return 2;
  if (seconds >= 900)  return 3;
  return 4;
}

/**
 * Returns the X-axis velocity offset (pixels/frame) caused by hurricane wind.
 * Wind blows east (+X direction).
 *
 *   Phase 1–2: no wind
 *   Phase 3:   +0.8  (noticeable but manageable)
 *   Phase 4:   +1.5  (strong, requires active counter-steering)
 */
export function getWindDrift(phase) {
  if (phase === 3) return 0.8;
  if (phase === 4) return 1.5;
  return 0;
}
