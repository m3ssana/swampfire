#!/usr/bin/env node
/**
 * Generates Zone 4 (LOLHS / SR-54) tilemap JSON.
 *
 * Output: public/assets/maps/zone4.json
 *
 * Map: 80 × 60 tiles, 48 px/tile → 3840 × 2880 world pixels
 *
 * Tileset (GIDs reference lolhs-tiles.png, 8 tiles wide):
 *   GID 1  — Highway asphalt      (passable)
 *   GID 2  — Athletic field grass  (passable)
 *   GID 3  — Red brick wall        (impassable)
 *   GID 4  — School interior       (passable)
 *   GID 5  — Sidewalk/concrete     (passable)
 *   GID 6  — Road stripe           (passable)
 *   GID 7  — Chain-link fence      (impassable)
 *   GID 8  — Parking lot           (passable)
 *
 * Exits:
 *   North → Zone 1 (US-41 Corridor): cols 34-46, rows 0-2
 *
 * Run:  node scripts/generate-zone4.js
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
  ASPHALT:  1,
  FIELD:    2,
  WALL:     3,
  FLOOR:    4,
  SIDEWALK: 5,
  STRIPE:   6,
  FENCE:    7,
  PARKING:  8,
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

const ground    = makeGrid(MAP_W, MAP_H, GID.ASPHALT);  // base: highway asphalt
const obstacles = makeGrid(MAP_W, MAP_H, GID.EMPTY);

// ── Border (3-tile ring of CHAIN-LINK FENCE, impassable) ─────────────────────

for (let x = 0; x < MAP_W; x++) {
  for (let b = 0; b < 3; b++) {
    set(obstacles, x, b, GID.FENCE);
    set(obstacles, x, MAP_H - 1 - b, GID.FENCE);
  }
}
for (let y = 0; y < MAP_H; y++) {
  for (let b = 0; b < 3; b++) {
    set(obstacles, b, y, GID.FENCE);
    set(obstacles, MAP_W - 1 - b, y, GID.FENCE);
  }
}

// ── Open exit corridors ───────────────────────────────────────────────────────

// North → Zone 1: cols 34-46, rows 0-2
for (let x = 34; x <= 46; x++)
  for (let y = 0; y <= 2; y++) {
    set(obstacles, x, y, GID.EMPTY);
    set(ground,    x, y, GID.ASPHALT);
  }

// ── Ground layout ─────────────────────────────────────────────────────────────

// SR-54 highway runs N-S through cols 33-46
fillRect(ground, 33, 0, 14, 60, GID.ASPHALT);
// Center stripe dashes (cols 39-40)
for (let y = 0; y < 60; y++) {
  if ((y % 4) < 3) {
    set(ground, 39, y, GID.STRIPE);
    set(ground, 40, y, GID.STRIPE);
  }
}

// Sidewalks flanking highway (cols 31-32 west side, cols 47-48 east side)
fillRect(ground, 31, 3, 2, 54, GID.SIDEWALK);
fillRect(ground, 47, 3, 2, 54, GID.SIDEWALK);

// West side: parking strip near school
fillRect(ground, 4, 3, 2, 35, GID.PARKING);

// Athletic field (cols 4-29, rows 38-56) — bright grass
fillRect(ground, 4, 38, 26, 19, GID.FIELD);

// East side: parking lot (cols 49-74, rows 3-56)
fillRect(ground, 49, 3, 26, 54, GID.PARKING);

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

// LOLHS Main Building (cols 6-30, rows 4-36) — entrance east at offset 16
buildStore(6, 4, 25, 33, 'east', 16);

// Chemistry lab wing (cols 6-16, rows 38-50) — entrance north at offset 5
buildStore(6, 38, 11, 13, 'north', 5);

// Tractor Supply (cols 49-72, rows 10-38) — entrance west at offset 14
buildStore(49, 10, 24, 29, 'west', 14);

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
  entryPoint(40, 10, 1),
  exitZone(34, 0, 13, 3, 1),

  // ── LOLHS main containers (~7) — toolbox/crate in shop area, default in halls
  container(10, 14, 'toolbox', 'lolhs'),
  container(16, 14, 'toolbox', 'lolhs'),
  container(22, 14, 'toolbox', 'lolhs'),
  container(10, 22, 'crate',   'lolhs'),
  container(18, 22, 'crate',   'lolhs'),
  container(10, 30, 'default', 'lolhs'),
  container(20, 30, 'default', 'lolhs'),

  // ── Chemistry lab containers (~4) — crate and default
  container( 8, 42, 'crate',   'chemlabs'),
  container(12, 42, 'crate',   'chemlabs'),
  container( 8, 47, 'default', 'chemlabs'),
  container(12, 47, 'default', 'chemlabs'),

  // ── Tractor Supply containers (~8) — toolbox, crate, cooler
  container(52, 14, 'toolbox',  'tractorsupply'),
  container(58, 14, 'toolbox',  'tractorsupply'),
  container(64, 14, 'toolbox',  'tractorsupply'),
  container(52, 22, 'crate',    'tractorsupply'),
  container(58, 22, 'crate',    'tractorsupply'),
  container(64, 22, 'crate',    'tractorsupply'),
  container(52, 30, 'cooler',   'tractorsupply'),
  container(60, 30, 'cooler',   'tractorsupply'),
];

// ── Tiled JSON ────────────────────────────────────────────────────────────────

const tiledMap = {
  version: '1.10', tiledversion: '1.10.2', type: 'map',
  orientation: 'orthogonal', renderorder: 'right-down',
  width: MAP_W, height: MAP_H, tilewidth: TILE_PX, tileheight: TILE_PX,
  infinite: false, nextlayerid: 4, nextobjectid: nextId,

  tilesets: [{
    firstgid:    1,
    name:        'lolhs',
    tilewidth:   TILE_PX,
    tileheight:  TILE_PX,
    spacing:     0,
    margin:      0,
    columns:     8,
    tilecount:   8,
    imagewidth:  384,
    imageheight: TILE_PX,
    image:       '../images/lolhs-tiles.png',
    tiles: [
      { id: 2, properties: [{ name: 'impassable', type: 'bool', value: true }] }, // GID 3: brick wall
      { id: 6, properties: [{ name: 'impassable', type: 'bool', value: true }] }, // GID 7: chain-link fence
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

const outPath = path.resolve(__dirname, '../public/assets/maps/zone4.json');
fs.writeFileSync(outPath, JSON.stringify(tiledMap, null, 2));

const containers = objects.filter(o => o.type === 'container');
const stores = [...new Set(containers.map(c => c.name.split('_')[0]))];
console.log(`✓  Zone 4 tilemap (${MAP_W}×${MAP_H}) → ${path.relative(process.cwd(), outPath)}`);
console.log(`   ${containers.length} containers across stores: ${stores.join(', ')}`);
console.log(`   Exits: Zone 1 (north)`);
