/**
 * objective_logic.js — Pure JS module (NO Phaser imports).
 *
 * Determines the current player objective text for the HUD banner.
 * Exported constants are kept in sync with workbench.js and zone_manager.js.
 */

// ── Constants (synced from workbench.js) ──────────────────────────────────────

export const ROCKET_SYSTEMS = [
  { label: 'Fuel Injector' },
  { label: 'Oxidizer Tank' },
  { label: 'Avionics Board' },
  { label: 'Battery Array' },
  { label: 'Pressure Regulator' },
];

// ── Constants (synced from zone_manager.js) ───────────────────────────────────

export const ZONE_NAMES = {
  0: 'Cypress Creek Preserve',
  1: 'US-41 Corridor',
  2: 'Collier Commons',
  3: 'Conner Preserve',
  4: 'LOLHS / SR-54',
};

// ── Zone hints per system (most likely ingredient zone) ───────────────────────

export const SYSTEM_ZONE_HINTS = {
  'Fuel Injector':       1, // US-41 — hardware stores
  'Oxidizer Tank':       2, // Collier Commons
  'Avionics Board':      4, // LOLHS / SR-54 — chem lab
  'Battery Array':       1, // US-41 — auto parts
  'Pressure Regulator':  3, // Conner Preserve
};

// ── Pulse animation duration (ms) ────────────────────────────────────────────

export const PULSE_DURATION_MS = 600;

// ── Completed text ────────────────────────────────────────────────────────────

export const COMPLETED_TEXT = 'Launch the rocket!';

// ── Logic ─────────────────────────────────────────────────────────────────────

/**
 * Determine the current objective based on game state.
 *
 * @param {Object} state
 * @param {number} state.systemsInstalled — number of systems installed on rocket (0–5)
 * @param {Array}  state.inventory        — player inventory items
 * @returns {{ text: string, item: string|null, location: string|null, zoneId: number|null, isComplete: boolean }}
 */
export function getNextObjective({ systemsInstalled, inventory } = {}) {
  const installed = systemsInstalled ?? 0;
  const inv = inventory ?? [];

  // All systems installed → complete
  if (installed >= 5) {
    return {
      text: COMPLETED_TEXT,
      item: null,
      location: null,
      zoneId: null,
      isComplete: true,
    };
  }

  // Determine the next system in the build sequence
  const components = inv.filter(i => i.type === 'component');
  const ingredients = inv.filter(i => i.type === 'ingredient');

  // If player has any component in inventory → suggest installing it
  if (components.length > 0) {
    const nextComponent = components[0];
    return {
      text: `Install ${nextComponent.label} at the rocket`,
      item: nextComponent.label,
      location: ZONE_NAMES[0],
      zoneId: 0,
      isComplete: false,
    };
  }

  // If player has 2+ ingredients → suggest crafting
  if (ingredients.length >= 2) {
    const nextSystem = ROCKET_SYSTEMS[installed];
    return {
      text: `Craft ${nextSystem.label} at the workbench`,
      item: nextSystem.label,
      location: ZONE_NAMES[0],
      zoneId: 0,
      isComplete: false,
    };
  }

  // Otherwise → suggest scavenging for the next system's ingredients
  const nextSystem = ROCKET_SYSTEMS[installed];
  const hintZoneId = SYSTEM_ZONE_HINTS[nextSystem.label];
  const location = ZONE_NAMES[hintZoneId];

  return {
    text: `Find ${nextSystem.label} — check ${location}`,
    item: nextSystem.label,
    location,
    zoneId: hintZoneId,
    isComplete: false,
  };
}

/**
 * Detect whether the objective text has changed (for pulse trigger).
 *
 * @param {Object|null|undefined} prev    — previous objective result
 * @param {Object}                current — current objective result
 * @returns {boolean}
 */
export function hasObjectiveChanged(prev, current) {
  if (!prev) return true;
  return prev.text !== current.text;
}
