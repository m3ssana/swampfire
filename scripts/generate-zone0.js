#!/usr/bin/env node
/**
 * Generates Zone 0 (Cypress Creek Preserve) tilemap JSON.
 *
 * Output: public/assets/maps/zone0.json
 *
 * Map dimensions: 80 × 60 tiles, 48 px/tile → 3840 × 2880 world pixels
 *
 * Tileset (GIDs reference swamp-tiles.png, 6 tiles wide):
 *   GID 1  — Mud ground      (passable)
 *   GID 2  — Standing water  (impassable, custom property: impassable=true)
 *   GID 3  — Cypress tree    (impassable, custom property: impassable=true)
 *   GID 4  — Trail / path    (passable)
 *   GID 5  — Campfire        (passable)
 *   GID 6  — Swamp grass     (passable)
 *
 * Layers:
 *   "ground"    — tilelayer, filled with ground / grass / trail / campfire tiles
 *   "obstacles" — tilelayer, water and tree tiles that block movement
 *   "objects"   — objectgroup, searchable containers + workbench + rocket
 *
 * Zone narrative:
 *   - Center clearing (~35-46 x, ~25-35 y): campfire, workbench, rocket launch pad
 *   - Winding trails from center to south and west exits
 *   - Dense cypress stands and water pools scattered through the swamp
 *   - 18 searchable containers across varied loot tables
 *   - South exit: tile columns 34-46, row 58-59
 *   - West exit:  tile columns 0-1, rows 26-34
 *
 * Run:  node scripts/generate-zone0.js
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Constants ─────────────────────────────────────────────────────────────────

const MAP_W    = 80;
const MAP_H    = 60;
const TILE_PX  = 48;

// Tile GIDs
const GID = {
  EMPTY:     0,
  GROUND:    1,
  WATER:     2,
  TREE:      3,
  TRAIL:     4,
  CAMPFIRE:  5,
  GRASS:     6,
};

// ── 2D grid helpers ───────────────────────────────────────────────────────────

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

function setIfEmpty(grid, x, y, gid) {
  if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H && grid[y][x] === GID.EMPTY)
    grid[y][x] = gid;
}

/** Seeded pseudo-random — deterministic map layout every run. */
function rng(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Map generation ────────────────────────────────────────────────────────────

const rand = rng(0xDEADBEEF);

// Layer grids
const ground    = makeGrid(MAP_W, MAP_H, GID.GROUND);
const obstacles = makeGrid(MAP_W, MAP_H, GID.EMPTY);

// ── 1. Outer border: 3-tile ring of trees ─────────────────────────────────────
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

// ── 2. Open up south exit (columns 34-46, rows 57-59) ────────────────────────
for (let x = 34; x <= 46; x++) {
  for (let y = 57; y <= 59; y++) {
    set(obstacles, x, y, GID.EMPTY);
    set(ground,    x, y, GID.TRAIL);
  }
}

// ── 3. Open up west exit (columns 0-2, rows 26-34) ───────────────────────────
for (let x = 0; x <= 2; x++) {
  for (let y = 26; y <= 34; y++) {
    set(obstacles, x, y, GID.EMPTY);
    set(ground,    x, y, GID.TRAIL);
  }
}

// ── 4. Center clearing (trail tiles, 30-50 x, 23-37 y) ───────────────────────
fillRect(ground, 30, 23, 20, 14, GID.TRAIL);

// ── 5. Trail from center to south exit ───────────────────────────────────────
// Run south from center clearing (40, 37) to (40, 59)
for (let y = 37; y <= 59; y++) {
  for (let dx = -3; dx <= 3; dx++) {
    set(ground, 40 + dx, y, GID.TRAIL);
    set(obstacles, 40 + dx, y, GID.EMPTY); // clear any border trees in corridor
  }
}

// ── 6. Trail from center to west exit ────────────────────────────────────────
for (let x = 0; x <= 30; x++) {
  for (let dy = -3; dy <= 3; dy++) {
    set(ground, x, 30 + dy, GID.TRAIL);
    set(obstacles, x, 30 + dy, GID.EMPTY); // clear corridor
  }
}

// ── 7. Campfire at clearing center ───────────────────────────────────────────
set(ground, 40, 28, GID.CAMPFIRE);

// ── 8. Swamp grass patches (decorative, on ground layer) ─────────────────────
const grassPatches = [
  [8, 8],   [15, 12], [22, 6],  [55, 10], [65, 8],  [72, 15],
  [8, 42],  [14, 50], [55, 48], [68, 44], [62, 54], [72, 50],
  [6, 22],  [12, 40], [18, 18], [58, 20], [70, 30], [16, 55],
];
for (const [gx, gy] of grassPatches) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (get(ground, gx + dx, gy + dy) === GID.GROUND &&
          get(obstacles, gx + dx, gy + dy) === GID.EMPTY)
        set(ground, gx + dx, gy + dy, GID.GRASS);
}

