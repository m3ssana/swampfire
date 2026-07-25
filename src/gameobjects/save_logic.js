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
 * Fix 1 API (searched container persistence):
 *   markSearched(map, zoneId, containerId) — mark a container as looted
 *   isSearched(map, zoneId, containerId)   — check if a container was looted
 *   getSearchedContainers(map, zoneId)     — get all searched ids for a zone
 *
 * Fix 3 API (defence-in-depth clamping):
 *   clampState(state) — clamp numeric fields to valid game ranges
 *
 * Fix 4 API (full registry key reset):
 *   getFullResetState(savedState) — merge saved state with transition defaults
 *
 * All storage-accepting functions take an injectable storage object (same
 * interface as window.localStorage: getItem, setItem, removeItem).
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** localStorage key used for the single save slot */
export const SAVE_KEY = 'swampfire_save';

/**
 * Schema version — bumped to 2 (Fix 5: removed achievements field,
 * added searchedContainers, craftCount, frenzyCount).
 */
export const SAVE_VERSION = 2;

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

// ── Validation (Fix 2: strict type checks) ───────────────────────────────────

/**
 * Validate a parsed save envelope (not the raw JSON string).
 * Checks schema version and presence/type of all required state fields.
 *
 * Fix 2: Now performs strict type validation to prevent crash paths:
 * - All numeric fields must be typeof 'number' && Number.isFinite()
 * - position.x/y must be finite numbers
 * - inventory items must be non-null objects with string label and string type
 * - timerExpired must be boolean
 *
 * @param {object|null|undefined} obj — parsed envelope ({ version, timestamp, state })
 * @returns {boolean}
 */
