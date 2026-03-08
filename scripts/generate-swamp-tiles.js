#!/usr/bin/env node
/**
 * Generates the Zone 0 swamp tileset.
 *
 * Output: public/assets/images/swamp-tiles.png
 * Size:   288 × 48 px  (6 tiles × 48×48)
 *
 * Tile layout (0-indexed columns, 1-indexed GIDs in Tiled):
 *   Col 0 / GID 1  — Mud ground      (passable)
 *   Col 1 / GID 2  — Standing water  (impassable)
 *   Col 2 / GID 3  — Cypress tree    (impassable)
 *   Col 3 / GID 4  — Trail / path    (passable)
 *   Col 4 / GID 5  — Campfire        (passable)
 *   Col 5 / GID 6  — Swamp grass     (passable, decorative)
 *
 * Run:  node scripts/generate-swamp-tiles.js
 */

import zlib from 'zlib';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Pixel canvas helpers ───────────────────────────────────────────────────────
function makeCanvas(w, h) {
  const px = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => [0, 0, 0, 0])
  );

  function set(x, y, color) {
    if (x >= 0 && x < w && y >= 0 && y < h) px[y][x] = color;
  }

  function rect(x, y, rw, rh, color) {
    for (let dy = 0; dy < rh; dy++)
      for (let dx = 0; dx < rw; dx++)
        set(x + dx, y + dy, color);
  }

  function noise(x, y, rw, rh, colors, seed = 0) {
    for (let dy = 0; dy < rh; dy++)
      for (let dx = 0; dx < rw; dx++) {
        const n = Math.abs(Math.sin(seed + dx * 13.7 + dy * 7.3)) * colors.length | 0;
        set(x + dx, y + dy, colors[n % colors.length]);
      }
  }

  function toBuffer() {
    const rows = [];
    for (let y = 0; y < h; y++) {
      rows.push(0); // PNG filter: None
      for (let x = 0; x < w; x++) {
        rows.push(...px[y][x]);
      }
    }
    return Buffer.from(rows);
  }

  return { set, rect, noise, toBuffer };
}

// ── PNG writer (pure Node.js / zlib) ─────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++)
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const byte of buf) c = (c >>> 8) ^ CRC_TABLE[(c ^ byte) & 0xFF];
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}

function pngChunk(type, data) {
  const tb  = Buffer.from(type, 'ascii');
  const crc = u32(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([u32(data.length), tb, data, crc]);
}

function writePNG(w, h, rawBuf, outPath) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = pngChunk('IHDR',
    Buffer.concat([u32(w), u32(h), Buffer.from([8, 6, 0, 0, 0])]));
  const idat = pngChunk('IDAT', zlib.deflateSync(rawBuf, { level: 9 }));
  const iend = pngChunk('IEND', Buffer.alloc(0));
  fs.writeFileSync(outPath, Buffer.concat([sig, ihdr, idat, iend]));
  console.log(`✓  ${w}×${h} PNG written → ${path.relative(process.cwd(), outPath)}`);
}

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  // Ground / mud
  MUD:  [ 52,  62,  32, 255],
  MUD2: [ 44,  54,  26, 255],
  MUD3: [ 60,  70,  38, 255],
  MUD4: [ 38,  46,  22, 255],

  // Water
  WAT:  [ 22,  56,  64, 255],
  WAT2: [ 18,  48,  56, 255],
  WAT3: [ 28,  68,  78, 255],
  WATR: [ 34,  80,  92, 255],  // ripple

  // Tree / bark
  BARK: [ 54,  38,  20, 255],
  BARK2:[ 40,  28,  14, 255],
  CAN:  [ 22,  52,  18, 255],  // canopy
  CAN2: [ 16,  42,  14, 255],  // canopy shadow
  CAN3: [ 32,  68,  24, 255],  // canopy highlight
  MOSS: [ 80, 100,  40, 255],  // Spanish moss

  // Path / trail
  TRAIL:[ 120, 100,  60, 255],
  TRL2: [ 110,  90,  50, 255],
  TRL3: [ 130, 110,  70, 255],

  // Campfire
  FIRE: [ 220, 120,  20, 255],
  FIRE2:[ 240, 160,  30, 255],
  FIRE3:[ 200,  60,  10, 255],
  ASH:  [  80,  70,  60, 255],
  LOG:  [  60,  40,  20, 255],

  // Swamp grass
  GRS:  [ 60,  96,  28, 255],
  GRS2: [ 48,  80,  20, 255],
  GRS3: [ 76, 116,  36, 255],
};

// ── Tile renderers ────────────────────────────────────────────────────────────

/** Tile 0 (GID 1) — Mud ground */
function drawMud(canvas, ox) {
  const { rect, noise } = canvas;
  rect(ox, 0, 48, 48, C.MUD);
  noise(ox, 0, 48, 48, [C.MUD, C.MUD2, C.MUD3, C.MUD4], 42);
}

