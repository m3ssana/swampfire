#!/usr/bin/env node
/**
 * Generates the Zone 1 (US-41 corridor) commercial strip tileset.
 *
 * Output: public/assets/images/us41-tiles.png
 * Size:   384 × 48 px  (8 tiles × 48×48)
 *
 * Tile layout (0-indexed columns, 1-indexed GIDs in Tiled):
 *   Col 0 / GID 1  — Asphalt road       (passable)
 *   Col 1 / GID 2  — Parking lot        (passable)
 *   Col 2 / GID 3  — Building wall      (impassable)
 *   Col 3 / GID 4  — Sidewalk concrete  (passable)
 *   Col 4 / GID 5  — Store interior     (passable)
 *   Col 5 / GID 6  — Road center stripe (passable)
 *   Col 6 / GID 7  — Grass strip        (passable)
 *   Col 7 / GID 8  — Chain-link fence   (impassable)
 *
 * Run:  node scripts/generate-us41-tiles.js
 */

import zlib from 'zlib';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Canvas helpers ────────────────────────────────────────────────────────────

function makeCanvas(w, h) {
  const px = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => [0, 0, 0, 0])
  );
  function set(x, y, c) {
    if (x >= 0 && x < w && y >= 0 && y < h) px[y][x] = c;
  }
  function rect(x, y, rw, rh, c) {
    for (let dy = 0; dy < rh; dy++)
      for (let dx = 0; dx < rw; dx++)
        set(x + dx, y + dy, c);
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
      rows.push(0);
      for (let x = 0; x < w; x++) rows.push(...px[y][x]);
    }
    return Buffer.from(rows);
  }
  return { set, rect, noise, toBuffer };
}

// ── PNG writer ────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const byte of buf) c = (c >>> 8) ^ CRC_TABLE[(c ^ byte) & 0xFF];
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const crc = u32(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([u32(data.length), tb, data, crc]);
}

function writePNG(w, h, rawBuf, outPath) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = pngChunk('IHDR', Buffer.concat([u32(w), u32(h), Buffer.from([8, 6, 0, 0, 0])]));
  const idat = pngChunk('IDAT', zlib.deflateSync(rawBuf, { level: 9 }));
  const iend = pngChunk('IEND', Buffer.alloc(0));
  fs.writeFileSync(outPath, Buffer.concat([sig, ihdr, idat, iend]));
  console.log(`✓  ${w}×${h} PNG written → ${path.relative(process.cwd(), outPath)}`);
}

// ── Colour palette ────────────────────────────────────────────────────────────

const C = {
  // Asphalt
  ASP:  [ 48,  48,  48, 255],
  ASP2: [ 40,  40,  40, 255],
  ASP3: [ 56,  56,  56, 255],
  ASPK: [ 36,  36,  36, 255], // crack

  // Parking lot
  PKG:  [ 82,  80,  74, 255],
  PKG2: [ 74,  72,  66, 255],
  PKG3: [ 90,  88,  82, 255],
  PKGL: [200, 190, 150, 255], // faded parking stripe

  // Building wall (brick)
  BRK:  [140,  90,  55, 255],
  BRK2: [110,  68,  38, 255],
  BRK3: [160, 110,  72, 255],
  MRT:  [180, 165, 140, 255], // mortar

  // Sidewalk
  SWK:  [175, 160, 140, 255],
  SWK2: [155, 140, 120, 255],
  SWK3: [190, 175, 155, 255],
  SWKC: [135, 120, 100, 255], // crack

  // Store floor
  FLR:  [195, 175, 125, 255],
  FLR2: [180, 160, 110, 255],
  FLR3: [205, 185, 135, 255],
  FGRP: [160, 140,  90, 255], // grout

  // Road stripe
  YLW:  [240, 190,  30, 255],
  YLW2: [220, 170,  20, 255],

  // Grass
  GRS:  [ 68, 112,  44, 255],
  GRS2: [ 54,  94,  34, 255],
  GRS3: [ 82, 132,  56, 255],

  // Fence
  FNC:  [150, 148, 144, 255],
  FNC2: [120, 118, 114, 255],
  FNCW: [180, 178, 174, 128], // wire (semi-transparent)
};

// ── Tile renderers ────────────────────────────────────────────────────────────

/** GID 1 — Asphalt road */
function drawAsphalt(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.ASP);
  noise(ox, 0, 48, 48, [C.ASP, C.ASP2, C.ASP3], 7);
  // subtle crack lines
  for (let y = 10; y < 48; y += 18) {
    set(ox + 12, y,     C.ASPK);
    set(ox + 13, y + 1, C.ASPK);
    set(ox + 32, y + 5, C.ASPK);
    set(ox + 33, y + 6, C.ASPK);
  }
}

/** GID 2 — Parking lot */
function drawParking(canvas, ox) {
  const { rect, noise, set } = canvas;
  rect(ox, 0, 48, 48, C.PKG);
  noise(ox, 0, 48, 48, [C.PKG, C.PKG2, C.PKG3], 23);
  // faded parking space stripe (vertical, left edge)
  for (let y = 0; y < 48; y++) set(ox + 2, y, C.PKGL);
  for (let y = 0; y < 48; y++) set(ox + 3, y, C.PKGL);
}

