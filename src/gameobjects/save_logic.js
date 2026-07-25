/**
 * Save Logic — Pure JS Module (Issue #98)
 *
 * Owns localStorage schema, serialization, deserialization, and validation
 * for the Swampfire Protocol save system. Zero Phaser dependency — safe for
 * unit testing and import from any context.
 *
 * Public API (for issue #115 — CONTINUE menu wiring):
 *   hasSave(storage)   — returns true if a valid save exists
 *   clearSave(storage) — removes the save from storage
 *   serialize(state)   — packs game state into a JSON string envelope
 *   deserialize(json)  — unpacks JSON string → state object (or null)
 *   isValidSave(obj)   — validates a parsed envelope's structure + version
 *
 * All storage-accepting functions take an injectable storage object (same
 * interface as window.localStorage: getItem, setItem, removeItem).
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** localStorage key used for the single save slot */
export const SAVE_KEY = 'swampfire_save';

/** Schema version — increment when the state shape changes (migration needed) */
export const SAVE_VERSION = 1;

/** Autosave fires every 5 minutes (300,000 ms) in addition to event triggers */
export const AUTOSAVE_INTERVAL_MS = 300000;

/** Enum of trigger reasons that cause an autosave */
export const AUTOSAVE_TRIGGERS = Object.freeze({
  ZONE_0_RETURN:    'zone_0_return',
  SYSTEM_INSTALLED: 'system_installed',
  PHASE_TRANSITION: 'phase_transition',
  INTERVAL:         'interval',
});

// ── Serialization ─────────────────────────────────────────────────────────────

/**
 * Serialize game state into a JSON string wrapped in a versioned envelope.
 *
 * @param {object} state — full game state (position, registry keys, etc.)
 * @returns {string} JSON string with { version, timestamp, state }
 */
export function serialize(state) {
  const envelope = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    state,
  };
  return JSON.stringify(envelope);
}

/**
 * Deserialize a JSON string back into the game state object.
 * Returns null on any parsing failure or missing envelope structure.
 *
 * @param {string|null|undefined} json — raw JSON string from storage
 * @returns {object|null} the state object, or null on error
 */
export function deserialize(json) {
  if (json == null || json === '') return null;
  try {
    const envelope = JSON.parse(json);
    if (!envelope || typeof envelope !== 'object') return null;
    if (!envelope.state || typeof envelope.state !== 'object') return null;
    return envelope.state;
  } catch {
    return null;
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate a parsed save envelope (not the raw JSON string).
 * Checks schema version and presence/type of all required state fields.
 *
 * @param {object|null|undefined} obj — parsed envelope ({ version, timestamp, state })
 * @returns {boolean}
 */
export function isValidSave(obj) {
  if (obj == null || typeof obj !== 'object') return false;
  if (obj.version !== SAVE_VERSION) return false;

  const s = obj.state;
  if (!s || typeof s !== 'object') return false;

  // Position must be an object with x and y
  if (!s.position || typeof s.position !== 'object') return false;
  if (!('x' in s.position) || !('y' in s.position)) return false;

  // Required numeric fields must exist
  if (!('hp' in s)) return false;
  if (!('timeLeft' in s)) return false;
  if (!('xp' in s)) return false;
  if (!('systemsInstalled' in s)) return false;
  if (!('stormPhase' in s)) return false;
  if (!('zone' in s)) return false;

  // inventory must be an array
  if (!Array.isArray(s.inventory)) return false;

  // npcQuests must be a non-null object (not a string, not an array)
  if (!s.npcQuests || typeof s.npcQuests !== 'object' || Array.isArray(s.npcQuests)) return false;

  // visitedZones must be an array
  if (!Array.isArray(s.visitedZones)) return false;

  return true;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

/**
 * Check whether a valid save exists in the provided storage.
 * Guards against corrupt/unparseable data and version mismatches.
 *
 * @param {object} storage — localStorage-compatible object
 * @returns {boolean}
 */
export function hasSave(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return isValidSave(parsed);
  } catch {
    return false;
  }
}

/**
 * Remove the save data from storage.
 * Does not throw if no save exists.
 *
 * @param {object} storage — localStorage-compatible object
 */
export function clearSave(storage) {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // graceful no-op (private browsing, etc.)
  }
}
