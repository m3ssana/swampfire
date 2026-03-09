#!/usr/bin/env node
/**
 * Generates the Zone 4 LOLHS/SR-54 tileset.
 *
 * Output: public/assets/images/lolhs-tiles.png
 * Size:   384 × 48 px  (8 tiles × 48×48)
 *
 * Tile layout (0-indexed columns, 1-indexed GIDs in Tiled):
 *   Col 0 / GID 1  — Highway asphalt      (passable)
 *   Col 1 / GID 2  — Athletic field grass  (passable)
 *   Col 2 / GID 3  — Red brick wall        (impassable)
 *   Col 3 / GID 4  — School interior       (passable)
 *   Col 4 / GID 5  — Sidewalk/concrete     (passable)
 *   Col 5 / GID 6  — Road stripe           (passable)
 *   Col 6 / GID 7  — Chain-link fence      (impassable)
 *   Col 7 / GID 8  — Parking lot           (passable)
 *
 * Run:  node scripts/generate-lolhs-tiles.js
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
  // GID 1: Highway asphalt
  HWY:  [ 65,  65,  70, 255],
  HWY2: [ 55,  55,  60, 255],
  HWY3: [ 75,  75,  80, 255],

  // GID 2: Athletic field grass
  FGRS: [ 55, 140,  55, 255],
  FGRS2:[ 44, 120,  44, 255],
  FGRS3:[ 68, 158,  68, 255],

  // GID 3: Red brick wall
  BRCK: [160,  70,  55, 255],
  BRCK2:[140,  58,  44, 255],
  BRCK3:[175,  85,  68, 255],
  MORT: [190, 178, 165, 255],  // mortar

  // GID 4: School interior / institutional tile
  TILE: [200, 195, 185, 255],
  TILE2:[190, 185, 175, 255],
  TILE3:[210, 205, 195, 255],

  // GID 5: Sidewalk/concrete
  CONC: [185, 185, 180, 255],
  CONC2:[175, 175, 170, 255],
  CONC3:[195, 195, 190, 255],

  // GID 6: Road stripe
  STRP: [210, 195,  50, 255],
  STRP2:[195, 180,  40, 255],
  STRP3:[225, 210,  62, 255],

  // GID 7: Chain-link fence
  FNCE: [160, 165, 160, 255],
  FNCE2:[140, 145, 140, 255],
  FNCE3:[180, 185, 180, 255],

  // GID 8: Parking lot
  PRKG: [100, 100, 105, 255],
  PRKG2:[ 88,  88,  93, 255],
  PRKG3:[112, 112, 118, 255],
};

// ── Tile renderers ────────────────────────────────────────────────────────────

/** GID 1 — Highway asphalt */
function drawHighway(canvas, ox) {
  const { rect, noise } = canvas;
  rect(ox, 0, 48, 48, C.HWY);
  noise(ox, 0, 48, 48, [C.HWY, C.HWY2, C.HWY3], 13);
}

/** GID 2 — Athletic field grass with mow lines */
function drawFieldGrass(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.FGRS);
  noise(ox, 0, 48, 48, [C.FGRS, C.FGRS2, C.FGRS3], 27);
  // Alternating mow stripes
  for (let x = ox; x < ox + 48; x += 8) {
    for (let y = 0; y < 48; y++) set(x, y, C.FGRS2);
  }
}

/** GID 3 — Red brick wall (impassable) */
function drawBrick(canvas, ox) {
  const { rect, set } = canvas;
  // Base brick color
  rect(ox, 0, 48, 48, C.BRCK);
  // Horizontal mortar lines every 8px
  for (let y = 0; y < 48; y += 8) {
    for (let x = ox; x < ox + 48; x++) set(x, y, C.MORT);
  }
  // Vertical mortar — offset alternating rows
  for (let y = 0; y < 48; y += 16) {
    // Even rows: verticals at 12, 28, 44
    for (const vx of [12, 28, 44]) set(ox + vx, y + 4, C.MORT);
    // Odd rows: verticals at 4, 20, 36
    for (const vx of [4, 20, 36]) set(ox + vx, y + 12, C.MORT);
  }
  // Brick highlights/shadows
  for (let y = 0; y < 48; y += 8) {
    for (let x = ox; x < ox + 48; x++) {
      if (y % 8 === 1) set(x, y, C.BRCK3);
      if (y % 8 === 6) set(x, y, C.BRCK2);
    }
  }
}

/** GID 4 — School interior / institutional tile */
function drawSchoolFloor(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.TILE);
  noise(ox, 0, 48, 48, [C.TILE, C.TILE2, C.TILE3], 49);
  // Grout lines every 16px
  for (let i = 0; i < 48; i += 16) {
    for (let x = ox; x < ox + 48; x++) set(x, i, C.TILE2);
    for (let y = 0; y < 48; y++) set(ox + i, y, C.TILE2);
  }
}

/** GID 5 — Sidewalk/concrete */
function drawSidewalk(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.CONC);
  noise(ox, 0, 48, 48, [C.CONC, C.CONC2, C.CONC3], 71);
  // Expansion joints
  for (let x = ox; x < ox + 48; x++) set(x, 24, C.CONC2);
  for (let y = 0; y < 48; y++) set(ox + 24, y, C.CONC2);
}

/** GID 6 — Road stripe (yellow) */
function drawStripe(canvas, ox) {
  const { rect, noise } = canvas;
  rect(ox, 0, 48, 48, C.STRP);
  noise(ox, 0, 48, 48, [C.STRP, C.STRP2, C.STRP3], 88);
}

/** GID 7 — Chain-link fence (impassable) */
function drawFence(canvas, ox) {
  const { rect, set } = canvas;
  rect(ox, 0, 48, 48, C.HWY);
  // Fence post and diamond-mesh pattern
  rect(ox + 22, 0, 4, 48, C.FNCE);  // center post
  for (let y = 0; y < 48; y += 6) {
    for (let x = 0; x < 48; x += 6) {
      set(ox + x,     y,     C.FNCE);
      set(ox + x + 3, y + 3, C.FNCE2);
    }
  }
  // Top and bottom rail
  rect(ox, 0,  48, 2, C.FNCE3);
  rect(ox, 46, 48, 2, C.FNCE3);
}

/** GID 8 — Parking lot */
function drawParking(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.PRKG);
  noise(ox, 0, 48, 48, [C.PRKG, C.PRKG2, C.PRKG3], 95);
  // Parking space line (white stripe)
  rect(ox + 23, 0, 2, 48, [230, 230, 228, 255]);
}

// ── Render all 8 tiles ────────────────────────────────────────────────────────
const TILES  = 8;
const TW     = 48;
const TH     = 48;

const canvas = makeCanvas(TILES * TW, TH);

drawHighway(canvas,    0 * TW);
drawFieldGrass(canvas, 1 * TW);
drawBrick(canvas,      2 * TW);
drawSchoolFloor(canvas,3 * TW);
drawSidewalk(canvas,   4 * TW);
drawStripe(canvas,     5 * TW);
drawFence(canvas,      6 * TW);
drawParking(canvas,    7 * TW);

// ── Write PNG ─────────────────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, '../public/assets/images/lolhs-tiles.png');
writePNG(TILES * TW, TH, canvas.toBuffer(), outPath);
