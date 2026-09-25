/**
 * مولّد أيقونات تطبيق «وِردي» — بـ Node خالص وبدون أي مكتبات خارجية.
 * يرسم الأشكال بتقنية Signed Distance Fields ثم يصدّرها كملفات PNG.
 *
 *   node tools/make_icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'icons');
const R = 1024; // دقة الرسم العالية

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
const hex = (h) => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];
const lerp3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/* ------------------------------ canvas ------------------------------ */
function newCanvas(w, h = w) {
  return {
    w,
    h,
    r: new Float32Array(w * h), // ألفا مضروبة مسبقًا (premultiplied)
    g: new Float32Array(w * h),
    b: new Float32Array(w * h),
    a: new Float32Array(w * h),
  };
}

const scratch = [0, 0, 0, 0];

/** يرسم شكلًا عبر دالة المسافة الموقّعة. shader(x,y,d) يكتب [r,g,b,a] في scratch */
function draw(cv, sdf, shader, opts = {}) {
  const { mode = 'over', spread = 1.2 } = opts;
  const x0 = Math.max(0, Math.floor(opts.x0 ?? 0));
  const y0 = Math.max(0, Math.floor(opts.y0 ?? 0));
  const x1 = Math.min(cv.w, Math.ceil(opts.x1 ?? cv.w));
  const y1 = Math.min(cv.h, Math.ceil(opts.y1 ?? cv.h));
  const { r, g, b, a: A, w: W } = cv;
  for (let y = y0; y < y1; y++) {
    const row = y * W;
    for (let x = x0; x < x1; x++) {
      const d = sdf(x + 0.5, y + 0.5);
      if (d > spread) continue;
      const cov = clamp(0.5 - d, 0, 1);
      if (cov <= 0) continue;
      scratch[0] = scratch[1] = scratch[2] = scratch[3] = 0;
      shader(x + 0.5, y + 0.5, d, cov);
      const sa = clamp(scratch[3] * cov, 0, 1);
      if (sa <= 0) continue;
      const i = row + x;
      if (mode === 'add') {
        r[i] = Math.min(1, r[i] + scratch[0] * sa);
        g[i] = Math.min(1, g[i] + scratch[1] * sa);
        b[i] = Math.min(1, b[i] + scratch[2] * sa);
        A[i] = Math.min(1, A[i] + sa);
      } else if (mode === 'erase') {
        r[i] *= 1 - sa; g[i] *= 1 - sa; b[i] *= 1 - sa; A[i] *= 1 - sa;
      } else {
        const inv = 1 - sa;
        r[i] = scratch[0] * sa + r[i] * inv;
        g[i] = scratch[1] * sa + g[i] * inv;
        b[i] = scratch[2] * sa + b[i] * inv;
        A[i] = sa + A[i] * inv;
      }
    }
  }
}

/* ------------------------------ sdf ------------------------------ */
const sdCircle = (x, y, cx, cy, rr) => Math.hypot(x - cx, y - cy) - rr;

function sdRotBox(x, y, cx, cy, hx, hy, rad, ang) {
  const dx = x - cx, dy = y - cy;
  const c = Math.cos(-ang), s = Math.sin(-ang);
  const px = dx * c - dy * s, py = dx * s + dy * c;
  const qx = Math.abs(px) - (hx - rad), qy = Math.abs(py) - (hy - rad);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - rad;
}

const sdSquare = (x, y, cx, cy, half, rad, ang) => sdRotBox(x, y, cx, cy, half, half, rad, ang);
const ring = (d, t) => Math.abs(d) - t / 2;

/* ------------------------------ palette ------------------------------ */
const C = {
  deep: hex('#04150F'),
  gold: hex('#E7C77E'),
  goldLight: hex('#FFF0C9'),
  goldDeep: hex('#C2923C'),
  teal: hex('#1FBD96'),
};

