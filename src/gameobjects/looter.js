/**
 * Looter — opportunistic patrol hazard.
 *
 * Spawns in Zone 1 when stormPhase reaches 2 (after ~20 min of play,
 * i.e. ≤ 2699 seconds remaining).
 *
 * Behaviour:
 *   - Two-waypoint patrol AI: walks between pointA and pointB indefinitely.
 *   - Briefly pauses (0.4–1.2 s) at each waypoint before turning back.
 *   - Flips sprite horizontally when changing direction.
 *   - Deals 1 HP on contact with the player (via game.restartScene()).
 *   - Near-miss sensor (1.5× hitbox): no damage — brief text warning.
 *
 * Rendering:
 *   - Procedural pixel-art: hoodie figure, baseball cap, bag.
 *   - Red/maroon palette to visually distinguish from Juan (brown/green).
 *   - Walk cycle: 2 alternating frames driven by a tween on scaleX.
 *
 * Physics:
 *   - Dynamic circular Matter body — moves via setVelocity each frame.
 *   - frictionAir dampens drift between velocity updates.
 *   - Main body label: 'looter'
 *   - Near-miss sensor label: 'looter_warn'
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Patrol walk speed in pixels/frame at 60 fps. */
const WALK_SPEED = 1.4;  // ~84 px/s — slightly slower than Juan

/** Radius of the main physics hitbox (pixels). */
const BODY_RADIUS = 12;

/** Near-miss sensor radius — 1.5× the main body. */
const SENSOR_RADIUS = BODY_RADIUS * 1.5;

/** Pause duration range at each waypoint (ms). */
const PAUSE_MS_MIN = 400;
const PAUSE_MS_MAX = 1200;

// ── Looter ────────────────────────────────────────────────────────────────────

