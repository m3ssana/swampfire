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
      achievements: registry.get('achievements') ?? [],
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

    const registry = scene.registry;

    // Restore all registry keys
    registry.set('hp', state.hp);
    registry.set('xp', state.xp);
    registry.set('timeLeft', state.timeLeft);
    registry.set('timerExpired', state.timerExpired);
    registry.set('inventory', state.inventory);
    registry.set('systemsInstalled', state.systemsInstalled);
    registry.set('npcQuests', state.npcQuests);
    registry.set('visitedZones', state.visitedZones);

    // Recompute storm phase from timeLeft — don't trust saved stormPhase
    // (in case the clock ticked between save and load)
    const correctPhase = getPhaseForTimeLeft(state.timeLeft);
    registry.set('stormPhase', correctPhase);

    // Position and zone are returned for the caller to use when spawning
    // the player and loading the correct zone map
    return state;
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
