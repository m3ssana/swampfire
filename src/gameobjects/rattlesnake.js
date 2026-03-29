/**
 * Rattlesnake — patrol/idle hazard.
 *
 * Spawned at zone edges (Zone 0) and throughout Zone 3.
 * Behaviour:
 *   - Idles for 1–3 s, then moves to a random nearby waypoint
 *   - Inflicts 1 HP on contact via the standard restartScene() path
 *   - Near-miss sensor: a second, larger sensor body (1.5x radius) detects
 *     the player approaching before the main hitbox fires, giving a brief
 *     rattle warning (camera flash + showPoints text) without dealing damage
 *
 * Rendering:
 *   - Procedural pixel-art snake drawn with scene.add.graphics()
 *   - Green/brown body segments, triangular head, forked tongue
 *   - Subtly wiggles by tween-cycling scaleX ±0.08 when idle
 *   - Flips horizontally when moving left vs right
 *
 * Physics:
 *   - Dynamic Matter body so it can move freely
 *   - frictionAir dampens drift; velocity is set directly each tick
 *   - Marked with body.label = "rattlesnake" for collision routing in game.js
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Patrol speed in pixels/second. */
const PATROL_SPEED = 28;

/** Radius of the main hitbox (kills on contact). */
const BODY_RADIUS = 10;

/** Radius of the near-miss warning sensor (flash + text, no damage). */
const SENSOR_RADIUS = 20;

/** After reaching a waypoint, pause this many ms before picking the next one. */
const IDLE_MS_MIN = 1000;
const IDLE_MS_MAX = 3000;

/** Maximum pixel distance for the randomly-chosen next waypoint. */
const WANDER_RADIUS = 120;

// ── Rattlesnake ───────────────────────────────────────────────────────────────

