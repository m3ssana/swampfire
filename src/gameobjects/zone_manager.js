/**
 * ZoneManager
 *
 * Manages the active zone and provides its tilemap dimensions, spawn point,
 * and camera bounds to the Game scene.
 *
 * Zone 0 is a blank placeholder (Cypress Creek Preserve).
 * No tile rendering — just a correctly-dimensioned Phaser tilemap so the
 * rest of the scene (camera, player spawn) has real pixel measurements to
 * work with. Tile content and physics will be layered in during Phase 3.
 */

const TILE_SIZE = 48; // pixels per tile (matches legacy tileset grid)

const ZONES = {
  0: {
    name: "Cypress Creek Preserve",
    widthInTiles: 80,
    heightInTiles: 60,
  },
};

export default class ZoneManager {
  constructor(scene) {
    this.scene = scene;
    this.currentZoneId = null;
    this.map = null;
    this.zoneName = null;

    this.loadZone(0);
  }

  /**
   * Load (or switch to) a zone by ID.
   * Creates a blank Phaser tilemap with the correct dimensions.
   */
  loadZone(zoneId) {
    const config = ZONES[zoneId];
    if (!config) throw new Error(`ZoneManager: zone ${zoneId} is not defined`);

    this.currentZoneId = zoneId;
    this.zoneName = config.name;

    this.map = this.scene.make.tilemap({
      width: config.widthInTiles,
      height: config.heightInTiles,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
  }

  /** Center of the current zone in world pixels. */
  getSpawnPoint() {
    return {
      x: this.map.widthInPixels / 2,
      y: this.map.heightInPixels / 2,
    };
  }

  /** Full pixel dimensions — use for camera bounds. */
  getBounds() {
    return {
      width: this.map.widthInPixels,
      height: this.map.heightInPixels,
    };
  }
}
