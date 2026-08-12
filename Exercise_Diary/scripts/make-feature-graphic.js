// Play 스토어 피처 그래픽(1024x500) 생성 — 실제 런처 아이콘(퍼플→블루 그라데이션
// 스톱워치+덤벨, assets/android-icon-foreground.png)을 그대로 가져와 아이콘 배경과
// 같은 톤의 방사형 그라데이션 위에 크게 배치한다.
// assets/icon.png을 직접 리사이즈하지 않는 이유: 그 파일은 이미 정사각형 안에
// 자체 비네트가 구워져 있어 넓은 배너에 놓으면 테두리가 도드라진다. 대신 투명
// foreground 레이어(모티프만)를 새로 만든 배경 위에 얹어 이음새 없이 이어지게 한다.
// 실행: node scripts/make-feature-graphic.js
const path = require('path');
const sharp = require('sharp');

const width = 1024;
const height = 500;
const cx = width / 2;
const cy = height / 2;
const motifSize = 440; // foreground 레이어를 이 크기로 확대해 중앙 배치

async function main() {
  const maxR = Math.round(Math.hypot(cx, cy)) + 20;
  const bgSvg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="${cx}" cy="${cy}" r="${maxR}" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="rgb(54,40,79)"/>
          <stop offset="35%" stop-color="rgb(36,36,45)"/>
          <stop offset="100%" stop-color="rgb(13,14,16)"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/>
    </svg>
  `);

  const background = await sharp(bgSvg).png().toBuffer();

  const motif = await sharp(path.join(__dirname, '..', 'assets', 'android-icon-foreground.png'))
    .resize(motifSize, motifSize)
    .toBuffer();

  const outPath = path.join(__dirname, '..', 'store-assets', 'android', 'feature-graphic-1024x500.png');
  await sharp(background)
    .composite([{ input: motif, left: Math.round(cx - motifSize / 2), top: Math.round(cy - motifSize / 2) }])
    .flatten({ background: 'rgb(13,14,16)' })
    .removeAlpha() // Play 요건: 알파 없는 불투명 PNG
    .png()
    .toFile(outPath);

  console.log('written', path.relative(path.join(__dirname, '..'), outPath));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