/** GID 3 — Building wall (impassable, brick) */
function drawWall(canvas, ox) {
  const { rect, set } = canvas;
  rect(ox, 0, 48, 48, C.BRK);
  // Brick course pattern: alternating horizontal rows with staggered joints
  for (let row = 0; row < 8; row++) {
    const y = row * 6;
    // mortar horizontal line
    rect(ox, y, 48, 1, C.MRT);
    // vertical joints (staggered per row)
    const offset = (row % 2) * 12;
    for (let jx = offset; jx < 48; jx += 24) {
      set(ox + jx, y + 1, C.MRT);
      set(ox + jx, y + 2, C.MRT);
      set(ox + jx, y + 3, C.MRT);
      set(ox + jx, y + 4, C.MRT);
    }
    // brick shading: highlight top, shadow bottom
    for (let bx = 0; bx < 48; bx++) {
      if (bx % 24 !== offset % 24) {
        set(ox + bx, y + 1, C.BRK3);
        set(ox + bx, y + 5, C.BRK2);
      }
    }
  }
}

/** GID 4 — Sidewalk concrete */
function drawSidewalk(canvas, ox) {
  const { rect, set, noise } = canvas;
  rect(ox, 0, 48, 48, C.SWK);
  noise(ox, 0, 48, 48, [C.SWK, C.SWK2, C.SWK3], 31);
  // expansion joints (horizontal lines every 16px)
  for (let y = 16; y < 48; y += 16) {
    rect(ox, y, 48, 1, C.SWK2);
  }
  // occasional crack
  set(ox + 20, 8,  C.SWKC);
  set(ox + 21, 9,  C.SWKC);
  set(ox + 22, 10, C.SWKC);
  set(ox + 36, 30, C.SWKC);
  set(ox + 37, 31, C.SWKC);
}

/** GID 5 — Store interior floor */
function drawFloor(canvas, ox) {
  const { rect, set } = canvas;
  rect(ox, 0, 48, 48, C.FLR);
  // 16×16 tile grid (grout lines)
  for (let y = 0; y < 48; y += 16) rect(ox, y, 48, 1, C.FGRP);
  for (let x = 0; x < 48; x += 16) {
    for (let y = 0; y < 48; y++) set(ox + x, y, C.FGRP);
  }
  // tile fill with slight variation
  for (let ty = 0; ty < 3; ty++)
    for (let tx = 0; tx < 3; tx++) {
      const shade = ((tx + ty) % 2 === 0) ? C.FLR : C.FLR2;
      rect(ox + tx * 16 + 1, ty * 16 + 1, 14, 14, shade);
    }
}

/** GID 6 — Road center stripe (asphalt + yellow dash) */
function drawStripe(canvas, ox) {
  const { rect, noise, set } = canvas;
  // asphalt base
  rect(ox, 0, 48, 48, C.ASP);
  noise(ox, 0, 48, 48, [C.ASP, C.ASP2, C.ASP3], 11);
  // dashed yellow center line
  for (let y = 0; y < 48; y++) {
    if ((y % 16) < 10) {
      set(ox + 22, y, C.YLW);
      set(ox + 23, y, C.YLW);
      set(ox + 24, y, C.YLW2);
    }
  }
}

/** GID 7 — Grass strip */
function drawGrassStrip(canvas, ox) {
  const { rect, set, noise } = canvas;
  rect(ox, 0, 48, 48, C.GRS);
  noise(ox, 0, 48, 48, [C.GRS, C.GRS2, C.GRS3], 53);
  // taller grass blades
  for (let gx = 4; gx < 48; gx += 8) {
    set(ox + gx,     6, C.GRS3);
    set(ox + gx + 1, 4, C.GRS3);
    set(ox + gx + 4, 8, C.GRS2);
    set(ox + gx + 5, 6, C.GRS3);
    set(ox + gx,    30, C.GRS3);
    set(ox + gx + 2,28, C.GRS2);
  }
}

/** GID 8 — Chain-link fence (impassable) */
function drawFence(canvas, ox) {
  const { rect, set, noise } = canvas;
  // concrete post base
  rect(ox, 0, 48, 48, C.PKG2);
  noise(ox, 0, 48, 48, [C.PKG2, C.PKG, C.PKG3], 67);
  // vertical posts every 12px
  for (let px2 = 0; px2 < 48; px2 += 12) {
    rect(ox + px2, 0, 3, 48, C.FNC);
    rect(ox + px2 + 1, 0, 1, 48, C.FNC2);
  }
  // horizontal rails
  rect(ox, 10, 48, 2, C.FNC);
  rect(ox, 22, 48, 2, C.FNC);
  rect(ox, 34, 48, 2, C.FNC);
  // chain-link diamond pattern
  for (let y = 0; y < 48; y += 6) {
    for (let x = 0; x < 48; x += 6) {
      set(ox + x,     y,     C.FNCW);
      set(ox + x + 3, y + 3, C.FNCW);
    }
  }
}

// ── Render all 8 tiles ────────────────────────────────────────────────────────

const TILES = 8;
const TW    = 48;
const TH    = 48;

const canvas = makeCanvas(TILES * TW, TH);

drawAsphalt(canvas,   0 * TW);
drawParking(canvas,   1 * TW);
drawWall(canvas,      2 * TW);
drawSidewalk(canvas,  3 * TW);
drawFloor(canvas,     4 * TW);
drawStripe(canvas,    5 * TW);
drawGrassStrip(canvas,6 * TW);
drawFence(canvas,     7 * TW);

const outPath = path.resolve(__dirname, '../public/assets/images/us41-tiles.png');
writePNG(TILES * TW, TH, canvas.toBuffer(), outPath);
