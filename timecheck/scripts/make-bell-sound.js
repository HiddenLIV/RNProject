// 벨 간격 알림용 "딩" 소리(WAV, 16-bit mono 44.1kHz)를 생성한다
// 실행: node scripts/make-bell-sound.js  (→ assets/sounds/bell.wav)
const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 0.45;
const n = Math.floor(sampleRate * duration);
const pcm = Buffer.alloc(n * 2);

for (let i = 0; i < n; i++) {
  const t = i / sampleRate;
  const env = Math.exp(-7 * t);
  // E6 + 옥타브 배음을 섞은 종소리 느낌 — TTS 음성과 확실히 구별되도록
  const s = (Math.sin(2 * Math.PI * 1318.51 * t) * 0.7 + Math.sin(2 * Math.PI * 2637.02 * t) * 0.3) * env * 0.85;
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

const out = process.argv[2] || path.join(__dirname, '..', 'assets', 'sounds', 'bell.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, pcm]));
console.log('written', out, header.length + pcm.length, 'bytes');
