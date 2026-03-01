#!/usr/bin/env node
/**
 * Generates Juan's pixel art spritesheet.
 *
 * Output: public/assets/images/player.png
 * Size:   192 × 48 px  (4 frames × 48×48)
 *
 * Frame layout (matches player.js animation keys):
 *   0  idle — neutral stance
 *   1  idle — subtle body-up bob (+1 life to the idle loop)
 *   2  walk — left leg forward
 *   3  walk — right leg forward
 *
 * Character: Juan — bald Hispanic man, short beard, black-framed glasses,
 *            olive work shirt, tool belt, cargo pants, dark work boots.
 *
 * Run:  node scripts/generate-juan-sprite.js
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
  S:   [200, 132,  75, 255], // skin (warm medium brown)
  SD:  [158,  98,  50, 255], // skin shadow
  SL:  [222, 164, 108, 255], // skin highlight
  BE:  [ 50,  32,  18, 255], // beard (very dark brown)
  BEL: [ 70,  48,  28, 255], // beard lighter edge
  G:   [ 16,  16,  16, 255], // glasses frame (near-black)
  EW:  [232, 222, 200, 255], // eye white
  EP:  [ 16,  16,  16, 255], // eye pupil
  SH:  [ 72, 108,  55, 255], // shirt (olive green)
  SHD: [ 50,  80,  36, 255], // shirt shadow
  SHL: [ 96, 134,  74, 255], // shirt highlight
  TL:  [136, 104,  18, 255], // tool belt leather
  TLD: [100,  76,  12, 255], // tool belt shadow
  BK:  [196, 162,  76, 255], // belt buckle (brass)
  P:   [136, 112,  76, 255], // cargo pants (khaki)
  PD:  [104,  84,  52, 255], // pants shadow
  W:   [ 38,  22,  10, 255], // work boot dark
  WL:  [ 58,  36,  18, 255], // work boot highlight
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

// ── Character renderer ────────────────────────────────────────────────────────
/**
 * Draw Juan at canvas offset (ox, oy).
 *
 * opts:
 *   dy     — whole-body vertical offset (idle bob)
 *   lLegDy — left-leg extra Y offset  (walk animation)
 *   rLegDy — right-leg extra Y offset (walk animation)
 */
