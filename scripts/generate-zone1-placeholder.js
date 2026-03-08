#!/usr/bin/env node
/**
 * Generates Zone 1 (US-41 Corridor) PLACEHOLDER tilemap JSON.
 *
 * Output: public/assets/maps/zone1.json
 *
 * ⚠️  This is a placeholder for Phase 3.2 (zone transitions).
 *     Task 3.3 will replace it with the real US-41 commercial strip layout.
 *
 * Reuses the swamp tileset (GIDs 1-6) as a stand-in.
 * Has the same 80×60 tile dimensions as Zone 0 for consistent world scale.
 *
 * Exit:  north edge → Zone 0 (Cypress Creek Preserve)
 * Entry: arriving from Zone 0 → north center, tile (40, 5)
 *
 * Run:  node scripts/generate-zone1-placeholder.js
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const MAP_W   = 80;
const MAP_H   = 60;
const TILE_PX = 48;

const GID = { EMPTY: 0, GROUND: 1, WATER: 2, TREE: 3, TRAIL: 4, CAMPFIRE: 5, GRASS: 6 };

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

// ── Layers ────────────────────────────────────────────────────────────────────

const ground    = makeGrid(MAP_W, MAP_H, GID.GROUND);
const obstacles = makeGrid(MAP_W, MAP_H, GID.EMPTY);

// Border trees (3-tile ring)
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

// North exit: open corridor (cols 34-46, rows 0-2) — leads to Zone 0
for (let x = 34; x <= 46; x++) {
  for (let y = 0; y <= 2; y++) {
    set(obstacles, x, y, GID.EMPTY);
    set(ground, x, y, GID.TRAIL);
  }
}

// South exit: open corridor for future Zone 4 connection
for (let x = 34; x <= 46; x++) {
  for (let y = 57; y <= 59; y++) {
    set(obstacles, x, y, GID.EMPTY);
    set(ground, x, y, GID.TRAIL);
  }
}

// Central "road" running north-south (trail tiles, 6 wide, cols 37-43)
for (let y = 3; y <= 56; y++) {
  for (let dx = -3; dx <= 3; dx++) {
    set(ground, 40 + dx, y, GID.TRAIL);
    set(obstacles, 40 + dx, y, GID.EMPTY);
  }
}

// East-west cross road at mid map (row 30±3)
for (let x = 3; x <= 76; x++) {
  for (let dy = -2; dy <= 2; dy++) {
    set(ground, x, 30 + dy, GID.TRAIL);
    set(obstacles, x, 30 + dy, GID.EMPTY);
  }
}

// Grass patches
const grassPos = [
  [8, 8], [20, 12], [60, 8], [70, 14],
  [8, 48], [16, 52], [60, 50], [72, 46],
  [8, 20], [70, 22], [10, 40], [68, 38],
];
for (const [gx, gy] of grassPos) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (get(ground, gx+dx, gy+dy) === GID.GROUND &&
          get(obstacles, gx+dx, gy+dy) === GID.EMPTY)
        set(ground, gx+dx, gy+dy, GID.GRASS);
}

// A few scattered tree clusters (not on roads)
const trees = [
  [12, 12, 2], [58, 12, 2], [72, 20, 2],
  [10, 28, 2], [70, 28, 2],
  [12, 46, 2], [60, 46, 2], [72, 40, 2],
];
for (const [cx, cy, r] of trees) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (Math.sqrt(dx*dx+dy*dy) > r) continue;
      if (get(ground, cx+dx, cy+dy) === GID.TRAIL) continue;
      set(obstacles, cx+dx, cy+dy, GID.TREE);
    }
}

// ── Objects ───────────────────────────────────────────────────────────────────

let nextId = 1;
const oid = () => nextId++;
const T = (col, row) => ({ x: col * TILE_PX, y: row * TILE_PX });

function container(tx, ty, table) {
  const { x, y } = T(tx, ty);
  return {
    id: oid(), name: `container_${tx}_${ty}`, type: 'container',
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
  // Default spawn (center)
  spawnPoint(40, 30),
  // Entry from Zone 0 — player appears just south of north corridor
  entryPoint(40, 5, 0),
  // Exit back to Zone 0 — north edge corridor trigger
  exitZone(34, 0, 13, 3, 0),
  // Exit placeholder for future Zone 4 — south edge
  exitZone(34, 57, 13, 3, 4),

  // US-41 flavour containers (placeholder loot)
  container(36, 10, 'toolbox'),
  container(44, 10, 'backpack'),
  container(30, 20, 'crate'),
  container(50, 20, 'toolbox'),
  container(28, 30, 'cooler'),
  container(52, 30, 'cooler'),
  container(30, 40, 'backpack'),
  container(50, 40, 'default'),
  container(36, 50, 'toolbox'),
  container(44, 50, 'crate'),
];

// ── Tiled JSON ────────────────────────────────────────────────────────────────

const tiledMap = {
  version: '1.10', tiledversion: '1.10.2', type: 'map',
  orientation: 'orthogonal', renderorder: 'right-down',
  width: MAP_W, height: MAP_H, tilewidth: TILE_PX, tileheight: TILE_PX,
  infinite: false, nextlayerid: 4, nextobjectid: nextId,
  tilesets: [{
    firstgid: 1, name: 'swamp', tilewidth: TILE_PX, tileheight: TILE_PX,
    spacing: 0, margin: 0, columns: 6, tilecount: 6,
    imagewidth: 288, imageheight: TILE_PX,
    image: '../images/swamp-tiles.png',
    tiles: [
      { id: 1, properties: [{ name: 'impassable', type: 'bool', value: true }] },
      { id: 2, properties: [{ name: 'impassable', type: 'bool', value: true }] },
    ],
  }],
  layers: [
    { id: 1, name: 'ground',    type: 'tilelayer', x: 0, y: 0,
      width: MAP_W, height: MAP_H, opacity: 1, visible: true, data: flatten(ground) },
    { id: 2, name: 'obstacles', type: 'tilelayer', x: 0, y: 0,
      width: MAP_W, height: MAP_H, opacity: 1, visible: true, data: flatten(obstacles) },
    { id: 3, name: 'objects',   type: 'objectgroup', x: 0, y: 0,
      opacity: 1, visible: true, objects },
  ],
};

const outPath = path.resolve(__dirname, '../public/assets/maps/zone1.json');
fs.writeFileSync(outPath, JSON.stringify(tiledMap, null, 2));
console.log(`✓  Zone 1 placeholder (${MAP_W}×${MAP_H}) written → ${path.relative(process.cwd(), outPath)}`);
console.log(`   Objects: ${objects.length} (${objects.filter(o=>o.type==='container').length} containers)`);
