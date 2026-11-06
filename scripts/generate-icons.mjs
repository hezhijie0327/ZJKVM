#!/usr/bin/env node

/**
 * ZJKVM icon generator — zero-dependency PNG writer.
 * Family mark: an amber-gold keycap (KVM starts with the keyboard) with the
 * family period as its legend, on the warm dark paper square — the same
 * single-glyph grammar as the ZJBlog mark. Produces:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/icon-maskable-512.png  (full-bleed, 80% safe zone)
 * Run: pnpm icons
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "public", "icons");

/* ── Minimal PNG encoder (RGBA, 8-bit) ──────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // compression 0 / filter 0 / interlace 0 stay zero

  // filter byte 0 + raw rows
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── The mark ───────────────────────────────────────────────────────────── */

function hex(color) {
  return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
}

/** Draw at size×size; `inset` shrinks the artwork into the maskable safe zone.
 *  Full-bleed warm paper (the family light ground, same as ZJSearch's tile) —
 *  iOS apple-touch icons must stay opaque or they composite onto black. */
function drawIcon(size, { inset = 0 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);

  const paper = hex("#faf9f6"); // family warm paper (light)
  const gold1 = hex("#f5c84c"); // gradient start (matches favicon.svg)
  const gold2 = hex("#e09f0a"); // gradient end

  const left = size * inset;
  const top = size * inset;
  const art = size * (1 - 2 * inset);

  // Keycap: centered rounded-rect outline + the golden period as its legend.
  // Same proportions as public/favicon.svg (17/66/15, stroke 9, dot 8 @100).
  const capHalf = art * 0.33; // half extent of the keycap square
  const capR = art * 0.15; // corner radius
  const strokeHalf = art * 0.045; // outline half-width
  const cx = left + art / 2;
  const cy = top + art / 2;
  const dotR = art * 0.08;

  const lerp = (a, b, t) => a + (b - a) * t;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // diagonal gold gradient, top-left → bottom-right of the artwork
      const g = Math.min(1, Math.max(0, (x - left + (y - top)) / (2 * art)));
      const color = [lerp(gold1[0], gold2[0], g), lerp(gold1[1], gold2[1], g), lerp(gold1[2], gold2[2], g)];

      // rounded-rect SDF → keycap outline stroke (with 1 px AA feather)
      const qx = Math.abs(x - cx) - (capHalf - capR);
      const qy = Math.abs(y - cy) - (capHalf - capR);
      const dx = Math.max(qx, 0);
      const dy = Math.max(qy, 0);
      const dist = Math.min(Math.max(qx, qy), 0) + Math.hypot(dx, dy) - capR;
      const inStroke = Math.abs(dist) <= strokeHalf;
      // the golden period
      const inDot = (x - cx) ** 2 + (y - cy) ** 2 <= dotR ** 2;

      const bgOrGold = inStroke || inDot ? color : paper;
      rgba[idx] = bgOrGold[0];
      rgba[idx + 1] = bgOrGold[1];
      rgba[idx + 2] = bgOrGold[2];
      rgba[idx + 3] = 255;
    }
  }

  return encodePNG(size, size, rgba);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "icon-192.png"), drawIcon(192));
writeFileSync(join(OUT, "icon-512.png"), drawIcon(512));
writeFileSync(join(OUT, "icon-maskable-512.png"), drawIcon(512, { inset: 0.1 }));
console.log(`icons written to ${OUT}`);
