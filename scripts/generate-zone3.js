#!/usr/bin/env node
/**
 * Generates Zone 3 (Conner Preserve) tilemap JSON.
 *
 * Output: public/assets/maps/zone3.json
 *
 * Map: 80 × 60 tiles, 48 px/tile → 3840 × 2880 world pixels
 *
 * Tileset (GIDs reference conner-tiles.png, 8 tiles wide):
 *   GID 1  — Pine needle ground  (passable)
 *   GID 2  — Marsh grass         (passable)
 *   GID 3  — Pine tree           (impassable)
 *   GID 4  — RC runway dirt      (passable)
 *   GID 5  — Cypress slough      (impassable)
 *   GID 6  — Sandy clearing      (passable)
 *   GID 7  — Fire tower base     (impassable)
 *   GID 8  — Scrub brush         (passable, decorative)
 *
 * Exits:
 *   East → Zone 0 (Cypress Creek Preserve): cols 77-79, rows 26-34
 *
 * Run:  node scripts/generate-zone3.js
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Constants ─────────────────────────────────────────────────────────────────

const MAP_W   = 80;
const MAP_H   = 60;
const TILE_PX = 48;

const GID = {
  EMPTY:  0,
  PINE:   1,
  MARSH:  2,
  TREE:   3,
  RUNWAY: 4,
  SLOUGH: 5,
  SAND:   6,
  TOWER:  7,
  SCRUB:  8,
};

// ── Grid helpers ──────────────────────────────────────────────────────────────

function makeGrid(w, h, fill = GID.EMPTY) {
  return Array.from({ length: h }, () => new Array(w).fill(fill));
}

function set(grid, x, y, gid) {
  if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) grid[y][x] = gid;
}

function get(grid, x, y) {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return GID.EMPTY;
  return grid[y][x];
}

function fillRect(grid, x, y, w, h, gid) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      set(grid, x + dx, y + dy, gid);
}

function flatten(grid) {
  return grid.reduce((acc, row) => acc.concat(row), []);
}

// ── Layer grids ───────────────────────────────────────────────────────────────

const ground    = makeGrid(MAP_W, MAP_H, GID.PINE);  // base: pine needle ground
const obstacles = makeGrid(MAP_W, MAP_H, GID.EMPTY);

// ── Border (3-tile ring of PINE TREE, impassable) ────────────────────────────

for (let x = 0; x < MAP_W; x++) {
  for (let b = 0; b < 3; b++) {
    set(obstacles, x, b, GID.TREE);
    set(obstacles, x, MAP_H - 1 - b, GID.TREE);
  }
}
for (let y = 0; y < MAP_H; y++) {
  for (let b = 0; b < 3; b++) {
    set(obstacles, b, y, GID.TREE);
    set(obstacles, MAP_W - 1 - b, y, GID.TREE);
  }
}

// ── Open exit corridors ───────────────────────────────────────────────────────

// East → Zone 0: cols 77-79, rows 26-34
for (let x = 77; x <= 79; x++)
  for (let y = 26; y <= 34; y++) {
    set(obstacles, x, y, GID.EMPTY);
    set(ground,    x, y, GID.PINE);
  }

// ── Ground layout ─────────────────────────────────────────────────────────────

// Cypress slough band (cols 20-28, rows 8-52) — water in obstacles, marsh grass flanking
// Marsh grass flanking on ground (cols 16-19 and 29-33)
fillRect(ground, 16, 6, 4, 48, GID.MARSH);
fillRect(ground, 29, 6, 5, 48, GID.MARSH);

// RC Flying Field clearing (cols 32-72, rows 30-54)
fillRect(ground, 32, 30, 41, 25, GID.SAND);
// RC runway strip (cols 40-58, rows 35-52)
fillRect(ground, 40, 35, 19, 18, GID.RUNWAY);

// Fire tower sandy clearing base (cols 53-65, rows 5-22)
fillRect(ground, 53, 5, 13, 18, GID.SAND);

// Scrub brush decoration on ground
// Western strip scrub
fillRect(ground, 3, 20, 3, 20, GID.SCRUB);
// Northern interior scrub patches
fillRect(ground, 8,  6, 6, 5, GID.SCRUB);
fillRect(ground, 36,  4, 8, 4, GID.SCRUB);
// Eastern clearing edge scrub
fillRect(ground, 72, 30, 4, 12, GID.SCRUB);

// ── Obstacles ─────────────────────────────────────────────────────────────────

// Cypress slough water band (cols 20-28, rows 8-52)
fillRect(obstacles, 20, 8, 9, 45, GID.SLOUGH);

// Fire tower structure (cols 55-62, rows 6-20)
fillRect(obstacles, 55, 6, 8, 15, GID.TOWER);

// Dense pine forest clusters west of slough
// West edge cluster
fillRect(obstacles, 3, 6, 10, 6, GID.TREE);
fillRect(obstacles, 3, 15, 8, 8, GID.TREE);
fillRect(obstacles, 3, 38, 8, 10, GID.TREE);
// Mid-north cluster between slough and tower
fillRect(obstacles, 34, 4, 10, 4, GID.TREE);
// South border interior pines
fillRect(obstacles, 3, 54, 18, 3, GID.TREE);

// ── Building helper (for RC hangar) ───────────────────────────────────────────

function buildStore(x, y, w, h, entranceSide, entranceOffset, entranceWidth = 3) {
  fillRect(obstacles, x, y, w, 1, GID.TREE);
  fillRect(obstacles, x, y + h - 1, w, 1, GID.TREE);
  fillRect(obstacles, x, y, 1, h, GID.TREE);
  fillRect(obstacles, x + w - 1, y, 1, h, GID.TREE);

  const half = Math.floor(entranceWidth / 2);
  if (entranceSide === 'north') {
    for (let i = -half; i <= half; i++) set(obstacles, x + entranceOffset + i, y, GID.EMPTY);
  } else if (entranceSide === 'south') {
    for (let i = -half; i <= half; i++) set(obstacles, x + entranceOffset + i, y + h - 1, GID.EMPTY);
  } else if (entranceSide === 'east') {
    for (let i = -half; i <= half; i++) set(obstacles, x + w - 1, y + entranceOffset + i, GID.EMPTY);
  } else if (entranceSide === 'west') {
    for (let i = -half; i <= half; i++) set(obstacles, x, y + entranceOffset + i, GID.EMPTY);
  }

  fillRect(ground, x + 1, y + 1, w - 2, h - 2, GID.SAND);
}

// RC hangar building at south edge of field
buildStore(34, 50, 10, 7, 'north', 5);

// ── Objects layer ─────────────────────────────────────────────────────────────

let nextId = 1;
const oid = () => nextId++;
const T   = (col, row) => ({ x: col * TILE_PX, y: row * TILE_PX });

function container(tx, ty, table, storeName) {
  const { x, y } = T(tx, ty);
  return {
    id: oid(), name: `${storeName}_${tx}_${ty}`, type: 'container',
    x, y, width: 48, height: 48, rotation: 0, visible: true,
    properties: [{ name: 'table', type: 'string', value: table }],
  };
}

function exitZone(tx, ty, tw, th, target) {
  const { x, y } = T(tx, ty);
  return {
    id: oid(), name: `exit_to_zone${target}`, type: 'exit',
    x, y, width: tw * TILE_PX, height: th * TILE_PX, rotation: 0, visible: true,
    properties: [{ name: 'targetZone', type: 'int', value: target }],
  };
}

function entryPoint(tx, ty, fromZone) {
  const { x, y } = T(tx, ty);
  return {
    id: oid(), name: `entry_from_zone${fromZone}`, type: 'entry',
    x, y, width: 48, height: 48, rotation: 0, visible: true,
    properties: [{ name: 'fromZone', type: 'int', value: fromZone }],
  };
}

function spawnPoint(tx, ty) {
  const { x, y } = T(tx, ty);
  return {
    id: oid(), name: 'spawn', type: 'spawn',
    x, y, width: 48, height: 48, rotation: 0, visible: true,
    properties: [],
  };
}

const objects = [
  // ── Navigation ──────────────────────────────────────────────────────────────
  spawnPoint(68, 30),
  entryPoint(75, 30, 0),
  exitZone(77, 26, 3, 9, 0),

  // ── RC Field containers (~8) — backpack and default scattered around field ─
  container(36, 33, 'backpack', 'rcfield'),
  container(44, 33, 'default',  'rcfield'),
  container(52, 33, 'backpack', 'rcfield'),
  container(60, 33, 'default',  'rcfield'),
  container(36, 44, 'backpack', 'rcfield'),
  container(46, 46, 'default',  'rcfield'),
  container(54, 46, 'backpack', 'rcfield'),
  container(62, 46, 'default',  'rcfield'),

  // ── Fire Tower containers (~5) — crate and toolbox at tower base ──────────
  container(56, 22, 'crate',   'firetower'),
  container(60, 22, 'toolbox', 'firetower'),
  container(56, 25, 'crate',   'firetower'),
  container(60, 25, 'toolbox', 'firetower'),
  container(58, 28, 'crate',   'firetower'),

  // ── Scattered preserve containers (~4) — default in clearings ────────────
  container(10, 22, 'default', 'preserve'),
  container(12, 30, 'default', 'preserve'),
  container(10, 44, 'default', 'preserve'),
  container(14, 50, 'default', 'preserve'),
];

// ── Tiled JSON ────────────────────────────────────────────────────────────────

const tiledMap = {
  version: '1.10', tiledversion: '1.10.2', type: 'map',
  orientation: 'orthogonal', renderorder: 'right-down',
  width: MAP_W, height: MAP_H, tilewidth: TILE_PX, tileheight: TILE_PX,
  infinite: false, nextlayerid: 4, nextobjectid: nextId,

  tilesets: [{
    firstgid:    1,
    name:        'conner',
    tilewidth:   TILE_PX,
    tileheight:  TILE_PX,
    spacing:     0,
    margin:      0,
    columns:     8,
    tilecount:   8,
    imagewidth:  384,
    imageheight: TILE_PX,
    image:       '../images/conner-tiles.png',
    tiles: [
      { id: 2, properties: [{ name: 'impassable', type: 'bool', value: true }] }, // GID 3: pine tree
      { id: 4, properties: [{ name: 'impassable', type: 'bool', value: true }] }, // GID 5: slough
      { id: 6, properties: [{ name: 'impassable', type: 'bool', value: true }] }, // GID 7: tower
    ],
  }],

  layers: [
    {
      id: 1, name: 'ground', type: 'tilelayer',
      x: 0, y: 0, width: MAP_W, height: MAP_H,
      opacity: 1, visible: true, data: flatten(ground),
    },
    {
      id: 2, name: 'obstacles', type: 'tilelayer',
      x: 0, y: 0, width: MAP_W, height: MAP_H,
      opacity: 1, visible: true, data: flatten(obstacles),
    },
    {
      id: 3, name: 'objects', type: 'objectgroup',
      x: 0, y: 0, opacity: 1, visible: true, objects,
    },
  ],
};

// ── Write ─────────────────────────────────────────────────────────────────────

const outPath = path.resolve(__dirname, '../public/assets/maps/zone3.json');
fs.writeFileSync(outPath, JSON.stringify(tiledMap, null, 2));

const containers = objects.filter(o => o.type === 'container');
const stores = [...new Set(containers.map(c => c.name.split('_')[0]))];
console.log(`✓  Zone 3 tilemap (${MAP_W}×${MAP_H}) → ${path.relative(process.cwd(), outPath)}`);
console.log(`   ${containers.length} containers across stores: ${stores.join(', ')}`);
console.log(`   Exits: Zone 0 (east)`);
