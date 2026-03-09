#!/usr/bin/env node
/**
 * Generates Zone 2 (Collier Commons) tilemap JSON.
 *
 * Output: public/assets/maps/zone2.json
 *
 * Map: 80 × 60 tiles, 48 px/tile → 3840 × 2880 world pixels
 *
 * Tileset (GIDs reference collier-tiles.png, 8 tiles wide):
 *   GID 1  — Beige sidewalk/pavement (passable)
 *   GID 2  — Parking lot asphalt     (passable)
 *   GID 3  — Building wall           (impassable)
 *   GID 4  — Store interior floor    (passable)
 *   GID 5  — Grass                   (passable)
 *   GID 6  — Retention pond water    (impassable)
 *   GID 7  — Road/asphalt            (passable)
 *   GID 8  — Decorative tile accent  (passable)
 *
 * Exits:
 *   West → Zone 1 (US-41 Corridor):  cols 0-2, rows 25-35
 *
 * Run:  node scripts/generate-zone2.js
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
  EMPTY:    0,
  SIDEWALK: 1,
  PARKING:  2,
  WALL:     3,
  FLOOR:    4,
  GRASS:    5,
  POND:     6,
  ROAD:     7,
  TERR:     8,
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

const ground    = makeGrid(MAP_W, MAP_H, GID.SIDEWALK);  // base: beige sidewalk
const obstacles = makeGrid(MAP_W, MAP_H, GID.EMPTY);

// ── Border walls (3-tile ring of impassable WALL) ─────────────────────────────

for (let x = 0; x < MAP_W; x++) {
  for (let b = 0; b < 3; b++) {
    set(obstacles, x, b, GID.WALL);
    set(obstacles, x, MAP_H - 1 - b, GID.WALL);
  }
}
for (let y = 0; y < MAP_H; y++) {
  for (let b = 0; b < 3; b++) {
    set(obstacles, b, y, GID.WALL);
    set(obstacles, MAP_W - 1 - b, y, GID.WALL);
  }
}

// ── Open exit corridors ───────────────────────────────────────────────────────

// West → Zone 1: cols 0-2, rows 25-35
for (let x = 0; x <= 2; x++)
  for (let y = 25; y <= 35; y++) {
    set(obstacles, x, y, GID.EMPTY);
    set(ground,    x, y, GID.ROAD);
  }

// ── Ground layout ─────────────────────────────────────────────────────────────

// Large parking lot east section (cols 36-76, rows 3-56)
fillRect(ground, 36, 3, 41, 54, GID.PARKING);

// West parking strip (cols 3-7, rows 3-56)
fillRect(ground, 3, 3, 5, 54, GID.PARKING);

// Road connecting west exit
fillRect(ground, 3, 25, 5, 11, GID.ROAD);

// Grass strips near border interior
for (let y = 3; y <= 56; y++) {
  set(ground, 3, y, GID.GRASS);
  set(ground, 4, y, GID.GRASS);
}
fillRect(ground, 3, 3, 74, 2, GID.GRASS);
fillRect(ground, 3, 54, 74, 3, GID.GRASS);

// Grass around ponds
fillRect(ground, 42, 42, 14, 8, GID.GRASS);

// ── Building helper ───────────────────────────────────────────────────────────

function buildStore(x, y, w, h, entranceSide, entranceOffset, entranceWidth = 3) {
  fillRect(obstacles, x, y, w, 1, GID.WALL);
  fillRect(obstacles, x, y + h - 1, w, 1, GID.WALL);
  fillRect(obstacles, x, y, 1, h, GID.WALL);
  fillRect(obstacles, x + w - 1, y, 1, h, GID.WALL);

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

  fillRect(ground, x + 1, y + 1, w - 2, h - 2, GID.FLOOR);
}

// ── Place buildings ───────────────────────────────────────────────────────────

// Publix (cols 8-35, rows 4-24) — large grocery, entrance south
buildStore(8, 4, 28, 21, 'south', 14);

// Library/The Foundry (cols 8-32, rows 28-44) — entrance east
buildStore(8, 28, 25, 17, 'east', 8);

// Rec Center (cols 40-68, rows 8-40) — entrance south
buildStore(40, 8, 29, 33, 'south', 14);

// ── Retention ponds in obstacles layer ───────────────────────────────────────

// Pond 1: 6×4 at cols 44-49, rows 44-47
fillRect(obstacles, 44, 44, 6, 4, GID.POND);
fillRect(ground, 44, 44, 6, 4, GID.GRASS);

// Pond 2: 8×3 at cols 60-67, rows 43-45
fillRect(obstacles, 60, 43, 8, 3, GID.POND);
fillRect(ground, 60, 43, 8, 3, GID.GRASS);

// ── Decorative terra cotta accents near Publix entrance ──────────────────────
fillRect(ground, 18, 25, 4, 2, GID.TERR);
fillRect(ground, 22, 25, 4, 2, GID.TERR);

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
  spawnPoint(38, 30),
  entryPoint(4, 30, 1),
  exitZone(0, 25, 3, 11, 1),

  // ── Publix containers (~8) — coolers and crates in rows 5-23 ─────────────
  container(12,  8,  'cooler',  'publix'),
  container(18,  8,  'cooler',  'publix'),
  container(24,  8,  'cooler',  'publix'),
  container(12, 14,  'cooler',  'publix'),
  container(18, 14,  'cooler',  'publix'),
  container(24, 14,  'cooler',  'publix'),
  container(12, 20,  'crate',   'publix'),
  container(20, 20,  'crate',   'publix'),

  // ── Foundry containers (~7) — toolbox and default rows 29-43 ─────────────
  container(11, 32, 'toolbox', 'foundry'),
  container(16, 32, 'toolbox', 'foundry'),
  container(22, 32, 'toolbox', 'foundry'),
  container(11, 38, 'toolbox', 'foundry'),
  container(16, 38, 'default', 'foundry'),
  container(22, 38, 'default', 'foundry'),
  container(11, 43, 'default', 'foundry'),

  // ── Rec Center containers (~5) — backpack and crate rows 9-39 ────────────
  container(44, 14, 'backpack', 'reccenter'),
  container(52, 14, 'backpack', 'reccenter'),
  container(60, 14, 'backpack', 'reccenter'),
  container(44, 26, 'crate',    'reccenter'),
  container(58, 26, 'crate',    'reccenter'),
];

// ── Tiled JSON ────────────────────────────────────────────────────────────────

const tiledMap = {
  version: '1.10', tiledversion: '1.10.2', type: 'map',
  orientation: 'orthogonal', renderorder: 'right-down',
  width: MAP_W, height: MAP_H, tilewidth: TILE_PX, tileheight: TILE_PX,
  infinite: false, nextlayerid: 4, nextobjectid: nextId,

  tilesets: [{
    firstgid:    1,
    name:        'collier',
    tilewidth:   TILE_PX,
    tileheight:  TILE_PX,
    spacing:     0,
    margin:      0,
    columns:     8,
    tilecount:   8,
    imagewidth:  384,
    imageheight: TILE_PX,
    image:       '../images/collier-tiles.png',
    tiles: [
      { id: 2, properties: [{ name: 'impassable', type: 'bool', value: true }] }, // GID 3: wall
      { id: 5, properties: [{ name: 'impassable', type: 'bool', value: true }] }, // GID 6: pond
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

const outPath = path.resolve(__dirname, '../public/assets/maps/zone2.json');
fs.writeFileSync(outPath, JSON.stringify(tiledMap, null, 2));

const containers = objects.filter(o => o.type === 'container');
const stores = [...new Set(containers.map(c => c.name.split('_')[0]))];
console.log(`✓  Zone 2 tilemap (${MAP_W}×${MAP_H}) → ${path.relative(process.cwd(), outPath)}`);
console.log(`   ${containers.length} containers across stores: ${stores.join(', ')}`);
console.log(`   Exits: Zone 1 (west)`);
