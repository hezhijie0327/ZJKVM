#!/usr/bin/env node

/**
 * ZJKVM icon generator — zero-dependency PNG writer.
 * Family mark: an amber-gold keycap (KVM starts with the keyboard) closed by
 * the family period at (85,85) — the same single-glyph grammar as the ZJBlog
 * and ZJSearch marks. Ground per the family asset matrix (DESIGN.md §2.2):
 *   public/icons/icon-192.png            transparent glyph (PWA any)
 *   public/icons/icon-512.png            transparent glyph (PWA any)
 *   public/icons/icon-maskable-512.png   warm paper ground, 80% safe zone
 *   public/apple-touch-icon.png          warm paper ground, full-bleed 180
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

/** Draw the mark at size×size. Ground: null = transparent (tab icon / PWA
 *  any); "paper" = warm paper #faf9f6 full-bleed — iOS apple-touch icons
 *  must stay opaque or they composite onto black. `inset` shrinks the glyph
 *  into the maskable safe zone. Glyph layout in viewBox-100 terms: keycap
 *  outline (14,14)-(62,62) rx 12 stroke 14, period (85,85) r 7 — identical
 *  to public/favicon.svg. */
function drawIcon(size, { ground = null, inset = 0 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);

  const paper = hex("#faf9f6"); // family warm paper (light)
  const gold1 = hex("#f5c84c"); // gradient start
  const gold2 = hex("#e09f0a"); // gradient end
  const s = size / 100; // viewBox-100 scale

  const capHalf = 24 * s; // half extent of the keycap square
  const capR = 12 * s; // corner radius
  const strokeHalf = 7 * s; // outline half-width
  const cx = 38 * s;
  const cy = 38 * s;
  const dot = { x: 85 * s, y: 85 * s, r: 7 * s };

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // diagonal gold gradient, top-left → bottom-right of the canvas
      const g = clamp01((x + y) / (2 * size));
      const color = [lerp(gold1[0], gold2[0], g), lerp(gold1[1], gold2[1], g), lerp(gold1[2], gold2[2], g)];

      // rounded-rect SDF → keycap outline stroke
      const qx = Math.abs(x - cx) - (capHalf - capR);
      const qy = Math.abs(y - cy) - (capHalf - capR);
      const dist = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - capR;
      // glyph coverage: keycap stroke ∪ period, 0.75 px AA feather
      const strokeA = clamp01(strokeHalf + 0.75 - Math.abs(dist));
      const dotA = clamp01(dot.r + 0.75 - Math.hypot(x - dot.x, y - dot.y));
      const a = Math.max(strokeA, dotA);
      if (a <= 0 && ground === null) continue;

      const base = ground === "paper" ? paper : [0, 0, 0];
      rgba[idx] = Math.round(lerp(base[0], color[0], a));
      rgba[idx + 1] = Math.round(lerp(base[1], color[1], a));
      rgba[idx + 2] = Math.round(lerp(base[2], color[2], a));
      rgba[idx + 3] = ground === "paper" ? 255 : Math.round(a * 255);
    }
  }

  return encodePNG(size, size, rgba);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "icon-192.png"), drawIcon(192));
writeFileSync(join(OUT, "icon-512.png"), drawIcon(512));
writeFileSync(join(OUT, "icon-maskable-512.png"), drawIcon(512, { ground: "paper", inset: 10 }));
writeFileSync(join(HERE, "..", "public", "apple-touch-icon.png"), drawIcon(180, { ground: "paper" }));
console.log(`icons written to ${OUT}`);
