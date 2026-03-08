/**
 * ZoneManager
 *
 * Manages the active zone: loads a Tiled JSON tilemap, renders its tile layers,
 * sets up Matter.js collision on impassable tiles, and spawns all world objects
 * (containers, workbench, rocket) from the Tiled object layer.
 *
 * Supports zone transitions: destroyCurrentZone() tears down the active zone,
 * then loadZone(id, sourceId) builds the next one with the correct entry point.
 *
 * Public surface for game.js:
 *   zone.currentZoneId          — currently active zone number
 *   zone.containers             — SearchableContainer[]
 *   zone.workbench              — Workbench | null
 *   zone.rocket                 — Rocket | null
 *   zone.exits                  — ExitDescriptor[] (for per-frame overlap checks)
 *   zone.getSpawnPoint()        → { x, y }   initial spawn (first run / fallback)
 *   zone.getEntryPoint(fromId)  → { x, y }   where to appear after a transition
 *   zone.getBounds()            → { width, height }
 *   zone.destroyCurrentZone()   — teardown before loading the next zone
 */

import SearchableContainer from './searchable_container';
import Workbench           from './workbench';
import Rocket              from './rocket';

// ── Zone catalogue ─────────────────────────────────────────────────────────────
//
// entryPoints:  key = sourceZoneId the player is arriving FROM.
//               value = pixel { x, y } where the player materialises in THIS zone.
//
//   Chosen so the player appears just inside the passable corridor that connects
//   the two zones, close enough to the edge to feel like they just crossed over.

const ZONES = {
  0: {
    name:        'Cypress Creek Preserve',
    mapKey:      'zone0',
    tileKey:     'swamp-tiles',
    tilesetName: 'swamp',
    entryPoints: {
      // Arriving from Zone 1 (south exit) → appear near south trail, row 55
      1: { x: 40 * 48, y: 55 * 48 },
      // Arriving from Zone 3 (west exit) → appear near west trail, col 4
      3: { x:  4 * 48, y: 30 * 48 },
    },
  },
  1: {
    name:        'US-41 Corridor (placeholder)',
    mapKey:      'zone1',
    tileKey:     'swamp-tiles',
    tilesetName: 'swamp',
    entryPoints: {
      // Arriving from Zone 0 (north exit) → appear row 5 of Zone 1
      0: { x: 40 * 48, y: 5 * 48 },
      // Arriving from Zone 4 (south exit) → appear near south trail, row 55
      4: { x: 40 * 48, y: 55 * 48 },
    },
  },
};

// ── ZoneManager ────────────────────────────────────────────────────────────────

export default class ZoneManager {
  constructor(scene) {
    this.scene = scene;

    // Exposed world objects (populated/cleared on each loadZone call)
    this.containers    = [];
    this.workbench     = null;
    this.rocket        = null;

    /**
     * Exit descriptors parsed from the Tiled object layer.
     * Each entry: { x, y, width, height, targetZone }
     * game.js checks player overlap each frame.
     */
    this.exits = [];

    this.map           = null;
    this.currentZoneId = null;

    this.loadZone(0);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Where the player spawns at the very start of a run (or on death-restart).
   * Reads the 'spawn' object from the Tiled object layer; falls back to map centre.
   */
  getSpawnPoint() {
    return this._spawnPoint ?? {
      x: this.map.widthInPixels  / 2,
      y: this.map.heightInPixels / 2,
    };
  }

  /**
   * Where the player materialises when arriving via a zone transition.
   * @param {number} sourceZoneId — the zone the player is travelling FROM.
   * @returns {{ x: number, y: number }}
   */
  getEntryPoint(sourceZoneId) {
    const config = ZONES[this.currentZoneId];
    return config?.entryPoints?.[sourceZoneId] ?? this.getSpawnPoint();
  }

  /** Full pixel dimensions — use for camera bounds. */
  getBounds() {
    return {
      width:  this.map.widthInPixels,
      height: this.map.heightInPixels,
    };
  }

  // ── Zone lifecycle ──────────────────────────────────────────────────────────

  /**
   * Tear down everything belonging to the current zone.
   * Must be called before loadZone() when switching zones.
   */
  destroyCurrentZone() {
    this.containers.forEach(c => c.destroy());
    this.workbench?.destroy();
    this.rocket?.destroy();

    // Phaser tilemap destroy removes all layers and their physics bodies
    this.map?.destroy();

    this.containers = [];
    this.workbench  = null;
    this.rocket     = null;
    this.exits      = [];
    this.map        = null;
  }

  /**
   * Load a zone by ID, optionally knowing the source zone for entry-point selection.
   * If switching zones (not the first load), call destroyCurrentZone() first.
   *
   * @param {number} zoneId
   * @param {number} [sourceZoneId] — where the player is arriving from (for entry points)
   */
  loadZone(zoneId, sourceZoneId = null) {
    const config = ZONES[zoneId];
    if (!config) throw new Error(`ZoneManager: zone ${zoneId} is not defined`);

    this.currentZoneId = zoneId;
    this.zoneName      = config.name;

    this._buildTilemap(config);
    this._spawnObjects();
  }

  // ── Tilemap construction ────────────────────────────────────────────────────

  _buildTilemap({ mapKey, tileKey, tilesetName }) {
    this.map = this.scene.make.tilemap({ key: mapKey });

    const tileset = this.map.addTilesetImage(tilesetName, tileKey);

    // Ground layer — static rendering only, no physics
    const groundLayer = this.map.createLayer('ground', tileset, 0, 0);
    groundLayer.setDepth(0);

    // Obstacles layer — rendered + Matter.js static bodies for impassable tiles
    const obstacleLayer = this.map.createLayer('obstacles', tileset, 0, 0);
    obstacleLayer.setDepth(1);
    obstacleLayer.setCollisionByProperty({ impassable: true });
    this.scene.matter.world.convertTilemapLayer(obstacleLayer);
  }

  // ── Object layer ────────────────────────────────────────────────────────────

  _spawnObjects() {
    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) {
      console.warn(`ZoneManager: no "objects" layer in zone ${this.currentZoneId}`);
      return;
    }

    this.containers  = [];
    this.workbench   = null;
    this.rocket      = null;
    this.exits       = [];
    this._spawnPoint = null;

    for (const obj of objectLayer.objects) {
      // Tiled objects store top-left corner; game objects expect centre coords.
      const cx = obj.x + (obj.width  ?? 48) / 2;
      const cy = obj.y + (obj.height ?? 48) / 2;

      switch (obj.type) {
        case 'container': {
          const table = this._getProp(obj, 'table') ?? 'default';
          this.containers.push(new SearchableContainer(this.scene, cx, cy, table));
          break;
        }
        case 'workbench':
          this.workbench = new Workbench(this.scene, cx, cy);
          break;

        case 'rocket':
          this.rocket = new Rocket(this.scene, cx, cy);
          break;

        case 'spawn':
          this._spawnPoint = { x: cx, y: cy };
          break;

        case 'exit':
          // Store rectangle + target for per-frame overlap checks in game.js
          this.exits.push({
            x:          obj.x,
            y:          obj.y,
            width:      obj.width  ?? 48,
            height:     obj.height ?? 48,
            targetZone: this._getProp(obj, 'targetZone'),
          });
          break;

        case 'entry':
          // Entry points are handled via ZONES.entryPoints; object is informational only.
          break;

        default:
          console.warn(`ZoneManager: unknown object type "${obj.type}" (id ${obj.id})`);
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Read a named property from a Tiled object's properties array. */
  _getProp(obj, name) {
    return obj.properties?.find(p => p.name === name)?.value ?? null;
  }
}
