/**
 * PowerLine — downed power line hazard.
 *
 * Spawns in Zone 1 when stormPhase reaches 3 (after ~40 min of play,
 * i.e. ≤ 1799 seconds remaining).
 *
 * Behaviour:
 *   - Static hazard — does not move.
 *   - Sparks randomly from the downed end using a particle emitter.
 *   - Danger zone: a sensor body slightly larger than the visual (1.5x).
 *     Contact deals 1 HP via game.restartScene().
 *   - Near-miss sensor (outer ring, 2x radius): no damage — white flash + text warning.
 *
 * Rendering:
 *   - Procedural pixel-art: angled pole + drooping cable + arc-flash sparks.
 *   - Bright yellow/white spark particles emitted from the ground contact point.
 *   - Subtle arc animation: emitter frequency spikes every 1-3 s.
 *
 * Physics:
 *   - Main hitbox: static sensor rectangle (the "live end" only, ~24×24 px).
 *   - Near-miss sensor: slightly larger ring around the same point.
 *   - Pole body: static rectangle (collidable, impassable) so the player can't
 *     walk through the fallen pole.
 *   - Body labels: 'powerline_hit', 'powerline_warn', 'powerline_pole'
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Width × height of the dangerous live-end sensor (pixels). */
const HIT_W = 28;
const HIT_H = 28;

/** Near-miss sensor is 1.5× the hit sensor in each dimension. */
const WARN_W = HIT_W * 1.5;
const WARN_H = HIT_H * 1.5;

/** Fallen pole body dimensions (the long rod on the ground). */
const POLE_W = 80;
const POLE_H = 10;

/** Max particle count for the spark emitter (keeps fps safe). */
const MAX_PARTICLES = 40;

// ── PowerLine ─────────────────────────────────────────────────────────────────

export default class PowerLine {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x     - World x of the live (downed) end centre
   * @param {number}       y     - World y of the live (downed) end centre
   */
  constructor(scene, x, y) {
    this.scene      = scene;
    this._x         = x;
    this._y         = y;
    this._destroyed = false;
    this._nearPlayer = false;

    this._buildTexture();
    this._buildSprite(x, y);
    this._buildBodies(x, y);
    this._buildSparks(x, y);
    this._startArcAnimation();

    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Visual ───────────────────────────────────────────────────────────────────

  /** Generate a 112×80 power-line texture (pole + cable) on first use. */
  static _ensureTexture(scene) {
    if (scene.textures.exists('powerline_pixel')) return;

    const g = scene.make.graphics({ add: false });

    // Concrete utility pole (fallen, angled across the ground)
    g.fillStyle(0x888888, 1);
    g.fillRect(16, 8, 10, 60);   // pole shaft (vertical representation)
    g.fillStyle(0x666666, 1);
    g.fillRect(12, 10, 18, 6);   // cross-arm
    g.fillRect(12, 20, 18, 4);   // second cross-arm

    // Insulators (small white knobs on cross-arms)
    g.fillStyle(0xeeeeee, 1);
    g.fillCircle(13, 13, 3);
    g.fillCircle(29, 13, 3);
    g.fillCircle(13, 22, 3);
    g.fillCircle(29, 22, 3);

    // Downed cable — droops from insulator toward ground contact (live end)
    g.lineStyle(2, 0x444444, 1);
    g.beginPath();
    g.moveTo(29, 13);     // starts at insulator
    g.quadraticBezierTo(70, 40, 104, 68);  // droops down-right
    g.strokePath();

    // Second cable (slightly offset)
    g.lineStyle(2, 0x555555, 1);
    g.beginPath();
    g.moveTo(29, 22);
    g.quadraticBezierTo(68, 44, 102, 70);
    g.strokePath();

    // Live-end glow circle (bright yellow) at bottom-right
    g.fillStyle(0xffee00, 0.8);
    g.fillCircle(104, 68, 8);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(104, 68, 4);

    // Danger zone indicator — red dashed ring (approximated with arcs)
    g.lineStyle(1, 0xff2200, 0.6);
    g.strokeCircle(104, 68, 20);

    g.generateTexture('powerline_pixel', 112, 80);
    g.destroy();
  }

  _buildTexture() {
    PowerLine._ensureTexture(this.scene);
  }

  /**
   * The sprite is positioned so the live-end glow (at pixel 104,68 within
   * the 112×80 texture) lands at (x, y) in world space.
   * offset: sprite origin moves so live-end aligns with x,y.
   */
  _buildSprite(x, y) {
    // Live end is at (104/112, 68/80) = (0.929, 0.85) in texture space
    this.sprite = this.scene.add.image(x, y, 'powerline_pixel')
      .setOrigin(104 / 112, 68 / 80)
      .setDepth(4);
  }

  // ── Physics ──────────────────────────────────────────────────────────────────

  _buildBodies(x, y) {
    const { Bodies } = Phaser.Physics.Matter.Matter;

    // Lethal hit zone — small sensor at the live end
    this._hitBody = Bodies.rectangle(x, y, HIT_W, HIT_H, {
      isStatic: true,
      isSensor: true,
      label: 'powerline_hit',
    });
    this._hitBody.hazardRef = this;
    this.scene.matter.world.add(this._hitBody);

    // Near-miss warning sensor — slightly larger, centred at same point
    this._warnBody = Bodies.rectangle(x, y, WARN_W, WARN_H, {
      isStatic: true,
      isSensor: true,
      label: 'powerline_warn',
    });
    this._warnBody.hazardRef = this;
    this.scene.matter.world.add(this._warnBody);

    // Pole obstacle — the fallen concrete cylinder blocks passage
    // Positioned at the top-left portion of the sprite (pole shaft area)
    const poleX = x - (104 - 21);  // 83px left of live end
    const poleY = y - (68 - 38);   // 30px above live end
    this._poleBody = Bodies.rectangle(poleX, poleY, POLE_W, POLE_H, {
      isStatic: true,
      isSensor: false,
      label: 'powerline_pole',
      angle: 0.6,  // slight diagonal matches the falling pole orientation
    });
    this._poleBody.hazardRef = this;
    this.scene.matter.world.add(this._poleBody);
  }

  // ── Spark particle system ────────────────────────────────────────────────────

  _buildSparks(x, y) {
    // Ensure a tiny bright square texture exists for spark particles
    if (!this.scene.textures.exists('spark_pixel')) {
      const g = this.scene.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 3, 3);
      g.generateTexture('spark_pixel', 3, 3);
      g.destroy();
    }

    this._sparkEmitter = this.scene.add.particles(x, y, 'spark_pixel', {
      x:         { min: -6, max: 6 },
      y:         { min: -6, max: 6 },
      speedX:    { min: -60, max: 60 },
      speedY:    { min: -80, max: -10 },
      lifespan:  { min: 150, max: 400 },
      alpha:     { start: 1, end: 0 },
      scale:     { start: 1, end: 0 },
      tint:      [0xffee00, 0xffffff, 0xff8800, 0x44aaff],
      frequency:  120,
      quantity:   2,
      maxParticles: MAX_PARTICLES,
      gravityY:   200,
    });
    this._sparkEmitter.setDepth(6);
  }

