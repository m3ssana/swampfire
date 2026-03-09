#!/usr/bin/env node
/**
 * Generates the Zone 3 Conner Preserve tileset.
 *
 * Output: public/assets/images/conner-tiles.png
 * Size:   384 × 48 px  (8 tiles × 48×48)
 *
 * Tile layout (0-indexed columns, 1-indexed GIDs in Tiled):
 *   Col 0 / GID 1  — Pine needle ground  (passable)
 *   Col 1 / GID 2  — Marsh grass         (passable)
 *   Col 2 / GID 3  — Pine tree           (impassable)
 *   Col 3 / GID 4  — RC runway dirt      (passable)
 *   Col 4 / GID 5  — Cypress slough      (impassable)
 *   Col 5 / GID 6  — Sandy clearing      (passable)
 *   Col 6 / GID 7  — Fire tower base     (impassable)
 *   Col 7 / GID 8  — Scrub brush         (passable, decorative)
 *
 * Run:  node scripts/generate-conner-tiles.js
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
  // GID 1: Pine needle ground
  PINE: [110,  75,  45, 255],
  PINE2:[ 95,  62,  35, 255],
  PINE3:[125,  88,  55, 255],

  // GID 2: Marsh grass
  MRSH: [ 95, 110,  45, 255],
  MRSH2:[ 80,  95,  35, 255],
  MRSH3:[110, 125,  55, 255],

  // GID 3: Pine tree
  TREE: [ 30,  65,  25, 255],
  TREE2:[ 20,  50,  18, 255],
  TREE3:[ 42,  80,  32, 255],
  BARK: [ 80,  55,  30, 255],
  BARK2:[ 60,  40,  20, 255],

  // GID 4: RC runway dirt
  RUNW: [165, 145, 100, 255],
  RUNW2:[150, 130,  88, 255],
  RUNW3:[178, 160, 112, 255],

  // GID 5: Cypress slough water
  SLGH: [ 25,  65,  70, 255],
  SLGH2:[ 18,  52,  56, 255],
  SLGH3:[ 34,  80,  86, 255],
  SLGHR:[ 40,  90,  98, 255],  // ripple

  // GID 6: Sandy clearing
  SAND: [195, 175, 130, 255],
  SAND2:[180, 160, 115, 255],
  SAND3:[208, 190, 145, 255],

  // GID 7: Fire tower base
  TOWR: [120, 115, 105, 255],
  TOWR2:[105, 100,  90, 255],
  TOWR3:[135, 130, 118, 255],

  // GID 8: Scrub brush
  SCRB: [ 75,  90,  50, 255],
  SCRB2:[ 60,  75,  38, 255],
  SCRB3:[ 90, 105,  62, 255],
};

// ── Tile renderers ────────────────────────────────────────────────────────────

/** GID 1 — Pine needle ground */
function drawPineGround(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.PINE);
  noise(ox, 0, 48, 48, [C.PINE, C.PINE2, C.PINE3], 19);
  // Scattered needle streaks
  for (let y = 5; y < 48; y += 8) {
    for (let x = 3; x < 46; x += 9) {
      set(ox + x,     y, C.PINE2);
      set(ox + x + 1, y, C.PINE3);
      set(ox + x + 4, y + 2, C.PINE2);
    }
  }
}

/** GID 2 — Marsh grass */
function drawMarsh(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.MRSH);
  noise(ox, 0, 48, 48, [C.MRSH, C.MRSH2, C.MRSH3], 37);
  // Grass blade tufts
  const tufts = [[4, 30], [14, 20], [24, 36], [36, 14], [8, 42]];
  for (const [tx, ty] of tufts) {
    set(ox + tx,     ty - 5, C.MRSH3);
    set(ox + tx + 1, ty - 4, C.MRSH3);
    set(ox + tx + 2, ty - 6, C.MRSH2);
    set(ox + tx,     ty - 2, C.MRSH);
  }
}

/** GID 3 — Pine tree (impassable) */
function drawPineTree(canvas, ox) {
  const { rect, set, noise } = canvas;
  // Base ground
  rect(ox, 0, 48, 48, C.PINE);
  noise(ox, 0, 48, 48, [C.PINE, C.PINE2], 91);
  // Trunk
  rect(ox + 20, 30, 8, 18, C.BARK);
  rect(ox + 20, 30, 2, 18, C.BARK2);
  // Layered triangular canopy (3 layers)
  rect(ox + 12,  20, 24, 14, C.TREE);  // bottom layer
  rect(ox + 15,  10, 18, 14, C.TREE);  // middle
  rect(ox + 18,   2, 12, 12, C.TREE);  // top
  // Canopy shading
  rect(ox + 14,  26, 20,  6, C.TREE2);
  rect(ox + 17,  14, 14,  4, C.TREE2);
  // Highlights
  rect(ox + 20,   2,  8,  4, C.TREE3);
  rect(ox + 17,  10,  8,  3, C.TREE3);
}