export function isValidSave(obj) {
  if (obj == null || typeof obj !== 'object') return false;
  if (obj.version !== SAVE_VERSION) return false;

  const s = obj.state;
  if (!s || typeof s !== 'object') return false;

  // Position must be an object with finite numeric x and y
  if (!s.position || typeof s.position !== 'object') return false;
  if (typeof s.position.x !== 'number' || !Number.isFinite(s.position.x)) return false;
  if (typeof s.position.y !== 'number' || !Number.isFinite(s.position.y)) return false;

  // Required numeric fields: strict typeof + isFinite + range checks
  if (typeof s.hp !== 'number' || !Number.isFinite(s.hp)) return false;
  if (s.hp < 0 || s.hp > 3) return false;
  if (typeof s.timeLeft !== 'number' || !Number.isFinite(s.timeLeft)) return false;
  if (s.timeLeft < 0 || s.timeLeft > 3600) return false;
  if (typeof s.xp !== 'number' || !Number.isFinite(s.xp)) return false;
  if (s.xp < 0) return false;
  if (typeof s.systemsInstalled !== 'number' || !Number.isFinite(s.systemsInstalled)) return false;
  if (s.systemsInstalled < 0 || s.systemsInstalled > 5) return false;
  if (typeof s.stormPhase !== 'number' || !Number.isFinite(s.stormPhase)) return false;
  if (s.stormPhase < 1 || s.stormPhase > 4) return false;
  if (typeof s.zone !== 'number' || !Number.isFinite(s.zone)) return false;
  if (s.zone < 0 || s.zone > 4) return false;

  // timerExpired must be boolean (not 0, not "false")
  if (typeof s.timerExpired !== 'boolean') return false;

  // inventory must be an array whose every element is a valid item object
  if (!Array.isArray(s.inventory)) return false;
  for (const item of s.inventory) {
    if (item == null || typeof item !== 'object') return false;
    if (typeof item.label !== 'string') return false;
    if (typeof item.type !== 'string') return false;
  }

  // npcQuests must be a non-null object (not a string, not an array)
  if (!s.npcQuests || typeof s.npcQuests !== 'object' || Array.isArray(s.npcQuests)) return false;

  // visitedZones must be an array
  if (!Array.isArray(s.visitedZones)) return false;

  // searchedContainers must be an object (Fix 1)
  if (!s.searchedContainers || typeof s.searchedContainers !== 'object' || Array.isArray(s.searchedContainers)) return false;

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

/**
 * Resolves an initial zone ID from potentially untrusted input (e.g., a save
 * file). Coerces numeric strings, rejects non-integer / out-of-range values,
 * and falls back to zone 0 (Cypress Creek Preserve — the starting zone) when
 * the input is invalid.
 *
 * Valid zone IDs are integers 0–4 matching the ZONES catalogue in zone_manager.js.
 * This function mirrors the isZoneDefined() check but lives here so it is
 * unit-testable without Phaser.
 *
 * @param {*} zone — raw zone value from save data or scene init
 * @returns {number} a valid zone ID (0–4), defaulting to 0
 */
export function resolveInitialZone(zone) {
  const num = Number(zone);
  if (!Number.isFinite(num)) return 0;
  if (!Number.isInteger(num)) return 0;
  if (num < 0 || num > 4) return 0;
  return num;
}

/**
 * Decides where the player materialises when a zone is created.
 *
 * A resumed run must place the player exactly where they saved; a fresh run
 * (or a death/restart mid-run) uses the zone's own spawn point. Any missing or
 * non-finite coordinate falls back to the zone spawn so a corrupt or truncated
 * save can never drop the player outside the world.
 *
 * Pure: never mutates either argument.
 *
 * @param {{x: number, y: number}} zoneSpawn — the zone's default spawn point
 * @param {{x: *, y: *}|null} savedPosition — position from the save file
 * @param {boolean} loadedFromSave — true only when resuming via CONTINUE
 * @returns {{x: number, y: number}} the position to spawn at
 */
export function resolveSpawnPosition(zoneSpawn, savedPosition, loadedFromSave) {
  if (loadedFromSave === true && savedPosition) {
    const x = Number(savedPosition.x);
    const y = Number(savedPosition.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }
  }
  return { x: zoneSpawn.x, y: zoneSpawn.y };
}

// ── Fix 1: Searched container helpers ─────────────────────────────────────────

/**
 * Mark a container as searched in the searched-containers map.
 * Mutates the map in place and returns it for chaining.
 *
 * Container IDs come from the Tiled object layer's `id` field, which is a
 * stable, auto-incremented integer assigned by Tiled at authoring time.
 * Because our zone maps are generated deterministically by scripts (seeded RNG),
 * these IDs are stable across builds — making them a reliable identifier.
 *
 * @param {object} map — e.g. { "0": [5, 8], "1": [3] }
 * @param {number} zoneId — the zone the container is in
 * @param {number} containerId — the Tiled object id
 * @returns {object} the mutated map
 */
export function markSearched(map, zoneId, containerId) {
  const key = String(zoneId);
  if (!map[key]) {
    map[key] = [];
  }
  if (!map[key].includes(containerId)) {
    map[key].push(containerId);
  }
  return map;
}

/**
 * Check whether a container has been searched.
 *
 * @param {object|null|undefined} map
 * @param {number} zoneId
 * @param {number} containerId
 * @returns {boolean}
 */
export function isSearched(map, zoneId, containerId) {
  if (map == null || typeof map !== 'object') return false;
  const key = String(zoneId);
  const arr = map[key];
  if (!Array.isArray(arr)) return false;
  return arr.includes(containerId);
}

/**
 * Get all searched container IDs for a zone.
 *
 * @param {object|null|undefined} map
 * @param {number} zoneId
 * @returns {number[]}
 */
export function getSearchedContainers(map, zoneId) {
  if (map == null || typeof map !== 'object') return [];
  const key = String(zoneId);
  return map[key] ?? [];
}

// ── Fix 3: clampState (defence in depth) ──────────────────────────────────────

/**
 * Clamp numeric state fields to valid game ranges.
 * Returns a new object — does not mutate the input.
 *
 * Ranges:
 *   hp: 0–3
 *   timeLeft: 0–3600
 *   systemsInstalled: 0–5
 *   stormPhase: 1–4
 *   zone: 0–4
 *   xp: >= 0
 *
 * @param {object} state — deserialized game state
 * @returns {object} — new object with clamped values
 */
export function clampState(state) {
  return {
    ...state,
    hp:               Math.max(0, Math.min(3, state.hp)),
    timeLeft:         Math.max(0, Math.min(3600, state.timeLeft)),
    systemsInstalled: Math.max(0, Math.min(5, state.systemsInstalled)),
    stormPhase:       Math.max(1, Math.min(4, state.stormPhase)),
    zone:             Math.max(0, Math.min(4, state.zone)),
    xp:              Math.max(0, state.xp),
  };
}

// ── Fix 4: getFullResetState ──────────────────────────────────────────────────

/**
 * Merge a saved state with the full set of registry defaults from
 * transition.loadNext(). Any key present in the save is used; keys
 * missing from the save are reset to their transition defaults.
 *
 * This ensures CONTINUE doesn't leave stale values from a previous
 * abandoned run (Fix 4).
 *
 * NOTE: Does NOT include 'achievements' — that is owned by
 * AchievementManager's own localStorage key (Fix 5).
 *
 * @param {object} savedState — deserialized game state from save
 * @returns {object} — full state with all 14 registry keys
 */
export function getFullResetState(savedState) {
  // Defaults mirror transition.js loadNext() exactly
  const defaults = {
    hp:                 3,
    xp:                 0,
    timeLeft:           3600,
    timerExpired:       false,
    inventory:          [],
    systemsInstalled:   0,
    stormPhase:         1,
    hudToast:           '',
    npcQuests:          { harvey: false, maria: false, dale: false, reeves: false },
    visitedZones:       [0],
    craftCount:         0,
    frenzyCount:        0,
    achievementToast:   '',
    searchedContainers: {},
  };

  const result = {};
  for (const key of Object.keys(defaults)) {
    result[key] = (key in savedState) ? savedState[key] : defaults[key];
  }
  return result;
}