/* ------------------------------ background ------------------------------ */
function drawBackground(cv, { pattern = true, radius = 0.225, k = 1 } = {}) {
  const { w, h } = cv;
  const g1 = hex('#0F5C47');
  const g2 = hex('#04150E');

  draw(cv, () => -1, (x, y) => {
    const t = clamp((x * 0.35 + y * 0.9) / (h * 1.25), 0, 1);
    const c = lerp3(g1, g2, Math.pow(t, 0.85));
    scratch[0] = c[0]; scratch[1] = c[1]; scratch[2] = c[2]; scratch[3] = 1;
  }, { x0: 0, y0: 0, x1: w, y1: h });

  // هالة خضراء مخملية أعلى الأيقونة
  const gx = w * 0.5, gy = h * 0.2, gr = h * 0.8;
  draw(cv, (x, y) => sdCircle(x, y, gx, gy, gr), (x, y) => {
    const d = Math.hypot(x - gx, y - gy) / gr;
    const f = Math.pow(clamp(1 - d, 0, 1), 2.6) * 0.42;
    scratch[0] = C.teal[0] * 0.42; scratch[1] = C.teal[1] * 0.85; scratch[2] = C.teal[2] * 0.8;
    scratch[3] = f;
  }, { x0: gx - gr, y0: gy - gr, x1: gx + gr, y1: gy + gr, mode: 'add', spread: 4 });

  // نقش هندسي إسلامي خفيف جدًا يتلاشى نحو الأطراف
  if (pattern) {
    const step = h / 3.2;
    const half = step * 0.42;
    const cx0 = w / 2, cy0 = h / 2;
    const fadeR = Math.max(w, h) * 0.62;
    for (let cy = -step * 0.5; cy <= h + step; cy += step) {
      for (let cx = -step * 0.5; cx <= w + step; cx += step) {
        const mid = Math.hypot(cx - cx0, cy - cy0);
        const fade = Math.pow(clamp(1 - mid / fadeR, 0, 1), 1.4);
        if (fade <= 0.01) continue;
        draw(cv, (x, y) => Math.min(
          ring(sdSquare(x, y, cx, cy, half, half * 0.22, 0), 2.1 * k),
          ring(sdSquare(x, y, cx, cy, half, half * 0.22, Math.PI / 4), 2.1 * k),
        ), () => {
          scratch[0] = C.gold[0]; scratch[1] = C.gold[1]; scratch[2] = C.gold[2];
          scratch[3] = 0.075 * fade;
        }, { x0: cx - half * 1.5, y0: cy - half * 1.5, x1: cx + half * 1.5, y1: cy + half * 1.5 });
      }
    }
  }

  // ظل داخلي على الحواف يمنح عمقًا
  if (radius > 0) {
    const rad = Math.min(w, h) * radius;
    draw(cv, (x, y) => -sdRotBox(x, y, w / 2, h / 2, w / 2, h / 2, rad, 0), (x, y, d) => {
      const f = clamp(1 - d / (h * 0.13), 0, 1) * 0.2;
      scratch[0] = 0; scratch[1] = 0; scratch[2] = 0; scratch[3] = f;
    }, { x0: 0, y0: 0, x1: w, y1: h, spread: h * 0.13 });
  }
}

