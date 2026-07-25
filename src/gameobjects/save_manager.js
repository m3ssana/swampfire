/**
 * SaveManager — Phaser-aware autosave wrapper (Issue #98)
 *
 * Triggers autosave on:
 *   - Entering Zone 0 (zoneChanged event)
 *   - systemsInstalled registry change
 *   - stormPhase registry change
 *   - 5-minute repeating timer (AUTOSAVE_INTERVAL_MS)
 *
 * Uses save_logic.js for all serialization/validation. Reads state from the
 * Phaser registry and player position. All localStorage access is try/catch
 * guarded — graceful no-op in private browsing.
 *
 * Public API for issue #115 (CONTINUE menu):
 *   SaveManager.hasSave()               — static: true if a valid save exists in localStorage
 *   SaveManager.loadInto(scene)         — static: restores registry + player from saved state
 *   SaveManager.clearSave()             — static: removes the save slot
 *   SaveManager.getSavedState()         — static: returns deserialized state or null
 *
 * Instance methods (created inside GameScene):
 *   new SaveManager(scene)              — starts listening for triggers
 *   .save(trigger)                      — immediate manual save
 *   .destroy()                          — unsubscribes everything
 */

import {
  SAVE_KEY,
  SAVE_VERSION,
  AUTOSAVE_INTERVAL_MS,
  AUTOSAVE_TRIGGERS,
  serialize,
  deserialize,
  isValidSave,
  hasSave,
  clearSave,
  markSearched,
  clampState,
  getFullResetState,
} from './save_logic.js';

import { getPhaseForTimeLeft } from './storm_phase_logic.js';

/**
 * @param {object} storage — defaults to window.localStorage
 */
