// 生成扩展图标：蓝色圆角底 + 白色图片图形(山+太阳) + 绿色下载角标。
// 用 4x 超采样做抗锯齿，输出 16/32/48/128 四种尺寸 PNG。
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("src/icons");
const SIZES = [16, 32, 48, 128];
const SS = 4; // 超采样倍数

// ---------- 颜色 ----------
const BG_TOP = [59, 130, 246]; // #3b82f6
const BG_BOT = [37, 99, 235]; // #2563eb
const WHITE = [255, 255, 255];
const SUN = [245, 158, 11]; // #f59e0b
const MOUNT = [37, 99, 235]; // 山用底色蓝
const BADGE = [22, 163, 74]; // #16a34a 绿
const TRANSPARENT = [0, 0, 0, 0];

// ---------- 几何辅助(归一化坐标 0..1) ----------
function insideRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  if (x < x0 + r && y < y0 + r) return dx * dx + dy * dy <= r * r;
  if (x > x1 - r && y < y0 + r) return dx * dx + dy * dy <= r * r;
  if (x < x0 + r && y > y1 - r) return dx * dx + dy * dy <= r * r;
  if (x > x1 - r && y > y1 - r) return dx * dx + dy * dy <= r * r;
  return true;
}
function insideCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}
function insideTri(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

// ---------- 单点着色(画家顺序，返回 [r,g,b,a]) ----------
function shade(x, y) {
  // 透明区域之外：圆角底
  let col = null;

  // 背景圆角方块
  if (insideRoundRect(x, y, 0.02, 0.02, 0.98, 0.98, 0.22)) {
    const t = (y - 0.02) / 0.96;
    col = [
      Math.round(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t),
      Math.round(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t),
      Math.round(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t),
      255,
    ];
  } else {
    return TRANSPARENT;
  }

  // 白色图片卡
  const cx0 = 0.18,
    cy0 = 0.2,
    cx1 = 0.82,
    cy1 = 0.66;
  if (insideRoundRect(x, y, cx0, cy0, cx1, cy1, 0.06)) {
    col = [...WHITE, 255];
    // 太阳
    if (insideCircle(x, y, 0.33, 0.31, 0.055)) col = [...SUN, 255];
    // 山(两座三角)——裁剪在卡片内部底部
    const inCard = y > cy0 && y < cy1 - 0.02 && x > cx0 + 0.02 && x < cx1 - 0.02;
    if (inCard) {
      if (insideTri(x, y, 0.5, 0.4, 0.66, 0.64, 0.34, 0.64)) col = [...MOUNT, 255];
      if (insideTri(x, y, 0.65, 0.46, 0.8, 0.64, 0.5, 0.64)) col = [...MOUNT, 255];
    }
  }

  // 绿色下载角标(右下，叠在卡片上方)
  const bx = 0.72,
    by = 0.73,
    br = 0.22;
  if (insideCircle(x, y, bx, by, br)) {
    col = [...BADGE, 255];
    // 白色下箭头：竖杆 + 箭头 + 托盘
    const shaft = x > bx - 0.035 && x < bx + 0.035 && y > by - 0.1 && y < by + 0.02;
    const head = insideTri(x, y, bx, by + 0.1, bx - 0.08, by + 0.0, bx + 0.08, by + 0.0);
    const tray = x > bx - 0.09 && x < bx + 0.09 && y > by + 0.08 && y < by + 0.115;
    if (shaft || head || tray) col = [...WHITE, 255];
  }

  return col;
}

// ---------- 渲染 + 超采样 ----------
function renderRGBA(size) {
  const buf = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (px + (sx + 0.5) / SS) / size;
          const ny = (py + (sy + 0.5) / SS) / size;
          const c = shade(nx, ny);
          const ca = c[3] ?? 0;
          r += c[0] * ca;
          g += c[1] * ca;
          b += c[2] * ca;
          a += ca;
        }
      }
      const n = SS * SS;
      const o = (py * size + px) * 4;
      if (a > 0) {
        buf[o] = Math.round(r / a);
        buf[o + 1] = Math.round(g / a);
        buf[o + 2] = Math.round(b / a);
        buf[o + 3] = Math.round(a / n);
      } else {
        buf[o] = buf[o + 1] = buf[o + 2] = buf[o + 3] = 0;
      }
    }
  }
  return buf;
}

// ---------- PNG 编码 ----------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const cd = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cd));
  return Buffer.concat([len, cd, crc]);
}
function encodePNG(rgba, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    rgba.copy(raw, o, y * size * 4, (y + 1) * size * 4);
    o += size * 4;
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- 主流程 ----------
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const png = encodePNG(renderRGBA(size), size);
  const file = path.join(OUT_DIR, `icon${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}