/* ------------------------------ emblem ------------------------------ */
/** الشعار: حلقة مسبحة + نجمة إسلامية ثمانية + قلب ذهبي */
function drawEmblem(cv, { cx, cy, s }) {
  const ringR = 316 * s;
  const beadR = 27 * s;
  const startR = 38 * s;

  // توهّج ناعم خلف الشعار
  const haloR = 520 * s;
  draw(cv, (x, y) => sdCircle(x, y, cx, cy, haloR), (x, y) => {
    const t = clamp(1 - Math.hypot(x - cx, y - cy) / haloR, 0, 1);
    scratch[0] = C.teal[0] * 0.45; scratch[1] = C.teal[1] * 0.8; scratch[2] = C.teal[2] * 0.75;
    scratch[3] = Math.pow(t, 4.2) * 0.22;
  }, { x0: cx - haloR - 2, y0: cy - haloR - 2, x1: cx + haloR + 2, y1: cy + haloR + 2, mode: 'add', spread: 6 });

  // خيط المسبحة
  draw(cv, (x, y) => ring(sdCircle(x, y, cx, cy, ringR), 3.2 * s), () => {
    scratch[0] = C.gold[0]; scratch[1] = C.gold[1]; scratch[2] = C.gold[2]; scratch[3] = 0.2;
  }, { x0: cx - ringR - 8, y0: cy - ringR - 8, x1: cx + ringR + 8, y1: cy + ringR + 8 });

  // الخرز
  const beads = 12;
  for (let i = 0; i < beads; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI * 2) / beads;
    const bx = cx + Math.cos(ang) * ringR;
    const by = cy + Math.sin(ang) * ringR;
    const isStart = i === 0;
    const rr = isStart ? startR : beadR;
    if (isStart) {
      draw(cv, (x, y) => sdCircle(x, y, bx, by, rr * 2.2), (x, y) => {
        const t = clamp(1 - Math.hypot(x - bx, y - by) / (rr * 2.2), 0, 1);
        scratch[0] = 1; scratch[1] = 0.94; scratch[2] = 0.74;
        scratch[3] = Math.pow(t, 2.6) * 0.3;
      }, { x0: bx - rr * 2.3, y0: by - rr * 2.3, x1: bx + rr * 2.3, y1: by + rr * 2.3, mode: 'add', spread: 4 });
    }
    draw(cv, (x, y) => sdCircle(x, y, bx, by, rr), (x, y) => {
      const t = clamp((x - bx) / (2 * rr) + 0.5, 0, 1) * 0.4 + clamp((y - by) / (2 * rr) + 0.5, 0, 1) * 0.6;
      const c = lerp3(C.goldLight, isStart ? C.goldDeep : hex('#C9A055'), t);
      scratch[0] = c[0]; scratch[1] = c[1]; scratch[2] = c[2]; scratch[3] = 1;
    }, { x0: bx - rr - 2, y0: by - rr - 2, x1: bx + rr + 2, y1: by + rr + 2 });
  }

  // النجمة الثمانية كإطار
  const starHalf = 176 * s;
  const thick = 21 * s;
  const cornerR = 30 * s;
  const extent = starHalf * Math.SQRT2 + 6;
  draw(cv, (x, y) => Math.min(
    ring(sdSquare(x, y, cx, cy, starHalf, cornerR, 0), thick),
    ring(sdSquare(x, y, cx, cy, starHalf, cornerR, Math.PI / 4), thick),
  ), (x, y) => {
    const t = clamp((x - cx + (y - cy)) / (2 * extent) + 0.5, 0, 1);
    const c = lerp3(hex('#FFF6DC'), C.goldDeep, t);
    scratch[0] = c[0]; scratch[1] = c[1]; scratch[2] = c[2]; scratch[3] = 1;
  }, { x0: cx - extent, y0: cy - extent, x1: cx + extent, y1: cy + extent });

  // جوهرة المركز: معيّن ذهبي مع فجوة داكنة تفصله عن الأشعة
  const coreR = 60 * s;
  const ext = coreR * 1.6;
  const gapR = coreR + 13 * s;
  const dark = hex('#06190F');
  draw(cv, (x, y) => sdSquare(x, y, cx, cy, gapR, 8 * s, Math.PI / 4), () => {
    scratch[0] = dark[0]; scratch[1] = dark[1]; scratch[2] = dark[2]; scratch[3] = 1;
  }, { x0: cx - ext, y0: cy - ext, x1: cx + ext, y1: cy + ext });
  const gem = (x, y) => sdSquare(x, y, cx, cy, coreR, 5 * s, Math.PI / 4);
  draw(cv, gem, (x, y) => {
    const t = clamp((x - cx + (y - cy)) / (2 * coreR) + 0.5, 0, 1);
    const c = lerp3(hex('#FFF8E4'), C.goldDeep, t);
    scratch[0] = c[0]; scratch[1] = c[1]; scratch[2] = c[2]; scratch[3] = 1;
  }, { x0: cx - ext, y0: cy - ext, x1: cx + ext, y1: cy + ext });
  const sparkR = 22 * s;
  draw(cv, (x, y) => sdCircle(x, y, cx, cy, sparkR), (x, y, d) => {
    const t = clamp(-d / sparkR, 0, 1);
    scratch[0] = 1; scratch[1] = 0.99; scratch[2] = 0.94;
    scratch[3] = Math.pow(t, 1.3) * 0.9;
  }, { x0: cx - sparkR * 1.2, y0: cy - sparkR * 1.2, x1: cx + sparkR * 1.2, y1: cy + sparkR * 1.2, mode: 'add', spread: sparkR * 1.2 });
}

function buildIcon({ size = R, emblem = 1, bleed = false, pattern = true, radius = 0.225 }) {
  const cv = newCanvas(size);
  drawBackground(cv, { pattern, radius: bleed ? 0 : radius, k: size / R });
  drawEmblem(cv, { cx: size / 2, cy: size / 2, s: (size / R) * emblem });
  if (!bleed) {
    const rad = size * radius;
    // نمسح ما هو خارج المربّع المستدير (إشارة سالبة = تغطية الخارج)
    draw(cv, (x, y) => -sdRotBox(x, y, size / 2, size / 2, size / 2, size / 2, rad, 0), () => {
      scratch[3] = 1;
    }, { x0: 0, y0: 0, x1: size, y1: size, mode: 'erase' });
  }
  return cv;
}

