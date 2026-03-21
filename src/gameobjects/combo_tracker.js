/**
 * ComboTracker — escalating feedback for rapid loot pickups.
 *
 * Call onLoot() each time a container yields XP. The tracker increments a
 * counter, restarts a 3-second expiry window, and triggers centre-screen
 * combo text at each threshold. FRENZY (5+ pickups) adds a camera shake,
 * red screen flash, and a 1.5× XP multiplier that lasts 5 seconds.
 *
 * Thresholds:
 *   2 → DOUBLE!   (white,  22 px)
 *   3 → TRIPLE!   (yellow, 24 px)
 *   4 → QUAD!     (orange, 27 px)
 *   5+ → FRENZY!  (red,    32 px, shake + flash + 1.5× XP)
 *
 * Usage:
 *   this.comboTracker = new ComboTracker(this);        // game.js create()
 *   this.comboTracker.onLoot(x, y);                   // after XP awarded
 *   const mult = this.comboTracker.getMultiplier();    // before XP calc
 *   this.comboTracker.reset();                         // on player death
 *   this.comboTracker.destroy();                       // on scene shutdown
 */

// ── Tuning constants ──────────────────────────────────────────────────────────

/** Rolling window in ms — streak resets if no loot arrives within this time. */
export const COMBO_WINDOW_MS    = 3000;

/** XP multiplier applied while FRENZY is active. */
export const FRENZY_MULT        = 1.5;

/** Duration in ms that the FRENZY multiplier stays active after triggering. */
export const FRENZY_DURATION_MS = 5000;

// ── Level definitions ─────────────────────────────────────────────────────────

const LEVELS = [
  null,   // 0 — below threshold, no display
  null,   // 1 — first pickup, no display yet
  { label: 'DOUBLE!', tint: 0xffffff, size: 22 },
  { label: 'TRIPLE!', tint: 0xffee00, size: 24 },
  { label: 'QUAD!',   tint: 0xff8800, size: 27 },
  { label: 'FRENZY!', tint: 0xff2244, size: 32 },  // re-used for 5, 6, 7, …
];

// ── Class ─────────────────────────────────────────────────────────────────────

export default class ComboTracker {
  /**
   * @param {Phaser.Scene} scene - The GameScene instance.
   */
  constructor(scene) {
    this.scene = scene;

    this._count        = 0;
    this._windowTimer  = null;
    this._frenzyTimer  = null;
    this._frenzyActive = false;
    this._comboText    = null;

    // Run-lifetime stats — survive reset() so they persist to the end-of-run share card
    this._peakCombo   = 0;
    this._frenzyCount = 0;

    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Register a loot event. Call this after the XP has been awarded and the
   * XP popup has been queued — so the multiplier from a prior FRENZY is
   * already baked into the XP before the count increments and potentially
   * activates FRENZY for the next hit.
   *
   * @param {number} x - World X of the loot source (reserved for future FX).
   * @param {number} y - World Y of the loot source.
   */
  onLoot(x, y) {
    this._count++;
    if (this._count > this._peakCombo) this._peakCombo = this._count;
    this._restartWindowTimer();

    const level = LEVELS[Math.min(this._count, LEVELS.length - 1)];
    if (!level) return;   // count < 2, nothing to display yet

    this._showComboText(level);

    if (this._count >= 5 && !this._frenzyActive) {
      this._triggerFrenzy();
    }
  }

  /**
   * Returns the active XP multiplier (1.5 during FRENZY, 1.0 otherwise).
   * Read this BEFORE awarding XP and BEFORE calling onLoot().
   */
  getMultiplier() {
    return this._frenzyActive ? FRENZY_MULT : 1.0;
  }

  /** Returns the highest loot streak count reached during this run. */
  getPeakCombo() { return this._peakCombo; }

  /** Returns the number of distinct FRENZY activations during this run. */
  getFrenzyCount() { return this._frenzyCount; }

  /**
   * Hard-resets all streak state. Call on player death so the combo does
   * not persist into the respawn. Zone transitions do NOT reset the streak.
   */
  reset() {
    this._count = 0;

    this._windowTimer?.remove(false);
    this._windowTimer = null;

    this._clearFrenzy();

    if (this._comboText?.active) this._comboText.destroy();
    this._comboText = null;
  }

  /** Cleans up all state and timers. Registered automatically on shutdown. */
  destroy() {
    this.scene?.events.off('shutdown', this.destroy, this);
    this.reset();
    this.scene = null;
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  /** Restarts the 3-second window. Expiry resets the count but not FRENZY. */
  _restartWindowTimer() {
    this._windowTimer?.remove(false);
    this._windowTimer = this.scene.time.delayedCall(COMBO_WINDOW_MS, () => {
      this._count       = 0;
      this._windowTimer = null;
    });
  }

  /**
   * Renders the combo label at the centre of the screen.
   * Scale pops in (1.6 → 1.0) then the text fades out after a short hold.
   * Any in-flight combo text is destroyed first so labels never stack.
   */
  _showComboText(level) {
    if (this._comboText?.active) this._comboText.destroy();
    this._comboText = null;

    const { width, height } = this.scene.sys.game.config;

    const text = this.scene.add
      .bitmapText(width / 2, height / 2 - 40, 'default', level.label, level.size)
      .setOrigin(0.5)
      .setTint(level.tint)
      .setDropShadow(2, 3, 0x000000, 0.9)
      .setScrollFactor(0)   // camera-fixed — not affected by world scroll
      .setDepth(60)          // above XP popups (50) and HUD toast (20)
      .setScale(1.6);

    this._comboText = text;

    // Scale pop-in: 1.6 → 1.0
    this.scene.tweens.add({
      targets: text, scaleX: 1.0, scaleY: 1.0,
      duration: 180, ease: 'Back.Out',
    });

    // Hold at full opacity then fade out
    this.scene.tweens.add({
      targets: text, alpha: 0,
      duration: 350, delay: 650,
      onComplete: () => {
        if (text?.active) text.destroy();
        if (this._comboText === text) this._comboText = null;
      },
    });
  }

  /**
   * Triggers the FRENZY cascade: biggest camera shake in the game,
   * red screen flash, and starts the 1.5× XP multiplier window.
   */
  _triggerFrenzy() {
    this._frenzyActive = true;
    this._frenzyCount++;

    // Shake: heavier than install (0.008) and death (0.012)
    this.scene.cameras.main.shake(400, 0.018);
    // Red flash: r=255, g=30, b=0, intensity=0.55
    this.scene.cameras.main.flash(300, 255, 30, 0, 0.55);

    // Multiplier expires after FRENZY_DURATION_MS
    this._frenzyTimer?.remove(false);
    this._frenzyTimer = this.scene.time.delayedCall(FRENZY_DURATION_MS, () => {
      this._clearFrenzy();
    });
  }

  _clearFrenzy() {
    this._frenzyActive = false;
    this._frenzyTimer?.remove(false);
    this._frenzyTimer = null;
  }
}
