#!/usr/bin/env node
/**
 * Generates the searchable container spritesheet.
 *
 * Output: public/assets/images/container.png
 * Size:   96 × 48 px  (2 frames × 48×48)
 *
 * Frame layout (matches SearchableContainer game object):
 *   0  closed toolbox — latched, solid lid
 *   1  open/searched  — lid pivoted back, dark interior visible
 *
 * Run:  node scripts/generate-container-sprite.js
 */

import zlib from 'zlib';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  _:   [  0,   0,   0,   0], // transparent
  BG:  [107, 127, 140, 255], // steel-grey body (#6B7F8C)
  BGD: [ 45,  61,  69, 255], // dark edge/shadow (#2D3D45)
  LID: [143, 163, 173, 255], // lighter grey lid (#8FA3AD)
  LID2:[120, 140, 150, 255], // lid mid-tone (open frame)
  LAT: [184, 146,  42, 255], // latch brass (#B8922A)
  HND: [ 45,  61,  69, 255], // handle (dark bar)
  INT: [ 26,  32,  40, 255], // interior dark (#1A2028)
  RVT: [ 35,  50,  58, 255], // rivet dark
  HLT: [180, 200, 210, 255], // highlight (open lid face)
};

// ── Pixel canvas ──────────────────────────────────────────────────────────────
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

  return { set, rect, toBuffer };
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

// ── Frame 0: Closed toolbox ───────────────────────────────────────────────────
/**
 * Draws a closed toolbox at canvas offset (ox, oy).
 *
 * Layout within 48×48 frame:
 *   Lid:  x=4, y=8,  w=40, h=6   — lighter grey
 *   Body: x=4, y=14, w=40, h=26  — steel grey
 *   Left/Right/Bottom edges: 2px dark
 *   Top of lid: handle + latch
 *   Corner rivets: 2×2 dark dots
 */
function drawClosed(canvas, ox, oy) {
  const { set, rect } = canvas;
  const R = (x, y, w, h, c) => rect(ox + x, oy + y, w, h, c);
  const S = (x, y, c)       => set(ox + x, oy + y, c);

  // ── Body (steel grey) ──────────────────────────────────────────────────────
  R(4, 14, 40, 26, C.BG);

  // Body edges: left, right, bottom (2px dark)
  R(4,  14,  2, 26, C.BGD); // left edge
  R(42, 14,  2, 26, C.BGD); // right edge
  R(4,  38, 40,  2, C.BGD); // bottom edge

  // ── Lid (lighter grey, sits above body) ───────────────────────────────────
  R(4,  8, 40,  6, C.LID);

  // Lid left/right/top edges (1–2px dark)
  R(4,  8,  2,  6, C.BGD); // left
  R(42, 8,  2,  6, C.BGD); // right
  R(4,  8, 40,  1, C.BGD); // top edge of lid

  // Lid/body seam — thin dark line
  R(4, 14, 40,  1, C.BGD);

  // ── Handle (dark bar centred on top of lid) ────────────────────────────────
  R(18,  6, 12,  3, C.HND); // handle bar
  R(18,  6,  2,  3, C.BGD); // left side of handle arch
  R(28,  6,  2,  3, C.BGD); // right side

  // ── Latch (brass rectangle centred on lid front face) ─────────────────────
  R(21, 11,  6,  2, C.LAT);
  S(21, 12, C.BGD); // shadow left edge of latch
  S(26, 12, C.BGD); // shadow right edge

  // ── Corner rivets (2×2 dark at body corners) ──────────────────────────────
  R(5,  15,  2,  2, C.RVT); // top-left
  R(41, 15,  2,  2, C.RVT); // top-right
  R(5,  36,  2,  2, C.RVT); // bottom-left
  R(41, 36,  2,  2, C.RVT); // bottom-right

  // ── Keyhole (tiny detail at latch) ────────────────────────────────────────
  S(23, 12, C.BGD);
  S(24, 12, C.BGD);
}

// ── Frame 1: Open / searched toolbox ─────────────────────────────────────────
/**
 * Draws an open toolbox at canvas offset (ox, oy).
 * Lid is pivoted backward: shown as a flat strip across the back-top.
 * Interior shows dark emptied space.
 * Body and shadow identical to closed frame.
 */
function drawOpen(canvas, ox, oy) {
  const { set, rect } = canvas;
  const R = (x, y, w, h, c) => rect(ox + x, oy + y, w, h, c);
  const S = (x, y, c)       => set(ox + x, oy + y, c);

  // ── Body (same as closed) ─────────────────────────────────────────────────
  R(4, 14, 40, 26, C.BG);

  // Body edges
  R(4,  14,  2, 26, C.BGD);
  R(42, 14,  2, 26, C.BGD);
  R(4,  38, 40,  2, C.BGD);

  // ── Interior (dark opening — top of body is now open) ─────────────────────
  R(6,  15, 36, 12, C.INT);

  // Interior highlight: single bright pixel row at very top of opening
  R(6, 15, 36,  1, C.BGD);

  // ── Lid pivoted back (flat strip across top-rear of box) ─────────────────
  // In a simple 2-D fake: lid appears as a thin horizontal band at top of body,
  // angled slightly — drawn as a trapezoid approximation.
  R(4,  8, 40,  4, C.LID);   // lid face (now facing mostly up)
  R(4,  8, 40,  1, C.HLT);   // highlight on lid top surface
  R(4, 11, 40,  1, C.BGD);   // bottom edge where lid meets open body
  R(4,  8,  2,  4, C.BGD);   // left edge
  R(42, 8,  2,  4, C.BGD);   // right edge

  // ── Handle (still visible on pivoted lid) ─────────────────────────────────
  R(18,  5, 12,  3, C.HND);
  R(18,  5,  2,  3, C.BGD);
  R(28,  5,  2,  3, C.BGD);

  // ── Corner rivets (body) ──────────────────────────────────────────────────
  R(5,  27,  2,  2, C.RVT); // mid-left
  R(41, 27,  2,  2, C.RVT); // mid-right
  R(5,  36,  2,  2, C.RVT); // bottom-left
  R(41, 36,  2,  2, C.RVT); // bottom-right

  // ── Debris hint inside box (small pixel highlight = something remains) ─────
  S(22, 22, C.LID2);
  S(30, 25, C.LID2);
}

// ── Render both frames ────────────────────────────────────────────────────────
const FRAMES = 2;
const FW     = 48;
const FH     = 48;

const canvas = makeCanvas(FRAMES * FW, FH);

// Frame 0 — closed toolbox
drawClosed(canvas, 0 * FW, 0);

// Frame 1 — open/searched toolbox
drawOpen(canvas, 1 * FW, 0);

// ── Write PNG ─────────────────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, '../public/assets/images/container.png');
writePNG(FRAMES * FW, FH, canvas.toBuffer(), outPath);
