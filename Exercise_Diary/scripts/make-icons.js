// HiddenReps 앱 아이콘 생성: 아령(메인) + 스톱워치(작은 배지) 조합.
// 아이콘 시안 리뷰에서 "N3 — 아령이 메인" 안으로 확정됨 (배지는 서로 안 닿게 간격을 둠).
// 색상은 src/theme.ts의 다크(background)+마젠타(primary) 팔레트로 통일.
// 실행: node scripts/make-icons.js  (→ assets/ 아래 6개 PNG 재생성)
// 의존성 없이 PNG를 직접 인코딩한다 (RGBA, zlib은 node 내장)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- PNG 인코더 ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

// alpha: false로 주면 24-bit RGB(알파 채널 없음)로 인코딩한다.
// Play 스토어 피처 그래픽처럼 "no alpha" 요건이 있는 에셋용.
function encodePng(width, height, rgba, { alpha = true } = {}) {
  const bpp = alpha ? 4 : 3;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = alpha ? 6 : 2; // RGBA : RGB
  const stride = width * bpp;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    if (alpha) {
      rgba.copy(raw, y * (stride + 1) + 1, y * width * 4, (y + 1) * width * 4);
    } else {
      for (let x = 0; x < width; x++) {
        const src = (y * width + x) * 4;
        const dst = y * (stride + 1) + 1 + x * 3;
        raw[dst] = rgba[src];
        raw[dst + 1] = rgba[src + 1];
        raw[dst + 2] = rgba[src + 2];
      }
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- 도형 (1024 좌표계 기준 SDF) ----------
function distSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)));
  const dx = px - (ax + abx * t), dy = py - (ay + aby * t);
  return Math.hypot(dx, dy);
}

function sdRoundBox(x, y, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(x - cx) - halfW + r;
  const qy = Math.abs(y - cy) - halfH + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}
function rotate(x, y, cx, cy, deg) {
  const t = (deg * Math.PI) / 180;
  const dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(t) + dy * Math.sin(t), cy - dx * Math.sin(t) + dy * Math.cos(t)];
}

// 아령(바 + 안쪽/바깥쪽 2단 원판), 로컬 좌표계(512,512 중심)에 정의 — 회전은 좌표계를
// 통째로 돌려서 원판이 바와 어긋나지 않게 한다.
function dumbbellLocal(x, y, angleDeg) {
  const [rx, ry] = rotate(x, y, 512, 512, angleDeg);
  return Math.min(
    distSeg(rx, ry, 330, 512, 694, 512) - 26,
    sdRoundBox(rx, ry, 296, 512, 40, 108, 20),
    sdRoundBox(rx, ry, 184, 512, 62, 168, 30),
    sdRoundBox(rx, ry, 728, 512, 40, 108, 20),
    sdRoundBox(rx, ry, 840, 512, 62, 168, 30)
  );
}
// 로컬 아령을 원하는 위치·크기·각도로 재배치
function dumbbellAt(x, y, cx, cy, scale, angleDeg) {
  const lx = (x - cx) / scale + 512;
  const ly = (y - cy) / scale + 512;
  return dumbbellLocal(lx, ly, angleDeg) * scale;
}
// 스톱워치(링 + 크라운 + 시침 2개 + 중심점), 반지름 R 기준 상대 크기
function stopwatchAt(x, y, cx, cy, R) {
  const thick = R * 0.155;
  const ring = Math.abs(sdCircle(x, y, cx, cy, R)) - thick;
  const crownH = R * 0.26, crownW = R * 0.19;
  const crown = sdRoundBox(x, y, cx, cy - R - crownH * 0.55, crownW, crownH, crownH * 0.4);
  const hand1 = distSeg(x, y, cx, cy, cx, cy - R * 0.56) - R * 0.085;
  const hand2 = distSeg(x, y, cx, cy, cx + R * 0.34, cy - R * 0.23) - R * 0.075;
  const hub = sdCircle(x, y, cx, cy, R * 0.1);
  return Math.min(ring, crown, hand1, hand2, hub);
}