/* ------------------------------ resample + png ------------------------------ */
function resize(cv, dstW, dstH = dstW) {
  const out = newCanvas(dstW, dstH);
  const sx = cv.w / dstW, sy = cv.h / dstH;
  const { r, g, b, a } = cv;
  for (let y = 0; y < dstH; y++) {
    const y0 = y * sy, y1 = (y + 1) * sy;
    for (let x = 0; x < dstW; x++) {
      const x0 = x * sx, x1 = (x + 1) * sx;
      let sA = 0, sR = 0, sG = 0, sB = 0, ws = 0;
      for (let py = Math.floor(y0); py < Math.ceil(y1); py++) {
        const wy = Math.min(py + 1, y1) - Math.max(py, y0);
        if (wy <= 0) continue;
        for (let px = Math.floor(x0); px < Math.ceil(x1); px++) {
          const wx = Math.min(px + 1, x1) - Math.max(px, x0);
          if (wx <= 0) continue;
          const wgt = wx * wy;
          const i = py * cv.w + px;
          sR += r[i] * wgt; sG += g[i] * wgt; sB += b[i] * wgt; sA += a[i] * wgt; ws += wgt;
        }
      }
      if (ws <= 0) continue;
      const i = y * dstW + x;
      out.r[i] = sR / ws; out.g[i] = sG / ws; out.b[i] = sB / ws; out.a[i] = sA / ws;
    }
  }
  return out;
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const pngChunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
};

function encodePNG(cv) {
  const { w: W, h: H } = cv;
  const raw = Buffer.alloc(H * (W * 4 + 1));
  let p = 0;
  for (let y = 0; y < H; y++) {
    raw[p++] = 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = clamp(cv.a[i], 0, 1);
      const inv = a > 0.0001 ? 1 / a : 0;
      raw[p++] = Math.round(clamp(cv.r[i] * inv, 0, 1) * 255);
      raw[p++] = Math.round(clamp(cv.g[i] * inv, 0, 1) * 255);
      raw[p++] = Math.round(clamp(cv.b[i] * inv, 0, 1) * 255);
      raw[p++] = Math.round(a * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function icoFromPng(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

function write(name, cv) {
  const png = encodePNG(cv);
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(`  ✓ ${name.padEnd(24)} ${(png.length / 1024).toFixed(1)} KB`);
}

/* ------------------------------ run ------------------------------ */
fs.mkdirSync(OUT, { recursive: true });

console.log('• رسم الأيقونة الأساسية…');
const base = buildIcon({ size: R });
write('icon-1024.png', base);
write('icon-512.png', resize(base, 512));
write('icon-192.png', resize(base, 192));
write('icon-144.png', resize(base, 144));

console.log('• رسم أيقونات النظام…');
write('apple-touch-icon.png', resize(buildIcon({ size: R, radius: 0, emblem: 1.06 }), 180));
write('favicon-32.png', resize(buildIcon({ size: R, pattern: false, emblem: 1.12 }), 32));
write('favicon-48.png', resize(buildIcon({ size: R, pattern: false, emblem: 1.1 }), 48));
fs.writeFileSync(path.join(OUT, 'favicon.ico'), icoFromPng(fs.readFileSync(path.join(OUT, 'favicon-48.png')), 48));
console.log('  ✓ favicon.ico');

console.log('• رسم الأيقونة القابلة للقصّ (maskable)…');
const maskable = buildIcon({ size: R, bleed: true, emblem: 0.6 });
write('maskable-512.png', resize(maskable, 512));
write('maskable-1024.png', resize(maskable, 1024));

console.log('• رسم صورة المشاركة (1200×630)…');
{
  const W = 1200, H = 630;
  const cv = newCanvas(W, H);
  drawBackground(cv, { pattern: true, radius: 0, k: 1 });
  drawEmblem(cv, { cx: W * 0.5, cy: H * 0.5, s: 0.62 });
  write('og-image.png', cv);
}

console.log('\nتم إنشاء كل الأيقونات في assets/icons ✨');
