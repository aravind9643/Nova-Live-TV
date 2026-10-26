// Renders public/og.png (1200×630) — the link-preview image for WhatsApp,
// Facebook and X, which don't render SVG. Dependency-free: draws the brand
// gradient and TV mark pixel by pixel and encodes the PNG with zlib.
//
//   node scripts/og-image.mjs

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 1200;
const H = 630;
const px = Buffer.alloc(W * H * 3);

const mix = (a, b, t) => a + (b - a) * t;
const VIOLET = [124, 92, 255];
const CYAN = [34, 211, 238];
const BG = [7, 9, 15];

// Signed distance to a rounded rectangle centred at (cx, cy).
function roundRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.max(Math.abs(x - cx) - hw + r, 0);
  const dy = Math.max(Math.abs(y - cy) - hh + r, 0);
  const inside = Math.min(Math.max(Math.abs(x - cx) - hw + r, Math.abs(y - cy) - hh + r), 0);
  return Math.hypot(dx, dy) + inside - r;
}
const cover = (d) => Math.min(1, Math.max(0, 0.5 - d)); // 1px anti-aliasing

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // Background: dark base with two soft brand glows.
    const g1 = Math.max(0, 1 - Math.hypot(x - 260, y - 120) / 620) ** 2 * 0.55;
    const g2 = Math.max(0, 1 - Math.hypot(x - 1040, y - 560) / 560) ** 2 * 0.45;
    let c = BG.map((v, i) => v + VIOLET[i] * g1 + CYAN[i] * g2);

    // App tile: gradient rounded square.
    const tile = cover(roundRect(x, y, 600, 300, 170, 170, 48));
    if (tile > 0) {
      const t = ((x - 430) + (y - 130)) / 680;
      const grad = VIOLET.map((v, i) => mix(v, CYAN[i], Math.min(1, Math.max(0, t))));
      c = c.map((v, i) => mix(v, grad[i], tile));
    }

    // TV glyph in white: screen outline, antenna, stand.
    const screenOuter = roundRect(x, y, 600, 315, 100, 70, 18);
    const screenInner = roundRect(x, y, 600, 315, 84, 54, 8);
    let ink = cover(screenOuter) * (1 - cover(screenInner));
    // antenna: two strokes meeting above the screen
    for (const [x0, y0] of [[555, 195], [645, 195]]) {
      const x1 = 600;
      const y1 = 240;
      const vx = x1 - x0;
      const vy = y1 - y0;
      const t = Math.min(1, Math.max(0, ((x - x0) * vx + (y - y0) * vy) / (vx * vx + vy * vy)));
      ink = Math.max(ink, cover(Math.hypot(x - (x0 + vx * t), y - (y0 + vy * t)) - 8));
    }
    ink = Math.max(ink, cover(roundRect(x, y, 600, 410, 50, 8, 8))); // stand
    // live dot inside the screen
    ink = Math.max(ink, cover(Math.hypot(x - 600, y - 315) - 20));
    if (ink > 0) c = c.map((v) => mix(v, 255, ink));

    // Bottom bar: a "live" strip of three rounded pills, hinting at a channel row.
    for (const [cx, w] of [[460, 110], [600, 110], [740, 110]]) {
      const d = cover(roundRect(x, y, cx, 545, w / 2, 14, 14));
      if (d > 0) c = c.map((v) => mix(v, 255, d * 0.14));
    }

    const o = (y * W + x) * 3;
    px[o] = Math.min(255, c[0]);
    px[o + 1] = Math.min(255, c[1]);
    px[o + 2] = Math.min(255, c[2]);
  }
}

// ---- PNG encoding ----
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // RGB

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(new URL('../public/og.png', import.meta.url), png);
console.log(`og.png: ${(png.length / 1024).toFixed(0)} kB`);
