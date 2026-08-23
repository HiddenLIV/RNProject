// 안드로이드 상태 표시줄 알림 아이콘 생성 — 안드로이드는 이 아이콘을 실루엣(알파 채널)으로만
// 취급하고 색은 전부 흰색으로 렌더링하므로, 원본이 그라데이션이면 흰 뭉개진 원으로 보인다
// (리마인더 알림 QA 중 실기기에서 발견). 실제 런처 아이콘의 foreground 레이어
// (assets/android-icon-foreground.png, 스톱워치+덤벨 모티프)에서 알파 채널만 그대로 가져오고
// RGB를 순백으로 덮어써 안드로이드가 기대하는 "흰 실루엣 + 투명 배경" 포맷으로 만든다.
//
// 원본은 적응형 런처 아이콘용이라 세이프존 여백이 커서(432 캔버스 안에 실제 도형은 165x194
// 정도) 그대로 쓰면 알림 아이콘이 원형 배지 안에서 너무 작아 보인다(실기기 QA 중 발견) —
// 실제 도형의 바운딩 박스만 잘라내 캔버스의 CONTENT_FILL 비율을 채우도록 다시 배치한다.
//
// expo-notifications config plugin(app.json)이 prebuild 시 이 파일을 여러 DPI로 알아서
// 리사이즈하므로 소스 하나만 있으면 된다.
// 실행: node scripts/make-notification-icon.js
const path = require('path');
const sharp = require('sharp');

const FINAL_SIZE = 320;
const CONTENT_FILL = 0.78; // 도형의 긴 변이 최종 캔버스에서 차지할 비율

async function main() {
  const srcPath = path.join(__dirname, '..', 'assets', 'android-icon-foreground.png');
  const outPath = path.join(__dirname, '..', 'assets', 'notification-icon.png');

  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * channels + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;

  // RGB만 순백으로 덮어쓰고 알파(모양)는 원본 그대로 유지한다.
  for (let i = 0; i < data.length; i += channels) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  }

  const cropped = await sharp(data, { raw: { width, height, channels } })
    .extract({ left: minX, top: minY, width: boxW, height: boxH })
    .png()
    .toBuffer();

  const contentMax = Math.round(FINAL_SIZE * CONTENT_FILL);
  const resized = await sharp(cropped)
    .resize({ width: contentMax, height: contentMax, fit: 'inside' })
    .toBuffer();
  const { width: resizedW, height: resizedH } = await sharp(resized).metadata();

  await sharp({
    create: {
      width: FINAL_SIZE,
      height: FINAL_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resized,
        left: Math.round((FINAL_SIZE - resizedW) / 2),
        top: Math.round((FINAL_SIZE - resizedH) / 2),
      },
    ])
    .png()
    .toFile(outPath);

  console.log('written', path.relative(path.join(__dirname, '..'), outPath));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
