/**
 * Zone Tilemap Data Integrity Tests
 *
 * Parses the actual Tiled JSON files and verifies:
 * - Exit objects exist with correct targetZone values
 * - Exit corridors are free of impassable obstacle tiles
 * - Entry points have sufficient clearance from exit triggers
 *
 * This catches map-editor mistakes that could silently break transitions.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const MAPS_DIR = resolve(import.meta.dirname, '../public/assets/maps');

function loadZoneMap(filename) {
  return JSON.parse(readFileSync(resolve(MAPS_DIR, filename), 'utf-8'));
}

function getObjectsByType(mapData, type) {
  const layer = mapData.layers.find(l => l.type === 'objectgroup');
  if (!layer) return [];
  return layer.objects.filter(o => o.type === type);
}

function getProp(obj, name) {
  return obj.properties?.find(p => p.name === name)?.value ?? null;
}

function getImpassableTileGIDs(mapData) {
  const gids = new Set();
  for (const ts of mapData.tilesets) {
    for (const tile of (ts.tiles ?? [])) {
      const props = Object.fromEntries((tile.properties ?? []).map(p => [p.name, p.value]));
      if (props.impassable) {
        gids.add(ts.firstgid + tile.id);
      }
    }
  }
  return gids;
}

function getObstacleLayer(mapData) {
  return mapData.layers.find(l => l.name === 'obstacles' && l.type === 'tilelayer');
}

const VALID_LOOT_TABLES = new Set(['default', 'toolbox', 'cooler', 'backpack', 'crate']);

// ── Zone 1 tests (the zone where bug #27 manifests) ────────────────────────

describe('Zone 1 tilemap (zone1.json)', () => {
  let mapData;
  let exits;
  let impassableGIDs;

  beforeAll(() => {
    mapData = loadZoneMap('zone1.json');
    exits = getObjectsByType(mapData, 'exit');
    impassableGIDs = getImpassableTileGIDs(mapData);
  });

  it('has a north exit targeting Zone 0', () => {
    const northExit = exits.find(e => getProp(e, 'targetZone') === 0);
    expect(northExit).toBeDefined();
    expect(northExit.y).toBe(0);           // at top of map
    expect(northExit.width).toBeGreaterThan(0);
    expect(northExit.height).toBeGreaterThan(0);
  });

  it('north exit targetZone is numeric (not string)', () => {
    const northExit = exits.find(e => e.name?.includes('zone0'));
    expect(typeof getProp(northExit, 'targetZone')).toBe('number');
  });

  it('north exit corridor is free of impassable obstacle tiles', () => {
    const northExit = exits.find(e => getProp(e, 'targetZone') === 0);
    const obsLayer = getObstacleLayer(mapData);
    const tw = mapData.tilewidth;
    const th = mapData.tileheight;
    const mapW = mapData.width;

    // Check every tile cell that falls within the exit rectangle
    const colStart = Math.ceil(northExit.x / tw);
    const colEnd   = Math.floor((northExit.x + northExit.width) / tw) - 1;
    const rowStart = Math.ceil(northExit.y / th);
    const rowEnd   = Math.floor((northExit.y + northExit.height) / th) - 1;

    const blockers = [];
    for (let row = rowStart; row <= rowEnd; row++) {
      for (let col = colStart; col <= colEnd; col++) {
        const tileGID = obsLayer.data[row * mapW + col];
        if (impassableGIDs.has(tileGID)) {
          blockers.push({ row, col, x: col * tw, y: row * th, tileGID });
        }
      }
    }

    expect(blockers).toEqual([]);
  });

  it('entry point from Zone 0 is NOT inside any exit rectangle', () => {
    const entryX = 40 * 48;   // 1920 — from ZONES config
    const entryY = 12 * 48;   // 576

    for (const exit of exits) {
      const inside = entryX >= exit.x && entryX <= exit.x + exit.width &&
                     entryY >= exit.y && entryY <= exit.y + exit.height;
      expect(inside, `entry (${entryX},${entryY}) is inside exit "${exit.name}"`).toBe(false);
    }
  });
});

// ── Zone 0 tests ────────────────────────────────────────────────────────────

describe('Zone 0 tilemap (zone0.json)', () => {
  let mapData;
  let exits;
  let impassableGIDs;

  beforeAll(() => {
    mapData = loadZoneMap('zone0.json');
    exits = getObjectsByType(mapData, 'exit');
    impassableGIDs = getImpassableTileGIDs(mapData);
  });

  it('has a south exit targeting Zone 1', () => {
    const southExit = exits.find(e => getProp(e, 'targetZone') === 1);
    expect(southExit).toBeDefined();
    expect(southExit.width).toBeGreaterThan(0);
    expect(southExit.height).toBeGreaterThan(0);
  });

  it('south exit corridor is free of impassable obstacle tiles', () => {
    const southExit = exits.find(e => getProp(e, 'targetZone') === 1);
    const obsLayer = getObstacleLayer(mapData);
    const tw = mapData.tilewidth;
    const th = mapData.tileheight;
    const mapW = mapData.width;

    const colStart = Math.ceil(southExit.x / tw);
    const colEnd   = Math.floor((southExit.x + southExit.width) / tw) - 1;
    const rowStart = Math.ceil(southExit.y / th);
    const rowEnd   = Math.floor((southExit.y + southExit.height) / th) - 1;

    const blockers = [];
    for (let row = rowStart; row <= rowEnd; row++) {
      for (let col = colStart; col <= colEnd; col++) {
        const tileGID = obsLayer.data[row * mapW + col];
        if (impassableGIDs.has(tileGID)) {
          blockers.push({ row, col, x: col * tw, y: row * th, tileGID });
        }
      }
    }

    expect(blockers).toEqual([]);
  });

  it('entry point from Zone 1 is NOT inside any exit rectangle', () => {
    const entryX = 40 * 48;   // 1920
    const entryY = 52 * 48;   // 2496

    for (const exit of exits) {
      const inside = entryX >= exit.x && entryX <= exit.x + exit.width &&
                     entryY >= exit.y && entryY <= exit.y + exit.height;
      expect(inside, `entry (${entryX},${entryY}) is inside exit "${exit.name}"`).toBe(false);
    }
  });
});

// ── Zone 2 tests (Collier Commons) ──────────────────────────────────────────

describe('Zone 2 tilemap (zone2.json)', () => {
  let mapData;
  let exits;
  let containers;
  let impassableGIDs;

  beforeAll(() => {
    mapData = loadZoneMap('zone2.json');
    exits = getObjectsByType(mapData, 'exit');
    containers = getObjectsByType(mapData, 'container');
    impassableGIDs = getImpassableTileGIDs(mapData);
  });

  it('JSON file parses without error', () => {
    expect(mapData).toBeDefined();
    expect(typeof mapData).toBe('object');
  });

  it('map dimensions are 80x60 tiles', () => {
    expect(mapData.width).toBe(80);
    expect(mapData.height).toBe(60);
  });

  it('has exactly 3 layers: ground (tilelayer), obstacles (tilelayer), objects (objectgroup)', () => {
    expect(mapData.layers).toHaveLength(3);
    expect(mapData.layers[0].name).toBe('ground');
    expect(mapData.layers[0].type).toBe('tilelayer');
    expect(mapData.layers[1].name).toBe('obstacles');
    expect(mapData.layers[1].type).toBe('tilelayer');
    expect(mapData.layers[2].name).toBe('objects');
    expect(mapData.layers[2].type).toBe('objectgroup');
  });

  it('tileset name is "collier"', () => {
    expect(mapData.tilesets[0].name).toBe('collier');
  });

  it('has at least one spawn object', () => {
    const spawns = getObjectsByType(mapData, 'spawn');
    expect(spawns.length).toBeGreaterThanOrEqual(1);
  });

  it('has exactly 1 exit targeting Zone 1', () => {
    expect(exits).toHaveLength(1);
    expect(getProp(exits[0], 'targetZone')).toBe(1);
  });

  it('exit targetZone is numeric (not string)', () => {
    expect(typeof getProp(exits[0], 'targetZone')).toBe('number');
  });

  it('has exactly 20 containers', () => {
    expect(containers).toHaveLength(20);
  });

  it('all containers have a valid loot table value', () => {
    for (const c of containers) {
      const table = getProp(c, 'table') ?? 'default';
      expect(VALID_LOOT_TABLES.has(table), `container "${c.name}" has invalid table "${table}"`).toBe(true);
    }
  });

  it('exit corridor tiles (cols 0-2, rows 25-35) are passable in the obstacles layer', () => {
    const obsLayer = getObstacleLayer(mapData);
    const mapW = mapData.width;

    const blockers = [];
    for (let row = 25; row <= 35; row++) {
      for (let col = 0; col <= 2; col++) {
        const gid = obsLayer.data[row * mapW + col];
        if (gid !== 0) {
          blockers.push({ row, col, gid, impassable: impassableGIDs.has(gid) });
        }
      }
    }

    expect(blockers).toEqual([]);
  });
});

// ── Zone 3 tests (Conner Preserve) ──────────────────────────────────────────

describe('Zone 3 tilemap (zone3.json)', () => {
  let mapData;
  let exits;
  let containers;
  let impassableGIDs;

  beforeAll(() => {
    mapData = loadZoneMap('zone3.json');
    exits = getObjectsByType(mapData, 'exit');
    containers = getObjectsByType(mapData, 'container');
    impassableGIDs = getImpassableTileGIDs(mapData);
  });

  it('JSON file parses without error', () => {
    expect(mapData).toBeDefined();
    expect(typeof mapData).toBe('object');
  });

  it('map dimensions are 80x60 tiles', () => {
    expect(mapData.width).toBe(80);
    expect(mapData.height).toBe(60);
  });

  it('has exactly 3 layers: ground (tilelayer), obstacles (tilelayer), objects (objectgroup)', () => {
    expect(mapData.layers).toHaveLength(3);
    expect(mapData.layers[0].name).toBe('ground');
    expect(mapData.layers[0].type).toBe('tilelayer');
    expect(mapData.layers[1].name).toBe('obstacles');
    expect(mapData.layers[1].type).toBe('tilelayer');
    expect(mapData.layers[2].name).toBe('objects');
    expect(mapData.layers[2].type).toBe('objectgroup');
  });

  it('tileset name is "conner"', () => {
    expect(mapData.tilesets[0].name).toBe('conner');
  });

  it('has at least one spawn object', () => {
    const spawns = getObjectsByType(mapData, 'spawn');
    expect(spawns.length).toBeGreaterThanOrEqual(1);
  });

  it('has exactly 1 exit targeting Zone 0', () => {
    expect(exits).toHaveLength(1);
    expect(getProp(exits[0], 'targetZone')).toBe(0);
  });

  it('exit targetZone is numeric (not string)', () => {
    expect(typeof getProp(exits[0], 'targetZone')).toBe('number');
  });

  it('has exactly 17 containers', () => {
    expect(containers).toHaveLength(17);
  });

  it('all containers have a valid loot table value', () => {
    for (const c of containers) {
      const table = getProp(c, 'table') ?? 'default';
      expect(VALID_LOOT_TABLES.has(table), `container "${c.name}" has invalid table "${table}"`).toBe(true);
    }
  });

  it('exit corridor tiles (cols 77-79, rows 26-34) are passable in the obstacles layer', () => {
    const obsLayer = getObstacleLayer(mapData);
    const mapW = mapData.width;

    const blockers = [];
    for (let row = 26; row <= 34; row++) {
      for (let col = 77; col <= 79; col++) {
        const gid = obsLayer.data[row * mapW + col];
        if (gid !== 0) {
          blockers.push({ row, col, gid, impassable: impassableGIDs.has(gid) });
        }
      }
    }

    expect(blockers).toEqual([]);
  });
});

// ── Zone 4 tests (LOLHS / SR-54) ────────────────────────────────────────────

describe('Zone 4 tilemap (zone4.json)', () => {
  let mapData;
  let exits;
  let containers;
  let impassableGIDs;

  beforeAll(() => {
    mapData = loadZoneMap('zone4.json');
    exits = getObjectsByType(mapData, 'exit');
    containers = getObjectsByType(mapData, 'container');
    impassableGIDs = getImpassableTileGIDs(mapData);
  });

  it('JSON file parses without error', () => {
    expect(mapData).toBeDefined();
    expect(typeof mapData).toBe('object');
  });

  it('map dimensions are 80x60 tiles', () => {
    expect(mapData.width).toBe(80);
    expect(mapData.height).toBe(60);
  });

  it('has exactly 3 layers: ground (tilelayer), obstacles (tilelayer), objects (objectgroup)', () => {
    expect(mapData.layers).toHaveLength(3);
    expect(mapData.layers[0].name).toBe('ground');
    expect(mapData.layers[0].type).toBe('tilelayer');
    expect(mapData.layers[1].name).toBe('obstacles');
    expect(mapData.layers[1].type).toBe('tilelayer');
    expect(mapData.layers[2].name).toBe('objects');
    expect(mapData.layers[2].type).toBe('objectgroup');
  });

  it('tileset name is "lolhs"', () => {
    expect(mapData.tilesets[0].name).toBe('lolhs');
  });

  it('has at least one spawn object', () => {
    const spawns = getObjectsByType(mapData, 'spawn');
    expect(spawns.length).toBeGreaterThanOrEqual(1);
  });

  it('has exactly 1 exit targeting Zone 1', () => {
    expect(exits).toHaveLength(1);
    expect(getProp(exits[0], 'targetZone')).toBe(1);
  });

  it('exit targetZone is numeric (not string)', () => {
    expect(typeof getProp(exits[0], 'targetZone')).toBe('number');
  });

  it('has exactly 19 containers', () => {
    expect(containers).toHaveLength(19);
  });

  it('all containers have a valid loot table value', () => {
    for (const c of containers) {
      const table = getProp(c, 'table') ?? 'default';
      expect(VALID_LOOT_TABLES.has(table), `container "${c.name}" has invalid table "${table}"`).toBe(true);
    }
  });

  it('exit corridor tiles (cols 34-46, rows 0-2) are passable in the obstacles layer', () => {
    const obsLayer = getObstacleLayer(mapData);
    const mapW = mapData.width;

    const blockers = [];
    for (let row = 0; row <= 2; row++) {
      for (let col = 34; col <= 46; col++) {
        const gid = obsLayer.data[row * mapW + col];
        if (gid !== 0) {
          blockers.push({ row, col, gid, impassable: impassableGIDs.has(gid) });
        }
      }
    }

    expect(blockers).toEqual([]);
  });
});
