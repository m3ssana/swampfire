/**
 * FloodZone — rising water tile overlay.
 *
 * Spawns over low roads in Zone 1 when stormPhase reaches 3 (after ~35 min
 * of play, i.e. ≤ 1799 seconds remaining).
 *
 * Behaviour:
 *   - Static visual tile overlay — a semi-transparent blue/green rectangle
 *     that covers a defined region of the map.
 *   - Per-frame overlap detection: when the player's sprite centre is inside
 *     the flood bounds, their velocity is scaled by FLOOD_SPEED_MULTIPLIER.
 *   - Speed reduction is applied by multiplying the velocity that the player's
 *     own update already set — no modifications to player.js required.
 *   - Slow effect: 45% of normal speed (player feels like wading through water).
 *   - Near-miss: no dedicated near-miss — the visual is always present as a
 *     clear environmental cue. A "wading..." text popup fires once on entry.
 *
 * Rendering:
 *   - Rounded semi-transparent blue-green rectangle (alpha 0.45).
 *   - Subtle wave animation: tween alpha between 0.35 and 0.55 on a 2 s loop.
 *   - Depth 2 — above ground tiles (0) but below obstacles (1 was taken;
 *     flooding is passable so it sits above ground but we keep it below
 *     interactive objects at depth 4+).
 *
 * Physics:
 *   - No Matter.js body — overlap is detected via AABB check in update().
 *   - This avoids friction/collision side effects and is cheaper to compute.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Speed multiplier while inside the flood zone.
 * 0.45 feels like wading — slow enough to be dangerous near the storm deadline
 * but not completely immobilising.
 */
export const FLOOD_SPEED_MULTIPLIER = 0.45;

/** Alpha oscillation range for the wave animation. */
const ALPHA_MIN = 0.35;
const ALPHA_MAX = 0.55;

/** Wave cycle duration (ms). */
const WAVE_DURATION = 2000;

// ── FloodZone ─────────────────────────────────────────────────────────────────

export default class FloodZone {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x      - World x of top-left corner (pixels)
   * @param {number}       y      - World y of top-left corner (pixels)
   * @param {number}       width  - Width of flooded region (pixels)
   * @param {number}       height - Height of flooded region (pixels)
   */
  constructor(scene, x, y, width, height) {
    this.scene      = scene;
    this._bounds    = { x, y, width, height };
    this._destroyed = false;
    this._playerInZone = false;
    this._warnedEntry  = false;

    this._buildOverlay(x, y, width, height);
    this._startWaveAnimation();

    scene.events.on('update', this._update, this);
    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Visual ───────────────────────────────────────────────────────────────────

  _buildOverlay(x, y, width, height) {
    // Centre the rectangle game object (Phaser rectangle origin is top-left by default
    // but fillRect coordinates are top-left — using add.rectangle which takes centre x,y)
    this._rect = this.scene.add.rectangle(
      x + width  / 2,
      y + height / 2,
      width,
      height,
      0x1166aa,  // storm-water blue
      0.45,
    ).setDepth(2);

    // Ripple texture overlay — small wave lines on top of the solid fill
    this._buildRipples(x, y, width, height);
  }

  /** Draw a few horizontal wave lines using graphics for visual texture. */
  _buildRipples(x, y, width, height) {
    const g = this.scene.add.graphics().setDepth(3);
    g.lineStyle(1, 0x44aaff, 0.3);

    const waveCount = Math.floor(height / 32);
    for (let i = 1; i <= waveCount; i++) {
      const wy = y + (i / (waveCount + 1)) * height;
      g.beginPath();
      // Simple sine-approximated wave using quadratic bezier segments
      const segments = Math.max(2, Math.floor(width / 64));
      g.moveTo(x, wy);
      for (let s = 0; s < segments; s++) {
        const sx = x + (s / segments) * width;
        const ex = x + ((s + 1) / segments) * width;
        const mx = (sx + ex) / 2;
        const dir = (s % 2 === 0) ? -5 : 5;
        g.quadraticBezierTo(mx, wy + dir, ex, wy);
      }
      g.strokePath();
    }

    this._rippleGraphics = g;

    // Tween ripple alpha to animate independently from the fill
    this._rippleTween = this.scene.tweens.add({
      targets:  g,
      alpha:    { from: 0.4, to: 0.9 },
      duration: WAVE_DURATION * 0.7,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  _startWaveAnimation() {
    this._waveTween = this.scene.tweens.add({
      targets:  this._rect,
      alpha:    { from: ALPHA_MIN, to: ALPHA_MAX },
      duration: WAVE_DURATION,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  // ── Player overlap detection ──────────────────────────────────────────────────

  _update() {
    if (this._destroyed) return;

    const player = this.scene.player;
    if (!player?.sprite) return;

    const px = player.sprite.x;
    const py = player.sprite.y;
    const { x, y, width, height } = this._bounds;

    const inside = px >= x && px <= x + width && py >= y && py <= y + height;

    if (inside) {
      // Scale down player velocity AFTER the player's own update has set it.
      // FloodZone's update listener is registered after the player's, so the
      // player velocity has already been applied this frame — we reduce it here.
      // Using setVelocity with the current velocity * multiplier achieves wading.
      const vx = player.sprite.body.velocity.x * FLOOD_SPEED_MULTIPLIER;
      const vy = player.sprite.body.velocity.y * FLOOD_SPEED_MULTIPLIER;
      player.sprite.setVelocity(vx, vy);

      if (!this._playerInZone) {
        // First frame of entry — show wading text
        this._playerInZone = true;
        if (!this._warnedEntry) {
          this._warnedEntry = true;
          this.scene.showPoints(px, py - 30, '~ wading ~', 0x44aaff);
          // Reset the warn flag after player exits so re-entry shows it again
          this.scene.time.delayedCall(5000, () => { this._warnedEntry = false; });
        }
      }
    } else {
      if (this._playerInZone) {
        this._playerInZone = false;
      }
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this.scene.events.off('update', this._update, this);

    this._waveTween?.stop();
    this._rippleTween?.stop();

    this._rect?.destroy();
    this._rippleGraphics?.destroy();

    this._rect           = null;
    this._rippleGraphics = null;
  }
}