// 아령(메인) + 스톱워치(우하단 작은 배지). 반환: 흰색 커버리지에 쓸 signed distance (음수 = 내부)
function motifSdf(x, y) {
  return Math.min(
    dumbbellAt(x, y, 452, 452, 0.8, -14),
    stopwatchAt(x, y, 806, 806, 96)
  );
}

function gradientBg(y, size) {
  const t = y / size;
  const top = [0x9b, 0x27, 0x91]; // colors.primary
  const bottom = [0x6d, 0x1b, 0x66]; // colors.primaryPressed
  return top.map((c, i) => Math.round(c + (bottom[i] - c) * t));
}

// mode: icon(배경+실루엣) | foreground(투명+실루엣 축소) | background(배경만) | monochrome(투명+흰 실루엣 축소)
function render(size, mode, motifScale = 1, motifColor = [255, 255, 255]) {
  const rgba = Buffer.alloc(size * size * 4);
  const toRef = (v) => (v * 1024) / size; // 픽셀 → 1024 기준 좌표
  for (let y = 0; y < size; y++) {
    const bg = gradientBg(y, size);
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let r = 0, g = 0, b = 0, a = 0;
      if (mode === 'icon' || mode === 'background') {
        [r, g, b] = bg;
        a = 255;
      }
      if (mode !== 'background') {
        // 축소는 중심(512) 기준: 도형 좌표계로 역변환 후 거리도 같이 스케일
        const rx = (toRef(x + 0.5) - 512) / motifScale + 512;
        const ry = (toRef(y + 0.5) - 512) / motifScale + 512;
        const sd = motifSdf(rx, ry) * motifScale / toRef(1); // 픽셀 단위 거리
        const cov = Math.max(0, Math.min(1, 0.5 - sd));
        if (cov > 0) {
          r = Math.round(r + (motifColor[0] - r) * cov);
          g = Math.round(g + (motifColor[1] - g) * cov);
          b = Math.round(b + (motifColor[2] - b) * cov);
          a = Math.max(a, Math.round(255 * cov));
        }
      }
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
    }
  }
  return encodePng(size, size, rgba);
}

// Play 스토어 피처 그래픽(1024x500) — 아이콘의 아령 모티프만 가로로 넓게 재배치.
// no-alpha 요건이라 encodePng(..., { alpha: false })로 인코딩한다.
function renderFeatureGraphic() {
  const width = 1024, height = 500;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const bg = gradientBg(y, height);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let [r, g, b] = bg;
      const sd = dumbbellAt(x, y, 512, 250, 1.0, -14);
      const cov = Math.max(0, Math.min(1, 0.5 - sd));
      if (cov > 0) {
        r = Math.round(r + (255 - r) * cov);
        g = Math.round(g + (255 - g) * cov);
        b = Math.round(b + (255 - b) * cov);
      }
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
    }
  }
  return encodePng(width, height, rgba, { alpha: false });
}

const outDir = process.argv[2] || path.join(__dirname, '..', 'assets');
// 스토어 등록용 그래픽은 앱 번들에 포함될 필요가 없으므로 별도 폴더에 둔다.
const storeDir = path.join(__dirname, '..', 'store-assets', 'android');
const jobs = [
  ['icon.png', render(1024, 'icon'), outDir],
  ['android-icon-foreground.png', render(1024, 'foreground', 0.62), outDir], // 어댑티브 세이프존
  ['android-icon-background.png', render(1024, 'background'), outDir],
  ['favicon.png', render(196, 'icon'), outDir],
  // 스플래시 배경은 흰색이므로 실루엣을 브랜드 마젠타로
  ['splash-icon.png', render(1024, 'foreground', 0.62, [0x9b, 0x27, 0x91]), outDir],
  // Play Console 등록용 — 512 hi-res 아이콘, 1024x500 피처 그래픽
  ['icon-512.png', render(512, 'icon'), storeDir],
  ['feature-graphic-1024x500.png', renderFeatureGraphic(), storeDir],
];
for (const [name, buf, dir] of jobs) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buf);
  console.log('written', path.join(path.relative(path.join(__dirname, '..'), dir), name), buf.length, 'bytes');
}