  // ── Arc animation ─────────────────────────────────────────────────────────────

  /**
   * Every 1-3 seconds, briefly spike the emitter frequency to simulate an
   * arc flash, then return to idle. This creates the visual rhythm of a
   * live wire intermittently arcing rather than continuously sparking.
   */
  _startArcAnimation() {
    const scheduleArc = () => {
      if (this._destroyed) return;
      const delay = Phaser.Math.Between(1000, 3000);
      this._arcTimer = this.scene.time.delayedCall(delay, () => {
        if (this._destroyed) return;
        // Arc flash: increase emitter output + white overlay flash
        this._sparkEmitter.setFrequency(20, 8);
        this.scene.cameras.main.flash(40, 0xff, 0xff, 0xcc, true);

        // Return to idle rate after 400 ms
        this.scene.time.delayedCall(400, () => {
          if (!this._destroyed) this._sparkEmitter.setFrequency(120, 2);
        });

        scheduleArc();
      });
    };
    scheduleArc();
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Called from game.js when the near-miss sensor overlaps the player.
   * Gives an audio-visual warning without dealing damage.
   */
  onNearMiss() {
    if (this._nearPlayer) return;
    this._nearPlayer = true;

    this.scene.showPoints(this._x, this._y - 32, '! live wire !', 0xffee00);
    this.scene.cameras.main.flash(80, 0xff, 0xee, 0x00, true);

    this.scene.time.delayedCall(2000, () => { this._nearPlayer = false; });
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this._arcTimer?.remove(false);

    this._sparkEmitter?.destroy();
    this._sparkEmitter = null;

    if (this._hitBody)  this.scene.matter.world.remove(this._hitBody);
    if (this._warnBody) this.scene.matter.world.remove(this._warnBody);
    if (this._poleBody) this.scene.matter.world.remove(this._poleBody);
    this._hitBody  = null;
    this._warnBody = null;
    this._poleBody = null;

    this.sprite?.destroy();
    this.sprite = null;
  }
}