/** Tile 1 (GID 2) — Standing water */
function drawWater(canvas, ox) {
  const { rect, set } = canvas;
  rect(ox, 0, 48, 48, C.WAT);
  // Water texture: horizontal ripples
  for (let y = 4; y < 48; y += 8) {
    for (let x = 2; x < 46; x += 6) {
      set(ox + x,     y, C.WATR);
      set(ox + x + 1, y, C.WATR);
      set(ox + x + 2, y, C.WAT3);
    }
  }
  // Darker edge to differentiate from ground
  rect(ox,      0, 48,  2, C.WAT2);
  rect(ox,     46, 48,  2, C.WAT2);
  rect(ox,      0,  2, 48, C.WAT2);
  rect(ox + 46, 0,  2, 48, C.WAT2);
}

/** Tile 2 (GID 3) — Cypress tree (impassable) */
function drawTree(canvas, ox) {
  const { rect, set, noise } = canvas;
  // Base: ground color so borders blend naturally
  rect(ox, 0, 48, 48, C.MUD);
  noise(ox, 0, 48, 48, [C.MUD, C.MUD2, C.MUD3], 99);

  // Trunk (bottom third)
  rect(ox + 18, 28, 12, 20, C.BARK);
  rect(ox + 18, 28,  3, 20, C.BARK2);  // trunk shadow
  rect(ox + 27, 28,  3, 20, C.BARK2);

  // Root spread
  rect(ox + 12, 42,  6,  6, C.BARK2);
  rect(ox + 30, 42,  6,  6, C.BARK2);

  // Canopy (layered circles)
  rect(ox + 10,  4, 28, 24, C.CAN);   // main canopy block
  rect(ox + 14,  2, 20, 28, C.CAN);
  rect(ox + 12,  0, 24, 30, C.CAN);

  // Canopy highlights/shadows
  rect(ox + 16,  2, 16,  4, C.CAN3);  // top highlight
  rect(ox + 10, 20, 28,  8, C.CAN2);  // bottom shadow

  // Spanish moss hanging strands
  for (let mx = 12; mx < 40; mx += 6) {
    set(ox + mx,     28, C.MOSS);
    set(ox + mx + 1, 30, C.MOSS);
    set(ox + mx,     32, C.MOSS);
  }
}

/** Tile 3 (GID 4) — Trail / path */
function drawTrail(canvas, ox) {
  const { rect, noise } = canvas;
  rect(ox, 0, 48, 48, C.TRAIL);
  noise(ox, 0, 48, 48, [C.TRAIL, C.TRL2, C.TRL3], 17);
  // Subtle edge darkening to show path boundary
  rect(ox,      0, 48,  2, C.TRL2);
  rect(ox,     46, 48,  2, C.TRL2);
}

/** Tile 4 (GID 5) — Campfire */
function drawCampfire(canvas, ox) {
  const { rect, set } = canvas;
  // Ground base
  rect(ox, 0, 48, 48, C.MUD);
  // Ash circle
  rect(ox + 16, 24, 16, 12, C.ASH);
  // Logs in X pattern
  rect(ox + 18, 28, 12,  4, C.LOG);   // horizontal log
  rect(ox + 22, 24,  4, 12, C.LOG);   // vertical log
  // Flame base
  rect(ox + 20, 18, 8,  8, C.FIRE3);
  rect(ox + 21, 14, 6,  6, C.FIRE);
  rect(ox + 22,  8, 4,  8, C.FIRE2); // tallest flame
  // Glow suggestion on ground
  rect(ox + 18, 34, 12,  3, C.ASH);
  // Ember sparks
  set(ox + 18, 12, C.FIRE2);
  set(ox + 28, 14, C.FIRE);
  set(ox + 16, 16, C.FIRE3);
}

/** Tile 5 (GID 6) — Swamp grass (decorative) */
function drawGrass(canvas, ox) {
  const { rect, set } = canvas;
  // Ground base
  rect(ox, 0, 48, 48, C.MUD);
  // Grass tufts: 4 clusters
  const tufts = [
    [6, 28], [18, 34], [30, 26], [38, 36],
    [10, 14], [36, 12], [22, 20], [4, 40],
  ];
  for (const [tx, ty] of tufts) {
    // Tall blades
    set(ox + tx,     ty - 6, C.GRS3);
    set(ox + tx,     ty - 4, C.GRS);
    set(ox + tx + 1, ty - 5, C.GRS);
    set(ox + tx + 2, ty - 6, C.GRS2);
    set(ox + tx + 2, ty - 4, C.GRS);
    // Short blades
    set(ox + tx + 1, ty - 2, C.GRS);
    set(ox + tx + 3, ty - 3, C.GRS2);
    // Root base
    rect(ox + tx - 1, ty - 1, 6, 2, C.GRS2);
  }
}

// ── Render all 6 tiles ────────────────────────────────────────────────────────
const TILES  = 6;
const TW     = 48;
const TH     = 48;

const canvas = makeCanvas(TILES * TW, TH);

drawMud(canvas,      0 * TW);
drawWater(canvas,    1 * TW);
drawTree(canvas,     2 * TW);
drawTrail(canvas,    3 * TW);
drawCampfire(canvas, 4 * TW);
drawGrass(canvas,    5 * TW);

// ── Write PNG ─────────────────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, '../public/assets/images/swamp-tiles.png');
writePNG(TILES * TW, TH, canvas.toBuffer(), outPath);
