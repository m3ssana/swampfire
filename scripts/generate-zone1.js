#!/usr/bin/env node
/**
 * Generates Zone 1 (US-41 Corridor) tilemap JSON.
 *
 * Output: public/assets/maps/zone1.json
 *
 * Map: 80 × 60 tiles, 48 px/tile → 3840 × 2880 world pixels
 *
 * Tileset (GIDs reference us41-tiles.png, 8 tiles wide):
 *   GID 1  — Asphalt road       (passable)
 *   GID 2  — Parking lot        (passable)
 *   GID 3  — Building wall      (impassable, custom property: impassable=true)
 *   GID 4  — Sidewalk concrete  (passable)
 *   GID 5  — Store interior     (passable)
 *   GID 6  — Road center stripe (passable)
 *   GID 7  — Grass strip        (passable)
 *   GID 8  — Chain-link fence   (impassable, custom property: impassable=true)
 *
 * Zone layout:
 *   US-41 highway (cols 33-44, 12 tiles wide) runs full N-S through center.
 *   West side (cols 3-31): RaceTrac, Harvey's Hardware, Gulf Coast Tractor
 *   East side (cols 46-77): NAPA, Advance Auto, O'Reilly Auto Parts
 *   Sidewalks along highway edges (cols 31-32 west, cols 45-46 east)
 *   Grass buffer along east/west border fences
 *
 * Exits:
 *   North → Zone 0 (Cypress Creek Preserve):  cols 34-46, rows 0-2
 *   South → Zone 4 (LOLHS / SR-54):           cols 34-46, rows 57-59
 *   East  → Zone 2 (Collier Pkwy):            cols 77-79, rows 25-35
 *
 * Run:  node scripts/generate-zone1.js
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
  EMPTY:   0,
  ASPHALT: 1,
  PARKING: 2,
  WALL:    3,
  SIDEWALK:4,
  FLOOR:   5,
  STRIPE:  6,
  GRASS:   7,
  FENCE:   8,
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

const ground    = makeGrid(MAP_W, MAP_H, GID.ASPHALT);  // base: asphalt everywhere
const obstacles = makeGrid(MAP_W, MAP_H, GID.EMPTY);

// ── Border fences (3-tile ring) ───────────────────────────────────────────────

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

// ── Open exit corridors (clear the border fences) ─────────────────────────────

// North → Zone 0: cols 34-46, rows 0-2
for (let x = 34; x <= 46; x++)
  for (let y = 0; y <= 2; y++) {
    set(obstacles, x, y, GID.EMPTY);
    set(ground,    x, y, GID.ASPHALT);
  }

// South → Zone 4: cols 34-46, rows 57-59
for (let x = 34; x <= 46; x++)
  for (let y = 57; y <= 59; y++) {
    set(obstacles, x, y, GID.EMPTY);
    set(ground,    x, y, GID.ASPHALT);
  }

// East → Zone 2: cols 77-79, rows 25-35
for (let x = 77; x <= 79; x++)
  for (let y = 25; y <= 35; y++) {
    set(obstacles, x, y, GID.EMPTY);
    set(ground,    x, y, GID.ASPHALT);
  }

// ── Ground layout ─────────────────────────────────────────────────────────────

// Grass buffer strips inside border fences (cols 3-5 west, cols 74-76 east)
for (let y = 3; y <= 56; y++) {
  for (let x = 3; x <= 5; x++) set(ground, x, y, GID.GRASS);
  for (let x = 74; x <= 76; x++) set(ground, x, y, GID.GRASS);
}

// West parking lots (cols 6-30)
fillRect(ground, 6, 3, 25, 54, GID.PARKING);

// Sidewalks flanking US-41 (cols 31-32 west, cols 45-46 east)
fillRect(ground, 31, 3, 2, 54, GID.SIDEWALK);
fillRect(ground, 45, 3, 2, 54, GID.SIDEWALK);

// US-41 highway (cols 33-44)
fillRect(ground, 33, 0, 12, 60, GID.ASPHALT);
// Center stripe dashes on highway (cols 38-39)
for (let y = 0; y < 60; y++) {
  if ((y % 4) < 3) { // dashed — 3 on, 1 off
    set(ground, 38, y, GID.STRIPE);
    set(ground, 39, y, GID.STRIPE);
  }
}

// East parking lots (cols 47-73)
fillRect(ground, 47, 3, 27, 54, GID.PARKING);

// ── Building helper ───────────────────────────────────────────────────────────

/**
 * Place a building: solid wall perimeter in obstacles layer, floor interior in ground layer.
 * @param {number[]} ground    - ground grid
 * @param {number[]} obstacles - obstacle grid
 * @param {number} x  tile column of top-left corner
 * @param {number} y  tile row of top-left corner
 * @param {number} w  width in tiles
 * @param {number} h  height in tiles
 * @param {'north'|'south'|'east'|'west'} entranceSide
 * @param {number} entranceOffset tiles from start of that side to entrance center
 * @param {number} entranceWidth  width of entrance gap in tiles
 */
function buildStore(ground, obstacles, x, y, w, h, entranceSide, entranceOffset, entranceWidth = 3) {
  // Wall perimeter
  fillRect(obstacles, x, y, w, 1, GID.WALL);    // top wall
  fillRect(obstacles, x, y + h - 1, w, 1, GID.WALL); // bottom wall
  fillRect(obstacles, x, y, 1, h, GID.WALL);    // left wall
  fillRect(obstacles, x + w - 1, y, 1, h, GID.WALL); // right wall

  // Entrance gap (clear wall tiles)
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

  // Store floor interior
  fillRect(ground, x + 1, y + 1, w - 2, h - 2, GID.FLOOR);
}

