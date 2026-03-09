#!/usr/bin/env node
/**
 * Generates the Zone 2 Collier Commons tileset.
 *
 * Output: public/assets/images/collier-tiles.png
 * Size:   384 × 48 px  (8 tiles × 48×48)
 *
 * Tile layout (0-indexed columns, 1-indexed GIDs in Tiled):
 *   Col 0 / GID 1  — Beige sidewalk/pavement (passable)
 *   Col 1 / GID 2  — Parking lot asphalt     (passable)
 *   Col 2 / GID 3  — Building wall           (impassable)
 *   Col 3 / GID 4  — Store interior floor    (passable)
 *   Col 4 / GID 5  — Grass                   (passable)
 *   Col 5 / GID 6  — Retention pond water    (impassable)
 *   Col 6 / GID 7  — Road/asphalt            (passable)
 *   Col 7 / GID 8  — Decorative tile accent  (passable)
 *
 * Run:  node scripts/generate-collier-tiles.js
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
  // GID 1: Beige sidewalk
  SID:  [210, 195, 165, 255],
  SID2: [200, 185, 155, 255],
  SID3: [220, 205, 175, 255],

  // GID 2: Parking lot asphalt
  PARK: [ 80,  80,  85, 255],
  PARK2:[ 70,  70,  75, 255],
  PARK3:[ 90,  90,  95, 255],

  // GID 3: Building wall / stucco
  WALL: [195, 175, 140, 255],
  WALL2:[185, 165, 130, 255],
  WALL3:[205, 185, 150, 255],

  // GID 4: Store interior floor
  FLOR: [220, 215, 205, 255],
  FLOR2:[210, 205, 195, 255],
  FLOR3:[230, 225, 215, 255],

  // GID 5: Manicured grass
  GRS:  [ 80, 130,  50, 255],
  GRS2: [ 70, 115,  40, 255],
  GRS3: [ 95, 145,  60, 255],

  // GID 6: Retention pond water
  POND: [ 60, 100, 120, 255],
  POND2:[ 50,  88, 108, 255],
  POND3:[ 72, 115, 135, 255],
  PONDR:[ 80, 130, 150, 255],  // ripple highlight

  // GID 7: Road
  ROAD: [ 70,  70,  75, 255],
  ROAD2:[ 60,  60,  65, 255],
  ROAD3:[ 80,  80,  85, 255],

  // GID 8: Terra cotta accent
  TERR: [185, 105,  60, 255],
  TERR2:[170,  90,  48, 255],
  TERR3:[200, 120,  72, 255],
};

// ── Tile renderers ────────────────────────────────────────────────────────────

/** GID 1 — Beige sidewalk with subtle grid lines */
function drawSidewalk(canvas, ox) {
  const { rect, set, noise } = canvas;
  rect(ox, 0, 48, 48, C.SID);
  noise(ox, 0, 48, 48, [C.SID, C.SID2, C.SID3], 11);
  // Subtle grid lines every 16px
  for (let i = 0; i <= 48; i += 16) {
    for (let x = ox; x < ox + 48; x++) set(x, i % 48 === 0 ? 0 : i, C.SID2);
    for (let y = 0; y < 48; y++) set(ox + (i % 48 === 0 ? 0 : i), y, C.SID2);
  }
}

/** GID 2 — Parking lot asphalt */
function drawParking(canvas, ox) {
  const { rect, noise } = canvas;
  rect(ox, 0, 48, 48, C.PARK);
  noise(ox, 0, 48, 48, [C.PARK, C.PARK2, C.PARK3], 77);
}

/** GID 3 — Building wall / stucco (impassable) */
function drawWall(canvas, ox) {
  const { rect, set, noise } = canvas;
  rect(ox, 0, 48, 48, C.WALL);
  noise(ox, 0, 48, 48, [C.WALL, C.WALL2, C.WALL3], 33);
  // Top ledge
  rect(ox, 0, 48, 3, C.WALL3);
  // Subtle stucco dividers
  for (let y = 12; y < 48; y += 12) {
    for (let x = ox; x < ox + 48; x++) set(x, y, C.WALL2);
  }
}

/** GID 4 — Store interior floor */
function drawFloor(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.FLOR);
  noise(ox, 0, 48, 48, [C.FLOR, C.FLOR2, C.FLOR3], 55);
  // Tile grout lines every 16px
  for (let i = 0; i < 48; i += 16) {
    for (let x = ox; x < ox + 48; x++) set(x, i, C.FLOR2);
    for (let y = 0; y < 48; y++) set(ox + i, y, C.FLOR2);
  }
}

/** GID 5 — Manicured grass */
function drawGrass(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.GRS);
  noise(ox, 0, 48, 48, [C.GRS, C.GRS2, C.GRS3], 22);
  // Mow lines
  for (let y = 0; y < 48; y += 6) {
    for (let x = ox; x < ox + 48; x++) set(x, y, C.GRS2);
  }
}

/** GID 6 — Retention pond water (impassable) with ripples */
function drawPond(canvas, ox) {
  const { rect, set } = canvas;
  rect(ox, 0, 48, 48, C.POND);
  // Horizontal ripple lines
  for (let y = 6; y < 48; y += 9) {
    for (let x = 3; x < 45; x += 7) {
      set(ox + x,     y, C.PONDR);
      set(ox + x + 1, y, C.PONDR);
      set(ox + x + 2, y, C.POND3);
    }
  }
  // Diagonal ripple accent
  for (let y = 12; y < 48; y += 14) {
    for (let x = 6; x < 42; x += 8) {
      set(ox + x,     y + 1, C.POND3);
      set(ox + x + 3, y,     C.PONDR);
    }
  }
  // Darker edge
  rect(ox,      0, 48,  2, C.POND2);
  rect(ox,     46, 48,  2, C.POND2);
  rect(ox,      0,  2, 48, C.POND2);
  rect(ox + 46, 0,  2, 48, C.POND2);
}

/** GID 7 — Road/asphalt */
function drawRoad(canvas, ox) {
  const { rect, noise } = canvas;
  rect(ox, 0, 48, 48, C.ROAD);
  noise(ox, 0, 48, 48, [C.ROAD, C.ROAD2, C.ROAD3], 44);
}

/** GID 8 — Decorative terra cotta accent tile */
function drawTerracotta(canvas, ox) {
  const { rect, set, noise } = canvas;
  rect(ox, 0, 48, 48, C.TERR);
  noise(ox, 0, 48, 48, [C.TERR, C.TERR2, C.TERR3], 66);
  // Diamond pattern accent
  for (let y = 6; y < 48; y += 12) {
    for (let x = 6; x < 48; x += 12) {
      set(ox + x,     y,     C.TERR3);
      set(ox + x - 1, y + 1, C.TERR2);
      set(ox + x + 1, y + 1, C.TERR2);
      set(ox + x,     y + 2, C.TERR3);
    }
  }
}

// ── Render all 8 tiles ────────────────────────────────────────────────────────
const TILES  = 8;
const TW     = 48;
const TH     = 48;

const canvas = makeCanvas(TILES * TW, TH);

drawSidewalk(canvas,    0 * TW);
drawParking(canvas,     1 * TW);
drawWall(canvas,        2 * TW);
drawFloor(canvas,       3 * TW);
drawGrass(canvas,       4 * TW);
drawPond(canvas,        5 * TW);
drawRoad(canvas,        6 * TW);
drawTerracotta(canvas,  7 * TW);

// ── Write PNG ─────────────────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, '../public/assets/images/collier-tiles.png');
writePNG(TILES * TW, TH, canvas.toBuffer(), outPath);
