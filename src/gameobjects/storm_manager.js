/**
 * StormManager
 *
 * Manages all four storm phases driven by the registry timeLeft countdown.
 * Owns rain particles, darkness overlay, and camera shake for Phase 4.
 * Communicates phase changes back to HUDScene via registry.stormPhase.
 *
 * Phase thresholds (timeLeft in seconds):
 *   Phase 1  3600 – 2700  Warning      light rain
 *   Phase 2  2699 – 1800  Evacuation   moderate rain
 *   Phase 3  1799 – 900   Storm Surge  heavy rain, darkness, angled rain, debris
 *   Phase 4   899 – 0     Landfall     intense + lightning, strong wind angle
 */

// ── Pure phase logic (re-exported for unit tests) ──────────────────────────
export { getPhaseForTimeLeft } from './storm_phase_logic.js';

// ── Lightning logic (pure — imported for bolt generation, intervals) ────────
import {
  pickInterval,
  getShakeProfile,
  getThunderDelay,
  generateBoltPoints,
  isLightningPhase,
} from './lightning_logic.js';

// ── Per-phase rain config ──────────────────────────────────────────────────
const RAIN_CONFIG = {
  1: { quantity: 1,  freq: 120, speedX: 0,                        speedY: { min: 280, max: 360 }, alpha: { start: 0.25, end: 0 }, lifespan: 900 },
  2: { quantity: 2,  freq:  80, speedX: 0,                        speedY: { min: 320, max: 440 }, alpha: { start: 0.40, end: 0 }, lifespan: 900 },
  3: { quantity: 4,  freq:  40, speedX: { min:  40, max:  80 },   speedY: { min: 380, max: 520 }, alpha: { start: 0.55, end: 0 }, lifespan: 900 },
  4: { quantity: 8,  freq:  20, speedX: { min:  80, max: 140 },   speedY: { min: 460, max: 640 }, alpha: { start: 0.70, end: 0 }, lifespan: 900 },
};

// ── Per-phase debris config (Phase 3+ only) ────────────────────────────────
const DEBRIS_CONFIG = {
  3: { tint: 0x88aa44 },  // olive/leaf — storm surge
  4: { tint: 0xaa8844 },  // brown/dirt — landfall
};

// ── Phase transition toasts ────────────────────────────────────────────────
const TOAST = {
  2: 'PHASE 2 — EVACUATE NOW',
  3: 'PHASE 3 — STORM SURGE',
  4: 'PHASE 4 — LANDFALL',
};

// ── Darkness overlay alpha per phase ──────────────────────────────────────
const DARK_ALPHA = { 1: 0, 2: 0.10, 3: 0.28, 4: 0.50 };

// ── Flash colours per phase transition ────────────────────────────────────
const FLASH = {
  2: [0, 0x44, 0xff],
  3: [0, 0,    0x88],
  4: [0xff, 0xff, 0xff],
};

// ── Shake per phase transition ────────────────────────────────────────────
const TRANSITION_SHAKE = { 2: null, 3: [600, 0.006], 4: [800, 0.010] };

import { getPhaseForTimeLeft } from './storm_phase_logic.js';

export default class StormManager {
  /**
   * @param {Phaser.Scene} scene  — the active GameScene
   */
  constructor(scene) {
    this._scene        = scene;
    this._currentPhase = 1;
    this._destroyed    = false;
    this._shakeTimer   = null;
    this._lightningTimer = null;

    this._debrisEmitter = null;

    this._buildOverlay();
    this._buildRainEmitter(1);
    this._listenForTimeLeft();

    this._scene.events.once('shutdown', this.destroy, this);
  }

  // ── Internal builders ────────────────────────────────────────────────────

