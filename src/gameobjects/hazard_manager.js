/**
 * HazardManager
 *
 * Manages all timed hazards across zones. Created once in GameScene.create()
 * alongside StormManager. Listens for zone changes and stormPhase changes to
 * spawn hazards at the right moment.
 *
 * Hazard schedule:
 *   Rattlesnakes  — Zone 0 edges + Zone 3   always present when zone is active
 *   Looters       — Zone 1, stormPhase >= 2  (~20 min elapsed / 40 min left)
 *   Power lines   — Zone 1, stormPhase >= 3  (~40 min elapsed / 20 min left)
 *   Flood zones   — Zone 1, stormPhase >= 3  (~35 min elapsed / 25 min left)
 *
 * All phases trigger roughly at:
 *   Phase 2  ≤ 2699 s remaining  (< 45 min left)
 *   Phase 3  ≤ 1799 s remaining  (< 30 min left)
 *
 * Collision routing:
 *   addCollisions() registers handlers for all hazard body labels so game.js
 *   can stay free of per-hazard switch cases.
 *
 * Cleanup:
 *   destroy() is called by GameScene on shutdown (scene restart / game over).
 *   All active hazard instances are destroyed; registry listeners removed.
 */

import Rattlesnake from './rattlesnake';
import Looter      from './looter';
import PowerLine   from './power_line';
import FloodZone, { FLOOD_SPEED_MULTIPLIER } from './flood_zone';

// ── Spawn tables ──────────────────────────────────────────────────────────────
//
// World coordinates (pixels). All zones are 80×60 tiles at 48px = 3840×2880 px.
// Positions chosen to be:
//   - In passable space (not on obstacle tiles)
//   - Spread across zone edges / low-lying roads
//   - Far enough from spawn / workbench to not frustrate new players

const RATTLESNAKE_SPAWNS = {
  // Zone 0 — Cypress Creek Preserve
  // Edge positions: south trail near exit, west trail near exit, north edge
  0: [
    { x:  6 * 48, y: 25 * 48 },   // west corridor
    { x:  8 * 48, y: 35 * 48 },   // west-mid trail
    { x: 40 * 48, y: 56 * 48 },   // south trail near exit
    { x: 45 * 48, y: 55 * 48 },   // south trail cluster
    { x: 70 * 48, y: 10 * 48 },   // north-east edge
    { x: 72 * 48, y: 48 * 48 },   // east mid-edge
  ],
  // Zone 3 — Conner Preserve
  // Throughout preserve: fire tower approach, RC field perimeter
  3: [
    { x: 20 * 48, y: 15 * 48 },
    { x: 35 * 48, y: 20 * 48 },
    { x: 50 * 48, y: 30 * 48 },
    { x: 25 * 48, y: 40 * 48 },
    { x: 60 * 48, y: 12 * 48 },
    { x: 15 * 48, y: 50 * 48 },
  ],
};

// Looter patrol waypoints in Zone 1 — two points per looter.
// Waypoints along the US-41 corridor parking lots and sidewalks.
const LOOTER_PATROLS = [
  // RaceTrac parking lot patrol
  { ax: 18 * 48, ay: 22 * 48,  bx: 28 * 48, by: 22 * 48 },
  // Harvey's Hardware front — blocks a useful east-west corridor
  { ax: 35 * 48, ay: 30 * 48,  bx: 50 * 48, by: 30 * 48 },
  // Gulf Coast Tractor lot — diagonal patrol
  { ax: 55 * 48, ay: 18 * 48,  bx: 62 * 48, by: 28 * 48 },
  // South highway — late-game pressure near Zone 4 exit
  { ax: 30 * 48, ay: 50 * 48,  bx: 48 * 48, by: 50 * 48 },
];

// Power line drop positions in Zone 1 — live end coordinates.
// Placed at road intersections and store fronts for maximum navigational impact.
const POWERLINE_SPAWNS = [
  { x: 22 * 48, y: 28 * 48 },   // main highway north section
  { x: 48 * 48, y: 35 * 48 },   // mid-corridor intersection
  { x: 62 * 48, y: 22 * 48 },   // east parking lot
];

// Flood zones in Zone 1 — AABB rectangles (top-left x/y, width, height).
// Cover low-lying road sections; positioned over drainage swales and curb dips.
const FLOOD_ZONES = [
  // North highway segment — narrows the main Zone 0 → Zone 4 corridor
  { x: 14 * 48, y: 10 * 48, w: 18 * 48, h:  6 * 48 },
  // Central intersection pond — forces route around it
  { x: 34 * 48, y: 24 * 48, w: 10 * 48, h:  8 * 48 },
  // South road near Zone 4 exit
  { x: 20 * 48, y: 52 * 48, w: 22 * 48, h:  5 * 48 },
];

// ── HazardManager ─────────────────────────────────────────────────────────────

export default class HazardManager {
  /**
   * @param {Phaser.Scene} scene — the active GameScene
   */
  constructor(scene) {
    this._scene        = scene;
    this._destroyed    = false;
    this._currentZone  = null;

    /** All currently live hazard instances. */
    this._hazards = [];

    this._listenForPhase();
    this._listenForZone();

    // Spawn any hazards that are unconditionally present in the starting zone
    this._onZoneChanged(scene.zone?.currentZoneId ?? 0);

    scene.events.once('shutdown', this.destroy, this);
  }

  // ── Registry listeners ───────────────────────────────────────────────────────

  _listenForPhase() {
    this._onPhaseChange = (parent, phase) => this._checkPhaseSpawns(phase);
    this._scene.registry.events.on('changedata-stormPhase', this._onPhaseChange, this);
  }