// ── 9. Water pools (obstacles layer, impassable) ─────────────────────────────
const waterPools = [
  { x: 10, y: 10, w: 6, h: 4 },
  { x: 22, y: 16, w: 4, h: 3 },
  { x: 56, y: 8,  w: 8, h: 5 },
  { x: 68, y: 18, w: 5, h: 4 },
  { x: 62, y: 38, w: 6, h: 5 },
  { x: 14, y: 44, w: 5, h: 4 },
  { x: 50, y: 50, w: 7, h: 4 },
  { x: 22, y: 52, w: 4, h: 4 },
  { x: 72, y: 42, w: 4, h: 6 },
  { x: 8,  y: 32, w: 4, h: 5 },
];
for (const { x, y, w, h } of waterPools) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) {
      const tx = x + dx, ty = y + dy;
      // Skip if already cleared (trail/exit corridors)
      if (get(obstacles, tx, ty) !== GID.TREE &&
          get(ground, tx, ty) !== GID.TRAIL) {
        set(obstacles, tx, ty, GID.WATER);
        set(ground, tx, ty, GID.GROUND);
      }
    }
}

// ── 10. Tree clusters in the interior ────────────────────────────────────────
const treeClusters = [
  // [centerX, centerY, spread] — circular-ish cluster
  [18,  8, 3], [55, 14, 4], [72,  8, 3],
  [10, 20, 2], [26, 18, 2], [60, 22, 3],
  [74, 28, 2], [72, 40, 3], [60, 52, 3],
  [18, 52, 2], [10, 46, 2], [28, 46, 2],
  [46, 10, 2], [50, 40, 2], [64, 10, 3],
];
for (const [cx, cy, spread] of treeClusters) {
  for (let dy = -spread; dy <= spread; dy++) {
    for (let dx = -spread; dx <= spread; dx++) {
      // Roughly circular with some randomness
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > spread + rand() * 0.8) continue;
      const tx = cx + dx, ty = cy + dy;
      // Don't plant trees in exit corridors or center clearing
      if (get(ground, tx, ty) === GID.TRAIL) continue;
      if (get(obstacles, tx, ty) === GID.TREE) continue; // border already set
      set(obstacles, tx, ty, GID.TREE);
    }
  }
}

// ── 11. Flatten grids to 1D arrays (Tiled row-major) ────────────────────────
function flatten(grid) {
  return grid.reduce((acc, row) => acc.concat(row), []);
}

// ── Objects layer ─────────────────────────────────────────────────────────────

/**
 * World pixel coordinates (top-left corner of each tile).
 * Tiled objects use pixel coords, top-left of object bounds.
 */
const T = (col, row) => ({ x: col * TILE_PX, y: row * TILE_PX });

let nextObjId = 1;
const oid = () => nextObjId++;

/**
 * Container object helper.
 * @param {number} tx   - tile column
 * @param {number} ty   - tile row
 * @param {string} table - loot table key
 */
function container(tx, ty, table) {
  const { x, y } = T(tx, ty);
  return {
    id:     oid(),
    name:   `container_${tx}_${ty}`,
    type:   'container',
    x,
    y,
    width:  48,
    height: 48,
    rotation: 0,
    visible: true,
    properties: [
      { name: 'table', type: 'string', value: table },
    ],
  };
}

function workbench(tx, ty) {
  const { x, y } = T(tx, ty);
  return {
    id:     oid(),
    name:   'workbench',
    type:   'workbench',
    x,
    y,
    width:  48,
    height: 48,
    rotation: 0,
    visible: true,
    properties: [],
  };
}

function rocket(tx, ty) {
  const { x, y } = T(tx, ty);
  return {
    id:     oid(),
    name:   'rocket',
    type:   'rocket',
    x,
    y,
    width:  48,
    height: 48,
    rotation: 0,
    visible: true,
    properties: [],
  };
}

function spawnPoint(tx, ty) {
  const { x, y } = T(tx, ty);
  return {
    id:     oid(),
    name:   'spawn',
    type:   'spawn',
    x,
    y,
    width:  48,
    height: 48,
    rotation: 0,
    visible: true,
    properties: [],
  };
}