  _buildOverlay() {
    const { width, height } = this._scene.sys.game.config;
    this._overlay = this._scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000022, 0)
      .setScrollFactor(0)
      .setDepth(85);
  }

  _buildRainEmitter(phase) {
    if (this._emitter) {
      this._emitter.destroy();
      this._emitter = null;
    }
    const cfg   = RAIN_CONFIG[phase];
    const width = this._scene.sys.game.config.width;

    this._emitter = this._scene.add.particles(0, -10, 'rain-drop', {
      x:        { min: 0, max: width },
      speedX:   cfg.speedX,
      speedY:   cfg.speedY,
      quantity:  cfg.quantity,
      lifespan:  cfg.lifespan,
      alpha:     cfg.alpha,
      frequency: cfg.freq,
      tint:      0xaaddff,
    });

    this._emitter.setScrollFactor(0);
    this._emitter.setDepth(86);
  }

  _buildDebrisEmitter(phase) {
    // Destroy any existing debris emitter first (defensive re-entry guard)
    if (this._debrisEmitter) {
      this._debrisEmitter.destroy();
      this._debrisEmitter = null;
    }

    const cfg    = DEBRIS_CONFIG[phase];
    const height = this._scene.sys.game.config.height;

    // Spawn from the left edge, random Y across full screen height.
    // Depth 84 — below the darkness overlay (85) and rain (86) so debris
    // reads as ground-level litter swept past the camera, not airborne above rain.
    this._debrisEmitter = this._scene.add.particles(0, 0, 'rain-drop', {
      x:        0,
      y:        { min: 0, max: height },
      speedX:   { min: 120, max: 220 },
      speedY:   { min: -40, max:  40 },
      scaleX:   { min: 2, max: 4 },
      scaleY:   { min: 2, max: 4 },
      quantity:  1,
      lifespan:  1200,
      alpha:     { start: 0.6, end: 0 },
      frequency: 400,
      tint:      cfg.tint,
    });

    this._debrisEmitter.setScrollFactor(0);
    this._debrisEmitter.setDepth(84);
  }

  // ── Registry listener ────────────────────────────────────────────────────

  _listenForTimeLeft() {
    this._onTimeLeft = (value) => this._onTick(value);
    this._scene.registry.events.on('changedata-timeLeft', this._onTimeLeft, this);
  }

  _onTick(seconds) {
    const newPhase = getPhaseForTimeLeft(seconds);
    if (newPhase === this._currentPhase) return;
    this._currentPhase = newPhase;
    this._applyPhase(newPhase);
  }

  // ── Phase transition ─────────────────────────────────────────────────────

  _applyPhase(phase) {
    // Rain
    this._buildRainEmitter(phase);

    // Debris (Phase 3+); destroy if somehow dropping back below Phase 3
    if (phase >= 3) {
      this._buildDebrisEmitter(phase);
    } else if (this._debrisEmitter) {
      this._debrisEmitter.destroy();
      this._debrisEmitter = null;
    }

    // Darkness tween
    this._scene.tweens.add({
      targets:  this._overlay,
      alpha:    DARK_ALPHA[phase],
      duration: 4000,
      ease:     'Linear',
    });

    // Flash
    const fc = FLASH[phase];
    if (fc) this._scene.cameras.main.flash(300, fc[0], fc[1], fc[2]);

    // Shake
    const sh = TRANSITION_SHAKE[phase];
    if (sh) this._scene.cameras.main.shake(sh[0], sh[1]);

    // Continuous shake for Phase 4
    if (phase === 4) {
      this._shakeTimer = this._scene.time.addEvent({
        delay:    4000,
        loop:     true,
        callback: () => {
          if (!this._destroyed) this._scene.cameras.main.shake(600, 0.007);
        },
      });
    }

    // Lightning starts at Phase 2 and intensifies through Phase 4.
    // Restart scheduler each phase transition so the interval range updates.
    if (isLightningPhase(phase)) {
      this._startLightning();
    }

    // Toast
    if (TOAST[phase]) {
      this._scene.registry.set('hudToast', TOAST[phase] + '|' + Date.now());
    }

    // Notify HUD
    this._scene.registry.set('stormPhase', phase);
  }

  // ── Lightning system (Phase 2-4) ────────────────────────────────────────

  /**
   * Starts (or restarts) the recurring lightning scheduler for the current phase.
   * Called on every phase transition to >= 2, so the interval range updates.
   */
  _startLightning() {
    // Cancel any in-flight timer so intervals always reflect the new phase
    this._lightningTimer?.remove(false);
    this._lightningTimer = null;

    const scheduleNext = () => {
      if (this._destroyed) return;
      const delay = pickInterval(this._currentPhase);
      if (delay === null) return; // Phase 1 or unexpected — bail

      this._lightningTimer = this._scene.time.delayedCall(delay, () => {
        if (this._destroyed) return;
        this._fireLightning();
        scheduleNext();
      });
    };

    scheduleNext();
  }

  /**
   * Executes one lightning event: camera flash, procedural bolt, item reveal,
   * proximity shake, and delayed thunder SFX.
   */
  _fireLightning() {
    const cam    = this._scene.cameras.main;
    const { width, height } = this._scene.sys.game.config;

    // 100 ms white flash (spec: "Camera flash white 100ms on strike")
    cam.flash(100, 255, 255, 255);

    // Procedural bolt rendered in screen-space
    const boltX = Phaser.Math.Between(Math.floor(width * 0.1), Math.floor(width * 0.9));
    this._renderBolt(boltX, 0, Math.floor(height * 0.65));

    // Item reveal — searchable containers flash white for ~2 frames
    this._revealItems();

    // Shake: Phase 4 = close (intense), Phase 2-3 = distant (subtle)
    const profile = getShakeProfile(this._currentPhase >= 4 ? 'close' : 'distant');
    cam.shake(profile.duration, profile.intensity);

    // Delayed thunder SFX — simulate bolt distance
    const thunderDelay = getThunderDelay();
    this._scene.time.delayedCall(thunderDelay, () => {
      if (this._destroyed || !this._scene?.sound) return;
      // Graceful no-op if 'thunder' key not yet loaded
      try { this._scene.sound.play('thunder', { volume: 0.6 }); } catch (_) { /* missing asset */ }
    });
  }

  /**
   * Draws a jagged lightning bolt using Phaser Graphics in screen-space.
   * Bolt fades out over ~100 ms then self-destructs.
   */
  _renderBolt(startX, startY, endY) {
    const points = generateBoltPoints(startX, startY, endY, 8, 40);

    const gfx = this._scene.add.graphics();
    gfx.setScrollFactor(0);
    gfx.setDepth(500); // Above rain, overlay, player — below pure-UI

    // Glow layer: wider, soft blue-white, low alpha
    gfx.lineStyle(6, 0xbbddff, 0.25);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) gfx.lineTo(points[i].x, points[i].y);
    gfx.strokePath();

    // Core bolt: crisp white, 2 px
    gfx.lineStyle(2, 0xffffff, 1.0);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) gfx.lineTo(points[i].x, points[i].y);
    gfx.strokePath();

    // Fade out over 100 ms then destroy
    this._scene.tweens.add({
      targets:    gfx,
      alpha:      0,
      duration:   100,
      ease:       'Linear',
      onComplete: () => gfx.destroy(),
    });
  }

  /**
   * Flashes all undestroyed searchable containers white for ~80 ms.
   * This is the "item reveal" mechanic — lightning briefly illuminates loot locations.
   */
  _revealItems() {
    const containers = this._scene.zoneManager?.containers ?? [];
    for (const c of containers) {
      if (c._destroyed) continue;
      c.sprite?.setTint(0xffffff);
      this._scene.time.delayedCall(80, () => {
        if (!c._destroyed) c.sprite?.clearTint();
      });
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this._scene?.registry.events.off('changedata-timeLeft', this._onTimeLeft, this);

    this._emitter?.destroy();
    this._emitter = null;

    this._debrisEmitter?.destroy();
    this._debrisEmitter = null;

    this._overlay?.destroy();
    this._overlay = null;

    this._shakeTimer?.remove(false);
    this._shakeTimer = null;

    this._lightningTimer?.remove(false);
    this._lightningTimer = null;

    this._scene = null;
  }
}
