/**
 * AchievementManager — run-independent achievement tracking.
 *
 * Achievements unlock once across all game sessions (stored in localStorage)
 * and fire a top-right slide-in toast the moment they trigger. Subsequent runs
 * do NOT re-fire toasts for already-unlocked achievements.
 *
 * Hooks into the Phaser registry via changedata events — no polling, no coupling
 * to individual game objects. Each achievement declares which registry key it
 * watches and a pure check() function that receives (newValue, prevValue).
 *
 * New registry keys required (seeded by TransitionScene.loadNext):
 *   craftCount    — incremented by Workbench on each successful craft
 *   frenzyCount   — incremented by ComboTracker on each FRENZY activation
 *   achievementToast — consumed by HUDScene to render the slide-in toast
 *
 * Achievements:
 *   first_loot    — picked up any item from a container
 *   first_craft   — crafted the first rocket component
 *   first_install — installed the first rocket system
 *   all_systems   — all 4 systems installed (launch ready)
 *   explorer      — left the starting zone for the first time
 *   globe_trotter — visited all 5 zones (0–4)
 *   first_frenzy  — triggered FRENZY combo for the first time
 *   survivor      — took damage but kept going (hp dropped, still alive)
 *
 * Usage:
 *   this.achievementManager = new AchievementManager(this); // game.js create()
 *   this.achievementManager.destroy();                       // on scene shutdown
 */

// ── localStorage key ─────────────────────────────────────────────────────────

export const LS_KEY = 'swampfire_achievements';

// ── Achievement definitions ───────────────────────────────────────────────────

export const ACHIEVEMENTS = [
  {
    id:    'first_loot',
    label: '★ FIRST FIND',
    // inventory is an array; any item present means at least one loot has occurred
    watch: 'inventory',
    check: (value) => Array.isArray(value) && value.length > 0,
  },
  {
    id:    'first_craft',
    label: '★ CRAFTSMAN',
    // craftCount is incremented by Workbench after each successful component craft
    watch: 'craftCount',
    check: (value) => value >= 1,
  },
  {
    id:    'first_install',
    label: '★ SYSTEMS ONLINE',
    // first rocket system successfully installed
    watch: 'systemsInstalled',
    check: (value) => value >= 1,
  },
  {
    id:    'all_systems',
    label: '★ LAUNCH READY',
    // all 5 rocket systems installed — rocket is ready to fire
    watch: 'systemsInstalled',
    check: (value) => value >= 5,
  },
  {
    id:    'explorer',
    label: '★ EXPLORER',
    // visitedZones starts as [0]; length >= 2 means at least one zone transition
    watch: 'visitedZones',
    check: (value) => Array.isArray(value) && value.length >= 2,
  },
  {
    id:    'globe_trotter',
    label: '★ GLOBE TROTTER',
    // all 5 zones (0–4) visited
    watch: 'visitedZones',
    check: (value) => Array.isArray(value) && value.length >= 5,
  },
  {
    id:    'first_frenzy',
    label: '★ FRENZY!',
    // frenzyCount is incremented by ComboTracker on each FRENZY activation
    watch: 'frenzyCount',
    check: (value) => value >= 1,
  },
  {
    id:    'survivor',
    label: '★ SURVIVOR',
    // hp decreased but player is still alive (value > 0 guards against death screen)
    watch: 'hp',
    check: (value, prev) => value > 0 && value < (prev ?? 3),
  },
];

// ── Class ─────────────────────────────────────────────────────────────────────

export default class AchievementManager {
  /**
   * @param {Phaser.Scene} scene - The GameScene instance.
   */
  constructor(scene) {
    this.scene = scene;

    // Load unlocked set from localStorage — persists across sessions
    this._unlocked = this._load();

    // Per-key previous-value map — used by achievements that need prev (e.g. hp)
    this._prev = {};

    // Snapshot current registry values as baselines so we don't fire achievements
    // for state that was already true before this scene started (e.g. visitedZones
    // restored from registry after a mid-run restart).
    this._baseline();

    // Listen for all registry changes
    this._onChange = this._handleChange.bind(this);
    scene.registry.events.on('changedata', this._onChange);

    // Auto-cleanup on scene shutdown
    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Returns true if the given achievement id has been unlocked this session
   * or in a prior session.
   * @param {string} id
   */
  isUnlocked(id) {
    return this._unlocked.has(id);
  }

  /** Returns a copy of all unlocked achievement ids. */
  getUnlocked() {
    return new Set(this._unlocked);
  }

  /** Cleans up event listeners and nulls the scene reference. */
  destroy() {
    this.scene?.events.off('shutdown', this.destroy, this);
    this.scene?.registry.events.off('changedata', this._onChange);
    this._onChange = null;
    this.scene = null;
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  /**
   * Snapshots the current registry values for all watched keys.
   * Called once in the constructor so mid-run restarts don't re-trigger
   * achievements that were already true before the scene restarted.
   */
  _baseline() {
    const watchedKeys = new Set(ACHIEVEMENTS.map(a => a.watch));
    for (const key of watchedKeys) {
      this._prev[key] = this.scene.registry.get(key);
    }
  }

  /** Called on every registry changedata event. */
  _handleChange(parent, key, value) {
    const prev = this._prev[key];
    this._prev[key] = value;

    for (const achievement of ACHIEVEMENTS) {
      if (achievement.watch !== key)  continue;
      if (this._unlocked.has(achievement.id)) continue;

      try {
        if (achievement.check(value, prev)) {
          this._unlock(achievement);
        }
      } catch {
        // Defensive: malformed registry value should never crash the game
      }
    }
  }

  /** Saves the achievement and fires the HUD toast. */
  _unlock(achievement) {
    this._unlocked.add(achievement.id);
    this._save();
    this._toast(achievement.label);
  }

  /** Fires the achievement toast via the HUD registry key. */
  _toast(label) {
    if (!this.scene) return;
    // Timestamp suffix forces a changedata event even if label repeats
    this.scene.registry.set('achievementToast', `${label}|${Date.now()}`);
  }

  /** Reads the localStorage set, returning an empty Set on any error. */
  _load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  /** Persists the unlocked set to localStorage. */
  _save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify([...this._unlocked]));
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded)
    }
  }
}
