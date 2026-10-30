#!/usr/bin/env node

/**
 * ZJKVM icon generator — zero-dependency PNG writer.
 * Family mark: warm dark paper square, three ruled paper lines, and the
 * amber-gold period (the family wordmark signature). Produces:
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

/** Draw at size×size; `inset` shrinks the artwork into the maskable safe zone. */
function drawIcon(size, { inset = 0 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);

  const bg = hex("#1b1a18"); // family dark paper
  const paper = hex("#eceae4"); // ink-on-dark text color
  const gold = hex("#fec843"); // accent-strong period
  const radius = size * 0.18;

  const left = size * inset;
  const right = size * (1 - inset);
  const top = size * inset;
  const bottom = size * (1 - inset);
  const art = right - left;

  const lineH = art * 0.045;
  const lines = [0.3, 0.44, 0.58].map((f) => top + art * f);
  const lineStart = left + art * 0.18;
  const lineEnd = left + art * 0.74;

  const dotR = art * 0.13;
  const dotX = left + art * 0.66;
  const dotY = top + art * 0.66;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // outside the rounded square → transparent
      if (x < left || x >= right || y < top || y >= bottom) {
        continue; // alpha 0
      }
      const cx = Math.max(left + radius, Math.min(x, right - 1 - radius));
      const cy = Math.max(top + radius, Math.min(y, bottom - 1 - radius));
      if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) {
        continue;
      }

      let color = bg;
      // ruled paper lines
      if (x >= lineStart && x <= lineEnd && lines.some((ly) => Math.abs(y - ly) <= lineH)) {
        color = paper;
      }
      // the golden period
      if ((x - dotX) ** 2 + (y - dotY) ** 2 <= dotR ** 2) {
        color = gold;
      }

      rgba[idx] = color[0];
      rgba[idx + 1] = color[1];
      rgba[idx + 2] = color[2];
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