export default class Rattlesnake {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x     - World x position (centre)
   * @param {number}       y     - World y position (centre)
   */
  constructor(scene, x, y) {
    this.scene       = scene;
    this._origin     = { x, y };
    this._target     = { x, y };
    this._idling     = true;
    this._destroyed  = false;
    this._nearPlayer = false;  // debounce the near-miss warning

    this._buildSprite(x, y);
    this._buildSensor(x, y);
    this._startIdleTween();
    this._scheduleWander();

    scene.events.on('update', this._update, this);
    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Visual ───────────────────────────────────────────────────────────────────

  /** Generate a 32×20 procedural snake texture the first time; reuse after. */
  static _ensureTexture(scene) {
    if (scene.textures.exists('rattlesnake_pixel')) return;

    const g = scene.make.graphics({ add: false });

    // Body — dark olive green with brown saddle marks
    g.fillStyle(0x4a6a1a, 1);
    g.fillEllipse(4,  10, 10, 14);   // tail segment
    g.fillEllipse(11, 10, 12, 14);   // mid segment
    g.fillEllipse(19, 10, 12, 14);   // shoulder segment

    // Saddle marks (darker diamonds on body)
    g.fillStyle(0x2e4a10, 1);
    g.fillRect(7, 7, 4, 6);
    g.fillRect(15, 7, 4, 6);

    // Head — triangular, slightly wider/lighter
    g.fillStyle(0x5a7a20, 1);
    g.fillTriangle(20, 5, 32, 10, 20, 15);

    // Eye
    g.fillStyle(0xff8800, 1);
    g.fillCircle(29, 8, 2);
    g.fillStyle(0x000000, 1);
    g.fillCircle(29, 8, 1);

    // Tongue (forked red lines)
    g.lineStyle(1, 0xee1111, 1);
    g.beginPath();
    g.moveTo(32, 10);
    g.lineTo(36, 10);
    g.lineTo(38, 8);
    g.moveTo(36, 10);
    g.lineTo(38, 12);
    g.strokePath();

    g.generateTexture('rattlesnake_pixel', 40, 20);
    g.destroy();
  }

  _buildSprite(x, y) {
    Rattlesnake._ensureTexture(this.scene);

    // Use a standard image game object; position is synced to the Matter body each tick
    this.sprite = this.scene.add.image(x, y, 'rattlesnake_pixel')
      .setOrigin(0.5)
      .setDepth(5);

    // Matter circle body — moves, collides with tiles
    const { Bodies, Body } = Phaser.Physics.Matter.Matter;
    this._body = Bodies.circle(x, y, BODY_RADIUS, {
      frictionAir: 0.18,
      friction: 0,
      label: 'rattlesnake',
      isSensor: false,
    });
    this._body.hazardRef = this;
    this.scene.matter.world.add(this._body);
  }

  _buildSensor(x, y) {
    const { Bodies } = Phaser.Physics.Matter.Matter;
    this._sensor = Bodies.circle(x, y, SENSOR_RADIUS, {
      isSensor: true,
      label: 'rattlesnake_warn',
      isStatic: false,
    });
    this._sensor.hazardRef = this;
    this.scene.matter.world.add(this._sensor);
  }

  _startIdleTween() {
    this._idleTween = this.scene.tweens.add({
      targets:  this.sprite,
      scaleX:   { from: 0.92, to: 1.08 },
      duration: 600,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  // ── Patrol AI ────────────────────────────────────────────────────────────────

  _scheduleWander() {
    if (this._destroyed) return;
    const delay = Phaser.Math.Between(IDLE_MS_MIN, IDLE_MS_MAX);
    this._wanderTimer = this.scene.time.delayedCall(delay, () => {
      if (this._destroyed) return;
      this._pickWaypoint();
    });
  }

  _pickWaypoint() {
    const angle = Math.random() * Math.PI * 2;
    const dist  = Phaser.Math.Between(30, WANDER_RADIUS);
    this._target = {
      x: this._origin.x + Math.cos(angle) * dist,
      y: this._origin.y + Math.sin(angle) * dist,
    };
    this._idling = false;
  }

  _update() {
    if (this._destroyed) return;

    const bx = this._body.position.x;
    const by = this._body.position.y;

    // Keep sensor body co-located with main body
    Phaser.Physics.Matter.Matter.Body.setPosition(this._sensor, { x: bx, y: by });

    // Sync sprite to physics body
    this.sprite.setPosition(bx, by);

    if (this._idling) return;

    const dx = this._target.x - bx;
    const dy = this._target.y - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 6) {
      // Reached waypoint — stop and idle
      Phaser.Physics.Matter.Matter.Body.setVelocity(this._body, { x: 0, y: 0 });
      this._idling = true;
      this._origin = { x: bx, y: by }; // update wander anchor to current position
      this._scheduleWander();
      return;
    }

    // Move toward target
    const speed = PATROL_SPEED / 60; // pixels per frame at 60 fps
    const nx    = (dx / dist) * speed;
    const ny    = (dy / dist) * speed;
    Phaser.Physics.Matter.Matter.Body.setVelocity(this._body, { x: nx, y: ny });

    // Flip sprite to face direction of travel
    this.sprite.setFlipX(dx < 0);
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Called from game.js collision handler when the near-miss SENSOR overlaps the player.
   * Shows a rattle warning — no HP damage.
   */
  onNearMiss() {
    if (this._nearPlayer) return;  // debounce
    this._nearPlayer = true;

    const { x, y } = this.sprite;
    this.scene.showPoints(x, y - 24, '~ rattle ~', 0xaaff44);
    this.scene.cameras.main.flash(60, 0xaa, 0xff, 0x44);
    const xp = this.scene.registry.get('xp') ?? 0;
    this.scene.registry.set('xp', xp + 15);
    this.scene.showXPGain(x, y - 48, 15, 'nearmiss');

    // Reset debounce after the player has had time to move away
    this.scene.time.delayedCall(1500, () => { this._nearPlayer = false; });
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this.scene.events.off('update', this._update, this);
    this._wanderTimer?.remove(false);
    this._idleTween?.stop();

    this.scene.matter.world?.remove(this._body);
    this.scene.matter.world?.remove(this._sensor);
    this.sprite?.destroy();

    this.sprite  = null;
    this._body   = null;
    this._sensor = null;
  }
}