function drawJuan(canvas, ox, oy, opts = {}) {
  const { dy = 0, lLegDy = 0, rLegDy = 0 } = opts;
  const { set, rect } = canvas;

  // shorthand rect relative to character origin
  const R  = (x, y, w, h, c) => rect(ox + x, oy + y,       w, h, c);
  const RB = (x, y, w, h, c) => rect(ox + x, oy + y + dy,  w, h, c); // body shift
  const S  = (x, y, c)       => set(ox + x, oy + y,        c);
  const SB = (x, y, c)       => set(ox + x, oy + y + dy,   c); // body shift

  // ── HEAD (no dy — head stays stable so glasses/beard read clearly) ─────────

  // Bald dome — top curve
  R(19,  4, 10,  1, C.S);
  R(17,  5, 14,  1, C.S);
  R(16,  6, 16,  1, C.SL);  // highlight strip across dome
  R(15,  7, 18,  5, C.S);   // main skull block
  R(16, 12, 16,  2, C.S);   // lower skull / cheek area

  // Ear stubs (darker skin)
  R(13,  9,  2,  4, C.SD);
  R(33,  9,  2,  4, C.SD);

  // ── GLASSES ─────────────────────────────────────────────────────────────────
  // Left lens frame (7×3)
  R(15, 10,  7,  3, C.G);
  // Right lens frame (7×3)
  R(26, 10,  7,  3, C.G);
  // Bridge between lenses
  R(22, 11,  4,  1, C.G);

  // Eye whites inside left lens
  R(16, 11,  5,  1, C.EW);
  // Eye whites inside right lens
  R(27, 11,  5,  1, C.EW);

  // Pupils
  S(18, 11, C.EP);
  S(29, 11, C.EP);

  // ── BEARD (short, covers lower half of face) ─────────────────────────────
  R(15, 13, 18,  3, C.BE);  // main beard block
  R(16, 16, 16,  1, C.BE);  // lower beard row
  R(17, 17, 14,  1, C.BEL); // bottom tapered edge / lighter
  R(19, 18, 10,  1, C.BEL); // chin centre, lighter fade

  // Skin showing at jaw edges (natural fade at edges)
  S(15, 14, C.SD); S(32, 14, C.SD);
  S(15, 15, C.SD); S(32, 15, C.SD);

  // ── NECK ──────────────────────────────────────────────────────────────────
  RB(20, 19,  8,  3, C.SD);
  RB(21, 19,  6,  3, C.S);

  // ── TORSO (shifts with dy) ────────────────────────────────────────────────
  // Shoulders (wider than body)
  RB(10, 22, 28,  2, C.SH);
  RB(10, 22,  3,  2, C.SHD);  // left shoulder shadow
  RB(35, 22,  3,  2, C.SHD);  // right shoulder shadow

  // Shirt body
  RB(12, 24, 24, 10, C.SH);
  RB(12, 24,  2, 10, C.SHD);  // left body shadow
  RB(34, 24,  2, 10, C.SHD);  // right body shadow
  RB(14, 24, 20,  1, C.SHL);  // top highlight stripe

  // ── TOOL BELT ────────────────────────────────────────────────────────────
  RB(12, 32, 24,  3, C.TL);
  RB(12, 32,  2,  3, C.TLD);  // belt left shadow
  RB(34, 32,  2,  3, C.TLD);  // belt right shadow
  // Buckle (brass, centre)
  RB(21, 33,  6,  1, C.BK);
  // Small pouch on right
  RB(29, 32,  5,  3, C.TLD);

  // ── LEGS (individually shifted for walk animation) ────────────────────────
  const lLY = dy + lLegDy;
  const rLY = dy + rLegDy;

  // Left leg
  rect(ox + 12, oy + 35 + lLY, 10,  9, C.P);
  rect(ox + 12, oy + 35 + lLY,  2,  9, C.PD);  // left shadow
  rect(ox + 20, oy + 35 + lLY,  2,  9, C.PD);  // right shadow

  // Right leg
  rect(ox + 26, oy + 35 + rLY, 10,  9, C.P);
  rect(ox + 26, oy + 35 + rLY,  2,  9, C.PD);  // left shadow
  rect(ox + 34, oy + 35 + rLY,  2,  9, C.PD);  // right shadow

  // Crotch gap / pocket seam
  RB(22, 34,  4,  2, C.PD);

  // ── BOOTS ─────────────────────────────────────────────────────────────────
  // Left boot
  rect(ox + 11, oy + 44 + lLY, 12,  4, C.W);
  rect(ox + 12, oy + 44 + lLY, 10,  1, C.WL); // toe highlight
  rect(ox + 11, oy + 47 + lLY, 12,  1, C.WL); // sole

  // Right boot
  rect(ox + 25, oy + 44 + rLY, 12,  4, C.W);
  rect(ox + 26, oy + 44 + rLY, 10,  1, C.WL);
  rect(ox + 25, oy + 47 + rLY, 12,  1, C.WL);
}

// ── Render all 4 frames ───────────────────────────────────────────────────────
const FRAMES = 4;
const FW     = 48;
const FH     = 48;

const canvas = makeCanvas(FRAMES * FW, FH);

// Frame 0 — idle, neutral
drawJuan(canvas, 0 * FW, 0, {});

// Frame 1 — idle, body up 1px (breathing bob)
drawJuan(canvas, 1 * FW, 0, { dy: -1 });

// Frame 2 — walk, left leg forward (down), right leg back (up)
drawJuan(canvas, 2 * FW, 0, { lLegDy: 1, rLegDy: -1 });

// Frame 3 — walk, right leg forward (down), left leg back (up)
drawJuan(canvas, 3 * FW, 0, { lLegDy: -1, rLegDy: 1 });

// ── Write PNG ─────────────────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, '../public/assets/images/player.png');
writePNG(FRAMES * FW, FH, canvas.toBuffer(), outPath);
