/**
 * menu_logic.js — Pure menu logic module (Issue #115)
 *
 * NO Phaser import. This module owns:
 *   - MENU_OPTIONS: ordered array of { id, label, action } menu items
 *   - TITLE_COLOUR: amber stencil font colour constant (hex number)
 *   - isOptionEnabled(id, { hasSave }): boolean predicate (CONTINUE gated by save)
 *   - getNextSelection(current, direction, options): wrap-around nav skipping disabled
 *   - buildLeaderboardRows(bests): format personal bests for display
 *
 * The scene passes { hasSave: boolean } context (from SaveManager.hasSave()) into
 * isOptionEnabled. This module never imports SaveManager — decoupled via parameter.
 */

// ── Menu option definitions ──────────────────────────────────────────────────

/**
 * Ordered menu options. The scene renders these top-to-bottom.
 * @type {Array<{ id: string, label: string, action: string }>}
 */
export const MENU_OPTIONS = [
  { id: 'new_game',    label: 'NEW GAME',    action: 'new_game' },
  { id: 'continue',    label: 'CONTINUE',    action: 'continue' },
  { id: 'leaderboard', label: 'LEADERBOARD', action: 'leaderboard' },
  { id: 'settings',    label: 'SETTINGS',    action: 'settings' },
];

// ── Title colour ─────────────────────────────────────────────────────────────

/**
 * Amber hex colour for the title text. Replaces the old green (0x4fffaa).
 * @type {number}
 */
export const TITLE_COLOUR = 0xFFBF00;

// ── Option enabled predicate ─────────────────────────────────────────────────

/**
 * Returns whether a menu option is currently enabled/selectable.
 * CONTINUE is disabled when no save exists; all others are always enabled.
 *
 * @param {string} id — option id from MENU_OPTIONS
 * @param {{ hasSave: boolean }} context — runtime context from SaveManager
 * @returns {boolean}
 */
export function isOptionEnabled(id, { hasSave }) {
  if (id === 'continue') return hasSave;
  return true;
}

// ── Navigation ───────────────────────────────────────────────────────────────

/**
 * Computes the next selected option id given current selection, direction,
 * and the full options array (with `enabled` field). Wraps around and SKIPS
 * disabled options.
 *
 * @param {string} current — currently selected option id
 * @param {'up'|'down'} direction — navigation direction
 * @param {Array<{ id: string, enabled: boolean }>} options — all options with enabled state
 * @returns {string} the next selectable option id
 */
export function getNextSelection(current, direction, options) {
  const len = options.length;
  const currentIndex = options.findIndex(opt => opt.id === current);
  const step = direction === 'down' ? 1 : -1;

  let nextIndex = (currentIndex + step + len) % len;

  // Skip disabled options (wrap-around safe with loop cap)
  for (let i = 0; i < len; i++) {
    if (options[nextIndex].enabled) return options[nextIndex].id;
    nextIndex = (nextIndex + step + len) % len;
  }

  // Fallback (shouldn't happen with at least one enabled option)
  return current;
}

// ── Leaderboard formatting ───────────────────────────────────────────────────

/**
 * Format time in seconds to M:SS (zero-padded seconds).
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Builds an array of { label, value } rows for the leaderboard panel.
 * Gracefully handles null, undefined, or partial bests — shows '--' for missing.
 *
 * Issue #106 (leaderboard persistence) is NOT in scope. This function is designed
 * to accept whatever data shape #106 eventually provides, rendering placeholders
 * until then.
 *
 * @param {object|null|undefined} bests — personal bests from persistence layer
 * @returns {Array<{ label: string, value: string }>}
 */
export function buildLeaderboardRows(bests) {
  const data = bests || {};

  const formatValue = (key, formatter) => {
    if (data[key] == null) return '--';
    return formatter ? formatter(data[key]) : String(data[key]);
  };

  return [
    { label: 'BEST TIME',  value: formatValue('bestTime', formatTime) },
    { label: 'BEST XP',    value: formatValue('bestXP', null) },
    { label: 'BEST COMBO', value: formatValue('bestCombo', null) },
    { label: 'GAMES PLAYED', value: formatValue('gamesPlayed', null) },
  ];
}
