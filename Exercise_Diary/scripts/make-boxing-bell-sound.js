// 세트 간 휴식 종료용 "복싱 라운드 벨" 소리(WAV, 16-bit mono 44.1kHz)를 생성한다.
// bell.wav(측정 화면 간격 벨)와 확실히 구분되도록 더 낮은 기본음 + 비정수배 배음(금속 타종 느낌) +
// 짧은 간격으로 두 번 치는 "댕-댕" 구성을 쓴다.
// 실행: node scripts/make-boxing-bell-sound.js  (→ assets/sounds/boxing-bell.wav)
const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 1.2;
const n = Math.floor(sampleRate * duration);
const pcm = Buffer.alloc(n * 2);

// 큰 금속 종의 배음은 정수배가 아니다 — 기본음에 비정수 비율을 섞어야 "쨍"한 차임벨이 아니라
// 육중한 "댕" 소리로 들린다.
const fundamental = 466.16; // A#4 — bell.wav(1318.51Hz, E6)보다 한참 낮은 음역
const partials = [
  { ratio: 1, gain: 0.6 },
  { ratio: 1.5, gain: 0.25 },
  { ratio: 2.4, gain: 0.2 },
  { ratio: 3.1, gain: 0.12 },
];
const strikeAt = [0, 0.35]; // 두 번 타종

function sampleAt(t) {
  let s = 0;
  for (const strike of strikeAt) {
    const dt = t - strike;
    if (dt < 0) continue;
    const env = Math.exp(-3.2 * dt);
    for (const p of partials) {
      s += Math.sin(2 * Math.PI * fundamental * p.ratio * dt) * p.gain * env;
    }
  }
  return s;
}

for (let i = 0; i < n; i++) {
  const t = i / sampleRate;
  const s = sampleAt(t) * 0.8;
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const out = process.argv[2] || path.join(__dirname, '..', 'assets', 'sounds', 'boxing-bell.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, pcm]));
console.log('written', out, header.length + pcm.length, 'bytes');