// ── Place all six stores ──────────────────────────────────────────────────────

// West side stores: entrances face east (toward parking + highway)
// RaceTrac gas station / convenience store (cols 7-22, rows 4-16)
buildStore(ground, obstacles, 7, 4, 16, 13, 'east', 6);

// Harvey's Hardware (cols 7-26, rows 18-32) — largest store
buildStore(ground, obstacles, 7, 18, 20, 15, 'east', 7);

// Gulf Coast Tractor (cols 7-24, rows 34-50)
buildStore(ground, obstacles, 7, 34, 18, 17, 'east', 8);

// East side stores: entrances face west (toward highway + parking)
// NAPA Auto Parts (cols 48-63, rows 4-17)
buildStore(ground, obstacles, 48, 4, 16, 14, 'west', 7);

// Advance Auto Parts (cols 48-63, rows 19-30)
buildStore(ground, obstacles, 48, 19, 16, 12, 'west', 6);

// O'Reilly Auto Parts (cols 65-78, rows 4-16)
buildStore(ground, obstacles, 65, 4, 13, 13, 'west', 6);

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
  spawnPoint(38, 30),                  // spawn on highway center
  entryPoint(40,  5, 0),              // arriving from Zone 0 (north)
  entryPoint(40, 54, 4),              // arriving from Zone 4 (south)
  entryPoint(75, 30, 2),              // arriving from Zone 2 (east)

  exitZone(34, 0,  13, 3, 0),        // north → Zone 0
  exitZone(34, 57, 13, 3, 4),        // south → Zone 4
  exitZone(77, 25,  3,11, 2),        // east  → Zone 2

  // ── RaceTrac (gas + convenience) — 4 containers ─────────────────────────────
  // Interior: cols 8-22, rows 5-16
  container(10,  8,  'cooler',  'ractrac'),   // cold drinks
  container(14,  8,  'cooler',  'racetrac'),  // snacks/cooler
  container(18,  9,  'backpack','racetrac'),  // supplies
  container(11,  13, 'default', 'racetrac'),  // register area

  // ── Harvey's Hardware — 5 containers ────────────────────────────────────────
  // Interior: cols 8-26, rows 19-31
  container(10,  22, 'toolbox', 'harveys'),
  container(15,  22, 'toolbox', 'harveys'),
  container(20,  22, 'crate',   'harveys'),
  container(10,  28, 'crate',   'harveys'),
  container(18,  28, 'backpack','harveys'),

  // ── Gulf Coast Tractor — 4 containers ───────────────────────────────────────
  // Interior: cols 8-24, rows 35-50
  container(10,  38, 'crate',   'gulftractor'),
  container(16,  38, 'crate',   'gulftractor'),
  container(10,  45, 'toolbox', 'gulftractor'),
  container(16,  45, 'toolbox', 'gulftractor'),

  // ── NAPA Auto Parts — 4 containers ──────────────────────────────────────────
  // Interior: cols 49-63, rows 5-17 (east side)
  container(51,  7,  'toolbox', 'napa'),
  container(57,  7,  'crate',   'napa'),
  container(51,  14, 'toolbox', 'napa'),
  container(57,  13, 'backpack','napa'),

  // ── Advance Auto Parts — 3 containers ───────────────────────────────────────
  // Interior: cols 49-63, rows 20-30
  container(51,  22, 'toolbox', 'advanceauto'),
  container(57,  22, 'toolbox', 'advanceauto'),
  container(54,  27, 'crate',   'advanceauto'),

  // ── O'Reilly Auto Parts — 3 containers ──────────────────────────────────────
  // Interior: cols 66-77, rows 5-16
  container(67,  7,  'toolbox', 'oreilly'),
  container(72,  7,  'crate',   'oreilly'),
  container(69,  13, 'toolbox', 'oreilly'),
];

// ── Tiled JSON ────────────────────────────────────────────────────────────────

const tiledMap = {
  version: '1.10', tiledversion: '1.10.2', type: 'map',
  orientation: 'orthogonal', renderorder: 'right-down',
  width: MAP_W, height: MAP_H, tilewidth: TILE_PX, tileheight: TILE_PX,
  infinite: false, nextlayerid: 4, nextobjectid: nextId,

  tilesets: [{
    firstgid:    1,
    name:        'us41',
    tilewidth:   TILE_PX,
    tileheight:  TILE_PX,
    spacing:     0,
    margin:      0,
    columns:     8,
    tilecount:   8,
    imagewidth:  384,
    imageheight: TILE_PX,
    image:       '../images/us41-tiles.png',
    tiles: [
      { id: 2, properties: [{ name: 'impassable', type: 'bool', value: true }] }, // GID 3: wall
      { id: 7, properties: [{ name: 'impassable', type: 'bool', value: true }] }, // GID 8: fence
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

const outPath = path.resolve(__dirname, '../public/assets/maps/zone1.json');
fs.writeFileSync(outPath, JSON.stringify(tiledMap, null, 2));

const containers = objects.filter(o => o.type === 'container');
const stores = [...new Set(containers.map(c => c.name.split('_')[0]))];
console.log(`✓  Zone 1 tilemap (${MAP_W}×${MAP_H}) → ${path.relative(process.cwd(), outPath)}`);
console.log(`   ${containers.length} containers across stores: ${stores.join(', ')}`);
console.log(`   Exits: Zone 0 (north), Zone 4 (south), Zone 2 (east)`);
