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
import NPC                 from './npc';

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
      // Arriving from Zone 1 (south exit) → appear on south trail, row 52.
      // Row 55 (y=2640) was only 96px north of the south exit trigger (y=2736);
      // row 52 (y=2496) gives comfortable clearance while still feeling southerly.
      1: { x: 40 * 48, y: 52 * 48 },
      // Arriving from Zone 3 (west exit) → appear near west trail, col 4
      3: { x:  4 * 48, y: 30 * 48 },
    },
  },
  1: {
    name:        'US-41 Corridor',
    mapKey:      'zone1',
    tileKey:     'us41-tiles',
    tilesetName: 'us41',
    entryPoints: {
      // Arriving from Zone 0 (north) → appear on highway, well south of north exit
      // trigger (y=0–144). Row 5 (y=240) was only 96px from the trigger; row 12
      // (y=576) gives comfortable clearance and drops the player into the main
      // commercial area rather than right at the border fence.
      0: { x: 40 * 48, y: 12 * 48 },
      // Arriving from Zone 4 (south) → appear on highway just north of south corridor
      4: { x: 40 * 48, y: 54 * 48 },
      // Arriving from Zone 2 (east) → appear in east parking lot near east exit
      2: { x: 75 * 48, y: 30 * 48 },
    },
  },
  2: {
    name:        'Collier Commons',
    mapKey:      'zone2',
    tileKey:     'collier-tiles',
    tilesetName: 'collier',
    entryPoints: {
      // Arriving from Zone 1 (west exit at rows 25-35) → col 4, row 30
      1: { x: 4 * 48, y: 30 * 48 },
    },
  },
  3: {
    name:        'Conner Preserve',
    mapKey:      'zone3',
    tileKey:     'conner-tiles',
    tilesetName: 'conner',
    entryPoints: {
      // Arriving from Zone 0 (east at cols 77-79, rows 26-34) → col 75, row 30
      0: { x: 75 * 48, y: 30 * 48 },
    },
  },
  4: {
    name:        'LOLHS / SR-54',
    mapKey:      'zone4',
    tileKey:     'lolhs-tiles',
    tilesetName: 'lolhs',
    entryPoints: {
      // Arriving from Zone 1 (south exit at cols 34-46, rows 57-59) → col 40, row 10
      1: { x: 40 * 48, y: 10 * 48 },
    },
  },
};

/** Returns true if a zone ID is defined and loadable. Used by game.js. */
export function isZoneDefined(zoneId) {
  return zoneId in ZONES;
}

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
    for (const npc of this.npcs ?? []) npc.destroy?.();
    this.npcs = [];

    // Phaser's Tilemap.destroy() removes TilemapLayer game objects but does
    // NOT call MatterTileBody.destroy() on individual tiles. The static
    // Matter.js bodies survive in the physics world as invisible colliders,
    // blocking the player in the next zone (root cause of bug #27).
    // We must explicitly remove them before destroying the map.
    this._removeTileBodies();

    this.map?.destroy();

    this.containers = [];
    this.workbench  = null;
    this.rocket     = null;
    this.npcs       = [];
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
    this.npcs        = [];
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

        case 'npc': {
          const npcId = this._getProp(obj, 'npcId');
          if (npcId) {
            if (!this.npcs) this.npcs = [];
            this.npcs.push(new NPC(this.scene, cx, cy, npcId));
          }
          break;
        }

        case 'entry':
          // Entry points are handled via ZONES.entryPoints; object is informational only.
          break;

        default:
          console.warn(`ZoneManager: unknown object type "${obj.type}" (id ${obj.id})`);
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Remove all Matter.js bodies that convertTilemapLayer() attached to tiles.
   *
   * Phaser's TilemapLayer.destroy() does NOT clean these up — the static bodies
   * linger in the Matter world and collide with the player in the next zone.
   * Each colliding tile stores its body at tile.physics.matterBody; calling
   * .destroy() on it removes the body from the world.
   */
  _removeTileBodies() {
    if (!this.map) return;

    for (const layerData of this.map.layers) {
      for (const row of layerData.data) {
        for (const tile of row) {
          if (tile?.physics?.matterBody) {
            tile.physics.matterBody.destroy();
          }
        }
      }
    }
  }

  /** Read a named property from a Tiled object's properties array. */
  _getProp(obj, name) {
    return obj.properties?.find(p => p.name === name)?.value ?? null;
  }
}