export default class Looter {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x1, y1  - World position of patrol point A
   * @param {number}       x2, y2  - World position of patrol point B
   */
  constructor(scene, x1, y1, x2, y2) {
    this.scene      = scene;
    this._ptA       = { x: x1, y: y1 };
    this._ptB       = { x: x2, y: y2 };
    this._target    = this._ptB;   // currently heading toward B
    this._pausing   = false;
    this._destroyed = false;
    this._nearPlayer = false;

    this._buildSprite(x1, y1);
    this._buildBodies(x1, y1);
    this._startWalkTween();

    scene.events.on('update', this._update, this);
    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Visual ───────────────────────────────────────────────────────────────────

  /** Generate a 24×32 looter texture on first use. */
  static _ensureTexture(scene) {
    if (scene.textures.exists('looter_pixel')) return;

    const g = scene.make.graphics({ add: false });

    // Legs (dark jeans)
    g.fillStyle(0x1a2a5a, 1);
    g.fillRect(7, 22, 5, 10);   // left leg
    g.fillRect(12, 22, 5, 10);  // right leg

    // Shoes
    g.fillStyle(0x111111, 1);
    g.fillRect(6, 30, 6, 3);
    g.fillRect(12, 30, 6, 3);

    // Hoodie body (dark red/maroon)
    g.fillStyle(0x8b1a1a, 1);
    g.fillRect(5, 13, 14, 11);

    // Hood/arms extension
    g.fillStyle(0x7a1515, 1);
    g.fillRect(3, 14, 4, 8);    // left arm
    g.fillRect(17, 14, 4, 8);   // right arm

    // Hands
    g.fillStyle(0xd4a574, 1);
    g.fillRect(3, 22, 4, 4);
    g.fillRect(17, 22, 4, 4);

    // Duffel bag (grey, slung over right shoulder)
    g.fillStyle(0x666666, 1);
    g.fillRect(19, 16, 5, 8);
    g.fillStyle(0x888888, 1);
    g.fillRect(20, 17, 3, 6);   // bag highlight

    // Head (skin tone)
    g.fillStyle(0xd4a574, 1);
    g.fillRect(8, 5, 8, 8);

    // Baseball cap (dark grey, brim facing right)
    g.fillStyle(0x333333, 1);
    g.fillRect(7, 3, 10, 4);    // cap top
    g.fillRect(14, 6, 5, 2);    // brim

    // Face details
    g.fillStyle(0x000000, 1);
    g.fillRect(9, 7, 2, 2);     // left eye
    g.fillRect(13, 7, 2, 2);    // right eye

    g.generateTexture('looter_pixel', 24, 32);
    g.destroy();
  }

  _buildSprite(x, y) {
    Looter._ensureTexture(this.scene);
    this.sprite = this.scene.add.image(x, y, 'looter_pixel')
      .setOrigin(0.5)
      .setDepth(5);
  }

  // ── Physics ──────────────────────────────────────────────────────────────────

  _buildBodies(x, y) {
    const { Bodies } = Phaser.Physics.Matter.Matter;

    this._body = Bodies.circle(x, y, BODY_RADIUS, {
      frictionAir: 0.15,
      friction: 0,
      label: 'looter',
      isSensor: false,
    });
    this._body.hazardRef = this;
    this.scene.matter.world.add(this._body);

    this._sensor = Bodies.circle(x, y, SENSOR_RADIUS, {
      isSensor: true,
      isStatic: false,
      label: 'looter_warn',
    });
    this._sensor.hazardRef = this;
    this.scene.matter.world.add(this._sensor);
  }

  // ── Walk cycle tween ─────────────────────────────────────────────────────────

  /**
   * Simulates a walk cycle by gently bobbing scaleX ±4%.
   * Subtle enough not to feel cartoonish; just enough to signal life.
   */
  _startWalkTween() {
    this._walkTween = this.scene.tweens.add({
      targets:  this.sprite,
      scaleY:   { from: 0.97, to: 1.03 },
      duration: 300,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  // ── Patrol AI ─────────────────────────────────────────────────────────────────

  _update() {
    if (this._destroyed) return;

    const bx = this._body.position.x;
    const by = this._body.position.y;

    // Keep sensor co-located with main body
    Phaser.Physics.Matter.Matter.Body.setPosition(this._sensor, { x: bx, y: by });

    // Sync sprite to physics body
    this.sprite.setPosition(bx, by);

    if (this._pausing) return;

    const dx   = this._target.x - bx;
    const dy   = this._target.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      // Reached waypoint — pause, then switch direction
      Phaser.Physics.Matter.Matter.Body.setVelocity(this._body, { x: 0, y: 0 });
      this._pausing = true;

      const pauseMs = Phaser.Math.Between(PAUSE_MS_MIN, PAUSE_MS_MAX);
      this._pauseTimer = this.scene.time.delayedCall(pauseMs, () => {
        if (this._destroyed) return;
        // Toggle target between A and B
        this._target  = (this._target === this._ptB) ? this._ptA : this._ptB;
        this._pausing = false;
      });
      return;
    }

    // Move toward current target
    const nx = (dx / dist) * WALK_SPEED;
    const ny = (dy / dist) * WALK_SPEED;
    Phaser.Physics.Matter.Matter.Body.setVelocity(this._body, { x: nx, y: ny });

    // Flip sprite to face direction of horizontal travel
    if (Math.abs(dx) > 4) {
      this.sprite.setFlipX(dx < 0);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Called from game.js when the near-miss sensor overlaps the player.
   * Delivers a warning without dealing damage.
   */
  onNearMiss() {
    if (this._nearPlayer) return;
    this._nearPlayer = true;

    const { x, y } = this._body.position;
    this.scene.showPoints(x, y - 28, '! looter !', 0xff4444);
    this.scene.cameras.main.flash(50, 0xff, 0x44, 0x44, true);

    this.scene.time.delayedCall(2000, () => { this._nearPlayer = false; });
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this.scene.events.off('update', this._update, this);
    this._pauseTimer?.remove(false);
    this._walkTween?.stop();

    if (this._body)   this.scene.matter.world?.remove(this._body);
    if (this._sensor) this.scene.matter.world?.remove(this._sensor);
    this._body   = null;
    this._sensor = null;

    this.sprite?.destroy();
    this.sprite = null;
  }
}