function exitZone(tx, ty, tw, th, target) {
  const { x, y } = T(tx, ty);
  return {
    id:     oid(),
    name:   `exit_to_zone${target}`,
    type:   'exit',
    x,
    y,
    width:  tw * TILE_PX,
    height: th * TILE_PX,
    rotation: 0,
    visible: true,
    properties: [
      { name: 'targetZone', type: 'int', value: target },
    ],
  };
}

// ── Place objects ─────────────────────────────────────────────────────────────

const objects = [
  // Core zone objects
  spawnPoint(40, 30),
  workbench(43, 33),
  rocket(36, 26),

  // Exit triggers
  exitZone(34, 57, 13, 3, 1),   // south → Zone 1 (US-41)
  exitZone(0, 26, 3, 9, 3),     // west  → Zone 3 (Conner Preserve)

  // Containers — 18 total across 5 loot tables
  // "toolbox"  : workshop/hardware items (crafting ingredients, higher weight)
  // "cooler"   : food/supplies (junk + small xp)
  // "backpack" : general scavenge (mixed ingredients + junk)
  // "crate"    : heavy hardware (rare crafting parts)
  // "default"  : general swamp finds

  // Near center clearing
  container(32, 25, 'toolbox'),
  container(48, 27, 'backpack'),
  container(34, 36, 'cooler'),
  container(47, 35, 'backpack'),

  // Along south trail
  container(38, 42, 'default'),
  container(42, 48, 'toolbox'),
  container(37, 54, 'crate'),

  // Along west trail
  container(20, 28, 'backpack'),
  container(12, 30, 'cooler'),
  container( 6, 30, 'default'),

  // North section
  container(20, 10, 'toolbox'),
  container(36, 10, 'backpack'),
  container(50, 12, 'crate'),

  // East section
  container(56, 30, 'default'),
  container(60, 42, 'backpack'),
  container(66, 26, 'toolbox'),

  // South-east
  container(54, 54, 'cooler'),

  // Near west exit (reward for exploring)
  container( 4, 22, 'crate'),
];

// ── Assemble Tiled JSON ───────────────────────────────────────────────────────

const tiledMap = {
  version:      '1.10',
  tiledversion: '1.10.2',
  type:         'map',
  orientation:  'orthogonal',
  renderorder:  'right-down',
  width:        MAP_W,
  height:       MAP_H,
  tilewidth:    TILE_PX,
  tileheight:   TILE_PX,
  infinite:     false,
  nextlayerid:  4,
  nextobjectid: nextObjId,

  tilesets: [
    {
      firstgid:    1,
      name:        'swamp',
      tilewidth:   TILE_PX,
      tileheight:  TILE_PX,
      spacing:     0,
      margin:      0,
      columns:     6,
      tilecount:   6,
      imagewidth:  288,
      imageheight: TILE_PX,
      image:       '../images/swamp-tiles.png',
      // Custom properties per tile for collision detection
      tiles: [
        {
          id: 1,  // GID 2 = water
          properties: [{ name: 'impassable', type: 'bool', value: true }],
        },
        {
          id: 2,  // GID 3 = tree
          properties: [{ name: 'impassable', type: 'bool', value: true }],
        },
      ],
    },
  ],

  layers: [
    {
      id:      1,
      name:    'ground',
      type:    'tilelayer',
      x:       0,
      y:       0,
      width:   MAP_W,
      height:  MAP_H,
      opacity: 1,
      visible: true,
      data:    flatten(ground),
    },
    {
      id:      2,
      name:    'obstacles',
      type:    'tilelayer',
      x:       0,
      y:       0,
      width:   MAP_W,
      height:  MAP_H,
      opacity: 1,
      visible: true,
      data:    flatten(obstacles),
    },
    {
      id:      3,
      name:    'objects',
      type:    'objectgroup',
      x:       0,
      y:       0,
      opacity: 1,
      visible: true,
      objects,
    },
  ],
};

// ── Write JSON ────────────────────────────────────────────────────────────────

const outPath = path.resolve(__dirname, '../public/assets/maps/zone0.json');
fs.writeFileSync(outPath, JSON.stringify(tiledMap, null, 2));
console.log(`✓  Zone 0 tilemap (${MAP_W}×${MAP_H}) written → ${path.relative(process.cwd(), outPath)}`);
console.log(`   Tiles: ${MAP_W * MAP_H} ground + ${MAP_W * MAP_H} obstacles`);
console.log(`   Objects: ${objects.length} (${objects.filter(o => o.type === 'container').length} containers)`);
