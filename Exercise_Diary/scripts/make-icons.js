// Exercise_Diary 앱 아이콘 생성: 아령 실루엣 (매달리기 전용에서 범용 운동 일지로 확장됨에 따라
// 데드행 전용 모티프 대신 모든 운동을 아우르는 아령으로 교체, 색상도 src/theme.ts의
// 다크(background)+마젠타(primary) 팔레트로 통일)
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

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
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

// 아령(바 + 안쪽/바깥쪽 2단 원판). 반환: 흰색 커버리지에 쓸 signed distance (음수 = 내부)
function motifSdf(x, y) {
  const shapes = [
    distSeg(x, y, 344, 512, 680, 512) - 22, // 바 (얇게, 원판과 대비)
    sdRoundBox(x, y, 310, 512, 34, 96, 18), // 왼쪽 안쪽 원판
    sdRoundBox(x, y, 210, 512, 56, 150, 28), // 왼쪽 바깥쪽 원판
    sdRoundBox(x, y, 714, 512, 34, 96, 18), // 오른쪽 안쪽 원판
    sdRoundBox(x, y, 814, 512, 56, 150, 28), // 오른쪽 바깥쪽 원판
  ];
  return Math.min(...shapes);
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

const outDir = process.argv[2] || path.join(__dirname, '..', 'assets');
const jobs = [
  ['icon.png', render(1024, 'icon')],
  ['android-icon-foreground.png', render(1024, 'foreground', 0.62)], // 어댑티브 세이프존
  ['android-icon-background.png', render(1024, 'background')],
  ['android-icon-monochrome.png', render(1024, 'monochrome', 0.62)],
  ['favicon.png', render(196, 'icon')],
  // 스플래시 배경은 흰색이므로 실루엣을 브랜드 마젠타로
  ['splash-icon.png', render(1024, 'foreground', 0.62, [0x9b, 0x27, 0x91])],
];
for (const [name, buf] of jobs) {
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log('written', name, buf.length, 'bytes');
}
