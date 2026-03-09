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
