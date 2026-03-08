/**
 * ZoneManager
 *
 * Manages the active zone: loads a Tiled JSON tilemap, renders its tile layers,
 * sets up Matter.js collision on impassable tiles, and spawns all world objects
 * (containers, workbench, rocket) from the Tiled object layer.
 *
 * Public surface for game.js:
 *   zone.containers   — SearchableContainer[]
 *   zone.workbench    — Workbench
 *   zone.rocket       — Rocket
 *   zone.getSpawnPoint() → { x, y }
 *   zone.getBounds()     → { width, height }
 */

import SearchableContainer from './searchable_container';
import Workbench           from './workbench';
import Rocket              from './rocket';

// Zone metadata — dimensions must match the generated tilemap.
const ZONES = {
  0: {
    name:    'Cypress Creek Preserve',
    mapKey:  'zone0',      // key loaded in bootloader: this.load.tilemapTiledJSON('zone0', ...)
    tileKey: 'swamp-tiles', // key loaded in bootloader: this.load.image('swamp-tiles', ...)
    tilesetName: 'swamp',  // name field in the Tiled JSON tileset object
  },
};

export default class ZoneManager {
  constructor(scene) {
    this.scene = scene;

    // Exposed world objects (populated by loadZone)
    this.containers = [];
    this.workbench  = null;
    this.rocket     = null;

    // Phaser tilemap reference
    this.map = null;

    this.loadZone(0);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Center spawn point of the current zone (from Tiled 'spawn' object, or map center). */
  getSpawnPoint() {
    return this._spawnPoint ?? {
      x: this.map.widthInPixels  / 2,
      y: this.map.heightInPixels / 2,
    };
  }

  /** Full pixel dimensions — use for camera bounds. */
  getBounds() {
    return {
      width:  this.map.widthInPixels,
      height: this.map.heightInPixels,
    };
  }

  // ── Zone loading ───────────────────────────────────────────────────────────

  /**
   * Load (or switch to) a zone by ID.
   * Creates the tilemap, renders layers, sets up collision, and spawns objects.
   */
  loadZone(zoneId) {
    const config = ZONES[zoneId];
    if (!config) throw new Error(`ZoneManager: zone ${zoneId} is not defined`);

    this.currentZoneId = zoneId;
    this.zoneName      = config.name;

    this._buildTilemap(config);
    this._spawnObjects();
  }

  // ── Tilemap construction ───────────────────────────────────────────────────

  _buildTilemap({ mapKey, tileKey, tilesetName }) {
    // Load the Tiled JSON into a Phaser Tilemap
    this.map = this.scene.make.tilemap({ key: mapKey });

    // Register the tileset image with the tilemap
    const tileset = this.map.addTilesetImage(tilesetName, tileKey);

    // Ground layer — static rendering, no physics needed
    const groundLayer = this.map.createLayer('ground', tileset, 0, 0);
    groundLayer.setDepth(0);

    // Obstacles layer — rendered above ground, with Matter physics bodies
    const obstacleLayer = this.map.createLayer('obstacles', tileset, 0, 0);
    obstacleLayer.setDepth(1);

    // Mark tiles that have the 'impassable' custom property for collision
    obstacleLayer.setCollisionByProperty({ impassable: true });

    // Convert colliding tiles to Matter.js static bodies
    this.scene.matter.world.convertTilemapLayer(obstacleLayer);
  }

  // ── Object layer ───────────────────────────────────────────────────────────

  _spawnObjects() {
    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) {
      console.warn('ZoneManager: no "objects" layer found in tilemap');
      return;
    }

    this.containers = [];
    this.workbench  = null;
    this.rocket     = null;
    this._spawnPoint = null;

    for (const obj of objectLayer.objects) {
      // Tiled objects use top-left corner; game objects expect center coords.
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
          // Exit zones handled in Phase 3.2 (zone transitions)
          break;

        default:
          console.warn(`ZoneManager: unknown object type "${obj.type}" (id ${obj.id})`);
      }
    }

    if (!this.workbench) console.warn('ZoneManager: no workbench object in tilemap');
    if (!this.rocket)    console.warn('ZoneManager: no rocket object in tilemap');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Read a named property from a Tiled object's properties array. */
  _getProp(obj, name) {
    return obj.properties?.find(p => p.name === name)?.value ?? null;
  }
}