function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export default class SaveManager {
  /**
   * @param {Phaser.Scene} scene — the active GameScene (must have .player, .zone)
   */
  constructor(scene) {
    this._scene = scene;
    this._destroyed = false;
    this._intervalTimer = null;

    this._startListeners();
    this._startInterval();

    scene.events.once('shutdown', this.destroy, this);
  }

  // ─── Instance: save triggers ────────────────────────────────────────────────

  _startListeners() {
    const registry = this._scene.registry;

    // Zone 0 return trigger
    this._onZoneChanged = (zoneId) => {
      if (zoneId === 0) this.save(AUTOSAVE_TRIGGERS.ZONE_0_RETURN);
    };
    this._scene.events.on('zoneChanged', this._onZoneChanged);

    // systemsInstalled change trigger
    this._onSystemsInstalled = () => {
      this.save(AUTOSAVE_TRIGGERS.SYSTEM_INSTALLED);
    };
    registry.events.on('changedata-systemsInstalled', this._onSystemsInstalled);

    // stormPhase change trigger
    this._onStormPhase = () => {
      this.save(AUTOSAVE_TRIGGERS.PHASE_TRANSITION);
    };
    registry.events.on('changedata-stormPhase', this._onStormPhase);
  }

  _startInterval() {
    this._intervalTimer = this._scene.time.addEvent({
      delay: AUTOSAVE_INTERVAL_MS,
      callback: () => this.save(AUTOSAVE_TRIGGERS.INTERVAL),
      loop: true,
    });
  }

  // ─── Instance: perform save ─────────────────────────────────────────────────

  /**
   * Capture current game state and write to localStorage.
   * @param {string} trigger — one of AUTOSAVE_TRIGGERS values
   */
  save(trigger) {
    if (this._destroyed) return;

    const storage = getStorage();
    if (!storage) return;

    const state = this._captureState();
    if (!state) return;

    try {
      storage.setItem(SAVE_KEY, serialize(state));
    } catch {
      // Graceful no-op — quota exceeded, private browsing, etc.
    }
  }

  /**
   * Snapshot all game state from registry + player position.
   * @returns {object|null}
   */
  _captureState() {
    const scene = this._scene;
    const registry = scene.registry;

    // Player position — guard against missing player during transitions
    let position = { x: 0, y: 0 };
    if (scene.player?.sprite) {
      position = { x: scene.player.sprite.x, y: scene.player.sprite.y };
    }

    // Current zone ID
    const zone = scene.zone?.currentZoneId ?? 0;

    // Build searchedContainers: merge current zone's searched containers into
    // the existing map (preserving records from zones the player is not in)
    const existingMap = registry.get('searchedContainers') ?? {};
    // Copy existing map to avoid mutation
    const searchedContainers = { ...existingMap };
    // Record current zone's searched containers from the live container instances
    if (scene.zone?.containers) {
      const currentZoneSearched = [];
      for (const container of scene.zone.containers) {
        if (container.searched && container.containerId != null) {
          currentZoneSearched.push(container.containerId);
        }
      }
      if (currentZoneSearched.length > 0) {
        searchedContainers[String(zone)] = currentZoneSearched;
      }
    }
    // Persist back to registry so zone transitions carry it forward
    registry.set('searchedContainers', searchedContainers);

    return {
      position,
      zone,
      hp: registry.get('hp') ?? 3,
      xp: registry.get('xp') ?? 0,
      timeLeft: registry.get('timeLeft') ?? 3600,
      timerExpired: registry.get('timerExpired') ?? false,
      inventory: registry.get('inventory') ?? [],
      systemsInstalled: registry.get('systemsInstalled') ?? 0,
      stormPhase: registry.get('stormPhase') ?? 1,
      npcQuests: registry.get('npcQuests') ?? { harvey: false, maria: false, dale: false, reeves: false },
      visitedZones: registry.get('visitedZones') ?? [0],
      searchedContainers,
      craftCount: registry.get('craftCount') ?? 0,
      frenzyCount: registry.get('frenzyCount') ?? 0,
    };
  }

  // ─── Instance: cleanup ──────────────────────────────────────────────────────

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    // Unsubscribe zone change listener
    this._scene.events.off('zoneChanged', this._onZoneChanged);

    // Unsubscribe registry listeners
    const registry = this._scene.registry;
    registry.events.off('changedata-systemsInstalled', this._onSystemsInstalled);
    registry.events.off('changedata-stormPhase', this._onStormPhase);

    // Stop interval timer
    if (this._intervalTimer) {
      this._intervalTimer.remove();
      this._intervalTimer = null;
    }
  }

  // ─── Static API for issue #115 (CONTINUE menu) ─────────────────────────────

  /**
   * Check whether a valid save exists in localStorage.
   * Safe to call from any scene (no Phaser dependency beyond window access).
   * @returns {boolean}
   */
  static hasSave() {
    const storage = getStorage();
    if (!storage) return false;
    return hasSave(storage);
  }

  /**
   * Get the deserialized save state without loading it into a scene.
   * Useful for displaying save info (zone, time remaining) on the menu.
   * @returns {object|null}
   */
  static getSavedState() {
    const storage = getStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!isValidSave(parsed)) return null;
      return deserialize(raw);
    } catch {
      return null;
    }
  }

  /**
   * Restore saved state into a GameScene's registry and player.
   * Call this in the GameScene's create() BEFORE addPlayer/addMap if loading
   * from a save, or AFTER if you need to reposition the player post-creation.
   *
   * The storm system should recompute visuals from the restored timeLeft using
   * getPhaseForTimeLeft() rather than replaying phase transitions.
   *
   * @param {Phaser.Scene} scene — the active GameScene instance
   * @returns {object|null} the restored state (or null if no valid save)
   */
  static loadInto(scene) {
    const state = SaveManager.getSavedState();
    if (!state) return null;

    // Fix 3: clamp numeric fields as defence-in-depth
    const clamped = clampState(state);

    // Fix 4: merge with full transition defaults so no registry key is unset
    const full = getFullResetState(clamped);

    const registry = scene.registry;

    // Restore ALL 14 registry keys that transition.loadNext() seeds
    registry.set('hp', full.hp);
    registry.set('xp', full.xp);
    registry.set('timeLeft', full.timeLeft);
    registry.set('timerExpired', full.timerExpired);
    registry.set('inventory', full.inventory);
    registry.set('systemsInstalled', full.systemsInstalled);
    registry.set('hudToast', full.hudToast);
    registry.set('npcQuests', full.npcQuests);
    registry.set('visitedZones', full.visitedZones);
    registry.set('craftCount', full.craftCount);
    registry.set('frenzyCount', full.frenzyCount);
    registry.set('achievementToast', full.achievementToast);
    registry.set('searchedContainers', full.searchedContainers);

    // Recompute storm phase from timeLeft — don't trust saved stormPhase
    // (in case the clock ticked between save and load)
    const correctPhase = getPhaseForTimeLeft(full.timeLeft);
    registry.set('stormPhase', correctPhase);

    // Position and zone are returned for the caller to use when spawning
    // the player and loading the correct zone map
    return { ...full, zone: clamped.zone, position: clamped.position };
  }

  /**
   * Remove the save slot from localStorage.
   * @returns {void}
   */
  static clearSave() {
    const storage = getStorage();
    if (!storage) return;
    clearSave(storage);
  }
}