/** GID 4 — RC runway dirt */
function drawRunway(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.RUNW);
  noise(ox, 0, 48, 48, [C.RUNW, C.RUNW2, C.RUNW3], 53);
  // Subtle tire tracks
  for (let y = 0; y < 48; y += 3) {
    set(ox + 18, y, C.RUNW2);
    set(ox + 29, y, C.RUNW2);
  }
}

/** GID 5 — Cypress slough water (impassable) */
function drawSlough(canvas, ox) {
  const { rect, set } = canvas;
  rect(ox, 0, 48, 48, C.SLGH);
  // Ripples
  for (let y = 5; y < 48; y += 10) {
    for (let x = 4; x < 44; x += 8) {
      set(ox + x,     y, C.SLGHR);
      set(ox + x + 1, y, C.SLGHR);
      set(ox + x + 2, y, C.SLGH3);
    }
  }
  // Murky swirls
  for (let y = 10; y < 48; y += 16) {
    for (let x = 8; x < 40; x += 12) {
      set(ox + x,     y,     C.SLGH3);
      set(ox + x + 2, y + 2, C.SLGHR);
      set(ox + x - 2, y + 2, C.SLGH2);
    }
  }
  rect(ox,      0, 48,  2, C.SLGH2);
  rect(ox,     46, 48,  2, C.SLGH2);
  rect(ox,      0,  2, 48, C.SLGH2);
  rect(ox + 46, 0,  2, 48, C.SLGH2);
}

/** GID 6 — Sandy clearing */
function drawSand(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.SAND);
  noise(ox, 0, 48, 48, [C.SAND, C.SAND2, C.SAND3], 61);
  // Wind ripple marks
  for (let y = 8; y < 48; y += 10) {
    for (let x = 5; x < 44; x += 6) {
      set(ox + x,     y, C.SAND2);
      set(ox + x + 2, y, C.SAND3);
    }
  }
}

/** GID 7 — Fire tower base (impassable) */
function drawTower(canvas, ox) {
  const { rect, set, noise } = canvas;
  rect(ox, 0, 48, 48, C.TOWR);
  noise(ox, 0, 48, 48, [C.TOWR, C.TOWR2, C.TOWR3], 83);
  // Tower leg cross-bracing
  rect(ox + 10,  4, 4, 40, C.TOWR2);  // left leg
  rect(ox + 34,  4, 4, 40, C.TOWR2);  // right leg
  rect(ox + 10,  4, 28,  4, C.TOWR2); // top brace
  rect(ox + 10, 40, 28,  4, C.TOWR2); // bottom brace
  // Diagonal cross brace (drawn as stepped pixels)
  for (let i = 0; i < 36; i++) {
    set(ox + 14 + i, 8 + i, C.TOWR3);
    set(ox + 34 - i, 8 + i, C.TOWR3);
  }
}

/** GID 8 — Scrub brush (passable, decorative) */
function drawScrub(canvas, ox) {
  const { rect, set, noise } = canvas;
  rect(ox, 0, 48, 48, C.PINE);
  noise(ox, 0, 48, 48, [C.PINE, C.PINE2], 29);
  // Scrub clumps
  const clumps = [[6, 28], [20, 16], [32, 34], [10, 40], [36, 10]];
  for (const [cx, cy] of clumps) {
    rect(ox + cx - 2, cy - 3, 8, 6, C.SCRB);
    rect(ox + cx - 1, cy - 5, 6, 4, C.SCRB3);
    set(ox + cx + 1,  cy - 6, C.SCRB2);
    set(ox + cx + 3,  cy - 4, C.SCRB3);
  }
}

// ── Render all 8 tiles ────────────────────────────────────────────────────────
const TILES  = 8;
const TW     = 48;
const TH     = 48;

const canvas = makeCanvas(TILES * TW, TH);

drawPineGround(canvas,  0 * TW);
drawMarsh(canvas,       1 * TW);
drawPineTree(canvas,    2 * TW);
drawRunway(canvas,      3 * TW);
drawSlough(canvas,      4 * TW);
drawSand(canvas,        5 * TW);
drawTower(canvas,       6 * TW);
drawScrub(canvas,       7 * TW);

// ── Write PNG ─────────────────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, '../public/assets/images/conner-tiles.png');
writePNG(TILES * TW, TH, canvas.toBuffer(), outPath);