  _listenForZone() {
    // GameScene fires 'zoneChanged' after each successful zone transition.
    // We hook here so hazards spawn/despawn cleanly whenever the zone flips.
    this._scene.events.on('zoneChanged', this._onZoneChanged, this);
  }

  // ── Zone change handler ──────────────────────────────────────────────────────

  _onZoneChanged(zoneId) {
    this._currentZone = zoneId;

    // Tear down all hazards from the old zone
    this._clearHazards();

    // Spawn unconditional hazards for this zone
    this._spawnRattlesnakes(zoneId);

    // Spawn phase-gated hazards based on the current phase at transition time
    const phase = this._scene.registry.get('stormPhase') ?? 1;
    this._checkPhaseSpawns(phase);
  }

  // ── Phase change handler ──────────────────────────────────────────────────────

  /**
   * Called when stormPhase changes. Spawns any hazards whose phase threshold
   * has just been crossed, provided we're in the right zone.
   *
   * Idempotent: if a hazard type is already spawned, _checkPhaseSpawns won't
   * re-spawn it (guarded by _looptersSpawned / _powerLinesSpawned flags).
   */
  _checkPhaseSpawns(phase) {
    if (this._currentZone !== 1) return;

    if (phase >= 2 && !this._lootersSpawned) {
      this._spawnLooters();
    }

    if (phase >= 3 && !this._powerLinesSpawned) {
      this._spawnPowerLines();
    }

    if (phase >= 3 && !this._floodZonesSpawned) {
      this._spawnFloodZones();
    }
  }

  // ── Rattlesnake spawning ──────────────────────────────────────────────────────

  _spawnRattlesnakes(zoneId) {
    const positions = RATTLESNAKE_SPAWNS[zoneId];
    if (!positions) return;

    for (const { x, y } of positions) {
      this._hazards.push(new Rattlesnake(this._scene, x, y));
    }
  }

  // ── Looter spawning ───────────────────────────────────────────────────────────

  _spawnLooters() {
    this._lootersSpawned = true;

    for (const patrol of LOOTER_PATROLS) {
      const looter = new Looter(
        this._scene,
        patrol.ax, patrol.ay,
        patrol.bx, patrol.by,
      );
      this._hazards.push(looter);
    }

    // Notify the player — phase-appropriate toast
    this._scene.registry.set('hudToast', 'LOOTERS ACTIVE — stay alert|' + Date.now());
  }

  // ── Power line spawning ───────────────────────────────────────────────────────

  _spawnPowerLines() {
    this._powerLinesSpawned = true;

    for (const { x, y } of POWERLINE_SPAWNS) {
      this._hazards.push(new PowerLine(this._scene, x, y));
    }

    this._scene.registry.set('hudToast', 'POWER LINES DOWN — avoid sparks|' + Date.now());
  }

  // ── Flood zone spawning ───────────────────────────────────────────────────────

  _spawnFloodZones() {
    this._floodZonesSpawned = true;

    for (const { x, y, w, h } of FLOOD_ZONES) {
      this._hazards.push(new FloodZone(this._scene, x, y, w, h));
    }

    this._scene.registry.set('hudToast', 'ROADS FLOODING — movement slowed|' + Date.now());
  }

  // ── Collision routing ─────────────────────────────────────────────────────────

  /**
   * Registers Matter.js collision handlers for all hazard body labels.
   * Call once from GameScene.addCollisions().
   *
   * Pattern: match on gameObjectB.label (the non-player body) — consistent
   * with the existing onPlayerCollide pattern in game.js.
   *
   * @param {Phaser.Scene} scene — the GameScene (same as this._scene)
   */
  addCollisions(scene) {
    scene.matterCollision.addOnCollideStart({
      objectA: scene.player.sprite,
      callback: ({ gameObjectB, bodyB }) => {
        if (!bodyB) return;
        const label = bodyB.label;

        switch (label) {
          case 'rattlesnake':
            this._onHazardHit(scene);
            break;

          case 'rattlesnake_warn': {
            const snake = bodyB.hazardRef;
            snake?.onNearMiss?.();
            break;
          }

          case 'looter':
            this._onHazardHit(scene);
            break;

          case 'looter_warn': {
            const looter = bodyB.hazardRef;
            looter?.onNearMiss?.();
            break;
          }

          case 'powerline_hit':
            this._onHazardHit(scene);
            break;

          case 'powerline_warn': {
            const line = bodyB.hazardRef;
            line?.onNearMiss?.();
            break;
          }

          default:
            break;
        }
      },
      context: this,
    });
  }

  // ── Damage helper ─────────────────────────────────────────────────────────────

  /**
   * Applies 1 HP damage to the player via the standard restartScene() path.
   * Screen flash (red) + shake precede the actual restart to make the hit
   * feel impactful before the scene cuts to black.
   */
  _onHazardHit(scene) {
    if (scene.player.invincible) return;

    scene.cameras.main.flash(120, 0xff, 0x00, 0x00);
    scene.cameras.main.shake(180, 0.012);
    scene.player.explosion();
    scene.restartScene();
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  /** Destroy all live hazard instances without removing the manager itself. */
  _clearHazards() {
    for (const h of this._hazards) h.destroy?.();
    this._hazards = [];

    // Reset spawn flags so re-entering the zone re-evaluates phase conditions
    this._lootersSpawned    = false;
    this._powerLinesSpawned = false;
    this._floodZonesSpawned = false;
  }

  /** Full teardown — called on scene shutdown. */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this._scene.registry.events.off('changedata-stormPhase', this._onPhaseChange, this);
    this._scene.events.off('zoneChanged', this._onZoneChanged, this);

    this._clearHazards();
    this._scene = null;
  }
}
