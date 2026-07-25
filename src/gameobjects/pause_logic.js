/**
 * Pause Logic — pure JS, no Phaser dependency.
 *
 * Powers Issue #99: Pause Menu (ESC key).
 *
 * Exports:
 *   PAUSE_FLAVOUR_TEXT       — string
 *   MENU_OPTIONS             — [{ id, label }]
 *   getNextSelection(current, direction, optionCount) — number (wrap-around)
 *   getOptionAction(optionId)      — string action id or null
 *   buildPauseStats(registryState) — { timeFormatted, xp, hp, systemsInstalled, checklist }
 *
 * REUSE: buildPauseStats delegates to buildChecklist() from checklist_logic.js
 * for the system checklist — it does NOT duplicate recipe/status logic.
 */

import { buildChecklist } from '../gameobjects/checklist_logic.js';

// ── Constants ──────────────────────────────────────────────────────────────────

export const PAUSE_FLAVOUR_TEXT =
  'Time paused. The hurricane waits for no one. But it will wait for you.';

export const MENU_OPTIONS = [
  { id: 'resume',   label: 'RESUME' },
  { id: 'settings', label: 'SETTINGS' },
  { id: 'quit',     label: 'QUIT TO MENU' },
];

// ── Action map ─────────────────────────────────────────────────────────────────

const ACTION_MAP = {
  resume:   'resume',
  settings: 'settings',
  quit:     'quit_to_menu',
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns the next menu selection index with wrap-around.
 * @param {number} current     - Current selection index
 * @param {number} direction   - +1 for down, -1 for up
 * @param {number} optionCount - Total number of options
 * @returns {number}
 */
export function getNextSelection(current, direction, optionCount) {
  return (current + direction + optionCount) % optionCount;
}

/**
 * Maps an option id to its corresponding action string.
 * @param {string} optionId
 * @returns {string|null}
 */
export function getOptionAction(optionId) {
  return ACTION_MAP[optionId] ?? null;
}

/**
 * Builds the stats object displayed on the pause overlay.
 * Delegates checklist generation to checklist_logic.js.
 *
 * @param {{ timeLeft: number, xp: number, hp: number, systemsInstalled: number, inventory: Array }} registryState
 * @returns {{ timeFormatted: string, xp: number, hp: number, systemsInstalled: number, checklist: Array }}
 */
export function buildPauseStats(registryState) {
  const { timeLeft, xp, hp, systemsInstalled, inventory } = registryState;

  // Format time as mm:ss (zero-padded)
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted =
    String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

  // Delegate checklist to checklist_logic.js (no duplication)
  const checklist = buildChecklist({ systemsInstalled, inventory });

  return {
    timeFormatted,
    xp,
    hp,
    systemsInstalled,
    checklist,
  };
}
