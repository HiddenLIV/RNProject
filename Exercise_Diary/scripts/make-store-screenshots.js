// Play Console 등록용 스크린샷 생성 — 원본 캡처(각 기기 폴더의 raw/)를 둥근 베젤의
// 기기 프레임 안에 넣고, 그 위에 밝은 배경 + 헤드라인 카피를 얹어 마케팅용
// 스크린샷으로 합성한다. 휴대전화(노치) / 태블릿(카메라 점) 두 프레임 스타일을 쓴다.
// 실행: node scripts/make-store-screenshots.js  (→ 각 기기 폴더의 *.png 재생성)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const screenshotsDir = path.join(__dirname, '..', 'store-assets', 'android', 'screenshots');

const CANVAS_W = 1080;
const CANVAS_H = 1920; // 9:16 — Play 최대 비율(2:1) 안쪽의 표준 스크린샷 크기

const BG = '#FAF6F8'; // light.background에 브랜드 마젠타를 아주 옅게 섞은 톤
const HEADLINE_COLOR = '#1C1620';
const SUBTITLE_COLOR = '#9B2791'; // colors.primary — 부제를 브랜드 포인트 컬러로
const ACCENT_COLOR = '#9B2791';
const BEZEL_COLOR = '#141013'; // dark.background — 프레임을 앱 다크 테마 색으로

const FRAME_TOP = 310;
const BEZEL_SIDE = 22;
const BEZEL_BOTTOM = 30;
const RADIUS_OUTER = 56;

const shots = [
  { file: '01-home.png', subtitle: '이름도 아이콘도 자유롭게', headline: '만들지 못하는 운동은 없어요' },
  { file: '02-measure-reps.png', subtitle: '숫자 하나까지 놓치지 않아요', headline: '세트, 횟수, 무게까지 전부' },
  { file: '03-measure-timer.png', subtitle: '0.01초까지', headline: '숨 참는 순간까지 정확하게 재요' },
  { file: '04-records.png', subtitle: '쌓일수록 선명해지는', headline: '어제의 나를 뛰어넘는 순간' },
];

// 휴대전화는 노치가 있는 세로 프레임, 태블릿은 노치 없이 중앙 카메라 점만 있는
// 프레임을 쓴다 — 두 기기 모두 같은 배경/헤드라인 스타일을 공유한다.
const DEVICES = [
  { dir: '.', frameW: 760, bezelTop: 46, hasNotch: true, radiusInner: 34 },
  { dir: 'tablet-7in', frameW: 820, bezelTop: 34, hasNotch: false, radiusInner: 14 },
  { dir: 'tablet-10in', frameW: 820, bezelTop: 34, hasNotch: false, radiusInner: 14 },
];

function textSvg({ subtitle, headline }) {
  const cx = CANVAS_W / 2;
  return Buffer.from(`
    <svg width="${CANVAS_W}" height="${FRAME_TOP}" xmlns="http://www.w3.org/2000/svg">
      <text x="${cx}" y="150" text-anchor="middle" font-family="Apple SD Gothic Neo, sans-serif"
            font-weight="700" font-size="34" fill="${SUBTITLE_COLOR}">${subtitle}</text>
      <text x="${cx}" y="230" text-anchor="middle" font-family="Apple SD Gothic Neo, sans-serif"
            font-weight="800" font-size="60" fill="${HEADLINE_COLOR}">${headline}</text>
      <rect x="${cx - 30}" y="255" width="60" height="6" rx="3" fill="${ACCENT_COLOR}"/>
    </svg>
  `);
}

function frameSvg(device, innerW, innerH, outerH) {
  const { frameW, bezelTop, hasNotch, radiusInner } = device;
  // 링(bezel) = 바깥 라운드 사각형 - 안쪽 라운드 사각형(스크린 구멍). mask로 뚫는다.
  const cam = hasNotch
    ? `<rect x="${frameW / 2 - 65}" y="${bezelTop / 2 - 8}" width="130" height="16" rx="8" fill="#000000"/>`
    : `<circle cx="${frameW / 2}" cy="${bezelTop / 2}" r="6" fill="#3a3640"/>`;
  return Buffer.from(`
    <svg width="${frameW}" height="${outerH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="hole">
          <rect x="0" y="0" width="${frameW}" height="${outerH}" rx="${RADIUS_OUTER}" fill="#fff"/>
          <rect x="${BEZEL_SIDE}" y="${bezelTop}" width="${innerW}" height="${innerH}" rx="${radiusInner}" fill="#000"/>
        </mask>
      </defs>
      <rect x="0" y="0" width="${frameW}" height="${outerH}" rx="${RADIUS_OUTER}" fill="${BEZEL_COLOR}" mask="url(#hole)"/>
      ${cam}
      <rect x="${frameW / 2 - 90}" y="${outerH - BEZEL_BOTTOM / 2 - 4}" width="180" height="8" rx="4" fill="#3a3640"/>
    </svg>
  `);
}

function shadowSvg(frameW, outerH) {
  const pad = 40;
  return Buffer.from(`
    <svg width="${frameW + pad * 2}" height="${outerH + pad * 2}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="b" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="24"/>
        </filter>
      </defs>
      <rect x="${pad}" y="${pad + 18}" width="${frameW}" height="${outerH}" rx="${RADIUS_OUTER}"
            fill="#1C1620" opacity="0.22" filter="url(#b)"/>
    </svg>
  `);
}

async function buildOne(device, { file, subtitle, headline }) {
  const rawDir = path.join(screenshotsDir, device.dir, 'raw');
  const outDir = path.join(screenshotsDir, device.dir);
  const rawPath = path.join(rawDir, file);

  const { frameW, bezelTop } = device;
  const innerW = frameW - BEZEL_SIDE * 2;
  const meta = await sharp(rawPath).metadata();
  const innerH = Math.round((innerW * meta.height) / meta.width);
  const outerH = bezelTop + innerH + BEZEL_BOTTOM;
  const frameLeft = Math.round((CANVAS_W - frameW) / 2);
  const canvasH = Math.max(CANVAS_H, FRAME_TOP + outerH + 60);

  const screenshot = await sharp(rawPath).resize(innerW, innerH).toBuffer();
  const frame = await sharp(frameSvg(device, innerW, innerH, outerH)).png().toBuffer();
  const shadow = await sharp(shadowSvg(frameW, outerH)).png().toBuffer();
  const text = await sharp(textSvg({ subtitle, headline })).png().toBuffer();

  const outPath = path.join(outDir, file);
  await sharp({
    create: { width: CANVAS_W, height: canvasH, channels: 3, background: BG },
  })
    .composite([
      { input: shadow, left: frameLeft - 40, top: FRAME_TOP - 40 },
      { input: screenshot, left: frameLeft + BEZEL_SIDE, top: FRAME_TOP + bezelTop },
      { input: frame, left: frameLeft, top: FRAME_TOP },
      { input: text, left: 0, top: 0 },
    ])
    .png()
    .toFile(outPath);
  console.log('written', path.relative(path.join(__dirname, '..'), outPath), `${CANVAS_W}x${canvasH}`);
}

async function main() {
  for (const device of DEVICES) {
    const rawDir = path.join(screenshotsDir, device.dir, 'raw');
    if (!fs.existsSync(rawDir)) {
      throw new Error(`원본 캡처 폴더가 없습니다: ${rawDir}`);
    }
    for (const shot of shots) await buildOne(device, shot);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
