// Generates the PWA PNG icons (purple rounded square with an open-book mark)
// without any image dependencies — plain pixels + zlib + PNG chunks.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const INK = [0x4c, 0x2a, 0x85, 255];
const PAGE = [0xed, 0xe7, 0xf6, 255];
const CLEAR = [0, 0, 0, 0];

function crc32(buf) {
  let c,
    table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixelFn) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x / size, y / size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// u, v in [0,1). Rounded purple square with a light open-book glyph.
function pixel(u, v) {
  const r = 0.21; // corner radius
  const cx = Math.min(Math.max(u, r), 1 - r);
  const cy = Math.min(Math.max(v, r), 1 - r);
  if (Math.hypot(u - cx, v - cy) > r) return CLEAR;

  // Open book: two mirrored page quads between y 0.24..0.76, x 0.22..0.78,
  // meeting at a spine at x = 0.5 with a slight dip at the top center.
  const inBookX = u > 0.22 && u < 0.78;
  const inBookY = v > 0.24 && v < 0.76;
  if (inBookX && inBookY) {
    const d = Math.abs(u - 0.5);
    const topEdge = 0.24 + 0.07 * (1 - Math.min(d / 0.28, 1)); // dip near spine
    if (v > topEdge && d > 0.016) return PAGE;
  }
  return INK;
}

mkdirSync('public', { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, png(size, pixel));
  console.log(`wrote public/icon-${size}.png`);
}
